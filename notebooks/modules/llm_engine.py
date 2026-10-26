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
_raw_key = os.getenv("OLLAMA_API_KEY", "").strip()
OLLAMA_API_KEY  = _raw_key if _raw_key and _raw_key != "your_ollama_api_key_here" else ""
DEFAULT_MODEL   = os.getenv("OLLAMA_MODEL", "qwen3.5:4b")
FALLBACK_MODEL  = "qwen3.5:4b"

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

# Alias kompatibilitas dengan notebook & modul terdahulu
VALID_CATEGORIES = VALID_UNITS
VALID_URGENCY = ["Low", "Medium", "High", "Critical"]

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

# ── System Prompt ─────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """Kamu adalah sistem cerdas routing aduan (Smart Triage) dan evaluasi urgensi objektif untuk institusi Politeknik Elektronika Negeri Surabaya (PENS).

Tugasmu menganalisis teks aduan stakeholder dan menghasilkan:
1. Rekomendasi Unit Kerja Operasional penanggung jawab (target_unit) dari 14 UNIT RESMI PENS
2. Skor keyakinan unit (unit_confidence) dan alasan singkat penugasan (unit_reason)
3. Evaluasi urgensi objektif (urgency_label & urgency_score) beserta alasan (urgency_reason)

14 UNIT KERJA RESMI PENS (Gunakan PERSIS salah satu dari nama berikut):
- Akademik: administrasi perkuliahan, nilai, KRS, ujian, jadwal kuliah, kurikulum, dosen, kelulusan/yudisium
- Kemahasiswaan: beasiswa, kegiatan organisasi mahasiswa (BEM/HIMA/UKM), perlombaan, prestasi, kesejahteraan mahasiswa
- Keuangan: pembayaran UKT, biaya kuliah, tagihan, restitusi, sistem pembayaran keuangan
- SDM/Kepegawaian: staf, administrasi kepegawaian dosen & tendik, presensi, sertifikasi, layanan pegawai
- Sarana Prasarana dan Layanan Umum: fasilitas fisik kampus, gedung, ruang kelas, toilet, AC, listrik, air, kebersihan, meja/kursi
- TIK/Sistem Informasi: jaringan internet/WiFi kampus, website pens.ac.id, sistem informasi (SIAKAD/SIA), akun email, server, komputer
- Perpustakaan: sirkulasi buku, akses e-journal/katalog, jam operasional perpustakaan, ruang baca
- Ukarni dan Hubungan Alumni: pusat karir, informasi lowongan kerja, bursa kerja, tracer study alumni, ikatan alumni
- Laboratorium/Jurusan: alat praktikum, komputer lab jurusan, modul praktikum, teknisi lab, administrasi departemen/prodi
- Kerjasama dan Hubungan Eksternal: program magang/PKL industri, MoU kemitraan, pertukaran mahasiswa, kunjungan industri
- Informasi Publik/PPID: layanan permohonan data publik, keterbukaan informasi publik, layanan humas kampus
- Keamanan dan Ketertiban: keamanan pos satpam, ketertiban lingkungan kampus, parkir kendaraan, helm/barang hilang
- Pimpinan/Manajemen: kebijakan strategis direksi, tata kelola kelembagaan, audit mutu, dewan senat institusi
- Lainnya/Lintas Unit: masalah yang membutuhkan koordinasi gabungan lebih dari satu unit atau tidak tercakup di atas

4 LEVEL URGENCY:
- Low (0.00 - 0.39): keluhan umum/saran, tidak mendesak, tidak berdampak pada perkuliahan/layanan vital
- Medium (0.40 - 0.69): perlu tindak lanjut 2-3 hari, dampak terbatas pada kelompok kecil
- High (0.70 - 0.89): perlu respons 1-2 hari, berdampak luas atau mengganggu perkuliahan/ujian/kegiatan penting
- Critical (0.90 - 1.00): perlu respons SEGERA (<24 jam), membahayakan keselamatan, kegagalan sistem vital, atau hak krusial terancam

BATASAN PENTING:
- DILARANG menentukan sanksi personal atau tindakan disipliner
- Tetap objektif, netral, dan berbasis bukti pada teks
- Output HARUS berupa JSON valid persis seperti ini:
{
  "target_unit": "<salah satu dari 14 unit di atas>",
  "unit_confidence": <float 0.0-1.0>,
  "unit_reason": "<alasan singkat mengapa unit ini yang berwenang>",
  "urgency_label": "<Low/Medium/High/Critical>",
  "urgency_score": <float 0.0-1.0>,
  "urgency_reason": "<alasan singkat penilaian tingkat urgensi>"
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
    # 6. NORMALISASI FIELD KEYS (TARGET_UNIT & URGENCY)
    # ========================================================

    raw_unit = (
        result.get("target_unit")
        or result.get("kategori")
        or result.get("unit")
        or "Lainnya/Lintas Unit"
    )

    raw_conf = (
        result.get("unit_confidence")
        if result.get("unit_confidence") is not None
        else result.get("confidence", 0.85)
    )

    raw_unit_reason = (
        result.get("unit_reason")
        or result.get("reason")
        or f"Aduan relevan dengan lingkup tugas {raw_unit}."
    )

    # ========================================================
    # 7. NORMALISASI TARGET UNIT (14 UNIT RESMI PENS)
    # ========================================================

    target_unit_str = str(raw_unit).strip()
    matched_unit = None

    # 1. Exact match
    if target_unit_str in VALID_UNITS:
        matched_unit = target_unit_str
    else:
        # 2. Check legacy dictionary
        lower_unit = target_unit_str.lower()
        if lower_unit in LEGACY_CATEGORY_TO_UNIT:
            matched_unit = LEGACY_CATEGORY_TO_UNIT[lower_unit]
        else:
            # 3. Fuzzy search in legacy dictionary
            for leg_k, leg_v in LEGACY_CATEGORY_TO_UNIT.items():
                if leg_k in lower_unit or lower_unit in leg_k:
                    matched_unit = leg_v
                    break

            # 4. Fuzzy search in VALID_UNITS
            if not matched_unit:
                for u in VALID_UNITS:
                    if u.lower() in lower_unit or lower_unit in u.lower():
                        matched_unit = u
                        break

    if not matched_unit:
        print(f"[WARN] Unit '{target_unit_str}' tidak dikenali. Menggunakan Lainnya/Lintas Unit.")
        matched_unit = "Lainnya/Lintas Unit"

    result["target_unit"] = matched_unit
    result["kategori"] = matched_unit  # Backward compatibility

    # ========================================================
    # 8. NORMALISASI URGENCY LABEL
    # ========================================================

    urgency_raw = str(result.get("urgency_label", "Medium")).strip().capitalize()
    if urgency_raw not in VALID_URGENCY:
        urgency_lower = urgency_raw.lower()
        urgency_mapping = {
            "low": "Low",
            "rendah": "Low",
            "medium": "Medium",
            "sedang": "Medium",
            "moderate": "Medium",
            "high": "High",
            "tinggi": "High",
            "critical": "Critical",
            "kritis": "Critical",
        }
        urgency_raw = urgency_mapping.get(urgency_lower, "Medium")

    result["urgency_label"] = urgency_raw

    # ========================================================
    # 9. VALIDASI URGENCY SCORE
    # ========================================================

    try:
        urgency_score = float(result.get("urgency_score", 0.5))
        urgency_score = max(0.0, min(1.0, urgency_score))
    except (ValueError, TypeError):
        print("[WARN] urgency_score tidak valid. Menggunakan 0.5.")
        urgency_score = 0.5

    result["urgency_score"] = urgency_score

    # ========================================================
    # 10. VALIDASI CONFIDENCE
    # ========================================================

    try:
        confidence = float(raw_conf)
        confidence = max(0.0, min(1.0, confidence))
    except (ValueError, TypeError):
        print("[WARN] confidence tidak valid. Menggunakan 0.85.")
        confidence = 0.85

    result["unit_confidence"] = confidence
    result["confidence"] = confidence  # Backward compatibility

    # ========================================================
    # 11. NORMALISASI REASONS
    # ========================================================

    result["unit_reason"] = str(raw_unit_reason).strip()
    result["urgency_reason"] = str(
        result.get("urgency_reason")
        or f"Tingkat urgensi {urgency_raw} berdasarkan analisis dampak terhadap stakeholder."
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
            "target_unit":      None,
            "unit_confidence":  None,
            "unit_reason":      None,
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
