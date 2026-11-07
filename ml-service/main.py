"""
SuaraLens ML Service Entrypoint
================================
Mengekspos FastAPI app dari arsitektur modular app.main.
Mempertahankan kompatibilitas penuh dengan perintah uvicorn eksisting:
    uvicorn main:app --app-dir ml-service
"""

from app.main import app

__all__ = ["app"]
