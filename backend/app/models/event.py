from pydantic import BaseModel


class PodEvent(BaseModel):
    """Schema for a pod event entry."""
    id: str
    time: str
    severity: str  # info | warning | critical
    description: str