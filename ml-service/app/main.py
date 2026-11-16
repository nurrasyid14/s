import logging
import secrets
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from .core.config import settings
from .core.model_loader import load_sentiment_model, init_presidio
from .api.routes import router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("suaralens.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan handler: Inisialisasi model ML (Singleton) saat startup,
    dan cleanup memori saat shutdown.
    """
    logger.info("Initializing SuaraLens ML models on startup...")
    # 1. Inisialisasi Presidio PII Engine
    init_presidio()
    # 2. Inisialisasi Sentiment IndoRoBERTa Pipeline
    load_sentiment_model()
    logger.info("SuaraLens ML Service startup complete.")
    yield
    logger.info("SuaraLens ML Service shutting down...")


app = FastAPI(
    title=settings.SERVICE_NAME,
    version=settings.SERVICE_VERSION,
    description="Layanan AI/NLP Produksi Modular SuaraLens PENS",
    lifespan=lifespan,
)

# Autentikasi API Key Middleware untuk Tailscale Funnel / Remote Access
@app.middleware("http")
async def verify_api_key(request: Request, call_next):
    # Endpoint health publik tanpa membocorkan informasi sensitif
    if request.url.path == "/health":
        return await call_next(request)

    # Fail-closed: jika ML_API_KEY belum dikonfigurasi di server, tolak request untuk mencegah akses tidak terproteksi
    if not settings.ML_API_KEY:
        return JSONResponse(
            status_code=503,
            content={"detail": "Service Unavailable: ML_API_KEY wajib dikonfigurasi pada server sebelum menerima request publik."}
        )

    client_key = request.headers.get("X-API-Key", "").strip()
    # Constant-time comparison untuk mencegah timing attack
    if not client_key or not secrets.compare_digest(client_key, settings.ML_API_KEY):
        return JSONResponse(
            status_code=401,
            content={"detail": "Unauthorized: API Key tidak valid atau belum disertakan pada header X-API-Key."}
        )

    return await call_next(request)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Daftarkan Router API
app.include_router(router)


