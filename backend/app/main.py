"""PodPulse API — FastAPI application entry point."""

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers.pods import router as pods_router
from app.routers.events import router as events_router
from app.routers.insights import router as insights_router
from app.routers.metrics import router as metrics_router
from app.routers.topology import router as topology_router
from app.services.event_service import EventService
from app.services.metrics_service import MetricsService


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Start background tasks on startup and clean up on shutdown."""
    print("PodPulse API Startup: Launching background tasks...")
    watch_task = asyncio.create_task(EventService.watch_loop())
    metrics_task = asyncio.create_task(MetricsService.collect_loop())
    yield
    print("PodPulse API Shutdown: Stopping background tasks...")
    EventService.stop_watch()
    watch_task.cancel()
    metrics_task.cancel()
    for task in (watch_task, metrics_task):
        try:
            await asyncio.wait_for(task, timeout=5)
        except (asyncio.CancelledError, asyncio.TimeoutError):
            pass


app = FastAPI(title=settings.app_title, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(pods_router)
app.include_router(events_router)
app.include_router(insights_router)
app.include_router(metrics_router)
app.include_router(topology_router)
