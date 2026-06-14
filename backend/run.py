"""Application entry point — starts the Uvicorn server."""

import os

import uvicorn

from app.config import settings

if __name__ == "__main__":
    # Allow environment variable to override reload behavior
    reload = os.getenv("PODPULSE_RELOAD", "").lower() in {"1", "true", "yes"}
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=reload,
    )