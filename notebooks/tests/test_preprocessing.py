"""
test_preprocessing.py
======================
Unit tests komprehensif untuk modul preprocessing & deduplication SuaraLens.

Mencakup:
1. Input kosong, None, dan whitespace-only
2. Simbol dan repetisi tanda baca
3. Slang normalisasi & koreksi informal Indonesia
4. Preservasi mutlak kata negasi ("tidak", "belum", "bukan")
5. Input teks pendek (< 3 kata) dan teks panjang (> 300 kata)
6. Exact duplicate detection (O(N) hash grouping)
7. Near-duplicate cosine similarity logic
"""

import sys
import unittest
import numpy as np
from pathlib import Path

# Add notebooks dir to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from modules.preprocessing import (
    clean_text, normalize_slang, exact_dedup_check,
    dedup_check, AUDITED_SLANG_MAP, NEGATION_WORDS
)


class TestPreprocessing(unittest.TestCase):

    def test_empty_and_whitespace(self):
        """Input kosong, None, atau spasi saja harus menghasilkan string kosong secara aman."""
        self.assertEqual(clean_text(""), "")
        self.assertEqual(clean_text("   "), "")
        self.assertEqual(clean_text(None), "")
        self.assertEqual(clean_text("\n\t  \r"), "")

    def test_symbols_and_repeated_punctuation(self):
        """Tanda baca berulang direduksi, URL diganti [URL], emoji dipertahankan."""
        raw = "Wifi mati total!!!!! Tolong dicek di https://siakad.pens.ac.id/login ???? 😭"
        cleaned = clean_text(raw, normalize_informal=False)
        self.assertIn("[url]", cleaned)
        self.assertNotIn("!!!!!", cleaned)
        self.assertIn("!", cleaned)
        self.assertNotIn("????", cleaned)
        self.assertIn("?", cleaned)
        self.assertIn("😭", cleaned)

    def test_informal_slang_normalization(self):
        """Kata informal dinormalisasi sesuai AUDITED_SLANG_MAP."""
        raw = "sy mhn tolg kpd bapak krn ukt sy blm dpt keringanan"
        cleaned = clean_text(raw, normalize_informal=True)
        self.assertIn("saya", cleaned)
        self.assertIn("mohon", cleaned)
        self.assertIn("tolong", cleaned)
        self.assertIn("kepada", cleaned)
        self.assertIn("karena", cleaned)
        self.assertIn("belum", cleaned)
        self.assertIn("dapat", cleaned)

    def test_negation_words_preserved(self):
        """Kata negasi krusial TIDAK PERNAH dihapus dari teks."""
        negations = ["tidak", "belum", "bukan", "tanpa", "jangan", "kurang"]
        for neg in negations:
            raw = f"fasilitas lab {neg} bisa digunakan mahasiswa"
            cleaned = clean_text(raw)
            self.assertIn(neg, cleaned, f"Kata negasi '{neg}' tidak boleh hilang!")

        # Uji variasi slang negasi ditransformasi menjadi negasi baku
        slang_neg = "ac ruangan gak dingin, blm diperbaiki, bkn salah mhs"
        cleaned_slang = clean_text(slang_neg)
        self.assertIn("tidak", cleaned_slang)
        self.assertIn("belum", cleaned_slang)
        self.assertIn("bukan", cleaned_slang)

    def test_short_text(self):
        """Teks sangat pendek tetap diproses dengan baik."""
        self.assertEqual(clean_text("ac mati"), "ac mati")
        self.assertEqual(clean_text("krs error"), "krs error")

    def test_long_text(self):
        """Teks panjang (300+ kata) diproses tanpa truncation atau error."""
        paragraph = "keluhan mahasiswa mengenai fasilitas kampus pens yang rusak. " * 50
        cleaned = clean_text(paragraph)
        self.assertTrue(len(cleaned) > 1000)
        self.assertNotIn("  ", cleaned)

    def test_exact_dedup_check(self):
        """Exact duplicate grouping mengidentifikasi teks identik dengan tepat."""
        texts = [
            "Lampu toilet gedung D mati total.",
            "Lampu toilet gedung D mati total.",  # exact duplicate
            "AC lab komputer panas sekali.",
            "Lampu toilet gedung D mati total. ",  # exact duplicate (trailing space)
        ]
        ids = ["ADU-01", "ADU-02", "ADU-03", "ADU-04"]

        dup_groups = exact_dedup_check(texts, ids)
        self.assertEqual(len(dup_groups), 1)
        self.assertEqual(dup_groups[0]["count"], 3)
        self.assertIn("ADU-01", dup_groups[0]["all_ids"])
        self.assertIn("ADU-02", dup_groups[0]["all_ids"])
        self.assertIn("ADU-04", dup_groups[0]["all_ids"])
        self.assertNotIn("ADU-03", dup_groups[0]["all_ids"])

    def test_near_dedup_cosine_similarity(self):
        """Near dedup menghitung cosine similarity dengan L2 normalized vectors."""
        # Dua vektor hampir identik (dot product ~ 0.96)
        v1 = np.array([0.8, 0.6])
        v2 = np.array([0.85, 0.5268])
        v2 = v2 / np.linalg.norm(v2)
        v3 = np.array([-0.6, 0.8])  # ortogonal

        embeddings = np.vstack([v1, v2, v3])
        pairs = dedup_check(embeddings, threshold=0.90, ids=["A", "B", "C"])

        self.assertEqual(len(pairs), 1)
        self.assertEqual(pairs[0]["id_a"], "A")
        self.assertEqual(pairs[0]["id_b"], "B")
        self.assertGreaterEqual(pairs[0]["similarity"], 0.90)


if __name__ == "__main__":
    unittest.main(verbosity=2)

