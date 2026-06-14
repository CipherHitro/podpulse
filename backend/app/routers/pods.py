"""Router for pod-related API endpoints."""

from fastapi import APIRouter, HTTPException

from app.services.pod_service import PodService

router = APIRouter(prefix="/api/pods", tags=["pods"])


@router.get("")
def list_pods(include_system: bool = False):
    """List all pods, optionally including system namespaces."""
    pods_data = PodService.list_pods(include_system=include_system)
    return pods_data


@router.post("/{namespace}/{name}/restart")
def restart_pod(namespace: str, name: str):
    """Delete (restart) a pod by namespace and name."""
    try:
        PodService.delete_pod(namespace, name)
        return {"status": "success", "message": f"Pod {namespace}/{name} deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))