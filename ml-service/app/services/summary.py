import re
import json
import time
import logging
from typing import Dict, Any, List, Optional
from ..core.config import settings

logger = logging.getLogger("suaralens.summary")


def check_grounding(summary: str, metrics: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validasi grounding: pastikan setiap angka dalam teks ringkasan berasal dari metrics.
    """
    numbers_in_text = re.findall(r"\b\d+(?:[.,]\d+)?%?\b", summary)

    # Flatten semua nilai numerik dari metrics
    allowed_values = set()

    def _collect(val):
        if isinstance(val, (int, float)):
            allowed_values.add(str(val))
            allowed_values.add(f"{val}%")
            if isinstance(val, float):
                allowed_values.add(f"{val:.1f}")
                allowed_values.add(f"{val:.1f}%")
                allowed_values.add(str(round(val)))
                allowed_values.add(f"{round(val)}%")
        elif isinstance(val, str):
            allowed_values.add(val)
        elif isinstance(val, dict):
            for v in val.values():
                _collect(v)
        elif isinstance(val, list):
            for item in val:
                _collect(item)

    _collect(metrics)

    unverified = []
    for num in numbers_in_text:
        clean = num.replace(",", ".").rstrip("%")
        found = False
        for allowed in allowed_values:
            allowed_clean = str(allowed).replace(",", ".").rstrip("%")
            if clean == allowed_clean:
                found = True
                break
        if not found:
            unverified.append(num)

    is_grounded = len(unverified) == 0
    note = (
        "Semua angka dalam ringkasan terverifikasi 100% dari data agregat. ✓"
        if is_grounded
        else f"Peringatan: angka {unverified} tidak terverifikasi langsung pada metrics sumber."
    )

    return {
        "is_grounded": is_grounded,
        "numbers_in_summary": numbers_in_text,
        "unverified_numbers": unverified,
        "potentially_ungrounded": unverified,
        "grounding_note": note,
    }


def generate_summary_template(metrics: Dict[str, Any]) -> str:
    """Template deterministik bebas halusinasi 100% grounded."""
    total = metrics.get("total_records", 0)
    sla_comp = metrics.get("overall_compliant_pct", 100)
    sla_breach = metrics.get("overall_breach_pct", 0)

    top_units = metrics.get("top_units", [])
    top_unit_str = f"{top_units[0]['unit']} ({top_units[0]['count']} tiket)" if top_units else "Sarana Prasarana"

    top_cats = metrics.get("top_categories", [])
    top_cat_str = f"{top_cats[0]['category']} ({top_cats[0]['count']} aduan)" if top_cats else "Fasilitas"

    sent = metrics.get("sentiment", {})
    neg_pct = sent.get("negative_pct", 0.0)
    high_urg = metrics.get("high_urgency_pending", 0)

    return (
        f"Dalam periode ini, sistem SuaraLens mencatat total {total} aduan masuk dengan tingkat kepatuhan SLA mencapai {sla_comp}%, "
        f"sedangkan {sla_breach}% berpotensi melampaui batas waktu penyelesaian. "
        f"Beban penanganan tertinggi berada pada unit {top_unit_str}, didominasi oleh kategori {top_cat_str}. "
        f"Sentimen negatif tercatat sebesar {neg_pct}%, dengan {high_urg} aduan berurgensi tinggi menunggu tindak lanjut prioritas."
    )


def generate_summary(metrics: Dict[str, Any], context: str = "Laporan Eksekutif SuaraLens PENS", model: Optional[str] = None) -> Dict[str, Any]:
    """
    Hasilkan ringkasan eksekutif berbasis LLM dengan verifikasi grounding.
    """
    target_model = model or settings.OLLAMA_MODEL
    prompt = f"""Kamu adalah analis data operasional di PENS.
Konteks: {context}
Tuliskan satu paragraf ringkasan eksekutif padat dan profesional (maksimal 4 kalimat) berdasarkan metrik berikut:
{json.dumps(metrics, indent=2, ensure_ascii=False)}

Aturan Penting:
1. Hanya gunakan angka yang benar-benar ada pada JSON metrik di atas. Dilarang menambah atau membulatkan angka sendiri.
2. Jelaskan beban unit tertinggi, kepatuhan SLA, sentimen, dan jumlah aduan berurgensi tinggi jika relevan.
3. Gunakan bahasa Indonesia formal dan ringkas."""

    start_time = time.time()
    err_msg = None
    try:
        import httpx
        from openai import OpenAI
        client = OpenAI(
            base_url=settings.OPENAI_BASE_URL,
            api_key=settings.OLLAMA_API_KEY or "ollama",
            timeout=httpx.Timeout(45.0, connect=3.0),
        )

        response = client.chat.completions.create(
            model=target_model,
            messages=[
                {"role": "system", "content": "Kamu adalah analis pelaporan data kampus yang akurat dan faktual."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.0,
            max_tokens=1024,
        )

        summary_text = response.choices[0].message.content.strip()
        grounding = check_grounding(summary_text, metrics)

        if grounding["is_grounded"]:
            return {
                "summary": summary_text,
                "grounding": grounding,
                "model_used": target_model,
                "inference_time_s": round(time.time() - start_time, 3),
                "error": None,
                "is_fallback": False,
            }
        else:
            err_msg = f"Ungrounded numbers detected: {grounding['potentially_ungrounded']}"
            logger.warning("Summary LLM ungrounded. Menggunakan factual template.")
    except Exception as e:
        err_msg = str(e)
        logger.warning("Ollama summary generation error: %s. Menggunakan factual template.", e)

    # Fallback template
    fallback_text = generate_summary_template(metrics)
    grounding = check_grounding(fallback_text, metrics)

    return {
        "summary": fallback_text,
        "grounding": grounding,
        "model_used": "factual-template-fallback",
        "inference_time_s": round(time.time() - start_time, 3),
        "error": err_msg,
        "is_fallback": True,
    }
