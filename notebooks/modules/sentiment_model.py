"""
sentiment_model.py
==================
Sentiment analysis menggunakan model pretrained HuggingFace
untuk Bahasa Indonesia.

Model default: w11wo/indonesian-roberta-base-sentiment-classifier
Label output model: positif / netral / negatif
Mapping ke schema SuaraLens: positive / neutral / negative

Dapat diimport dari notebook lain:
    from modules.sentiment_model import classify_sentiment, load_sentiment_model
"""

import json
from typing import Optional

# ── Konfigurasi Model ─────────────────────────────────────────────────────────

MODEL_NAME = "w11wo/indonesian-roberta-base-sentiment-classifier"

# Mapping label model → schema SuaraLens
LABEL_MAP = {
    "positif":  "positive",
    "negatif":  "negative",
    "netral":   "neutral",
    "positive": "positive",
    "negative": "negative",
    "neutral":  "neutral",
    "LABEL_0":  "negative",   # fallback kalau model pakai LABEL_x
    "LABEL_1":  "neutral",
    "LABEL_2":  "positive",
}

# ── Model Singleton ───────────────────────────────────────────────────────────

_pipeline = None

def load_sentiment_model(model_name: str = MODEL_NAME):
    """
    Load HuggingFace text-classification pipeline (singleton).

    Parameters
    ----------
    model_name : str — nama model HuggingFace

    Returns
    -------
    transformers.Pipeline
    """
    global _pipeline
    if _pipeline is None:
        try:
            from transformers import pipeline as hf_pipeline
            print(f"[INFO] Loading sentiment model: {model_name} ...")
            _pipeline = hf_pipeline(
                task="text-classification",
                model=model_name,
                tokenizer=model_name,
                max_length=512,
                truncation=True,
                device=-1   # CPU; ganti ke 0 jika ada GPU
            )
            print(f"[INFO] Sentiment model loaded.")
        except Exception as e:
            print(f"[ERROR] Gagal load model: {e}")
            print("  Install: pip install transformers torch")
            raise
    return _pipeline


# ── Fungsi Utama ─────────────────────────────────────────────────────────────

def classify_sentiment(teks_aduan: str,
                       model_name: str = MODEL_NAME) -> dict:
    """
    Klasifikasikan sentimen satu teks aduan.

    Parameters
    ----------
    teks_aduan : str
    model_name : str — nama model HuggingFace

    Returns
    -------
    dict : {
        "sentiment": "positive" | "neutral" | "negative",
        "score":     float (0-1, kepercayaan model),
        "raw_label": str (label asli model sebelum mapping)
    }

    Notes
    -----
    Model dilatih pada corpus Indonesia formal. Teks informal
    (singkatan, ALL CAPS, emoji) mungkin menurunkan akurasi.
    Cek performa pada subset kanal WhatsApp/Medsos vs Email/Web Form
    untuk mendeteksi degradasi.
    """
    pipe = load_sentiment_model(model_name)
    result = pipe(teks_aduan)[0]

    raw_label = result["label"]
    mapped    = LABEL_MAP.get(raw_label.lower(), LABEL_MAP.get(raw_label, "neutral"))

    return {
        "sentiment": mapped,
        "score":     round(result["score"], 4),
        "raw_label": raw_label,
    }


def classify_sentiment_batch(texts: list[str],
                              model_name: str = MODEL_NAME,
                              batch_size: int = 32) -> list[dict]:
    """
    Klasifikasi sentimen batch — lebih efisien dari panggilan satu-satu.

    Parameters
    ----------
    texts      : list teks
    model_name : nama model
    batch_size : ukuran batch untuk inference

    Returns
    -------
    list[dict] — satu entry per teks (sama format dengan classify_sentiment)
    """
    pipe    = load_sentiment_model(model_name)
    results = []

    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        preds = pipe(batch, truncation=True, max_length=512)
        for pred in preds:
            raw_label = pred["label"]
            mapped    = LABEL_MAP.get(raw_label.lower(), LABEL_MAP.get(raw_label, "neutral"))
            results.append({
                "sentiment": mapped,
                "score":     round(pred["score"], 4),
                "raw_label": raw_label,
            })
        print(f"  Processed {min(i + batch_size, len(texts))}/{len(texts)}", end="\r")

    print()
    return results


if __name__ == "__main__":
    test_cases = [
        "Layanan administrasi sangat cepat dan ramah, terima kasih!",
        "Wifi kampus sering mati, sangat mengganggu kegiatan belajar.",
        "Jadwal ujian sudah diumumkan kemarin.",
    ]
    for text in test_cases:
        res = classify_sentiment(text)
        print(f"'{text[:50]}...' → {res['sentiment']} ({res['score']:.3f})")
