from fastapi import APIRouter, HTTPException
from app.services import get_pods_data
from app.config import v1

router = APIRouter(prefix="/api/pods", tags=["pods"])

@router.get("")
def list_pods(include_system: bool = False):
    pods_data, _ = get_pods_data(include_system=include_system)
    return pods_data

@router.post("/{namespace}/{name}/restart")
def restart_pod(namespace: str, name: str):
    try:
        v1.delete_namespaced_pod(name, namespace)
        return {"status": "success", "message": f"Pod {namespace}/{name} deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
