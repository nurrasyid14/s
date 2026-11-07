import os
from pathlib import Path
from dotenv import load_dotenv

# Cari .env dari root project jika ada
_env_path = Path(__file__).resolve().parents[3] / ".env"
if _env_path.exists():
    load_dotenv(dotenv_path=_env_path, override=False)


class Settings:
    # ── Ollama / LLM ──────────────────────────────────────────────────────────
    OLLAMA_API_KEY: str = os.getenv("OLLAMA_API_KEY", "").strip()
    if OLLAMA_API_KEY == "your_ollama_api_key_here":
        OLLAMA_API_KEY = ""

    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "qwen3.5:4b")
    OLLAMA_REASONING_EFFORT: str = os.getenv("OLLAMA_REASONING_EFFORT", "none").strip().lower()

    # Base URL & Mode
    if OLLAMA_API_KEY:
        OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "https://ollama.com").rstrip("/")
        OLLAMA_API_MODE: str = "cloud"
    else:
        OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/")
        OLLAMA_API_MODE: str = "local"

    OPENAI_BASE_URL: str = f"{OLLAMA_BASE_URL}/v1"

    # ── Sentiment Model ───────────────────────────────────────────────────────
    SENTIMENT_MODEL_NAME: str = os.getenv(
        "SENTIMENT_MODEL_NAME",
        "w11wo/indonesian-roberta-base-sentiment-classifier"
    )

    # ── spaCy Model ───────────────────────────────────────────────────────────
    SPACY_MODEL_NAME: str = os.getenv("SPACY_MODEL_NAME", "en_core_web_sm")

    # ── Device & Performance ──────────────────────────────────────────────────
    DEVICE: int = int(os.getenv("DEVICE", "-1"))  # -1 for CPU, 0 for GPU
    MAX_TEXT_LENGTH: int = int(os.getenv("MAX_TEXT_LENGTH", "1024"))

    # ── Service Info ──────────────────────────────────────────────────────────
    SERVICE_NAME: str = "SuaraLens ML Service"
    SERVICE_VERSION: str = "2.0.0"


settings = Settings()

