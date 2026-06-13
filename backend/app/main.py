import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers.pods import router as pods_router
from app.routers.events import router as events_router
from app.routers.insights import router as insights_router
from app.routers.metrics import router as metrics_router
from app.services import watch_pod_events, update_metrics_loop, stop_pod_watch


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("FastAPI Application Startup: Launching background tasks...")
    watch_task = asyncio.create_task(watch_pod_events())
    metrics_task = asyncio.create_task(update_metrics_loop())
    yield
    print("FastAPI Application Shutdown: Stopping background tasks...")
    stop_pod_watch()
    watch_task.cancel()
    metrics_task.cancel()
    for task in (watch_task, metrics_task):
        try:
            await asyncio.wait_for(task, timeout=5)
        except (asyncio.CancelledError, asyncio.TimeoutError):
            pass


app = FastAPI(title="PodPulse API", lifespan=lifespan)

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

