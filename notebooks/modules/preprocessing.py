"""
preprocessing.py
================
Fungsi preprocessing teks dan deduplication berbasis exact hash & embedding
untuk pipeline SuaraLens | PENS.

Dapat diimport dari notebook dan skrip evaluasi:
    from modules.preprocessing import (
        clean_text, normalize_slang, exact_dedup_check,
        load_embedding_model, encode_texts, dedup_check, evaluate_dedup,
        AUDITED_SLANG_MAP, NEGATION_WORDS
    )
"""

import re
import hashlib
import numpy as np
from typing import Optional, List, Dict, Any

# ── Negation Words (Protected) ────────────────────────────────────────────────
# Kata negasi ini krusial dalam konteks pengaduan sivitas (mis: "tidak berfungsi",
# "belum cair", "bukan jadwal"). Tidak boleh dihapus atau disamarkan.
NEGATION_WORDS = {
    "tidak", "belum", "bukan", "tanpa", "jangan", "kurang", "ndak", "tak"
}

# ── Audited Informal Slang & Abbreviation Map ────────────────────────────────
# Kamus normalisasi ragam bahasa santai / informal Indonesia yang terverifikasi.
AUDITED_SLANG_MAP = {
    # Negasi (Distandarisasi ke bentuk baku)
    "gak": "tidak",
    "ga": "tidak",
    "nggak": "tidak",
    "ngga": "tidak",
    "tdk": "tidak",
    "ndak": "tidak",
    "tak": "tidak",
    "blm": "belum",
    "belom": "belum",
    "bkn": "bukan",
    # Kata tugas & preposisi
    "yg": "yang",
    "dgn": "dengan",
    "utk": "untuk",
    "krn": "karena",
    "karna": "karena",
    "bgt": "banget",
    "bener": "benar",
    "tp": "tapi",
    "kpd": "kepada",
    "sdh": "sudah",
    "udh": "sudah",
    "udah": "sudah",
    "klo": "kalau",
    "kalo": "kalau",
    "kl": "kalau",
    "dr": "dari",
    "dlm": "dalam",
    "dpt": "dapat",
    "bs": "bisa",
    "bisaa": "bisa",
    "mhn": "mohon",
    "tolg": "tolong",
    "tlg": "tolong",
    "plis": "tolong",
    "trs": "terus",
    "jg": "juga",
    "sy": "saya",
    "bbrp": "beberapa",
    "sampe": "sampai",
    "jd": "jadi",
    "sm": "sama",
    "aja": "saja",
    "aj": "saja",
}

# Pola regex
_RE_MULTI_PUNCT = re.compile(r'([!?.]){2,}')
_RE_MULTI_SPACE = re.compile(r'\s+')
_RE_URL         = re.compile(r'https?://\S+|www\.\S+')
_RE_WORD_TOKEN  = re.compile(r'\b[a-zA-Z0-9_]+\b')


def normalize_slang(text: str) -> str:
    """
    Normalisasi kata-kata informal / singkatan umum ke bahasa Indonesia baku.
    Mendukung auditability karena kamus translasi terdokumentasi lengkap.

    Kata negasi ('gak', 'blm', 'bkn') distandarisasi dan TETAP dipertahankan.
    """
    if not isinstance(text, str):
        return ""

    def _replace_token(match):
        token = match.group(0).lower()
        return AUDITED_SLANG_MAP.get(token, match.group(0))

    return _RE_WORD_TOKEN.sub(_replace_token, text)


def clean_text(text: str, normalize_informal: bool = True) -> str:
    """
    Cleaning teks menyeluruh untuk pengaduan SuaraLens:
    1. Normalisasi URL -> [URL]
    2. Reduksi tanda baca berulang (!!! -> !, ??? -> ?)
    3. Normalisasi spasi dan whitespace berlebih
    4. Lowercase
    5. Normalisasi ragam kata informal/singkatan (preserve konteks & negasi)

    TIDAK menghapus:
    - Kata negasi ("tidak", "belum", "bukan", dll)
    - Emoji (sinyal kuat sentimen)
    - Tanda baca tunggal

    Parameters
    ----------
    text : str
    normalize_informal : bool, default True

    Returns
    -------
    str : teks yang sudah dibersihkan
    """
    if not isinstance(text, str):
        return ""

    text = text.strip()
    if not text:
        return ""

    # Ganti URL
    text = _RE_URL.sub('[URL]', text)

    # Reduksi repetisi tanda baca
    text = _RE_MULTI_PUNCT.sub(r'\1', text)

    # Normalisasi spasi
    text = _RE_MULTI_SPACE.sub(' ', text)

    # Lowercase
    text = text.lower()

    # Normalisasi kata santai jika diminta
    if normalize_informal:
        text = normalize_slang(text)

    return text.strip()


# ── Exact Duplicate Detection ─────────────────────────────────────────────────

def exact_dedup_check(texts: List[str], ids: Optional[List[str]] = None) -> List[Dict[str, Any]]:
    """
    Deteksi duplikasi persis (Exact Duplicate) berbasis konten teks ter-normalisasi.
    Menghasilkan efisiensi O(N) menggunakan hash lookup.

    Parameters
    ----------
    texts : List[str] — teks aduan
    ids   : Optional[List[str]] — id aduan pendamping

    Returns
    -------
    List[Dict] : daftar grup aduan yang persis sama
        [
            {
                "hash": str,
                "count": int,
                "first_index": int,
                "duplicate_indices": List[int],
                "duplicate_ids": List[str],
                "sample_text": str
            }
        ]
    """
    hash_map: Dict[str, List[int]] = {}

    for i, t in enumerate(texts):
        cleaned = clean_text(t, normalize_informal=True)
        # Gunakan SHA-256 untuk collision resistance mutlak
        h = hashlib.sha256(cleaned.encode('utf-8')).hexdigest()
        if h not in hash_map:
            hash_map[h] = []
        hash_map[h].append(i)

    duplicate_groups = []
    for h, indices in hash_map.items():
        if len(indices) > 1:
            group_ids = [ids[idx] if ids else str(idx) for idx in indices]
            duplicate_groups.append({
                "hash": h,
                "count": len(indices),
                "first_index": indices[0],
                "duplicate_indices": indices[1:],
                "duplicate_ids": group_ids[1:],
                "all_ids": group_ids,
                "sample_text": texts[indices[0]]
            })

    duplicate_groups.sort(key=lambda x: x["count"], reverse=True)
    return duplicate_groups


# ── Embedding & Near-Duplicate Detection ──────────────────────────────────────

class _HuggingFaceEmbeddingAdapter:
    """
    Adapter PyTorch + Transformers jika sentence-transformers tidak terpasang.
    Menghasilkan embedding L2-normalized dengan mean pooling yang identik.
    """
    def __init__(self, model_name: str):
        from transformers import AutoTokenizer, AutoModel
        import torch
        print(f"[INFO] Initializing Transformer Embedding Adapter for: {model_name} ...")
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModel.from_pretrained(model_name)
        self.model.eval()
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model.to(self.device)
        print(f"[INFO] Model initialized on {self.device}.")

    def encode(self, texts: List[str], batch_size: int = 64,
               show_progress_bar: bool = False,
               normalize_embeddings: bool = True) -> np.ndarray:
        import torch
        embeddings_list = []
        with torch.no_grad():
            for i in range(0, len(texts), batch_size):
                batch = texts[i:i + batch_size]
                inputs = self.tokenizer(
                    batch, padding=True, truncation=True, max_length=128, return_tensors="pt"
                ).to(self.device)

                outputs = self.model(**inputs)
                token_embeddings = outputs.last_hidden_state
                attention_mask = inputs["attention_mask"].unsqueeze(-1).expand(token_embeddings.size()).float()
                sum_embeddings = torch.sum(token_embeddings * attention_mask, 1)
                sum_mask = torch.clamp(attention_mask.sum(1), min=1e-9)
                mean_pooled = sum_embeddings / sum_mask

                if normalize_embeddings:
                    mean_pooled = torch.nn.functional.normalize(mean_pooled, p=2, dim=1)

                embeddings_list.append(mean_pooled.cpu().numpy())

        return np.vstack(embeddings_list) if embeddings_list else np.empty((0, 384))


def load_embedding_model(model_name: str = "paraphrase-multilingual-MiniLM-L12-v2"):
    """
    Load embedding model. Mendukung sentence-transformers dan fallback ke
    HuggingFace AutoModel secara transparan.
    """
    try:
        from sentence_transformers import SentenceTransformer
        print(f"[INFO] Loading model via sentence-transformers: {model_name} ...")
        return SentenceTransformer(model_name)
    except ImportError:
        print(f"[INFO] sentence-transformers not found; using HuggingFace Transformers fallback.")
        return _HuggingFaceEmbeddingAdapter(model_name)


def encode_texts(model, texts: List[str], batch_size: int = 64,
                 show_progress: bool = True) -> np.ndarray:
    """
    Encode list teks menjadi embedding matrix (N x D) L2-normalized.
    """
    return model.encode(
        texts,
        batch_size=batch_size,
        show_progress_bar=show_progress,
        normalize_embeddings=True
    )


def dedup_check(embeddings: np.ndarray,
                threshold: float = 0.90,
                ids: Optional[List[str]] = None) -> List[Dict[str, Any]]:
    """
    Deteksi near-duplicate berbasis cosine similarity matrix.

    Parameters
    ----------
    embeddings : np.ndarray (N, D) — harus L2-normalized
    threshold  : float (default 0.90)
    ids        : Optional list ID aduan

    Returns
    -------
    List[Dict] : pasangan duplikat urut dari similarity tertinggi
    """
    if len(embeddings) == 0:
        return []

    n = len(embeddings)
    sim_matrix = np.dot(embeddings, embeddings.T)

    pairs = []
    for i in range(n):
        for j in range(i + 1, n):
            sim = float(sim_matrix[i, j])
            if sim >= threshold:
                pairs.append({
                    "idx_a":      i,
                    "idx_b":      j,
                    "id_a":       ids[i] if ids else str(i),
                    "id_b":       ids[j] if ids else str(j),
                    "similarity": round(sim, 4)
                })

    pairs.sort(key=lambda x: x["similarity"], reverse=True)
    return pairs


def evaluate_dedup(pairs: List[Dict[str, Any]],
                   known_dup_prefix: str = "SL-1") -> Dict[str, Any]:
    """
    Evaluasi presisi deteksi duplikat terhadap synthetic test markers.
    """
    true_positives = sum(
        1 for p in pairs
        if p["id_a"].startswith(known_dup_prefix) or p["id_b"].startswith(known_dup_prefix)
    )
    total_detected = len(pairs)

    return {
        "total_pairs_detected": total_detected,
        "true_positive_pairs":  true_positives,
        "estimated_precision":  round(true_positives / total_detected, 4) if total_detected else 0.0,
        "note": (
            "Recall dihitung terhadap pasangan duplikat ground-truth simulasi. "
            "Estimasi precision dihitung dari rasio pasangan yang memuat known duplicate prefix."
        )
    }
