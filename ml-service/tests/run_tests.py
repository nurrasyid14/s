"""
SuaraLens ML Service Automated Test Suite
=========================================
Pengujian terisolasi untuk modul anonymization, classification, sentiment, summary, dan FastAPI routes.
"""

import sys
import os
from pathlib import Path

# Set PYTHONPATH ke ml-service agar modul app dapat diimport
ML_SERVICE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ML_SERVICE_DIR))

passed = 0
failed = 0


def assert_test(name: str, condition: bool, detail: str = ""):
    global passed, failed
    if condition:
        print(f"  [PASS] {name}", flush=True)
        passed += 1
    else:
        print(f"  [FAIL] {name} - {detail}", flush=True)
        failed += 1


print("============================================================")
print("SUARALENS ML SERVICE UNIT TEST RUNNER")
print("============================================================\n")

# -----------------------------------------------------------------
# 1. TEST ANONYMIZATION
# -----------------------------------------------------------------
print("[1] Testing app.services.anonymization...")
from app.services.anonymization import anonymize_text, regex_fallback_redact

raw_text = "Saya Agus Prasetyo, NIM 3324600045, nomor WA 081234567899, email agus@pens.ac.id melaporkan AC bocor."
res_anon = anonymize_text(raw_text)

assert_test("PII: NIM disamarkan", "3324600045" not in res_anon["redacted_text"] and "<NIM>" in res_anon["redacted_text"])
assert_test("PII: Nomor HP disamarkan", "081234567899" not in res_anon["redacted_text"] and "<TELEPON>" in res_anon["redacted_text"])
assert_test("PII: Email disamarkan", "agus@pens.ac.id" not in res_anon["redacted_text"] and "<EMAIL>" in res_anon["redacted_text"])
assert_test("PII: Teks substansi keluhan dipertahankan", "AC bocor" in res_anon["redacted_text"])

# Edge case: teks kosong
res_empty = anonymize_text("")
assert_test("PII: Tangani teks kosong tanpa error", res_empty["redacted_text"] == "")

print()

# -----------------------------------------------------------------
# 2. TEST CLASSIFICATION
# -----------------------------------------------------------------
print("[2] Testing app.services.classification...")
from app.services.classification import classify_llm, VALID_UNITS, VALID_URGENCY

res_clf = classify_llm("Akun email mahasiswa dan server siakad error saat login.", submission_type="complaint")
assert_test("Classification: Target unit valid", res_clf["category"] in VALID_UNITS)
assert_test("Classification: Urgency label valid", res_clf["urgency_label"] in VALID_URGENCY)
assert_test("Classification: Urgency score 0.0 - 1.0", 0.0 <= res_clf["urgency_score"] <= 1.0)
assert_test("Classification: Unit target TIK", res_clf["category"] == "TIK/Sistem Informasi")

print()

# -----------------------------------------------------------------
# 3. TEST SENTIMENT
# -----------------------------------------------------------------
print("[3] Testing app.services.sentiment...")
from app.services.sentiment import classify_sentiment

res_sent_neg = classify_sentiment("Pelayanan loket sangat mengecewakan dan AC ruang kelas rusak.")
assert_test("Sentiment: Deteksi sentimen negatif", res_sent_neg["sentiment"] == "negative")
assert_test("Sentiment: Skor sentimen 0.0 - 1.0", 0.0 <= res_sent_neg["score"] <= 1.0)
assert_test("Sentiment: Memiliki distribusi skor", "negative" in res_sent_neg["scores"] and "positive" in res_sent_neg["scores"])

print()

# -----------------------------------------------------------------
# 4. TEST GROUNDED SUMMARY
# -----------------------------------------------------------------
print("[4] Testing app.services.summary...")
from app.services.summary import generate_summary, check_grounding, generate_summary_template

mock_metrics = {
    "total_records": 100,
    "overall_compliant_pct": 85,
    "overall_breach_pct": 15,
    "top_units": [{"unit": "Sarana Prasarana", "count": 40}],
    "top_categories": [{"category": "Fasilitas", "count": 40}],
    "sentiment": {"negative_pct": 30.0},
    "high_urgency_pending": 5,
}

template_res = generate_summary_template(mock_metrics)
assert_test("Summary: Template memuat angka total", "100" in template_res)
assert_test("Summary: Template memuat SLA compliant %", "85%" in template_res)

grounding_check = check_grounding(template_res, mock_metrics)
assert_test("Summary: Grounding valid pada template", grounding_check["is_grounded"] is True)

print()

# -----------------------------------------------------------------
# 5. TEST FASTAPI ROUTES (via TestClient)
# -----------------------------------------------------------------
print("[5] Testing FastAPI App Endpoints...")
from starlette.testclient import TestClient
from app.main import app

client = TestClient(app)

# GET /
r_root = client.get("/")
assert_test("Endpoint GET /: Status 200", r_root.status_code == 200)
assert_test("Endpoint GET /: Memuat service name", "SuaraLens" in r_root.json().get("service", ""))

# GET /health
r_health = client.get("/health")
assert_test("Endpoint GET /health: Status 200", r_health.status_code == 200)
assert_test("Endpoint GET /health: Status true", r_health.json().get("status") is True)

# GET /ready
r_ready = client.get("/ready")
assert_test("Endpoint GET /ready: Status 200", r_ready.status_code == 200)
assert_test("Endpoint GET /ready: Memuat komponen", "components" in r_ready.json())

# POST /analyze
r_analyze = client.post("/analyze", json={
    "complaint_id": 99,
    "text": "WiFi di perpustakaan lantai 2 putus-putus sejak 3 hari lalu.",
    "submission_type": "complaint"
})
assert_test("Endpoint POST /analyze: Status 200", r_analyze.status_code == 200)
assert_test("Endpoint POST /analyze: Memuat redacted_text", "redacted_text" in r_analyze.json().get("data", {}))
assert_test("Endpoint POST /analyze: Memuat target_unit valid", r_analyze.json()["data"]["target_unit"] in VALID_UNITS)

# POST /summary
r_summary = client.post("/summary", json={
    "metrics": mock_metrics,
    "context": "Laporan Bulanan"
})
assert_test("Endpoint POST /summary: Status 200", r_summary.status_code == 200)
assert_test("Endpoint POST /summary: Memuat summary grounded", "summary" in r_summary.json().get("data", {}))

print()

# -----------------------------------------------------------------
# SUMMARY
# -----------------------------------------------------------------
print("============================================================")
print(f"TEST RESULTS: Passed: {passed}, Failed: {failed}")
print("============================================================")

if failed > 0:
    sys.exit(1)
sys.exit(0)
