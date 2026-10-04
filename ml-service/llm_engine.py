import requests
import json


class LLMEngine:

    def __init__(self):
        self.url = "http://localhost:11434/api/generate"
        self.model = "qwen3:8b"

    def analyze(self, text: str):

        prompt = f"""
Kamu adalah sistem analisis pengaduan kampus.

Analisis pengaduan berikut.

Pilih satu kategori:

- Akademik
- Fasilitas
- Keuangan
- Kemahasiswaan
- Administrasi
- Teknologi Informasi
- Lainnya

Kemudian tentukan tingkat urgensi:

- low
- medium
- high
- critical

Gunakan pertimbangan berikut:
- low: masalah tidak mendesak dan dampaknya kecil.
- medium: masalah perlu ditangani tetapi tidak membutuhkan tindakan segera.
- high: masalah mengganggu aktivitas utama atau membutuhkan penanganan cepat.
- critical: masalah sangat serius, berisiko besar, atau membutuhkan tindakan segera.

Pengaduan:
{text}

Berikan HANYA JSON valid tanpa markdown dan tanpa penjelasan tambahan:

{{
    "category": "nama kategori",
    "confidence": 0.0,
    "urgency_label": "low",
    "urgency_reason": "alasan singkat"
}}
"""

        response = requests.post(
            self.url,
            json={
                "model": self.model,
                "prompt": prompt,
                "stream": False
            },
            timeout=120
        )

        response.raise_for_status()

        result = response.json()

        raw_response = result["response"].strip()

        print("=== RAW QWEN RESPONSE ===")
        print(raw_response)
        print("=========================")

        # Membersihkan markdown jika model tetap menggunakannya
        raw_response = raw_response.replace(
            "```json",
            ""
        ).replace(
            "```",
            ""
        ).strip()

        parsed = json.loads(raw_response)

        urgency_scores = {
            "low": 0.25,
            "medium": 0.50,
            "high": 0.75,
            "critical": 1.00
        }

        urgency_label = parsed.get(
            "urgency_label",
            "medium"
        ).lower()

        parsed["urgency_label"] = urgency_label

        parsed["urgency_score"] = urgency_scores.get(
            urgency_label,
            0.50
        )

        return parsed