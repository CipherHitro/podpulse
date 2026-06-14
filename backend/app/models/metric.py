from pydantic import BaseModel


class MetricSnapshot(BaseModel):
    """A single point-in-time metrics snapshot for all pods."""
    time: str
    memory: dict[str, float] = {}
    cpu: dict[str, float] = {}
    memoryMiB: dict[str, float] = {}
    cpuCores: dict[str, float] = {}


class MetricResponse(BaseModel):
    """Response shape for the /api/metrics endpoint."""
    memoryData: list[dict] = []
    cpuData: list[dict] = []
    pvcData: list[dict] = []
    networkData: list[dict] = []