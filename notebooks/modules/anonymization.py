"""
anonymization.py
================
Modul PII redaction untuk SuaraLens menggunakan Microsoft Presidio
+ custom regex recognizer untuk pola Indonesia.

Dapat diimport dari notebook lain:
    from modules.anonymization import anonymize_text
"""

import re
import json
from typing import Optional

# ── Presidio lazy imports (tidak semua environment perlu modul ini) ──────────
try:
    from presidio_analyzer import AnalyzerEngine, PatternRecognizer, Pattern
    from presidio_analyzer.nlp_engine import NlpEngineProvider
    from presidio_anonymizer import AnonymizerEngine
    from presidio_anonymizer.entities import OperatorConfig
    PRESIDIO_AVAILABLE = True
except ImportError:
    PRESIDIO_AVAILABLE = False
    print("[WARNING] presidio-analyzer / presidio-anonymizer belum terinstall.")
    print("  Jalankan: pip install presidio-analyzer presidio-anonymizer")
    print("  Lalu: python -m spacy download en_core_web_lg")


# ── Custom Regex Recognizer Indonesia ────────────────────────────────────────

def _build_custom_recognizers():
    """Buat list custom PatternRecognizer untuk pola PII Indonesia."""
    recognizers = []

    # NIM PENS: 10 digit diawali 33246
    nim_pattern = Pattern(
        name="NIM_PENS",
        regex=r"\b332\d{2}\d{5}\b",
        score=0.95
    )
    nim_recognizer = PatternRecognizer(
        supported_entity="NIM",
        patterns=[nim_pattern],
        name="NimPensRecognizer"
    )
    recognizers.append(nim_recognizer)

    # Nomor HP Indonesia: dimulai 08, 628, +628
    hp_pattern = Pattern(
        name="HP_INDONESIA",
        regex=r"(?:\+62|62|0)8[1-9]\d[\s\-]?\d{4}[\s\-]?\d{3,5}\b",
        score=0.90
    )
    hp_recognizer = PatternRecognizer(
        supported_entity="PHONE_NUMBER",
        patterns=[hp_pattern],
        name="HpIndonesiaRecognizer"
    )
    recognizers.append(hp_recognizer)

    # Email
    email_pattern = Pattern(
        name="EMAIL",
        regex=r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}",
        score=0.95
    )
    email_recognizer = PatternRecognizer(
        supported_entity="EMAIL_ADDRESS",
        patterns=[email_pattern],
        name="EmailRecognizer"
    )
    recognizers.append(email_recognizer)

    return recognizers


def _build_analyzer():
    """Inisialisasi AnalyzerEngine dengan NLP engine sederhana + custom recognizers."""
    if not PRESIDIO_AVAILABLE:
        raise ImportError("Presidio tidak tersedia. Install dulu sebelum menggunakan modul ini.")

    # Gunakan NLP engine ringan (spaCy en_core_web_sm)
    configuration = {
        "nlp_engine_name": "spacy",
        "models": [{"lang_code": "en", "model_name": "en_core_web_sm"}],
    }
    provider = NlpEngineProvider(nlp_configuration=configuration)
    nlp_engine = provider.create_engine()

    # Entitas default yang akan dideteksi (PERSON pakai NER spaCy)
    analyzer = AnalyzerEngine(
        nlp_engine=nlp_engine,
        supported_languages=["en"]
    )

    # Daftarkan custom recognizers
    for rec in _build_custom_recognizers():
        analyzer.registry.add_recognizer(rec)

    return analyzer


def _build_anonymizer():
    """Inisialisasi AnonymizerEngine."""
    return AnonymizerEngine()


# Singleton — inisialisasi sekali saja supaya tidak lambat tiap panggilan
_analyzer: Optional[object] = None
_anonymizer: Optional[object] = None

def _get_engines():
    global _analyzer, _anonymizer
    if _analyzer is None:
        _analyzer = _build_analyzer()
        _anonymizer = _build_anonymizer()
    return _analyzer, _anonymizer


# ── Fungsi Utama ─────────────────────────────────────────────────────────────

def anonymize_text(text: str) -> tuple[str, list[dict]]:
    """
    Redact PII dari teks dan kembalikan teks yang sudah dianonimkan
    beserta daftar entitas yang terdeteksi.

    Parameters
    ----------
    text : str
        Teks asli yang mungkin mengandung PII.

    Returns
    -------
    text_redacted : str
        Teks dengan PII diganti placeholder (mis. <PERSON>, <NIM>, dll.)
    entities_detected : list[dict]
        Daftar entitas terdeteksi: [{"type": str, "start": int, "end": int, "score": float}]

    Notes
    -----
    Limitasi:
    - PERSON recognizer menggunakan NER spaCy (dilatih data Inggris),
      sehingga recall untuk nama Indonesia mungkin rendah.
    - Perlu human review sebagai lapis kedua (human-in-the-loop).
    """
    if not PRESIDIO_AVAILABLE:
        return text, []

    analyzer, anonymizer = _get_engines()

    # Analisis entitas
    results = analyzer.analyze(
        text=text,
        language="en",
        entities=["PERSON", "PHONE_NUMBER", "EMAIL_ADDRESS", "NIM"]
    )

    entities_detected = [
        {
            "type": r.entity_type,
            "start": r.start,
            "end": r.end,
            "score": round(r.score, 3)
        }
        for r in results
    ]

    if not results:
        return text, entities_detected

    # Anonimkan
    anonymized = anonymizer.anonymize(
        text=text,
        analyzer_results=results,
        operators={
            "PERSON":        OperatorConfig("replace", {"new_value": "<NAMA>"}),
            "PHONE_NUMBER":  OperatorConfig("replace", {"new_value": "<NOMOR_HP>"}),
            "EMAIL_ADDRESS": OperatorConfig("replace", {"new_value": "<EMAIL>"}),
            "NIM":           OperatorConfig("replace", {"new_value": "<NIM>"}),
        }
    )

    return anonymized.text, entities_detected


# ── Regex-only fallback (untuk evaluasi recall sederhana) ────────────────────

_REGEX_NIM   = re.compile(r"\b332\d{2}\d{5}\b")
_REGEX_HP    = re.compile(r"(?:\+62|62|0)8[1-9]\d[\s\-]?\d{4}[\s\-]?\d{3,5}\b")
_REGEX_EMAIL = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")

def detect_pii_regex(text: str) -> dict:
    """
    Deteksi PII murni berbasis regex (tanpa Presidio).
    Dipakai sebagai baseline untuk menghitung recall Presidio.

    Returns dict {"nim": [...], "phone": [...], "email": [...]}
    """
    return {
        "nim":   _REGEX_NIM.findall(text),
        "phone": _REGEX_HP.findall(text),
        "email": _REGEX_EMAIL.findall(text),
    }


if __name__ == "__main__":
    sample = (
        "Halo, saya mahasiswa PENS NIM 3324601234 dengan nomor HP 08123456789. "
        "Email saya test@student.pens.ac.id. Nama saya Budi Santoso."
    )
    redacted, entities = anonymize_text(sample)
    print("Original :", sample)
    print("Redacted :", redacted)
    print("Entities :", json.dumps(entities, ensure_ascii=False, indent=2))
