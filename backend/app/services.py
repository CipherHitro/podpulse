import asyncio
import threading
import time

from app.config import v1, custom_api
from app.state import EVENT_LOG, METRICS_HISTORY
from app.utils import parse_cpu, parse_memory, get_pod_status_and_phase
from datetime import datetime, timezone
from kubernetes import watch

SYSTEM_NAMESPACES = {"kube-system", "kubernetes-dashboard"}

_watch_lock = threading.Lock()
_active_watch = None


def stop_pod_watch():
    """Unblock the Kubernetes watch stream so background threads can exit."""
    with _watch_lock:
        if _active_watch is not None:
            _active_watch.stop()

def _sum_container_usage(metric_entry, resource):
    values = []
    for container in metric_entry.get("containers", []):
        usage = container.get("usage", {}).get(resource)
        if resource == "cpu":
            values.append(parse_cpu(usage))
        elif resource == "memory":
            values.append(parse_memory(usage))
    parsed_values = [value for value in values if value is not None]
    return sum(parsed_values) if parsed_values else None

def _sum_container_limits(pod, resource):
    total = 0.0
    found_limit = False
    container_specs = list(pod.spec.containers or []) + list(pod.spec.init_containers or [])

    for container in container_specs:
        limits = getattr(container.resources, "limits", None) if container.resources else None
        if not limits or resource not in limits:
            continue

        found_limit = True
        if resource == "cpu":
            parsed = parse_cpu(limits[resource])
        else:
            parsed = parse_memory(limits[resource])

        if parsed is not None:
            total += parsed

    return total if found_limit and total > 0 else None

def get_pods_data(include_system: bool = False):
    try:
        pods_list = v1.list_pod_for_all_namespaces().items

        # Filter out system namespaces unless include_system is True
        if not include_system:
            pods_list = [pod for pod in pods_list if pod.metadata.namespace not in SYSTEM_NAMESPACES]
        
        pod_metrics = {}
        try:
            metrics_response = custom_api.list_cluster_custom_object("metrics.k8s.io", "v1beta1", "pods")
            for m in metrics_response.get("items", []):
                ns = m["metadata"]["namespace"]
                name = m["metadata"]["name"]
                pod_metrics[(ns, name)] = m
        except Exception as e:
            print("Warning: Failed to fetch Kubernetes pod metrics:", e)
            
        result = []
        for pod in pods_list:
            name = pod.metadata.name
            namespace = pod.metadata.namespace
            
            creation_timestamp = pod.metadata.creation_timestamp
            if creation_timestamp:
                age_delta = datetime.now(timezone.utc) - creation_timestamp
                days = age_delta.days
                hours = age_delta.seconds // 3600
                minutes = (age_delta.seconds % 3600) // 60
                if days > 0:
                    age_str = f"{days}d"
                elif hours > 0:
                    age_str = f"{hours}h"
                else:
                    age_str = f"{minutes}m"
            else:
                age_str = None
                
            status, phase, restarts = get_pod_status_and_phase(pod)
            
            cpu_cores = None
            mem_mib = None
            cpu_percent = None
            mem_percent = None
            cpu_limit = None
            mem_limit = None
            metric_entry = pod_metrics.get((namespace, name))
            if metric_entry:
                cpu_cores = _sum_container_usage(metric_entry, "cpu")
                mem_mib = _sum_container_usage(metric_entry, "memory")

                cpu_limit = _sum_container_limits(pod, "cpu")
                mem_limit = _sum_container_limits(pod, "memory")
                if cpu_cores is not None:
                    if cpu_limit:
                        cpu_percent = min(round((cpu_cores / cpu_limit) * 100.0), 100)
                    else:
                        cpu_percent = round(cpu_cores * 1000, 1)  # fallback: show millicores
                if mem_mib is not None:
                    if mem_limit:
                        mem_percent = min(round((mem_mib / mem_limit) * 100.0), 100)
                    else:
                        mem_percent = round(mem_mib, 1)  # fallback: show MiB
                
            has_limits = cpu_limit is not None or mem_limit is not None
            result.append({
                "id": name,
                "name": name,
                "namespace": namespace,
                "status": status,
                "cpu": cpu_percent,
                "memory": mem_percent,
                "cpuCores": cpu_cores,
                "memoryMiB": mem_mib,
                "hasLimits": has_limits,
                "restarts": restarts,
                "node": pod.spec.node_name,
                "age": age_str,
                "phase": phase
            })
            
        return result, {}
    except Exception as e:
        print("Error fetching pods in services:", e)
        return [], {}

def _run_pod_watch_stream():
    global _active_watch
    w = watch.Watch()
    with _watch_lock:
        _active_watch = w
    print("Background watch loop running.")
    try:
        for event in w.stream(v1.list_pod_for_all_namespaces):
            pod = event["object"]
            name = pod.metadata.name
            namespace = pod.metadata.namespace
            event_type = event["type"]
            phase = pod.status.phase or "Unknown"
            now_str = datetime.now().strftime("%H:%M:%S")

            severity = "info"
            restarts = 0
            if pod.status.container_statuses:
                for cs in pod.status.container_statuses:
                    restarts += cs.restart_count or 0
                    if cs.state.waiting:
                        if cs.state.waiting.reason in ["CrashLoopBackOff", "ImagePullBackOff", "ErrImagePull"]:
                            severity = "critical"

            if phase == "Failed":
                severity = "critical"
            elif phase == "Pending" or pod.metadata.deletion_timestamp:
                severity = "warning"
            elif severity == "info" and restarts > 0:
                severity = "warning"

            if event_type == "DELETED":
                severity = "warning"
                desc = f"Pod {namespace}/{name} deleted from cluster."
            elif event_type == "ADDED":
                desc = f"New Pod {namespace}/{name} added in phase {phase}."
            else:
                desc = f"Pod {namespace}/{name} state update: phase {phase}, restarts {restarts}."

            event_data = {
                "id": f"{int(time.time())}-{name}",
                "time": now_str,
                "severity": severity,
                "description": desc
            }
            EVENT_LOG.appendleft(event_data)
    finally:
        with _watch_lock:
            if _active_watch is w:
                _active_watch = None


async def watch_pod_events():
    while True:
        try:
            await asyncio.to_thread(_run_pod_watch_stream)
        except asyncio.CancelledError:
            stop_pod_watch()
            raise
        except Exception as e:
            print(f"Error in background watcher: {e}. Retrying in 5s...")
            try:
                await asyncio.sleep(5)
            except asyncio.CancelledError:
                stop_pod_watch()
                raise


async def update_metrics_loop():
    while True:
        try:
            pods_data, _ = await asyncio.to_thread(lambda: get_pods_data(include_system=False))
            now_str = datetime.now().strftime("%H:%M")

            new_point = {
                "time": now_str,
                "memory": {pod["name"]: pod["memory"] for pod in pods_data},
                "cpu": {pod["name"]: pod["cpu"] for pod in pods_data},
                "memoryMiB": {pod["name"]: pod["memoryMiB"] for pod in pods_data},
                "cpuCores": {pod["name"]: pod["cpuCores"] for pod in pods_data}
            }

            METRICS_HISTORY.append(new_point)
            if len(METRICS_HISTORY) > 10:
                METRICS_HISTORY.pop(0)
        except Exception as e:
            print("Error updating metrics history:", e)

        try:
            await asyncio.sleep(15)
        except asyncio.CancelledError:
            raise