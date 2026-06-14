from typing import Optional
from pydantic import BaseModel


class Insight(BaseModel):
    """Schema for a pod insight / recommendation."""
    id: int
    severity: str
    title: str
    rootCause: str
    summary: str
    evidence: list[str] = []
    impact: list[str] = []
    recommendation: str = ""
    timeToOOM: Optional[float] = None
    confidence: Optional[float] = None
    active: bool = True
    resolved: bool = False