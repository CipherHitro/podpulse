from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers.pods import router as pods_router
from app.routers.events import router as events_router
from app.routers.insights import router as insights_router
from app.routers.metrics import router as metrics_router
from app.services import start_background_jobs

app = FastAPI(title="PodPulse API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(pods_router)
app.include_router(events_router)
app.include_router(insights_router)
app.include_router(metrics_router)

@app.on_event("startup")
def startup_event():
    print("FastAPI Application Startup: Launching background daemon tasks...")
    start_background_jobs()
