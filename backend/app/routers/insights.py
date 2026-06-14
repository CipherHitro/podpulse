"""Router for insight-related API endpoints."""

from fastapi import APIRouter

from app.services.insight_service import InsightService

router = APIRouter(prefix="/api/insights", tags=["insights"])


@router.get("")
def get_insights():
    """Return generated insights for unhealthy pods."""
    return InsightService.get_insights()