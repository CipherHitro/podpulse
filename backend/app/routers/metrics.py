from fastapi import APIRouter
from app.state import METRICS_HISTORY

router = APIRouter(prefix="/api/metrics", tags=["metrics"])

@router.get("")
def get_metrics():
    memory_data = []
    cpu_data = []
    
    for h in METRICS_HISTORY:
        t = h["time"]
        memory_data.append({"time": t, **h.get("memory", {})})
        cpu_data.append({"time": t, **h.get("cpu", {})})
        
    return {
        "memoryData": memory_data,
        "cpuData": cpu_data,
        "pvcData": [],
        "networkData": []
    }
