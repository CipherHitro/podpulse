"""Service for collecting and storing metrics snapshots."""

import asyncio

from datetime import datetime

from app.config import settings
from app.core.state import app_state
from app.models.metric import MetricSnapshot
from app.services.pod_service import PodService


class MetricsService:
    """Periodically collects pod metrics and stores history snapshots."""

    @classmethod
    async def collect_loop(cls):
        """Background loop that captures metrics snapshots at a fixed interval."""
        while True:
            try:
                pods_data = PodService.list_pods(include_system=False)
                now_str = datetime.now().strftime("%H:%M")

                snapshot = MetricSnapshot(
                    time=now_str,
                    memory={pod.name: pod.memory for pod in pods_data if pod.memory is not None},
                    cpu={pod.name: pod.cpu for pod in pods_data if pod.cpu is not None},
                    memoryMiB={pod.name: pod.memoryMiB for pod in pods_data if pod.memoryMiB is not None},
                    cpuCores={pod.name: pod.cpuCores for pod in pods_data if pod.cpuCores is not None},
                )

                app_state.add_metric_snapshot(snapshot)
            except Exception as e:
                print("Error updating metrics history:", e)

            try:
                await asyncio.sleep(settings.metrics_loop_interval)
            except asyncio.CancelledError:
                raise

    @classmethod
    def get_metrics_data(cls) -> dict:
        """Build the response dict for the /api/metrics endpoint."""
        history = app_state.get_metrics_history()
        memory_data = []
        cpu_data = []

        for h in history:
            t = h.time
            memory_data.append({"time": t, **h.memory})
            cpu_data.append({"time": t, **h.cpu})

        return {
            "memoryData": memory_data,
            "cpuData": cpu_data,
            "pvcData": [],
            "networkData": [],
        }