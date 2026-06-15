"""Router for topology-related API endpoints."""

from fastapi import APIRouter, HTTPException

from app.models.topology import TopologyResponse
from app.services.topology_service import TopologyService

router = APIRouter(prefix="/api/topology", tags=["topology"])


@router.get("", response_model=TopologyResponse)
async def get_topology():
    """Return the service-to-service topology graph discovered via Istio + Prometheus."""
    try:
        topology = await TopologyService.fetch_topology()
        return topology
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc