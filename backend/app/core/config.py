import os
from pathlib import Path

# Paths
CORE_DIR = Path(__file__).resolve().parent
APP_DIR = CORE_DIR.parent
BACKEND_DIR = APP_DIR.parent
PROJECT_ROOT = BACKEND_DIR.parent

DATA_DIR = PROJECT_ROOT / "data"
UPLOADS_DIR = DATA_DIR / "uploads"
EXPORTS_DIR = DATA_DIR / "exports"
SAMPLE_DIR = DATA_DIR / "sample"
FRONTEND_DIST_DIR = PROJECT_ROOT / "frontend" / "dist"

# Ensure directories exist
for folder in [DATA_DIR, UPLOADS_DIR, EXPORTS_DIR, SAMPLE_DIR]:
    folder.mkdir(parents=True, exist_ok=True)

# Settings
SERVER_HOST = os.getenv("HOST", "127.0.0.1")
SERVER_PORT = int(os.getenv("PORT", 8000))
CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]
