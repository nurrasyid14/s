import time
import logging
from fastapi import APIRouter, HTTPException, status
from ..schemas.complaint import ComplaintRequest, ComplaintResponse, AnalysisData
from ..schemas.summary import SummaryRequest, SummaryResponse, SummaryData
from ..services.anonymization import anonymize_text
from ..services.classification import classify_llm
from ..services.sentiment import classify_sentiment
from ..services.summary import generate_summary
from ..core.model_loader import is_sentiment_ready, is_presidio_ready
from ..core.config import settings

logger = logging.getLogger("suaralens.routes")
router = APIRouter()


@router.get("/")
def root():
    return {
        "status": True,
        "service": settings.SERVICE_NAME,
        "version": settings.SERVICE_VERSION,
        "models": {
            "pii": "Presidio + Custom Indonesian Regex Recognizers",
            "classification": f"{settings.OLLAMA_MODEL} via Ollama",
            "sentiment": settings.SENTIMENT_MODEL_NAME,
        },
    }


@router.get("/health")
def health():
    return {
        "status": True,
        "service": settings.SERVICE_NAME,
        "message": "ML Service is healthy",
    }


@router.get("/ready")
def ready():
    sentiment_ok = is_sentiment_ready()
    presidio_ok = is_presidio_ready()

    is_ready = sentiment_ok or presidio_ok
    status_code = status.HTTP_200_OK if is_ready else status.HTTP_503_SERVICE_UNAVAILABLE

    return {
        "ready": is_ready,
        "components": {
            "sentiment_model": "ready" if sentiment_ok else "fallback_mode",
            "presidio_pii": "ready" if presidio_ok else "regex_fallback_mode",
            "ollama_llm": "configured",
        },
    }


@router.post("/analyze", response_model=ComplaintResponse)
def analyze(request: ComplaintRequest):
    """
    Pipeline lengkap pemrosesan teks pengaduan:
    1. PII Redaction (Presidio + Regex)
    2. LLM Classification & Urgency (Qwen via Ollama)
    3. Sentiment Analysis (IndoRoBERTa)
    """
    raw_text = request.text.strip()
    if not raw_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Teks pengaduan tidak boleh kosong.",
        )

    start_time = time.time()

    # 1. Anonimisasi PII
    pii_result = anonymize_text(raw_text)
    redacted_text = pii_result["redacted_text"]

    # 2. Klasifikasi Unit & Urgensi
    clf_result = classify_llm(redacted_text, submission_type=request.submission_type)

    # 3. Analisis Sentimen
    sent_result = classify_sentiment(redacted_text)

    is_fallback = pii_result.get("is_fallback", False) or clf_result.get("is_fallback", False) or sent_result.get("is_fallback", False)

    model_version = "qwen3.5:4b + indonesian-roberta"
    if is_fallback:
        model_version = f"{clf_result.get('model_version', 'heuristic')} + {sent_result.get('sentiment', 'rule')}"

    analysis = AnalysisData(
        redacted_text=redacted_text,
        category=clf_result["category"],
        category_confidence=clf_result.get("category_confidence"),
        target_unit=clf_result.get("target_unit", clf_result["category"]),
        unit_confidence=clf_result.get("unit_confidence"),
        unit_reason=clf_result.get("unit_reason"),
        urgency_label=clf_result["urgency_label"],
        urgency_score=clf_result["urgency_score"],
        urgency_reason=clf_result.get("urgency_reason"),
        sentiment=sent_result["sentiment"],
        sentiment_score=sent_result.get("score"),
        sentiment_scores=sent_result.get("scores"),
        submission_type=clf_result.get("submission_type", request.submission_type),
        requires_review=clf_result.get("requires_review", False),
        is_fallback=is_fallback,
        model_version=model_version,
    )

    elapsed_ms = int((time.time() - start_time) * 1000)
    logger.info("Complaint %d analyzed in %d ms (fallback=%s)", request.complaint_id, elapsed_ms, is_fallback)

    return ComplaintResponse(
        status=True,
        data=analysis,
        message="Analisis pengaduan berhasil diselesaikan.",
    )


@router.post("/summary", response_model=SummaryResponse)
def summary(request: SummaryRequest):
    """
    Hasilkan ringkasan eksekutif dengan verifikasi grounding faktual.
    """
    if not request.metrics:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Metrik analitik wajib disertakan.",
        )

    res = generate_summary(request.metrics, context=request.context)

    summary_data = SummaryData(
        summary=res["summary"],
        grounding=res["grounding"],
        model_used=res["model_used"],
        is_fallback=res.get("is_fallback", False),
    )

    return SummaryResponse(
        status=True,
        data=summary_data,
        message="Ringkasan eksekutif berhasil dibuat.",
    )

