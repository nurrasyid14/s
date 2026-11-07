"""
llm_engine.py
=============
Klasifikasi kategori & urgency scoring menggunakan LLM via Ollama.
Kompatibel penuh dengan notebook 03 & 05 serta backend service SuaraLens.
"""

import sys
import os
import time
import json
import logging
from pathlib import Path
from typing import Optional, List, Dict, Any

_PROJECT_ROOT = Path(__file__).resolve().parents[2]
_ML_SERVICE_DIR = _PROJECT_ROOT / "ml-service"
if str(_ML_SERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(_ML_SERVICE_DIR))

from app.core.config import settings
from app.services.classification import (
    classify_llm as _classify_llm_service, VALID_UNITS, VALID_URGENCY,
    SYSTEM_PROMPT as BASE_SYSTEM_PROMPT
)

# ── Konfigurasi & Export Simbol ───────────────────────────────────────────────
OLLAMA_BASE_URL = getattr(settings, "OLLAMA_BASE_URL", "http://localhost:11434")
DEFAULT_MODEL   = getattr(settings, "OLLAMA_MODEL", "qwen3.5:4b")
OPENAI_BASE_URL = f"{OLLAMA_BASE_URL.rstrip('/')}/v1"
OLLAMA_API_MODE = "cloud" if getattr(settings, "OLLAMA_API_KEY", None) else "local"

VALID_CATEGORIES = VALID_UNITS
SYSTEM_PROMPT = BASE_SYSTEM_PROMPT

LEGACY_CATEGORY_TO_UNIT = {
    "akademik": "Akademik",
    "keuangan": "Keuangan",
    "fasilitas": "Sarana Prasarana dan Layanan Umum",
    "sarana it": "TIK/Sistem Informasi",
    "kemahasiswaan": "Kemahasiswaan",
    "beasiswa": "Kemahasiswaan",
    "perpustakaan": "Perpustakaan",
    "parkir & keamanan": "Keamanan dan Ketertiban",
    "kebersihan & lingkungan": "Sarana Prasarana dan Layanan Umum",
    "kerjasama & mitra": "Kerjasama dan Hubungan Eksternal",
    "pelayanan administrasi": "SDM/Kepegawaian",
    "lainnya": "Lainnya/Lintas Unit",
}


def check_ollama_status() -> Dict[str, Any]:
    """
    Diagnosa konektivitas ke daemon Ollama lokal atau endpoint cloud.
    """
    import httpx
    try:
        r = httpx.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=3.0)
        if r.status_code == 200:
            models = [m.get("name", "") for m in r.json().get("models", [])]
            return {
                "running": True,
                "api_mode": OLLAMA_API_MODE,
                "base_url": OLLAMA_BASE_URL,
                "recommended_model": models[0] if models else DEFAULT_MODEL,
                "available_models": models,
                "error": None
            }
        else:
            return {
                "running": False,
                "api_mode": OLLAMA_API_MODE,
                "base_url": OLLAMA_BASE_URL,
                "recommended_model": None,
                "available_models": [],
                "error": f"HTTP {r.status_code}"
            }
    except Exception as e:
        return {
            "running": False,
            "api_mode": OLLAMA_API_MODE,
            "base_url": OLLAMA_BASE_URL,
            "recommended_model": None,
            "available_models": [],
            "error": str(e)
        }


def classify_llm(teks_aduan: str,
                 model: Optional[str] = None,
                 max_retries: int = 2) -> Dict[str, Any]:
    """
    Klasifikasikan satu teks aduan via classify_complaint dari app.services.classification.
    Menyediakan alias atribut untuk kompatibilitas script notebook.
    """
    start_time = time.time()
    res = _classify_llm_service(teks_aduan, model=model)
    elapsed = time.time() - start_time

    cat = res.get("category")
    conf = res.get("category_confidence")

    output = {
        "kategori": cat,
        "category": cat,
        "target_unit": cat,
        "confidence": conf,
        "category_confidence": conf,
        "unit_confidence": conf,
        "urgency_label": res.get("urgency_label"),
        "urgency_score": res.get("urgency_score"),
        "urgency_reason": res.get("urgency_reason"),
        "unit_reason": res.get("urgency_reason"),
        "submission_type": res.get("submission_type"),
        "is_fallback": res.get("is_fallback", False),
        "inference_time_s": round(elapsed, 3),
        "model_used": res.get("model_used", model or DEFAULT_MODEL),
        "error": None if cat else "Classification failed"
    }
    return output


def classify_llm_batch(texts: List[str],
                       model: Optional[str] = None,
                       delay_s: float = 0.05) -> List[Dict[str, Any]]:
    """
    Klasifikasi teks secara sekuensial / batch untuk evaluasi pipeline.
    """
    results = []
    total = len(texts)
    for i, t in enumerate(texts):
        res = classify_llm(t, model=model)
        results.append(res)
        if delay_s > 0:
            time.sleep(delay_s)
    return results


__all__ = [
    "classify_llm", "classify_llm_batch", "check_ollama_status",
    "VALID_CATEGORIES", "VALID_UNITS", "VALID_URGENCY", "SYSTEM_PROMPT",
    "OLLAMA_API_MODE", "OPENAI_BASE_URL", "LEGACY_CATEGORY_TO_UNIT"
]
