import re
import logging
from typing import Dict, Any, List
from ..core.model_loader import get_presidio_engines, init_presidio

logger = logging.getLogger("suaralens.anonymization")

# Operator replacements mapping
OPERATOR_MAP = {
    "NIM": "<NIM>",
    "PHONE_NUMBER": "<TELEPON>",
    "EMAIL_ADDRESS": "<EMAIL>",
    "PERSON": "<NAMA>",
    "LOCATION": "<LOKASI>",
    "URL": "<URL>",
}


def regex_fallback_redact(text: str) -> str:
    """Sanitasi regex fail-safe bahasa Indonesia jika Presidio engine tidak aktif."""
    # 1. Email
    res = re.sub(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}", "<EMAIL>", text)
    # 2. HP Indonesia (08, +62, 62)
    res = re.sub(r"(?:\+62|62|0)8[1-9]\d{1,2}[\s\-]?\d{3,4}[\s\-]?\d{3,5}\b", "<TELEPON>", res)
    # 3. NIM PENS (10 digit diawali 332)
    res = re.sub(r"\b332\d{7}\b", "<NIM>", res)
    # 4. Nomor Identitas umum (7 - 16 digit)
    res = re.sub(r"\b[0-9]{7,16}\b", "<NOMOR_IDENTITAS>", res)
    return res


def anonymize_text(text: str) -> Dict[str, Any]:
    """
    Samarkan entitas PII pada teks pengaduan.

    Returns:
    --------
    dict : {
        "original_text": str,
        "redacted_text": str,
        "entities_found": list,
        "is_fallback": bool
    }
    """
    if not text or not text.strip():
        return {
            "original_text": text,
            "redacted_text": text,
            "entities_found": [],
            "is_fallback": False,
        }

    analyzer, anonymizer = get_presidio_engines()
    if analyzer is None or anonymizer is None:
        analyzer, anonymizer = init_presidio()

    if analyzer is None or anonymizer is None:
        logger.warning("Presidio engine tidak tersedia, beralih ke regex fallback.")
        redacted = regex_fallback_redact(text)
        return {
            "original_text": text,
            "redacted_text": redacted,
            "entities_found": ["FALLBACK_REGEX"],
            "is_fallback": True,
        }

    try:
        from presidio_anonymizer.entities import OperatorConfig

        # Deteksi entitas (hanya yang relevan dan minim false-positive)
        results = analyzer.analyze(
            text=text,
            language="en",
            entities=["NIM", "PHONE_NUMBER", "EMAIL_ADDRESS", "PERSON", "URL"],
            score_threshold=0.6,
        )

        operators = {
            entity: OperatorConfig("replace", {"new_value": label})
            for entity, label in OPERATOR_MAP.items()
        }

        anonymized_result = anonymizer.anonymize(
            text=text,
            analyzer_results=results,
            operators=operators,
        )

        redacted_text = anonymized_result.text

        # Lapis kedua: Pastikan regex NIM PENS dan HP tidak lolos
        redacted_text = regex_fallback_redact(redacted_text)

        entities = [
            {"entity_type": r.entity_type, "start": r.start, "end": r.end, "score": r.score}
            for r in results
        ]

        return {
            "original_text": text,
            "redacted_text": redacted_text,
            "entities_found": entities,
            "is_fallback": False,
        }
    except Exception as e:
        logger.warning("Presidio anonymization error: %s. Menggunakan regex fallback.", e)
        return {
            "original_text": text,
            "redacted_text": regex_fallback_redact(text),
            "entities_found": [],
            "is_fallback": True,
        }
