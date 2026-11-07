import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
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

