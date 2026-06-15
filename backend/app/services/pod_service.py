"""Service layer for pod-related operations."""

from datetime import datetime, timezone

from app.config import settings
from app.core.utils import parse_cpu, parse_memory, get_pod_status_and_phase
from app.models.pod import Pod
from app.services.kube_client import get_kube_client, get_custom_objects_api


class PodService:
    """Handles pod listing, status computation, and pod actions."""

    SYSTEM_NAMESPACES = settings.system_namespaces

    @classmethod
    def list_pods(cls, include_system: bool = False) -> list[Pod]:
        """Fetch all pods (optionally including system namespaces)."""
        v1 = get_kube_client()
        pods_list = v1.list_pod_for_all_namespaces().items

        if not include_system:
            pods_list = [
                pod for pod in pods_list
                if pod.metadata.namespace not in cls.SYSTEM_NAMESPACES
            ]

        pod_metrics = cls._fetch_pod_metrics()

        result = []
        for pod in pods_list:
            pod_data = cls._build_pod_data(pod, pod_metrics)
            result.append(pod_data)

        return result

    @classmethod
    def _fetch_pod_metrics(cls) -> dict:
        """Fetch metrics from the metrics.k8s.io API (if available)."""
        pod_metrics = {}
        try:
            custom_api = get_custom_objects_api()
            metrics_response = custom_api.list_cluster_custom_object(
                "metrics.k8s.io", "v1beta1", "pods"
            )
            for m in metrics_response.get("items", []):
                ns = m["metadata"]["namespace"]
                name = m["metadata"]["name"]
                pod_metrics[(ns, name)] = m
        except Exception:
            pass

        return pod_metrics

    @classmethod
    def _compute_age(cls, creation_timestamp) -> str:
        """Compute a human-readable age string from a pod's creation timestamp."""
        if not creation_timestamp:
            return None
        age_delta = datetime.now(timezone.utc) - creation_timestamp
        days = age_delta.days
        hours = age_delta.seconds // 3600
        minutes = (age_delta.seconds % 3600) // 60
        if days > 0:
            return f"{days}d"
        elif hours > 0:
            return f"{hours}h"
        else:
            return f"{minutes}m"

    @classmethod
    def _sum_container_usage(cls, metric_entry, resource: str):
        """Sum a resource across all containers in a metrics entry."""
        values = []
        for container in metric_entry.get("containers", []):
            usage = container.get("usage", {}).get(resource)
            if resource == "cpu":
                values.append(parse_cpu(usage))
            elif resource == "memory":
                values.append(parse_memory(usage))
        parsed = [v for v in values if v is not None]
        return sum(parsed) if parsed else None

    @classmethod
    def _sum_container_limits(cls, pod, resource: str):
        """Sum a resource limit across all containers in a pod."""
        total = 0.0
        found_limit = False
        container_specs = list(pod.spec.containers or []) + list(pod.spec.init_containers or [])

        for container in container_specs:
            resources = getattr(container, "resources", None)
            limits = getattr(resources, "limits", None) if resources else None
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

    @classmethod
    def _build_pod_data(cls, pod, pod_metrics: dict) -> Pod:
        """Build a Pod model from a Kubernetes pod object and its metrics."""
        name = pod.metadata.name
        namespace = pod.metadata.namespace

        age_str = cls._compute_age(pod.metadata.creation_timestamp)

        status, phase, restarts = get_pod_status_and_phase(pod)

        cpu_cores = None
        mem_mib = None
        cpu_percent = None
        mem_percent = None
        cpu_limit = None
        mem_limit = None

        metric_entry = pod_metrics.get((namespace, name))
        if metric_entry:
            cpu_cores = cls._sum_container_usage(metric_entry, "cpu")
            mem_mib = cls._sum_container_usage(metric_entry, "memory")

            cpu_limit = cls._sum_container_limits(pod, "cpu")
            mem_limit = cls._sum_container_limits(pod, "memory")

            if cpu_cores is not None:
                if cpu_limit:
                    cpu_percent = min(round((cpu_cores / cpu_limit) * 100.0), 100)
                else:
                    cpu_percent = round(cpu_cores * 1000, 1)

            if mem_mib is not None:
                if mem_limit:
                    mem_percent = min(round((mem_mib / mem_limit) * 100.0), 100)
                else:
                    mem_percent = round(mem_mib, 1)

        return Pod(
            id=name,
            name=name,
            namespace=namespace,
            status=status,
            cpu=cpu_percent,
            memory=mem_percent,
            cpuCores=cpu_cores,
            memoryMiB=mem_mib,
            hasLimits=(cpu_limit is not None or mem_limit is not None),
            restarts=restarts,
            node=pod.spec.node_name,
            age=age_str,
            phase=phase,
        )

    @classmethod
    def delete_pod(cls, namespace: str, name: str) -> None:
        """Delete a pod by namespace and name."""
        v1 = get_kube_client()
        v1.delete_namespaced_pod(name, namespace)