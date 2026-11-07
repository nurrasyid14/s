import logging
from typing import Optional, Any
from .config import settings

logger = logging.getLogger("suaralens.model_loader")

_sentiment_pipeline: Optional[Any] = None
_presidio_analyzer: Optional[Any] = None
_presidio_anonymizer: Optional[Any] = None


def load_sentiment_model(force_reload: bool = False):
    """Load HuggingFace text-classification pipeline (Singleton)."""
    global _sentiment_pipeline
    if _sentiment_pipeline is None or force_reload:
        try:
            from transformers import pipeline as hf_pipeline
            logger.info("Loading sentiment model: %s ...", settings.SENTIMENT_MODEL_NAME)
            try:
                _sentiment_pipeline = hf_pipeline(
                    task="text-classification",
                    model=settings.SENTIMENT_MODEL_NAME,
                    tokenizer=settings.SENTIMENT_MODEL_NAME,
                    max_length=512,
                    truncation=True,
                    device=settings.DEVICE,
                    model_kwargs={"local_files_only": True},
                )
            except Exception:
                _sentiment_pipeline = hf_pipeline(
                    task="text-classification",
                    model=settings.SENTIMENT_MODEL_NAME,
                    tokenizer=settings.SENTIMENT_MODEL_NAME,
                    max_length=512,
                    truncation=True,
                    device=settings.DEVICE,
                )
            logger.info("Sentiment model successfully loaded.")
        except Exception as e:
            logger.warning("Gagal memuat model sentimen (%s): %s", settings.SENTIMENT_MODEL_NAME, e)
            _sentiment_pipeline = None
    return _sentiment_pipeline


def get_sentiment_pipeline():
    """Dapatkan instance sentiment pipeline yang sudah dimuat."""
    return _sentiment_pipeline


def is_sentiment_ready() -> bool:
    """Periksa kesiapan inferensi model sentimen."""
    return _sentiment_pipeline is not None


def init_presidio(force_reload: bool = False):
    """Inisialisasi Presidio Analyzer & Anonymizer engine (Singleton)."""
    global _presidio_analyzer, _presidio_anonymizer
    if _presidio_analyzer is None or force_reload:
        try:
            from presidio_analyzer import AnalyzerEngine, PatternRecognizer, Pattern
            from presidio_analyzer.nlp_engine import NlpEngineProvider
            from presidio_anonymizer import AnonymizerEngine

            configuration = {
                "nlp_engine_name": "spacy",
                "models": [{"lang_code": "en", "model_name": settings.SPACY_MODEL_NAME}],
            }
            provider = NlpEngineProvider(nlp_configuration=configuration)
            nlp_engine = provider.create_engine()

            analyzer = AnalyzerEngine(nlp_engine=nlp_engine, supported_languages=["en"])

            # ── Custom Recognizer Pola Indonesia ──
            # 1. NIM PENS (10 digit diawali 332)
            nim_pattern = Pattern(name="NIM_PENS", regex=r"\b332\d{7}\b", score=0.95)
            analyzer.registry.add_recognizer(
                PatternRecognizer(supported_entity="NIM", patterns=[nim_pattern], name="NimPensRecognizer")
            )

            # 2. HP Indonesia (08, +62, 62)
            hp_pattern = Pattern(name="HP_INDONESIA", regex=r"(?:\+62|62|0)8[1-9]\d{1,2}[\s\-]?\d{3,4}[\s\-]?\d{3,5}\b", score=0.92)
            analyzer.registry.add_recognizer(
                PatternRecognizer(supported_entity="PHONE_NUMBER", patterns=[hp_pattern], name="HpIndonesiaRecognizer")
            )

            # 3. Email
            email_pattern = Pattern(name="EMAIL_ID", regex=r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}", score=0.95)
            analyzer.registry.add_recognizer(
                PatternRecognizer(supported_entity="EMAIL_ADDRESS", patterns=[email_pattern], name="EmailRecognizer")
            )

            _presidio_analyzer = analyzer
            _presidio_anonymizer = AnonymizerEngine()
            logger.info("Presidio Anonymization Engine successfully initialized.")
        except Exception as e:
            logger.warning("Gagal inisialisasi Presidio engine: %s", e)
            _presidio_analyzer = None
            _presidio_anonymizer = None

    return _presidio_analyzer, _presidio_anonymizer


def get_presidio_engines():
    """Dapatkan instance presidio analyzer & anonymizer."""
    return _presidio_analyzer, _presidio_anonymizer


def is_presidio_ready() -> bool:
    """Periksa kesiapan engine PII redaction."""
    return _presidio_analyzer is not None and _presidio_anonymizer is not None

