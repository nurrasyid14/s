
import re
import logging
from typing import Dict, Any, List, Tuple

from ..core.model_loader import (
    get_presidio_engines,
    init_presidio,
    load_indonesian_ner,
)

logger = logging.getLogger("suaralens.anonymization")


# =========================================================
# 1. OPERATOR REPLACEMENT
# =========================================================

OPERATOR_MAP = {
    "NIM": "<NIM>",
    "PHONE_NUMBER": "<TELEPON>",
    "EMAIL_ADDRESS": "<EMAIL>",
    "URL": "<URL>",
    "PERSON": "<NAMA>",
}


# =========================================================
# 2. ROLE / ORGANIZATION ALLOWLIST
# =========================================================

ROLE_ALLOWLIST = [
    "mahasiswa",
    "mahasiswi",
    "dosen",
    "ketua program studi",
    "ketua prodi",
    "kaprodi",
    "kepala departemen",
    "ketua jurusan",
    "rektor",
    "wakil rektor",
    "direktur",
    "wakil direktur",
    "dekan",
    "wakil dekan",
    "admin",
    "administrator",
    "staf akademik",
    "staff akademik",
    "tenaga kependidikan",
    "teknisi",
    "petugas",
    "operator",
    "satpam",
    "laboran",
    "asisten dosen",
    "ketua kelas",
    "wali dosen",
    "wali akademik",
    "sekretaris",
    "bendahara",
    "kepala bagian",
    "kepala unit",
    "koordinator",
    "anggota",
    "pengelola",
    "staff",
    "staf",
]


def find_protected_role_spans(text: str) -> List[Tuple[int, int]]:
    """
    Mencari posisi jabatan dan role yang harus dipertahankan.
    """

    escaped_roles = [
        re.escape(role)
        for role in sorted(ROLE_ALLOWLIST, key=len, reverse=True)
    ]

    pattern = r"(?<!\w)(?:" + "|".join(escaped_roles) + r")(?!\w)"

    return [
        (match.start(), match.end())
        for match in re.finditer(
            pattern,
            text,
            flags=re.IGNORECASE
        )
    ]




def remove_protected_spans(
    text: str,
    start: int,
    end: int,
    protected_spans: List[Tuple[int, int]],
) -> List[Tuple[int, int]]:

    segments = [(start, end)]

    for p_start, p_end in protected_spans:
        new_segments = []

        for s, e in segments:

            if p_end <= s or p_start >= e:
                new_segments.append((s, e))
                continue

            if s < p_start:
                new_segments.append((s, p_start))

            if p_end < e:
                new_segments.append((p_end, e))

        segments = new_segments

    return [
        (s, e)
        for s, e in segments
        if s < e and re.search(r"[A-Za-zÀ-ÿ]", text[s:e])
    ]


# =========================================================
# 3. REGEX FALLBACK
# =========================================================

def regex_fallback_redact(text: str) -> str:
    """
    Fail-safe redaction untuk PII dengan format jelas.
    """

    text = re.sub(
        r"\b[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\b",
        "<EMAIL>",
        text,
    )

    text = re.sub(
        r"(?<!\w)(?:\+62|62|0)8[1-9]\d{1,2}[\s-]?\d{3,4}[\s-]?\d{3,5}\b",
        "<TELEPON>",
        text,
    )

    text = re.sub(
        r"(?i)(\bNIM\s*[:#]?\s*)\d{8,12}\b",
        r"\1<NIM>",
        text,
    )

    text = re.sub(
        r"\b332\d{7}\b",
        "<NIM>",
        text,
    )

    text = re.sub(
        r"https?://[^\s<>]+|www\.[^\s<>]+",
        "<URL>",
        text,
        flags=re.IGNORECASE,
    )

    return text


# =========================================================
# 4. INDONESIAN PERSON DETECTION
# =========================================================



def detect_indonesian_persons(text: str):
    """
    Menggunakan Indonesian NER untuk mendeteksi PERSON.
    Hanya label PER/PERSON yang dianonimkan.
    """

    ner = load_indonesian_ner()

    if ner is None:
        logger.warning(
            "Indonesian NER unavailable. "
            "Name anonymization is temporarily disabled."
        )
        return []

    # Konfigurasi deteksi nama
    PERSON_THRESHOLD = 0.70

    # Sapaan yang harus tetap dipertahankan
    HONORIFICS = (
        "Ibu", "Bapak", "Pak", "Bu",
        "Saudara", "Saudari", "Tuan", "Nyonya"
    )

    try:
        predictions = ner(text)

        protected_spans = find_protected_role_spans(text)

        logger.info("NER INPUT: %s", text)
        logger.info("NER RAW PREDICTIONS: %s", predictions)
        logger.info("NER PROTECTED SPANS: %s", protected_spans)

        person_spans = []

        for entity in predictions:

            label = entity.get(
                "entity_group",
                entity.get("entity", "")
            )

            label = label.upper().split("-")[-1]

            score = float(entity.get("score", 0))

            start = entity.get("start")
            end = entity.get("end")

            logger.info(
                "NER ENTITY: label=%s score=%.4f start=%s end=%s",
                label, score, start, end
            )

            if label not in ("PER", "PERSON"):
                continue

            if score < PERSON_THRESHOLD:
                logger.info(
                    "NER SKIPPED: confidence below threshold: %.4f",
                    score
                )
                continue

            if start is None or end is None:
                continue

            start = int(start)
            end = int(end)

            if start < 0 or end > len(text) or start >= end:
                continue

            # Pertahankan sapaan sebelum nama
            entity_text = text[start:end]

            honorific_pattern = (
                r"^(?:"
                + "|".join(map(re.escape, HONORIFICS))
                + r")\s+"
            )

            honorific_match = re.match(
                honorific_pattern,
                entity_text,
                flags=re.IGNORECASE
            )

            if honorific_match:
                start += honorific_match.end()

            # Jangan menyamarkan jabatan / role
            safe_segments = remove_protected_spans(
                text,
                start,
                end,
                protected_spans
            )

            logger.info(
                "NER SAFE SEGMENTS: %s",
                safe_segments
            )

            for safe_start, safe_end in safe_segments:

                value = text[safe_start:safe_end].strip()

                if not value:
                    continue

                if not re.search(r"[A-Za-zÀ-ÿ]", value):
                    continue

                person_spans.append({
                    "start": safe_start,
                    "end": safe_end,
                    "score": score,
                    "entity_type": "PERSON",
                })

        logger.info(
            "NER FINAL PERSON SPANS: %s",
            person_spans
        )

        return person_spans

    except Exception as e:
        logger.exception(
            "Indonesian NER detection error: %s", e
        )
        raise


# =========================================================
# 5. MAIN ANONYMIZATION
# =========================================================

def anonymize_text(text: str) -> Dict[str, Any]:
    """
    Anonimisasi PII pada pengaduan SuaraLens.

    PII:
    - Nama orang
    - NIM
    - Nomor HP
    - Email
    - URL

    Informasi yang dipertahankan:
    - Jabatan / role
    - Nama unit organisasi
    - Nama fasilitas
    - Konteks pengaduan
    """

    global CURRENT_TEXT

    if not text or not text.strip():
        return {
            "original_text": text,
            "redacted_text": text,
            "entities_found": [],
            "is_fallback": False,
        }

    CURRENT_TEXT = text

    analyzer, anonymizer = get_presidio_engines()

    if analyzer is None or anonymizer is None:
        analyzer, anonymizer = init_presidio()

    if analyzer is None or anonymizer is None:

        logger.warning(
            "Presidio unavailable. Using regex fallback."
        )

        redacted = regex_fallback_redact(text)

        return {
            "original_text": text,
            "redacted_text": redacted,
            "entities_found": ["FALLBACK_REGEX"],
            "is_fallback": True,
        }

    try:
        from presidio_anonymizer.entities import OperatorConfig
        from presidio_analyzer import RecognizerResult

        # A. Deteksi PII berbasis pola.
        pattern_results = analyzer.analyze(
            text=text,
            language="en",
            entities=[
                "NIM",
                "PHONE_NUMBER",
                "EMAIL_ADDRESS",
                "URL",
            ],
            score_threshold=0.6,
        )

        # B. Deteksi nama orang bahasa Indonesia.
        person_results = detect_indonesian_persons(text)

        ner_results = [
            RecognizerResult(
                entity_type="PERSON",
                start=item["start"],
                end=item["end"],
                score=item["score"],
                recognition_metadata={
                    "recognizer_name": "IndonesianNER"
                },
            )
            for item in person_results
        ]

        # C. Gabungkan hasil deteksi.
        all_results = list(pattern_results)

        # Hindari overlap dengan entitas PII lain.
        for person in ner_results:

            overlaps = any(
                person.start < existing.end
                and person.end > existing.start
                for existing in all_results
            )

            if not overlaps:
                all_results.append(person)

        # D. Konfigurasi penggantian.
        operators = {
            entity: OperatorConfig(
                "replace",
                {"new_value": replacement}
            )
            for entity, replacement in OPERATOR_MAP.items()
        }

        # E. Proses anonymization.
        anonymized = anonymizer.anonymize(
            text=text,
            analyzer_results=all_results,
            operators=operators,
        )

        redacted_text = regex_fallback_redact(
            anonymized.text
        )

        # F. Informasi entitas yang ditemukan.
        entities = [
            {
                "entity_type": item.entity_type,
                "start": item.start,
                "end": item.end,
                "score": item.score,
            }
            for item in all_results
        ]

        return {
            "original_text": text,
            "redacted_text": redacted_text,
            "entities_found": entities,
            "is_fallback": False,
        }

    except Exception as e:

        logger.exception(
            "Presidio anonymization error: %s", e
        )

        return {
            "original_text": text,
            "redacted_text": regex_fallback_redact(text),
            "entities_found": ["FALLBACK_REGEX"],
            "is_fallback": True,
        }


# Context untuk pemrosesan rentang teks.
CURRENT_TEXT = ""
