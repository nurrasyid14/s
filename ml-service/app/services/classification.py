import json
import logging
from typing import Dict, Any, Optional
from ..core.config import settings

logger = logging.getLogger("suaralens.classification")

VALID_UNITS = [
    "Akademik",
    "Kemahasiswaan",
    "Keuangan",
    "SDM/Kepegawaian",
    "Sarana Prasarana dan Layanan Umum",
    "TIK/Sistem Informasi",
    "Perpustakaan",
    "Ukarni dan Hubungan Alumni",
    "Laboratorium/Jurusan",
    "Kerjasama dan Hubungan Eksternal",
    "Informasi Publik/PPID",
    "Keamanan dan Ketertiban",
    "Pimpinan/Manajemen",
    "Lainnya/Lintas Unit",
]

VALID_URGENCY = ["Low", "Medium", "High", "Critical"]

URGENCY_SCORE_MAP = {
    "low": 0.25,
    "medium": 0.50,
    "high": 0.75,
    "critical": 0.95,
}

SYSTEM_PROMPT = """Kamu adalah asisten triase pengaduan kampus Politeknik Elektronika Negeri Surabaya (PENS).
Tugasmu:
1. Menentukan unit kerja penanggung jawab yang tepat dari 14 unit resmi:
- Akademik
- Kemahasiswaan
- Keuangan
- SDM/Kepegawaian
- Sarana Prasarana dan Layanan Umum
- TIK/Sistem Informasi
- Perpustakaan
- Ukarni dan Hubungan Alumni
- Laboratorium/Jurusan
- Kerjasama dan Hubungan Eksternal
- Informasi Publik/PPID
- Keamanan dan Ketertiban
- Pimpinan/Manajemen
- Lainnya/Lintas Unit

2. Menilai tingkat urgensi penanganan:
- Low: Masukan/saran atau keluhan ringan dengan dampak terbatas.
- Medium: Kendala operasional wajar yang perlu ditangani sesuai jadwal standar.
- High: Mengganggu proses belajar-mengajar atau layanan penting banyak sivitas.
- Critical: Kondisi darurat, bahaya keselamatan, mati total, atau risiko insiden berat.

3. Menentukan submission_type: "complaint" | "feedback" | "suggestion".

Kembalikan HANYA format JSON valid tanpa tanda markdown (tanpa ```json):
{
  "category": "salah satu dari 14 unit di atas",
  "category_confidence": 0.95,
  "urgency_label": "Low | Medium | High | Critical",
  "urgency_score": 0.75,
  "urgency_reason": "alasan singkat dan padat",
  "submission_type": "complaint"
}"""


def _build_client():
    """Inisialisasi OpenAI client yang kompatibel dengan Ollama API."""
    try:
        import httpx
        from openai import OpenAI
        return OpenAI(
            base_url=settings.OPENAI_BASE_URL,
            api_key=settings.OLLAMA_API_KEY or "ollama",
            timeout=httpx.Timeout(90.0, connect=3.0),
        )
    except Exception as e:
        logger.warning("Gagal membuat OpenAI client: %s", e)
        return None


def classify_llm(text: str, submission_type: Optional[str] = "complaint", model: Optional[str] = None) -> Dict[str, Any]:
    """
    Klasifikasikan teks pengaduan menggunakan LLM via Ollama.
    """
    client = _build_client()
    target_model = model or settings.OLLAMA_MODEL

    if client is not None:
        try:
            extra_body = {}
            if settings.OLLAMA_REASONING_EFFORT and settings.OLLAMA_REASONING_EFFORT != "":
                extra_body["reasoning_effort"] = settings.OLLAMA_REASONING_EFFORT

            response = client.chat.completions.create(
                model=target_model,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": f"Teks pengaduan: {text}"},
                ],
                temperature=0.0,
                max_tokens=1024,
                response_format={"type": "json_object"},
                extra_body=extra_body if extra_body else None,
            )

            raw_content = response.choices[0].message.content.strip()
            # Pembersihan markdown jika ada
            if raw_content.startswith("```"):
                raw_content = raw_content.split("\n", 1)[-1].rsplit("```", 1)[0].strip()

            parsed = json.loads(raw_content)

            # Validasi kategori unit
            category = parsed.get("category", "").strip()
            matched_unit = None
            for unit in VALID_UNITS:
                if unit.lower() == category.lower():
                    matched_unit = unit
                    break

            if not matched_unit:
                matched_unit = "Lainnya/Lintas Unit"

            urgency_label = parsed.get("urgency_label", "Medium").capitalize()
            if urgency_label not in VALID_URGENCY:
                urgency_label = "Medium"

            urgency_score = float(parsed.get("urgency_score", URGENCY_SCORE_MAP.get(urgency_label.lower(), 0.5)))
            urgency_score = max(0.0, min(1.0, urgency_score))

            category_confidence = float(parsed.get("category_confidence", 0.90))
            category_confidence = max(0.0, min(1.0, category_confidence))

            sub_type = parsed.get("submission_type", submission_type or "complaint")
            requires_review = urgency_label in ["High", "Critical"] or category_confidence < 0.70

            return {
                "category": matched_unit,
                "category_confidence": category_confidence,
                "target_unit": matched_unit,
                "unit_confidence": category_confidence,
                "unit_reason": parsed.get("urgency_reason", "Rekomendasi triase otomatis oleh model."),
                "urgency_label": urgency_label,
                "urgency_score": urgency_score,
                "urgency_reason": parsed.get("urgency_reason", f"Urgensi {urgency_label} berdasarkan evaluasi model."),
                "submission_type": sub_type,
                "requires_review": requires_review,
                "is_fallback": False,
                "model_version": f"{settings.OLLAMA_MODEL} via Ollama",
            }
        except Exception as e:
            logger.warning("Ollama LLM classification error: %s. Menggunakan heuristic fallback.", e)

    # Heuristic fallback jika Ollama offline
    lower = text.lower()
    urgent_keywords = ["darurat", "bahaya", "bocor", "kebocoran", "konslet", "terbakar", "mati total", "kritis", "segera"]
    is_urgent = any(w in lower for w in urgent_keywords)

    assigned_unit = "Sarana Prasarana dan Layanan Umum"
    if any(w in lower for w in ["wifi", "internet", "jaringan", "server", "login", "akun", "email"]):
        assigned_unit = "TIK/Sistem Informasi"
    elif any(w in lower for w in ["nilai", "krs", "khs", "transkrip", "yudisium", "kuliah"]):
        assigned_unit = "Akademik"
    elif any(w in lower for w in ["ukt", "biaya", "bayar", "tagihan", "restitusi"]):
        assigned_unit = "Keuangan"
    elif any(w in lower for w in ["beasiswa", "ormawa", "lomba", "prestasi", "asrama"]):
        assigned_unit = "Kemahasiswaan"
    elif any(w in lower for w in ["alat lab", "osiloskop", "multimeter", "kalibrasi"]):
        assigned_unit = "Laboratorium/Jurusan"
    elif any(w in lower for w in ["parkir", "helm", "satpam", "keamanan"]):
        assigned_unit = "Keamanan dan Ketertiban"

    urgency_label = "High" if is_urgent else "Medium"
    urgency_score = 0.85 if is_urgent else 0.50

    return {
        "category": assigned_unit,
        "category_confidence": None,  # Null karena fallback heuristik
        "target_unit": assigned_unit,
        "unit_confidence": None,
        "unit_reason": "Rekomendasi triase heuristik berbasis kata kunci.",
        "urgency_label": urgency_label,
        "urgency_score": urgency_score,
        "urgency_reason": "Evaluasi urgensi darurat kata kunci." if is_urgent else "Penilaian urgensi standar.",
        "submission_type": submission_type or "complaint",
        "requires_review": is_urgent,
        "is_fallback": True,
        "model_version": "heuristic-fallback-v1.2",
    }
