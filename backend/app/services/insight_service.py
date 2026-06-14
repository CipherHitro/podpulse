"""Service for generating pod insights and recommendations."""

from app.models.insight import Insight
from app.services.pod_service import PodService


class InsightService:
    """Analyzes pod data and generates actionable insights."""

    @classmethod
    def get_insights(cls) -> list[Insight]:
        """Generate insights from current pod data."""
        pods_data = PodService.list_pods(include_system=False)

        unhealthy_pods = [
            pod for pod in pods_data if pod.status in ("critical", "warning")
        ]

        insights = []
        for i, pod in enumerate(unhealthy_pods, start=1):
            severity = pod.status
            insights.append(
                Insight(
                    id=i,
                    severity=severity,
                    title=f"{severity.title()} Pod - {pod.name}",
                    rootCause=pod.id,
                    summary=(
                        f"Pod {pod.namespace}/{pod.name} is in phase {pod.phase} "
                        f"with status {pod.status}."
                    ),
                    evidence=[
                        f"Phase: {pod.phase}",
                        f"Restarts count: {pod.restarts}",
                        f"Node: {pod.node}",
                        f"Age: {pod.age}",
                    ],
                    impact=[],
                    recommendation=(
                        f"kubectl describe pod {pod.name} -n {pod.namespace}"
                    ),
                    timeToOOM=None,
                    confidence=None,
                    active=True,
                    resolved=False,
                )
            )

        return insights