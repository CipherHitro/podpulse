from fastapi import APIRouter
from app.state import EVENT_LOG

router = APIRouter(prefix="/api/events", tags=["events"])

@router.get("")
def get_events():
    return list(EVENT_LOG)
