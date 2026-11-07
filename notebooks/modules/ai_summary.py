"""
ai_summary.py
=============
Modul Grounded AI Executive Summary SuaraLens.
Menghasilkan ringkasan naratif faktual berbasis data analitik agregat.
"""

import sys
import json
from pathlib import Path
from typing import Optional, Dict, Any

_PROJECT_ROOT = Path(__file__).resolve().parents[2]
_ML_SERVICE_DIR = _PROJECT_ROOT / "ml-service"
if str(_ML_SERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(_ML_SERVICE_DIR))

from datetime import datetime
from app.services.summary import (
    generate_summary, check_grounding,
    generate_summary_template as _generate_summary_template
)

SUMMARY_SYSTEM_PROMPT = """Kamu adalah asisten pelaporan untuk pimpinan institusi PENS.
Tugasmu: Buat ringkasan naratif singkat (3-5 kalimat) dari angka-angka analitik yang diberikan.

ATURAN KETAT:
1. Hanya gunakan angka dan fakta yang TERSEDIA dalam data yang diberikan.
2. DILARANG menambahkan klaim, penyebab, atau rekomendasi yang tidak ada dasarnya di data.
3. DILARANG membuat inferensi kausal ("karena...", "disebabkan oleh...") kecuali data mendukungnya.
4. Jika data tidak lengkap, nyatakan keterbatasan data secara jujur.
5. Gunakan Bahasa Indonesia formal.
6. Tulis untuk pimpinan — ringkas, faktual, dan dapat ditindaklanjuti.

Format output: teks paragraf biasa (bukan JSON, bukan bullet point).
Panjang: 3-5 kalimat."""


def generate_summary_template(metrics: Dict[str, Any]) -> Dict[str, Any]:
    """Fallback template kompatibel dengan run_nb07 dan service."""
    text = _generate_summary_template(metrics)
    if isinstance(text, dict):
        return text
    return {
        "summary": text,
        "generated_at": datetime.now().isoformat(),
        "method": "template",
        "error": None,
    }


def save_summary_json(result: Dict[str, Any], output_path: str) -> None:
    """Simpan hasil generate_summary ke file JSON."""
    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2, default=str)
    print(f"[INFO] Summary saved: {path}")


__all__ = [
    "generate_summary", "check_grounding", "generate_summary_template",
    "save_summary_json", "SUMMARY_SYSTEM_PROMPT"
]
