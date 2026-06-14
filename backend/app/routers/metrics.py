"""Router for metrics-related API endpoints."""

from fastapi import APIRouter

from app.services.metrics_service import MetricsService

router = APIRouter(prefix="/api/metrics", tags=["metrics"])


@router.get("")
def get_metrics():
    """Return historical metrics data for all pods."""
    return MetricsService.get_metrics_data()