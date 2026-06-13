import os

import uvicorn

if __name__ == "__main__":
    # reload=True spawns a parent reloader process; disable it for cleaner Ctrl+C shutdown.
    reload = os.getenv("PODPULSE_RELOAD", "").lower() in {"1", "true", "yes"}
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=reload)