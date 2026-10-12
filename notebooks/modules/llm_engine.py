"""
llm_engine.py
=============
Klasifikasi kategori & urgency scoring menggunakan LLM via Ollama.

Mendukung dua mode:
  1. Ollama Cloud API  : https://ollama.com/v1  (butuh OLLAMA_API_KEY)
  2. Ollama Lokal      : http://localhost:11434  (tanpa API key)

Konfigurasi via .env:
  OLLAMA_API_KEY=<your_key>          # Wajib untuk mode Cloud
  OLLAMA_BASE_URL=https://ollama.com # Opsional, default cloud jika ada key
  OLLAMA_MODEL=qwen3:8b              # Opsional

Dapat diimport dari notebook lain:
    from modules.llm_engine import classify_llm, VALID_CATEGORIES

Prasyarat:
  pip install openai python-dotenv
"""

import json
import os
import time
import warnings
from pathlib import Path
from typing import Optional

# ── Load .env ──────────────────────────────────────────────────────────────────
try:
    from dotenv import load_dotenv
    # Cari .env dari root project (dua level di atas notebooks/modules/)
    _env_path = Path(__file__).resolve().parents[2] / ".env"
    load_dotenv(dotenv_path=_env_path, override=False)
except ImportError:
    warnings.warn("python-dotenv tidak ditemukan. Pastikan OLLAMA_API_KEY di-set manual.", stacklevel=2)

# ── Konfigurasi ────────────────────────────────────────────────────────────────

# Deteksi otomatis: cloud vs lokal
OLLAMA_API_KEY  = os.getenv("OLLAMA_API_KEY", "")
DEFAULT_MODEL   = os.getenv("OLLAMA_MODEL", "qwen3:8b")
FALLBACK_MODEL  = "qwen2.5:7b"

# Base URL & mode
if OLLAMA_API_KEY:
    # Mode Cloud: Ollama.com hosted API (OpenAI-compatible)
    OLLAMA_BASE_URL  = os.getenv("OLLAMA_BASE_URL", "https://ollama.com")
    OLLAMA_API_MODE  = "cloud"
else:
    # Mode Lokal: Ollama self-hosted
    OLLAMA_BASE_URL  = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    OLLAMA_API_MODE  = "local"

# OpenAI-compatible endpoint (berlaku untuk keduanya)
OPENAI_BASE_URL = f"{OLLAMA_BASE_URL.rstrip('/')}/v1"

# ── Konstanta ─────────────────────────────────────────────────────────────────

VALID_CATEGORIES = [
    "Akademik",
    "Keuangan",
    "Fasilitas",
    "Sarana IT",
    "Kemahasiswaan",
    "Beasiswa",
    "Perpustakaan",
    "Parkir & Keamanan",
    "Kebersihan & Lingkungan",
    "Kerjasama & Mitra",
    "Pelayanan Administrasi",
    "Lainnya",
]

VALID_URGENCY = ["Low", "Medium", "High", "Critical"]

# ── System Prompt ─────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """Kamu adalah sistem klasifikasi aduan untuk institusi pendidikan PENS (Politeknik Elektronika Negeri Surabaya).

Tugasmu adalah menganalisis teks aduan/masukan dari stakeholder dan menghasilkan:
1. Kategori yang tepat (HANYA dari 12 kategori yang tersedia)
2. Label urgency dan skor urgency
3. Alasan singkat urgency
4. Skor kepercayaan diri klasifikasi

12 KATEGORI VALID (gunakan PERSIS salah satu dari ini, tidak boleh membuat kategori baru):
- Akademik: masalah perkuliahan, nilai, kurikulum, dosen, jadwal
- Keuangan: UKT, biaya, pembayaran, beasiswa administrasi keuangan
- Fasilitas: gedung, ruang kelas, laboratorium, peralatan fisik
- Sarana IT: wifi, komputer, sistem informasi, akun, jaringan
- Kemahasiswaan: organisasi, kegiatan mahasiswa, ekstrakurikuler
- Beasiswa: beasiswa internal/eksternal, prosedur, persyaratan
- Perpustakaan: koleksi buku, akses jurnal, jam operasional perpustakaan
- Parkir & Keamanan: parkir kendaraan, keamanan kampus, kehilangan
- Kebersihan & Lingkungan: kebersihan toilet, sampah, taman, lingkungan
- Kerjasama & Mitra: PKL, magang, kerjasama industri, alumni
- Pelayanan Administrasi: surat, legalisir, KTM, administrasi umum
- Lainnya: tidak masuk kategori di atas

4 LEVEL URGENCY:
- Low: keluhan umum, tidak mendesak, tidak berdampak luas
- Medium: perlu tindak lanjut dalam 1-2 minggu, dampak terbatas
- High: perlu respons dalam 1-3 hari, berdampak pada banyak pihak atau mengganggu aktivitas penting
- Critical: perlu respons SEGERA (<24 jam), mengancam keselamatan, hak, atau aktivitas inti institusi

BATASAN PENTING:
- Tugasmu HANYA klasifikasi dan scoring
- DILARANG menentukan sanksi, tindakan disipliner, atau keputusan terhadap individu/pihak tertentu
- DILARANG memberikan rekomendasi kebijakan yang tidak diminta
- Tetap objektif dan netral

Output HARUS berupa JSON valid dengan format PERSIS seperti ini:
{
  "kategori": "<salah satu dari 12 kategori>",
  "urgency_label": "<Low/Medium/High/Critical>",
  "urgency_score": <float 0.0-1.0>,
  "urgency_reason": "<alasan singkat 1 kalimat>",
  "confidence": <float 0.0-1.0>
}

JANGAN tambahkan teks lain di luar JSON."""


# ── Client Singleton ──────────────────────────────────────────────────────────

_client = None

def _get_client():
    """
    Buat atau kembalikan OpenAI client singleton.
    Menggunakan openai library yang kompatibel dengan Ollama API.
    """
    global _client
    if _client is None:
        try:
            # pyrefly: ignore [missing-import]
            from openai import OpenAI
        except ImportError:
            raise ImportError(
                "openai package tidak ditemukan. Install: pip install openai"
            )

        api_key = OLLAMA_API_KEY if OLLAMA_API_KEY else "ollama"  # local dummy key
        _client = OpenAI(
            base_url=OPENAI_BASE_URL,
            api_key=api_key,
        )
        print(f"[INFO] LLM Client: mode={OLLAMA_API_MODE}, base_url={OPENAI_BASE_URL}")
    return _client


# ── Ollama Helper ─────────────────────────────────────────────────────────────

def check_ollama_status() -> dict:
    """
    Cek apakah Ollama (cloud atau lokal) dapat diakses dan model tersedia.

    Returns
    -------
    dict dengan keys: running (bool), available_models (list), recommended_model (str), mode (str)
    """
    try:
        client = _get_client()
        models_resp  = client.models.list()
        available    = [m.id for m in models_resp.data]

        # Pilih model terbaik yang tersedia
        recommended = None
        for candidate in [DEFAULT_MODEL, FALLBACK_MODEL]:
            if any(candidate in m for m in available):
                recommended = candidate
                break
        if recommended is None:
            recommended = available[0] if available else DEFAULT_MODEL

        return {
            "running":           True,
            "available_models":  available,
            "recommended_model": recommended,
            "mode":              OLLAMA_API_MODE,
            "base_url":          OPENAI_BASE_URL,
        }
    except Exception as e:
        return {
            "running":           False,
            "available_models":  [],
            "recommended_model": None,
            "mode":              OLLAMA_API_MODE,
            "base_url":          OPENAI_BASE_URL,
            "error":             str(e),
        }


def _call_ollama(
    prompt: str,
    model: str,
    temperature: float = 0.1
) -> Optional[str]:
    """
    Panggil Ollama via OpenAI-compatible Chat Completions API.
    """

    try:
        client = _get_client()

        response = client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "system",
                    "content": SYSTEM_PROMPT
                },
                {
                    "role": "user",
                    "content": prompt
                },
            ],
            temperature=temperature,
            max_tokens=512,
        )

        content = response.choices[0].message.content

        print("\n========== RAW QWEN RESPONSE ==========")
        print(repr(content))
        print("========================================\n")

        return content.strip()

    except Exception as e:
        print(f"[ERROR] LLM call failed: {e}")
        return None

def _parse_and_validate(raw: str) -> Optional[dict]:
    """
    Parse dan validasi response JSON dari Qwen.

    Parser dibuat lebih toleran terhadap:
    - <think>...</think>
    - ```json ... ```
    - teks tambahan sebelum/sesudah JSON
    - JSON yang memiliki whitespace/newline
    """

    if not raw:
        return None

    import re

    # ========================================================
    # 1. HAPUS THINKING TAG
    # ========================================================

    raw = re.sub(
        r"<think>.*?</think>",
        "",
        raw,
        flags=re.DOTALL | re.IGNORECASE
    ).strip()

    # ========================================================
    # 2. HAPUS MARKDOWN CODE BLOCK
    # ========================================================

    raw = re.sub(
        r"```json\s*",
        "",
        raw,
        flags=re.IGNORECASE
    )

    raw = re.sub(
        r"```\s*",
        "",
        raw
    ).strip()

    # ========================================================
    # 3. CARI BLOK JSON
    # ========================================================

    start = raw.find("{")
    end = raw.rfind("}")

    if start == -1 or end == -1 or end <= start:
        print("[ERROR] Tidak ditemukan blok JSON dalam response Qwen.")
        print("RAW RESPONSE:")
        print(raw)
        return None

    json_text = raw[start:end + 1].strip()

    # ========================================================
    # 4. PARSE JSON
    # ========================================================

    try:

        result = json.loads(json_text)

    except json.JSONDecodeError as e:

        print("[ERROR] JSON parsing gagal.")
        print(f"[ERROR] {e}")

        print("\n========== RAW QWEN RESPONSE ==========")
        print(raw)
        print("========================================\n")

        return None

    # ========================================================
    # 5. VALIDASI OBJECT
    # ========================================================

    if not isinstance(result, dict):
        print("[ERROR] Response JSON bukan object.")
        return None

    # ========================================================
    # 6. VALIDASI FIELD
    # ========================================================

    required = [
        "kategori",
        "urgency_label",
        "urgency_score",
        "urgency_reason",
        "confidence"
    ]

    missing = [
        field
        for field in required
        if field not in result
    ]

    if missing:

        print(
            f"[ERROR] Field JSON tidak lengkap: {missing}"
        )

        print("\n========== PARSED JSON ==========")
        print(
            json.dumps(
                result,
                ensure_ascii=False,
                indent=2
            )
        )
        print("=================================\n")

        return None

    # ========================================================
    # 7. NORMALISASI KATEGORI
    # ========================================================

    kategori = str(
        result["kategori"]
    ).strip()

    # Exact match

    if kategori in VALID_CATEGORIES:

        result["kategori"] = kategori

    else:

        # Fuzzy sederhana

        kategori_lower = kategori.lower()

        matched_category = None

        for cat in VALID_CATEGORIES:

            if cat.lower() in kategori_lower:

                matched_category = cat
                break

        if matched_category:

            result["kategori"] = matched_category

        else:

            print(
                f"[WARN] Kategori '{kategori}' "
                f"tidak dikenali. Menggunakan Lainnya."
            )

            result["kategori"] = "Lainnya"

    # ========================================================
    # 8. NORMALISASI URGENCY
    # ========================================================

    urgency = str(
        result["urgency_label"]
    ).strip().capitalize()

    if urgency not in VALID_URGENCY:

        urgency_lower = urgency.lower()

        urgency_mapping = {
            "low": "Low",
            "medium": "Medium",
            "moderate": "Medium",
            "high": "High",
            "critical": "Critical"
        }

        urgency = urgency_mapping.get(
            urgency_lower,
            "Medium"
        )

    result["urgency_label"] = urgency

    # ========================================================
    # 9. VALIDASI URGENCY SCORE
    # ========================================================

    try:

        urgency_score = float(
            result["urgency_score"]
        )

        urgency_score = max(
            0.0,
            min(1.0, urgency_score)
        )

    except (
        ValueError,
        TypeError
    ):

        print(
            "[WARN] urgency_score tidak valid. "
            "Menggunakan 0.5."
        )

        urgency_score = 0.5

    result["urgency_score"] = urgency_score

    # ========================================================
    # 10. VALIDASI CONFIDENCE
    # ========================================================

    try:

        confidence = float(
            result["confidence"]
        )

        confidence = max(
            0.0,
            min(1.0, confidence)
        )

    except (
        ValueError,
        TypeError
    ):

        print(
            "[WARN] confidence tidak valid. "
            "Menggunakan 0.5."
        )

        confidence = 0.5

    result["confidence"] = confidence

    # ========================================================
    # 11. NORMALISASI URGENCY REASON
    # ========================================================

    result["urgency_reason"] = str(
        result["urgency_reason"]
    ).strip()

    return result

def classify_llm(teks_aduan: str,
                 model: Optional[str] = None,
                 max_retries: int = 2) -> Optional[dict]:
    """
    Klasifikasikan satu teks aduan menggunakan LLM via Ollama (cloud atau lokal).

    Parameters
    ----------
    teks_aduan  : str — teks aduan dari stakeholder
    model       : str — nama model Ollama (default: dari env atau qwen3:8b)
    max_retries : int — jumlah retry jika parsing gagal

    Returns
    -------
    dict : {
        "kategori": str,
        "urgency_label": str,
        "urgency_score": float,
        "urgency_reason": str,
        "confidence": float,
        "inference_time_s": float,
        "model_used": str,
        "error": str | None
    }
    atau None jika semua retry gagal
    """
    # Auto-detect model jika tidak dispesifikasikan
    if model is None:
        status = check_ollama_status()
        if not status["running"]:
            print(f"[ERROR] Ollama tidak dapat diakses: {status.get('error')}")
            return {"error": "Ollama tidak dapat diakses", "kategori": None}
        model = status["recommended_model"] or DEFAULT_MODEL

    prompt = f"Teks aduan:\n{teks_aduan}\n\nKlasifikasikan teks di atas."

    start_time = time.time()
    result     = None

    for attempt in range(max_retries):
        raw    = _call_ollama(prompt, model)
        result = _parse_and_validate(raw)
        if result is not None:
            break
        if attempt < max_retries - 1:
            print(f"[WARN] Parsing gagal (attempt {attempt+1}/{max_retries}), retry...")

    elapsed = time.time() - start_time

    if result is None:
        return {
            "kategori":         None,
            "urgency_label":    None,
            "urgency_score":    None,
            "urgency_reason":   None,
            "confidence":       None,
            "inference_time_s": round(elapsed, 3),
            "model_used":       model,
            "error":            "Gagal parse JSON setelah semua retry"
        }

    result["inference_time_s"] = round(elapsed, 3)
    result["model_used"]       = model
    result["error"]            = None
    return result


def classify_llm_batch(texts: list,
                       model: Optional[str] = None,
                       delay_s: float = 0.1) -> list:
    """
    Klasifikasi batch teks. Wrapper sederhana di atas classify_llm.

    Parameters
    ----------
    texts   : list teks aduan
    model   : nama model Ollama
    delay_s : jeda antar request (detik) untuk hindari rate limiting

    Returns
    -------
    list[dict] — satu entry per teks
    """
    results = []
    for i, text in enumerate(texts):
        print(f"[{i+1}/{len(texts)}] Classifying...", end="\r")
        res = classify_llm(text, model=model)
        results.append(res or {"error": "None returned", "kategori": None})
        if delay_s > 0:
            time.sleep(delay_s)
    print()
    return results


if __name__ == "__main__":
    status = check_ollama_status()
    print("Ollama status:", json.dumps(status, indent=2, ensure_ascii=False))

    if status["running"]:
        sample = "Wifi di gedung D lantai 3 sudah 3 hari tidak bisa diakses, padahal besok ada ujian online."
        result = classify_llm(sample)
        print("\nHasil klasifikasi:")
        print(json.dumps(result, ensure_ascii=False, indent=2))
