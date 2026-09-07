"""
llm_engine.py
=============
Klasifikasi kategori & urgency scoring menggunakan LLM via Ollama.
Model default: qwen3:8b (Qwen3 8B).

Dapat diimport dari notebook lain:
    from modules.llm_engine import classify_llm, VALID_CATEGORIES

Prasyarat:
    - Ollama terinstall & server berjalan: ollama serve
    - Model tersedia: ollama pull qwen3:8b
"""

import json
import time
import requests
from typing import Optional

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

OLLAMA_BASE_URL = "http://localhost:11434"
DEFAULT_MODEL   = "qwen3:8b"
FALLBACK_MODEL  = "qwen2.5:7b"

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

# ── Ollama Helper ─────────────────────────────────────────────────────────────

def check_ollama_status() -> dict:
    """
    Cek apakah Ollama server berjalan dan model tersedia.

    Returns
    -------
    dict dengan keys: running (bool), available_models (list), recommended_model (str)
    """
    try:
        resp = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=5)
        resp.raise_for_status()
        models_data = resp.json()
        available   = [m["name"] for m in models_data.get("models", [])]

        # Pilih model terbaik yang tersedia
        recommended = None
        for candidate in [DEFAULT_MODEL, FALLBACK_MODEL]:
            if any(candidate in m for m in available):
                recommended = candidate
                break
        if recommended is None and available:
            recommended = available[0]

        return {
            "running":           True,
            "available_models":  available,
            "recommended_model": recommended,
        }
    except Exception as e:
        return {
            "running":           False,
            "available_models":  [],
            "recommended_model": None,
            "error":             str(e),
        }


def _call_ollama(prompt: str, model: str, temperature: float = 0.1) -> Optional[str]:
    """
    Panggil Ollama generate API dengan satu prompt.

    Parameters
    ----------
    prompt      : user prompt (system prompt sudah terpisah)
    model       : nama model Ollama
    temperature : rendah untuk output lebih deterministik

    Returns
    -------
    str atau None jika gagal
    """
    payload = {
        "model":  model,
        "prompt": prompt,
        "system": SYSTEM_PROMPT,
        "stream": False,
        "options": {
            "temperature": temperature,
            "num_predict": 256,    # batasi output supaya tidak ngelantur
        }
    }
    try:
        resp = requests.post(
            f"{OLLAMA_BASE_URL}/api/generate",
            json=payload,
            timeout=60
        )
        resp.raise_for_status()
        return resp.json().get("response", "").strip()
    except Exception as e:
        print(f"[ERROR] Ollama call failed: {e}")
        return None


def _parse_and_validate(raw: str) -> Optional[dict]:
    """
    Parse JSON dari response LLM dan validasi schema + nilai.

    Returns
    -------
    dict atau None jika parsing/validasi gagal
    """
    if not raw:
        return None

    # Coba ekstrak JSON dari response (kadang ada teks sebelum/sesudah)
    json_match = None
    for start in [raw.find('{'), 0]:
        try:
            end   = raw.rfind('}') + 1
            chunk = raw[start:end]
            json_match = json.loads(chunk)
            break
        except json.JSONDecodeError:
            continue

    if json_match is None:
        return None

    # Validasi field wajib
    required = ["kategori", "urgency_label", "urgency_score", "urgency_reason", "confidence"]
    if not all(k in json_match for k in required):
        return None

    # Validasi nilai
    if json_match["kategori"] not in VALID_CATEGORIES:
        # Coba fuzzy match
        for cat in VALID_CATEGORIES:
            if cat.lower() in str(json_match["kategori"]).lower():
                json_match["kategori"] = cat
                break
        else:
            json_match["kategori"] = "Lainnya"   # fallback

    if json_match["urgency_label"] not in VALID_URGENCY:
        json_match["urgency_label"] = "Medium"   # fallback

    # Clamp float values
    json_match["urgency_score"] = max(0.0, min(1.0, float(json_match["urgency_score"])))
    json_match["confidence"]    = max(0.0, min(1.0, float(json_match["confidence"])))

    return json_match


# ── Fungsi Utama ─────────────────────────────────────────────────────────────

def classify_llm(teks_aduan: str,
                 model: Optional[str] = None,
                 max_retries: int = 2) -> Optional[dict]:
    """
    Klasifikasikan satu teks aduan menggunakan LLM via Ollama.

    Parameters
    ----------
    teks_aduan  : str — teks aduan dari stakeholder
    model       : str — nama model Ollama (default: qwen3:8b atau yang tersedia)
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
            print("[ERROR] Ollama server tidak berjalan. Jalankan: ollama serve")
            return {"error": "Ollama server tidak berjalan", "kategori": None}
        model = status["recommended_model"] or DEFAULT_MODEL

    prompt = f"Teks aduan:\n{teks_aduan}\n\nKlasifikasikan teks di atas."

    start_time = time.time()
    result     = None

    for attempt in range(max_retries):
        raw = _call_ollama(prompt, model)
        result = _parse_and_validate(raw)
        if result is not None:
            break
        print(f"[WARN] Parsing gagal (attempt {attempt+1}/{max_retries}), retry...")

    elapsed = time.time() - start_time

    if result is None:
        return {
            "kategori":        None,
            "urgency_label":   None,
            "urgency_score":   None,
            "urgency_reason":  None,
            "confidence":      None,
            "inference_time_s": round(elapsed, 3),
            "model_used":      model,
            "error":           "Gagal parse JSON setelah semua retry"
        }

    result["inference_time_s"] = round(elapsed, 3)
    result["model_used"]       = model
    result["error"]            = None
    return result


def classify_llm_batch(texts: list[str],
                       model: Optional[str] = None,
                       delay_s: float = 0.1) -> list[dict]:
    """
    Klasifikasi batch teks. Wrapper sederhana di atas classify_llm.

    Parameters
    ----------
    texts   : list teks aduan
    model   : nama model Ollama
    delay_s : jeda antar request (detik) untuk hindari overload

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
