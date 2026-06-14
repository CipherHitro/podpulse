"""Router for event-related API endpoints."""

from fastapi import APIRouter

from app.services.event_service import EventService

router = APIRouter(prefix="/api/events", tags=["events"])


@router.get("")
def get_events():
    """Return all tracked pod events (newest first)."""
    return EventService.get_events()