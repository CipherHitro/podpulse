from fastapi import APIRouter
from app.services import get_pods_data

router = APIRouter(prefix="/api/insights", tags=["insights"])

@router.get("")
def get_insights():
    insights_list = []
    pods_data, _ = get_pods_data()
    
    unhealthy_pods = [
        pod for pod in pods_data if pod["status"] in ["critical", "warning"]
    ]
    for i, pod in enumerate(unhealthy_pods, start=1):
        severity = pod["status"]
        insights_list.append({
            "id": i,
            "severity": severity,
            "title": f"{severity.title()} Pod - {pod['name']}",
            "rootCause": pod["id"],
            "summary": f"Pod {pod['namespace']}/{pod['name']} is in phase {pod['phase']} with status {pod['status']}.",
            "evidence": [
                f"Phase: {pod['phase']}",
                f"Restarts count: {pod['restarts']}",
                f"Node: {pod['node']}",
                f"Age: {pod['age']}"
            ],
            "impact": [],
            "recommendation": f"kubectl describe pod {pod['name']} -n {pod['namespace']}",
            "timeToOOM": None,
            "confidence": None,
            "active": True,
            "resolved": False
        })
        
    return insights_list
