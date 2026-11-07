"""
anonymization.py
================
Modul PII redaction SuaraLens.
Mendelegasikan implementasi ke package produksi ml-service.app.services.anonymization.
"""

import sys
from pathlib import Path

# Path ke ml-service agar modul app dapat diimpor
_ML_SERVICE_DIR = Path(__file__).resolve().parents[2] / "ml-service"
if str(_ML_SERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(_ML_SERVICE_DIR))

from app.services.anonymization import anonymize_text, regex_fallback_redact
from app.core.model_loader import is_presidio_ready

PRESIDIO_AVAILABLE = is_presidio_ready()

__all__ = ["anonymize_text", "regex_fallback_redact", "PRESIDIO_AVAILABLE"]
