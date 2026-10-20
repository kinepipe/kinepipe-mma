from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path
import os

from .core.config import CORS_ORIGINS, FRONTEND_DIST_DIR
from .api import (
    routes_video,
    routes_tracking,
    routes_kinematics,
    routes_kinovea,
    routes_export
)

app = FastAPI(
    title="KinePipe MMA (Markless Motion Analyser)",
    description="KinePipe MMA: Markless Motion Analyser. API para análisis biomecánico cinemático y visión artificial desarrollada por Klgo. Felipe Vargas Ríos (@kinepipe)",
    version="1.5.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(routes_video.router)
app.include_router(routes_tracking.router)
app.include_router(routes_kinematics.router)
app.include_router(routes_kinovea.router)
app.include_router(routes_export.router)

# Mount frontend if built
if FRONTEND_DIST_DIR.exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST_DIR / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = FRONTEND_DIST_DIR / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(str(file_path))
        return FileResponse(str(FRONTEND_DIST_DIR / "index.html"))
else:
    @app.get("/")
    def root():
        return {
            "app": "KinePipe MMA Backend (Markless Motion Analyser - by Klgo. Felipe Vargas Ríos - @kinepipe)",
            "author": "Klgo. Felipe Vargas Ríos (@kinepipe)",
            "version": "1.5.0",
            "status": "online",
            "docs_url": "/docs",
            "models_endpoint": "/api/tracking/models"
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
