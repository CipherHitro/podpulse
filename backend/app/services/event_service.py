"""Service for watching Kubernetes pod events and maintaining event log."""

import asyncio
import threading
import time

from datetime import datetime
from kubernetes import watch

from app.core.state import app_state
from app.models.event import PodEvent
from app.services.kube_client import get_kube_client


class EventService:
    """Watches pod events in the cluster and maintains an in-memory event log."""

    _watch_lock = threading.Lock()
    _active_watch = None

    @classmethod
    def stop_watch(cls):
        """Unblock the Kubernetes watch stream so background threads can exit."""
        with cls._watch_lock:
            if cls._active_watch is not None:
                cls._active_watch.stop()

    @classmethod
    def _run_watch_stream(cls):
        """Internal blocking method that streams pod watch events."""
        w = watch.Watch()
        with cls._watch_lock:
            cls._active_watch = w
        print("Background watch loop running.")
        v1 = get_kube_client()
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
                            if cs.state.waiting.reason in [
                                "CrashLoopBackOff",
                                "ImagePullBackOff",
                                "ErrImagePull",
                            ]:
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

                event_data = PodEvent(
                    id=f"{int(time.time())}-{name}",
                    time=now_str,
                    severity=severity,
                    description=desc,
                )
                app_state.add_event(event_data)
        finally:
            with cls._watch_lock:
                if cls._active_watch is w:
                    cls._active_watch = None

    @classmethod
    async def watch_loop(cls):
        """Async wrapper that runs the watch stream in a background thread."""
        while True:
            try:
                await asyncio.to_thread(cls._run_watch_stream)
            except asyncio.CancelledError:
                cls.stop_watch()
                raise
            except Exception as e:
                print(f"Error in background watcher: {e}. Retrying in 5s...")
                try:
                    await asyncio.sleep(5)
                except asyncio.CancelledError:
                    cls.stop_watch()
                    raise

    @classmethod
    def get_events(cls) -> list[PodEvent]:
        """Return all current events."""
        return app_state.get_events()