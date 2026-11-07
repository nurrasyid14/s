import logging
from typing import Dict, Any
from ..core.model_loader import get_sentiment_pipeline, load_sentiment_model

logger = logging.getLogger("suaralens.sentiment")

LABEL_MAP = {
    "positif": "positive",
    "negatif": "negative",
    "netral": "neutral",
    "positive": "positive",
    "negative": "negative",
    "neutral": "neutral",
    "LABEL_0": "negative",
    "LABEL_1": "neutral",
    "LABEL_2": "positive",
}


def classify_sentiment(text: str) -> Dict[str, Any]:
    """
    Analisis sentimen teks berbahasa Indonesia menggunakan IndoRoBERTa transformer.

    Returns:
    --------
    dict: {
        "sentiment": "positive" | "neutral" | "negative",
        "score": float (0.0 - 1.0),
        "scores": {"negative": float, "neutral": float, "positive": float},
        "is_fallback": bool
    }
    """
    if not text or not text.strip():
        return {
            "sentiment": "neutral",
            "score": 0.5,
            "scores": {"negative": 0.25, "neutral": 0.50, "positive": 0.25},
            "is_fallback": True,
        }

    pipe = get_sentiment_pipeline()
    if pipe is None:
        pipe = load_sentiment_model()

    if pipe is not None:
        try:
            # Jalankan inferensi dengan top_k=None untuk mendapatkan distribusi probabilitas
            predictions = pipe(text, truncation=True, max_length=512, top_k=None)
            
            # Ekstrak distribusi skor per label
            scores = {"negative": 0.0, "neutral": 0.0, "positive": 0.0}
            for item in predictions:
                raw_label = item.get("label", "")
                mapped_label = LABEL_MAP.get(raw_label, "neutral")
                score = round(float(item.get("score", 0.0)), 4)
                scores[mapped_label] = score

            # Tentukan label dominan
            top_label = max(scores, key=scores.get)
            top_score = scores[top_label]

            return {
                "sentiment": top_label,
                "score": top_score,
                "scores": scores,
                "is_fallback": False,
            }
        except Exception as e:
            logger.warning("Error saat inferensi sentimen transformer: %s", e)

    # Heuristic fallback jika model transformer belum ter-load
    lower = text.lower()
    neg_words = ["rusak", "bocor", "kecewa", "lambat", "jelek", "mati", "error", "buruk", "tidak bisa", "ganggu"]
    pos_words = ["bagus", "terima kasih", "cepat", "puas", "hebat", "mantap", "ramah", "lancar"]

    neg_count = sum(1 for w in neg_words if w in lower)
    pos_count = sum(1 for w in pos_words if w in lower)

    if neg_count > pos_count:
        sent = "negative"
    elif pos_count > neg_count:
        sent = "positive"
    else:
        sent = "neutral"

    return {
        "sentiment": sent,
        "score": 0.65,
        "scores": {
            "negative": 0.70 if sent == "negative" else 0.15,
            "neutral": 0.70 if sent == "neutral" else 0.20,
            "positive": 0.70 if sent == "positive" else 0.10,
        },
        "is_fallback": True,
    }

