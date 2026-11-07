"""
test_analytics.py
=================
Unit tests untuk modul analytics & SLA trend SuaraLens.
"""

import sys
import unittest
import pandas as pd
import numpy as np
from pathlib import Path

# Add notebooks dir to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from modules.analytics import (
    compute_sla_breach_by_category,
    compute_sla_breach_by_urgency,
    compute_avg_resolution_time,
    compute_monthly_trend,
    detect_trend_anomalies,
    build_sla_analytics_payload,
    build_trend_analytics_payload
)


class TestAnalytics(unittest.TestCase):

    def setUp(self):
        # Sample dummy dataframe
        self.df = pd.DataFrame([
            {
                "id_aduan": "SL-01",
                "tanggal_masuk": "2026-03-01 10:00:00",
                "tanggal_selesai": "2026-03-03 10:00:00",
                "kategori_true": "Akademik",
                "urgency_label_true": "High",
                "status": "Selesai",
                "sla_breach_true": 0,
                "stakeholder_type": "Mahasiswa",
            },
            {
                "id_aduan": "SL-02",
                "tanggal_masuk": "2026-03-05 10:00:00",
                "tanggal_selesai": "2026-03-10 10:00:00",
                "kategori_true": "Akademik",
                "urgency_label_true": "Critical",
                "status": "Selesai",
                "sla_breach_true": 1,
                "stakeholder_type": "Mahasiswa",
            },
            {
                "id_aduan": "SL-03",
                "tanggal_masuk": "2026-04-01 10:00:00",
                "tanggal_selesai": None,
                "kategori_true": "Sarana IT",
                "urgency_label_true": "Low",
                "status": "Proses",
                "sla_breach_true": 0,
                "stakeholder_type": "Dosen",
            },
        ])

    def test_sla_breach_by_category(self):
        result = compute_sla_breach_by_category(self.df)
        self.assertEqual(len(result), 2)
        # Akademik: 1 breach out of 2 = 50%
        akademik = next(r for r in result if r["kategori"] == "Akademik")
        self.assertEqual(akademik["total"], 2)
        self.assertEqual(akademik["breach"], 1)
        self.assertEqual(akademik["breach_pct"], 50.0)

    def test_sla_breach_by_urgency(self):
        result = compute_sla_breach_by_urgency(self.df)
        self.assertTrue(len(result) > 0)
        # Critical has 1 total, 1 breach = 100%
        critical = next(r for r in result if r["urgency"] == "Critical")
        self.assertEqual(critical["breach_pct"], 100.0)

    def test_avg_resolution_time(self):
        result = compute_avg_resolution_time(self.df)
        # Only status='Selesai' (SL-01: 2 days, SL-02: 5 days -> avg 3.5 days)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["kategori"], "Akademik")
        self.assertEqual(result[0]["avg_days"], 3.5)

    def test_build_sla_payload(self):
        payload = build_sla_analytics_payload(self.df)
        self.assertIn("overall_breach_pct", payload)
        self.assertEqual(payload["total_records"], 3)
        self.assertAlmostEqual(payload["overall_breach_pct"], 33.33, places=1)

    def test_build_trend_payload(self):
        payload = build_trend_analytics_payload(self.df)
        self.assertEqual(payload["total_records"], 3)
        self.assertEqual(payload["date_range"]["start"], "2026-03-01")
        self.assertEqual(payload["date_range"]["end"], "2026-04-01")
        self.assertTrue(len(payload["monthly_trend"]) > 0)

    def test_empty_dataframe_guardrails(self):
        empty_df = pd.DataFrame()
        sla_payload = build_sla_analytics_payload(empty_df)
        trend_payload = build_trend_analytics_payload(empty_df)

        self.assertEqual(sla_payload["total_records"], 0)
        self.assertEqual(sla_payload["overall_breach_pct"], 0.0)
        self.assertEqual(trend_payload["total_records"], 0)
        self.assertIsNone(trend_payload["date_range"]["start"])


if __name__ == "__main__":
    unittest.main(verbosity=2)

