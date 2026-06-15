"""Pydantic models for service topology discovered via Istio + Prometheus."""

from pydantic import BaseModel


class TopologyNode(BaseModel):
    """A service node in the topology graph."""
    id: str
    namespace: str


class TopologyEdge(BaseModel):
    """A directed edge representing service-to-service traffic."""
    source: str
    target: str
    requests_per_sec: float


class TopologyResponse(BaseModel):
    """Top-level response for the /api/topology endpoint."""
    nodes: list[TopologyNode]
    edges: list[TopologyEdge]