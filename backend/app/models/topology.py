"""Pydantic models for service topology discovered via Istio + Prometheus."""

from pydantic import BaseModel


class TopologyNode(BaseModel):
    """A node in the topology graph."""
    id: str
    namespace: str
    type: str = "deployment"  # "deployment" or "pod"


class TopologyEdge(BaseModel):
    """A directed edge representing service-to-service or pod-to-service traffic."""
    source: str
    target: str
    requests_per_sec: float = 0.0
    relation: str = "traffic"  # "traffic" or "belongs_to"


class TopologyResponse(BaseModel):
    """Top-level response for the /api/topology endpoint."""
    nodes: list[TopologyNode]
    edges: list[TopologyEdge]