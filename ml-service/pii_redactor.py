from presidio_analyzer import AnalyzerEngine
from presidio_anonymizer import AnonymizerEngine


class PIIRedactor:
    def __init__(self):
        self.analyzer = AnalyzerEngine()
        self.anonymizer = AnonymizerEngine()

    def redact(self, text: str):

        # Hanya gunakan entity yang relatif aman
        # untuk tahap awal SuaraLens.
        results = self.analyzer.analyze(
            text=text,
            language="en",
            entities=[
                "EMAIL_ADDRESS",
                "PHONE_NUMBER",
                "URL"
            ]
        )

        # Hilangkan entity yang saling overlap.
        # Prioritas:
        # EMAIL > PHONE > URL
        priority = {
            "EMAIL_ADDRESS": 3,
            "PHONE_NUMBER": 2,
            "URL": 1
        }

        sorted_results = sorted(
            results,
            key=lambda r: (
                r.start,
                -priority.get(r.entity_type, 0),
                -(r.end - r.start)
            )
        )

        filtered_results = []

        for result in sorted_results:

            overlap = False

            for selected in filtered_results:

                if (
                    result.start < selected.end
                    and result.end > selected.start
                ):
                    overlap = True
                    break

            if not overlap:
                filtered_results.append(result)

        anonymized = self.anonymizer.anonymize(
            text=text,
            analyzer_results=filtered_results
        )

        return {
            "original_text": text,
            "redacted_text": anonymized.text,
            "entities": [
                {
                    "type": result.entity_type,
                    "start": result.start,
                    "end": result.end,
                    "score": result.score
                }
                for result in filtered_results
            ]
        }