from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from pathlib import Path
import sys
import time


# ============================================================
# PATH PROJECT
# ============================================================

# Struktur:
#
# s-main/
# ├── notebooks/
# │   └── modules/
# └── ml-service/
#     └── main.py
#
# Jadi parent dari ml-service = s-main

PROJECT_ROOT = Path(__file__).resolve().parent.parent
NOTEBOOKS_PATH = PROJECT_ROOT / "notebooks"

if str(NOTEBOOKS_PATH) not in sys.path:
    sys.path.insert(0, str(NOTEBOOKS_PATH))


# ============================================================
# IMPORT MODULE DARI NOTEBOOK
# ============================================================

from modules.anonymization import anonymize_text, PRESIDIO_AVAILABLE
from modules.llm_engine import classify_llm
from modules.sentiment_model import classify_sentiment


# ============================================================
# FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title="SuaraLens ML Service",
    description="ML/NLP Service SuaraLens berdasarkan pipeline notebooks",
    version="1.0.0"
)


# ============================================================
# REQUEST MODEL
# ============================================================

class ComplaintRequest(BaseModel):
    complaint_id: int
    text: str


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():
    return {
        "status": True,
        "service": "SuaraLens ML Service",
        "version": "1.0.0",
        "models": {
            "pii": "Presidio + Custom Regex",
            "classification": "Qwen3:8B via Ollama",
            "sentiment": "w11wo/indonesian-roberta-base-sentiment-classifier"
        }
    }


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/health")
def health():
    return {
        "status": True,
        "message": "ML Service is running"
    }


# ============================================================
# ANALYZE COMPLAINT
# ============================================================

@app.post("/analyze")
def analyze(request: ComplaintRequest):

    total_start = time.time()

    # --------------------------------------------------------
    # VALIDASI
    # --------------------------------------------------------

    if not request.text or not request.text.strip():
        raise HTTPException(
            status_code=400,
            detail="Teks pengaduan tidak boleh kosong."
        )

    text = request.text.strip()

    # Fail closed: anonymize_text() has a notebook-friendly fallback that
    # returns the input unchanged when Presidio is unavailable. Do not allow
    # raw complaint text to continue into inference or backend storage.
    if not PRESIDIO_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="PII redaction tidak tersedia. Instal dependency Presidio sebelum menganalisis aduan."
        )


    # ========================================================
    # 1. PII ANONYMIZATION
    # ========================================================

    pii_start = time.time()

    try:

        redacted_text, entities = anonymize_text(text)

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"PII anonymization gagal: {str(e)}"
        )

    pii_time = time.time() - pii_start


    # ========================================================
    # 2. LLM CLASSIFICATION
    # ========================================================

    llm_start = time.time()

    try:

        llm_result = classify_llm(redacted_text)

    except Exception as e:

        raise HTTPException(
            status_code=503,
            detail=f"LLM classification gagal: {str(e)}"
        )

    llm_time = time.time() - llm_start


    # --------------------------------------------------------
    # VALIDASI HASIL LLM
    # --------------------------------------------------------

    if not llm_result:

        raise HTTPException(
            status_code=503,
            detail="LLM tidak mengembalikan hasil."
        )


    if llm_result.get("kategori") is None:

        return {
            "status": False,
            "message": "Klasifikasi LLM gagal.",
            "data": {
                "complaint_id": request.complaint_id,
                "redacted_text": redacted_text,
                "entities": entities,
                "error": llm_result.get(
                    "error",
                    "Kategori tidak berhasil ditentukan."
                )
            }
        }


    # ========================================================
    # 3. SENTIMENT ANALYSIS
    # ========================================================

    sentiment_start = time.time()

    try:

        sentiment_result = classify_sentiment(
            redacted_text
        )

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Sentiment analysis gagal: {str(e)}"
        )

    sentiment_time = time.time() - sentiment_start


    # ========================================================
    # 4. CATEGORY CONFIDENCE
    # ========================================================

    category_confidence = llm_result.get(
        "confidence"
    )

    if category_confidence is not None:

        category_confidence = float(
            category_confidence
        )


    # ========================================================
    # 5. URGENCY
    # ========================================================

    urgency_label = llm_result.get(
        "urgency_label"
    )

    if urgency_label:

        urgency_label = urgency_label.lower()


    urgency_score = llm_result.get(
        "urgency_score"
    )

    if urgency_score is not None:

        urgency_score = float(
            urgency_score
        )


    # ========================================================
    # 6. HUMAN-IN-THE-LOOP
    # ========================================================

    requires_review = False

    # Review jika confidence klasifikasi rendah
    if category_confidence is not None and category_confidence < 0.70:
        requires_review = True

    # Review jika urgensi tinggi atau kritis
    if urgency_label in ["high", "critical"]:
        requires_review = True

    # ========================================================
    # 7. TOTAL INFERENCE TIME
    # ========================================================

    total_time = time.time() - total_start


    # ========================================================
    # 8. RESPONSE
    # ========================================================

    return {

        "status": True,

        "message": "Analisis berhasil.",

        "data": {

            # ------------------------------------------------
            # IDENTITAS
            # ------------------------------------------------

            "complaint_id": request.complaint_id,


            # ------------------------------------------------
            # PII
            # ------------------------------------------------

            "redacted_text": redacted_text,

            "entities": entities,


            # ------------------------------------------------
            # CATEGORY
            # ------------------------------------------------

            # Notebook menggunakan "kategori"
            # Backend menggunakan "category"

            "category": llm_result.get(
                "kategori"
            ),

            "category_confidence": category_confidence,


            # ------------------------------------------------
            # URGENCY
            # ------------------------------------------------

            "urgency_label": urgency_label,

            "urgency_score": urgency_score,

            "urgency_reason": llm_result.get(
                "urgency_reason"
            ),


            # ------------------------------------------------
            # SENTIMENT
            # ------------------------------------------------

            "sentiment": sentiment_result.get(
                "sentiment"
            ),

            "sentiment_score": sentiment_result.get(
                "score"
            ),

            "sentiment_raw_label": sentiment_result.get(
                "raw_label"
            ),


            # ------------------------------------------------
            # HUMAN REVIEW
            # ------------------------------------------------

            "requires_review": requires_review,


            # ------------------------------------------------
            # MODEL INFORMATION
            # ------------------------------------------------

            "model_version": {

                "classification": llm_result.get(
                    "model_used"
                ),

                "sentiment":
                    "w11wo/indonesian-roberta-base-sentiment-classifier"

            },


            # ------------------------------------------------
            # PERFORMANCE
            # ------------------------------------------------

            "pii_inference_time_ms": round(
                pii_time * 1000
            ),

            "llm_inference_time_ms": round(
                llm_time * 1000
            ),

            "sentiment_inference_time_ms": round(
                sentiment_time * 1000
            ),

            "total_inference_time_ms": round(
                total_time * 1000
            )

        }
    }
