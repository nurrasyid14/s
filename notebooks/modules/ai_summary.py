"""
ai_summary.py
=============
Generate ringkasan naratif otomatis dari angka agregat analytics
menggunakan LLM via Ollama (grounded — input hanya angka, bukan teks mentah).

Dapat diimport dari notebook lain:
    from modules.ai_summary import generate_summary

Prasyarat: Ollama berjalan dengan model qwen3:8b atau qwen2.5:7b.
"""

import json
import requests
import time
from datetime import datetime
from pathlib import Path
from typing import Optional

from modules.llm_engine import OLLAMA_BASE_URL, DEFAULT_MODEL, FALLBACK_MODEL, check_ollama_status

# ── System Prompt ─────────────────────────────────────────────────────────────

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

# ── Fungsi Utama ─────────────────────────────────────────────────────────────

def generate_summary(aggregated_data: dict,
                     model: Optional[str] = None,
                     context: str = "laporan bulanan") -> dict:
    """
    Generate ringkasan naratif dari data agregat analytics.

    Parameters
    ----------
    aggregated_data : dict — output dari build_sla_analytics_payload()
                             dan/atau build_trend_analytics_payload()
    model           : str — nama model Ollama
    context         : str — konteks laporan untuk judul (mis. "laporan bulanan")

    Returns
    -------
    dict : {
        "summary":           str (ringkasan naratif),
        "generated_at":      str (ISO timestamp),
        "model_used":        str,
        "input_data_keys":   list (kunci data yang digunakan),
        "inference_time_s":  float,
        "error":             str | None
    }
    """
    # Auto-detect model
    if model is None:
        status = check_ollama_status()
        if not status["running"]:
            return {
                "summary":          None,
                "generated_at":     datetime.now().isoformat(),
                "model_used":       None,
                "input_data_keys":  list(aggregated_data.keys()),
                "inference_time_s": 0,
                "error":            "Ollama server tidak berjalan"
            }
        model = status["recommended_model"] or DEFAULT_MODEL

    # Buat prompt — berikan data sebagai JSON terstruktur
    data_json = json.dumps(aggregated_data, ensure_ascii=False, indent=2, default=str)
    prompt = f"""Konteks: {context}

Data analitik (HANYA gunakan angka-angka di bawah ini):
{data_json}

Berdasarkan data di atas, tulis ringkasan naratif (3-5 kalimat) untuk pimpinan PENS."""

    payload = {
        "model":  model,
        "prompt": prompt,
        "system": SUMMARY_SYSTEM_PROMPT,
        "stream": False,
        "options": {
            "temperature": 0.2,   # sedikit lebih kreatif dari klasifikasi tapi tetap rendah
            "num_predict": 512,
        }
    }

    start_time = time.time()
    try:
        resp = requests.post(
            f"{OLLAMA_BASE_URL}/api/generate",
            json=payload,
            timeout=90
        )
        resp.raise_for_status()
        summary_text = resp.json().get("response", "").strip()
        elapsed      = time.time() - start_time

        return {
            "summary":           summary_text,
            "generated_at":      datetime.now().isoformat(),
            "model_used":        model,
            "input_data_keys":   list(aggregated_data.keys()),
            "inference_time_s":  round(elapsed, 3),
            "error":             None,
        }
    except Exception as e:
        elapsed = time.time() - start_time
        return {
            "summary":           None,
            "generated_at":      datetime.now().isoformat(),
            "model_used":        model,
            "input_data_keys":   list(aggregated_data.keys()),
            "inference_time_s":  round(elapsed, 3),
            "error":             str(e),
        }


def check_grounding(summary: str, aggregated_data: dict) -> dict:
    """
    Heuristic grounding check sederhana: verifikasi apakah angka-angka kunci
    yang ada di summary dapat ditelusuri ke input data.

    Ini adalah MANUAL CHECK HELPER — output-nya panduan untuk reviewer manusia,
    bukan keputusan otomatis.

    Parameters
    ----------
    summary         : ringkasan hasil generate_summary
    aggregated_data : data input yang sama

    Returns
    -------
    dict : {
        "numbers_in_summary": list[str],  ← angka yang muncul di ringkasan
        "grounding_note": str
    }
    """
    import re
    numbers_in_summary = re.findall(r'\b\d+(?:[.,]\d+)?(?:\s*%)?', summary)
    data_str = json.dumps(aggregated_data, ensure_ascii=False, default=str)

    ungrounded = []
    for num in numbers_in_summary:
        # Cari angka (hapus % dan koma) di data
        clean_num = num.replace("%", "").replace(",", ".").strip()
        if clean_num not in data_str:
            ungrounded.append(num)

    return {
        "numbers_in_summary": numbers_in_summary,
        "potentially_ungrounded": ungrounded,
        "grounding_note": (
            "Angka yang tidak ditemukan langsung di data input mungkin hasil "
            "perhitungan model (mis. pembulatan, persentase turunan). "
            "Perlu verifikasi manual oleh reviewer."
            if ungrounded else
            "Semua angka dalam ringkasan dapat ditelusuri ke data input. ✓"
        )
    }


def save_summary_json(result: dict, output_path: str) -> None:
    """Simpan hasil generate_summary ke file JSON."""
    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2, default=str)
    print(f"[INFO] Summary saved: {path}")


# ── Template Fallback (jika LLM grounding gagal) ─────────────────────────────

def generate_summary_template(aggregated_data: dict) -> dict:
    """
    Fallback: generate ringkasan berbasis template terstruktur.
    Lebih aman dari full-generative karena angka di-inject langsung.
    Digunakan jika grounding check LLM menunjukkan banyak halusinasi.

    Parameters
    ----------
    aggregated_data : output dari build_sla_analytics_payload()

    Returns
    -------
    dict : {"summary": str, "generated_at": str, "method": "template"}
    """
    total    = aggregated_data.get("total_records", "N/A")
    breach   = aggregated_data.get("overall_breach_pct", "N/A")
    by_cat   = aggregated_data.get("by_category", [])
    top_cat  = by_cat[0]["kategori"] if by_cat else "N/A"
    top_pct  = by_cat[0]["breach_pct"] if by_cat else "N/A"

    avg_res  = aggregated_data.get("avg_resolution_days", [])
    slow_cat = avg_res[0]["kategori"] if avg_res else "N/A"
    slow_day = avg_res[0]["avg_days"]  if avg_res else "N/A"

    summary = (
        f"Dalam periode pelaporan ini, sistem SuaraLens mencatat total {total} masukan "
        f"dari stakeholder PENS. "
        f"Tingkat pelanggaran SLA keseluruhan tercatat sebesar {breach}%. "
        f"Kategori dengan breach rate tertinggi adalah {top_cat} ({top_pct}%). "
        f"Rata-rata waktu penyelesaian terlama terdapat pada kategori {slow_cat} "
        f"dengan {slow_day} hari."
    )

    return {
        "summary":      summary,
        "generated_at": datetime.now().isoformat(),
        "method":       "template",
        "error":        None,
    }


if __name__ == "__main__":
    # Demo dengan data dummy
    sample_data = {
        "total_records":      5150,
        "overall_breach_pct": 32.31,
        "by_category": [
            {"kategori": "Akademik",  "breach_pct": 38.5},
            {"kategori": "Keuangan",  "breach_pct": 29.1},
        ],
        "avg_resolution_days": [
            {"kategori": "Fasilitas", "avg_days": 12.3},
        ]
    }

    result = generate_summary(sample_data, context="laporan Agustus 2026")
    print("Summary:", result.get("summary"))
    print("Grounding:", json.dumps(
        check_grounding(result.get("summary", ""), sample_data),
        ensure_ascii=False, indent=2
    ))
