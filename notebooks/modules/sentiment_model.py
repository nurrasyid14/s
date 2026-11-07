"""
sentiment_model.py
==================
Sentiment analysis menggunakan model pretrained HuggingFace untuk Bahasa Indonesia.
Kompatibel penuh dengan notebook 04 & 05 serta backend service SuaraLens.
"""

import sys
from pathlib import Path
from typing import Optional, List, Dict, Any

_PROJECT_ROOT = Path(__file__).resolve().parents[2]
_ML_SERVICE_DIR = _PROJECT_ROOT / "ml-service"
if str(_ML_SERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(_ML_SERVICE_DIR))

from app.services.sentiment import classify_sentiment, LABEL_MAP
from app.core.model_loader import load_sentiment_model, get_sentiment_pipeline

MODEL_NAME = "w11wo/indonesian-roberta-base-sentiment-classifier"


def classify_sentiment_batch(texts: List[str],
                              model_name: str = MODEL_NAME,
                              batch_size: int = 32) -> List[Dict[str, Any]]:
    """
    Klasifikasi sentimen batch — efisien untuk evaluasi dataset besar.
    """
    pipe = get_sentiment_pipeline()
    if pipe is None:
        pipe = load_sentiment_model(model_name)

    results = []
    if pipe is not None:
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            try:
                preds = pipe(batch, truncation=True, max_length=512)
                for pred in preds:
                    raw_label = pred["label"]
                    mapped = LABEL_MAP.get(raw_label.lower(), LABEL_MAP.get(raw_label, "neutral"))
                    results.append({
                        "sentiment": mapped,
                        "score": round(float(pred["score"]), 4),
                        "raw_label": raw_label,
                    })
            except Exception as e:
                # Fallback per text
                for t in batch:
                    res = classify_sentiment(t)
                    results.append({
                        "sentiment": res["sentiment"],
                        "score": res["score"],
                        "raw_label": res["sentiment"],
                    })
    else:
        # Fallback heuristic
        for t in texts:
            res = classify_sentiment(t)
            results.append({
                "sentiment": res["sentiment"],
                "score": res["score"],
                "raw_label": res["sentiment"],
            })

    return results


__all__ = [
    "classify_sentiment", "classify_sentiment_batch",
    "load_sentiment_model", "get_sentiment_pipeline",
    "LABEL_MAP", "MODEL_NAME"
]
