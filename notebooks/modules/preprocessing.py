"""
preprocessing.py
================
Fungsi preprocessing teks dan deduplication berbasis embedding
untuk pipeline SuaraLens.

Dapat diimport dari notebook lain:
    from modules.preprocessing import clean_text, dedup_check
"""

import re
import numpy as np
from typing import Optional

# ── Text Cleaning ─────────────────────────────────────────────────────────────

# Pola yang DIBERSIHKAN: whitespace berlebih, tanda baca berulang
_RE_MULTI_PUNCT  = re.compile(r'([!?.]){2,}')
_RE_MULTI_SPACE  = re.compile(r'\s+')
_RE_URL          = re.compile(r'https?://\S+|www\.\S+')

def clean_text(text: str) -> str:
    """
    Cleaning teks ringan — lowercase, normalisasi whitespace,
    hapus URL, normalisasi tanda baca berulang.

    TIDAK menghapus:
    - Emoji (bisa jadi sinyal sentimen)
    - Singkatan informal (gak, yg, dll) — variasi gaya bahasa dijaga
    - Tanda baca tunggal

    Parameters
    ----------
    text : str

    Returns
    -------
    str : teks yang sudah dibersihkan
    """
    if not isinstance(text, str):
        return ""
    text = text.strip()
    text = _RE_URL.sub('[URL]', text)
    text = _RE_MULTI_PUNCT.sub(r'\1', text)       # !!! -> !
    text = _RE_MULTI_SPACE.sub(' ', text)
    text = text.lower()
    return text


# ── Embedding & Deduplication ─────────────────────────────────────────────────

def load_embedding_model(model_name: str = "paraphrase-multilingual-MiniLM-L12-v2"):
    """
    Load sentence-transformer model.

    Parameters
    ----------
    model_name : str
        Nama model dari HuggingFace. Default support Bahasa Indonesia.

    Returns
    -------
    SentenceTransformer model
    """
    from sentence_transformers import SentenceTransformer
    print(f"[INFO] Loading model: {model_name} ...")
    model = SentenceTransformer(model_name)
    print(f"[INFO] Model loaded.")
    return model


def encode_texts(model, texts: list[str], batch_size: int = 64,
                 show_progress: bool = True) -> np.ndarray:
    """
    Encode list teks menjadi embedding matrix (N x D).

    Parameters
    ----------
    model : SentenceTransformer
    texts : list[str]
    batch_size : int
    show_progress : bool

    Returns
    -------
    np.ndarray shape (N, D)
    """
    embeddings = model.encode(
        texts,
        batch_size=batch_size,
        show_progress_bar=show_progress,
        normalize_embeddings=True   # L2-normalized → cosine sim = dot product
    )
    return embeddings


def dedup_check(embeddings: np.ndarray,
                threshold: float = 0.90,
                ids: Optional[list] = None) -> list[dict]:
    """
    Deteksi near-duplicate berbasis cosine similarity.

    Karena embedding sudah L2-normalized (dari encode_texts),
    cosine similarity = dot product → pakai np.dot.

    Kompleksitas: O(N²) — untuk N > 10.000 pertimbangkan FAISS.

    Parameters
    ----------
    embeddings : np.ndarray (N, D) — harus sudah L2-normalized
    threshold  : float — pasangan dengan sim >= threshold dianggap duplikat
    ids        : list — identifier tiap teks (mis. id_aduan), optional

    Returns
    -------
    list[dict] : [{"idx_a": int, "idx_b": int, "id_a": str, "id_b": str,
                   "similarity": float}]

    Notes
    -----
    Threshold 0.90 adalah trade-off antara presisi dan recall:
    - Terlalu ketat (0.95+): banyak duplikat lolos, recall rendah
    - Terlalu longgar (0.85-): banyak false positive, presisi rendah
    Nilai 0.90 dipilih berdasarkan karakteristik dataset SuaraLens
    yang punya variasi bahasa informal tinggi.
    """
    n = len(embeddings)
    # Hitung similarity matrix sekaligus (matrix multiply)
    sim_matrix = np.dot(embeddings, embeddings.T)   # (N, N)

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

    # Urutkan dari similarity tertinggi
    pairs.sort(key=lambda x: x["similarity"], reverse=True)
    return pairs


def evaluate_dedup(pairs: list[dict],
                   known_dup_prefix: str = "SL-1") -> dict:
    """
    Evaluasi sederhana recall & precision deteksi duplikat.

    Asumsi: id yang diawali `known_dup_prefix` adalah duplikat yang
    sengaja disisipkan oleh generator data.

    Parameters
    ----------
    pairs : output dedup_check
    known_dup_prefix : prefix id_aduan duplikat (default 'SL-1')

    Returns
    -------
    dict dengan precision, recall, total_detected, total_known_dup_in_pairs
    """
    true_positives  = sum(
        1 for p in pairs
        if p["id_a"].startswith(known_dup_prefix)
        or p["id_b"].startswith(known_dup_prefix)
    )
    total_detected = len(pairs)

    return {
        "total_pairs_detected": total_detected,
        "true_positive_pairs":  true_positives,
        "estimated_precision":  round(true_positives / total_detected, 4) if total_detected else 0,
        "note": (
            "Recall tidak bisa dihitung tanpa tahu total pasangan duplikat yang sebenarnya. "
            "Nilai di atas hanya estimasi precision berbasis prefix id_aduan."
        )
    }


if __name__ == "__main__":
    sample_texts = [
        "fasilitas parkir kampus sangat buruk",
        "fasilitas parkir kampus sangat buruk sekali",   # near-dup
        "wifi lab komputer sering mati",
    ]
    cleaned = [clean_text(t) for t in sample_texts]
    print("Cleaned:", cleaned)

    model = load_embedding_model()
    emb   = encode_texts(model, cleaned)
    pairs = dedup_check(emb, threshold=0.85, ids=["A", "B", "C"])
    print("Near-duplicates:", pairs)
