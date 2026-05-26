import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from CallCenterAPI_FastAPI.main import app
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path

STATIC_DIR = Path(__file__).resolve().parent.parent / "frontend" / "dist"
INDEX_HTML = STATIC_DIR / "index.html"

if INDEX_HTML.exists():
    app.mount("/assets", StaticFiles(directory=str(STATIC_DIR / "assets")), name="spa_assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str = ""):
        if full_path.startswith("api/"):
            from fastapi.responses import JSONResponse
            return JSONResponse(status_code=404, content={"detail": "Not found"})
        file_path = STATIC_DIR / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(str(file_path))
        return FileResponse(str(INDEX_HTML))
