from typing import Optional
from pydantic import BaseModel, Field


class Pod(BaseModel):
    """Schema for a single pod in the list response."""
    id: str
    name: str
    namespace: str
    status: str  # healthy | warning | critical
    cpu: Optional[float] = None
    memory: Optional[float] = None
    cpuCores: Optional[float] = None
    memoryMiB: Optional[float] = None
    hasLimits: bool = False
    restarts: int = 0
    node: Optional[str] = None
    age: Optional[str] = None
    phase: str = "Unknown"


class PodMetrics(BaseModel):
    """Raw per-container usage metrics from the metrics API."""
    cpu: Optional[float] = None
    memory: Optional[float] = None
    cpuLimit: Optional[float] = None
    memLimit: Optional[float] = None
    cpuPercent: Optional[float] = None
    memPercent: Optional[float] = None


class PodDetail(BaseModel):
    """Detailed pod information for the details endpoint."""
    name: str
    namespace: str
    uid: str = ""
    status: str
    phase: str
    restarts: int = 0
    node: str = ""
    age: str = ""
    labels: dict[str, str] = Field(default_factory=dict)
    annotations: dict[str, str] = Field(default_factory=dict)
    ip: str = ""
    hostIp: str = ""
    containers: list[dict] = Field(default_factory=list)
    conditions: list[dict] = Field(default_factory=list)
    metrics: PodMetrics = Field(default_factory=PodMetrics)