"""
analytics.py
============
Fungsi agregasi untuk SLA, tren, dan analitik dashboard SuaraLens.
Semua fungsi mengembalikan dict/list yang JSON-serializable
sehingga dapat langsung di-serve via FastAPI atau disimpan sebagai JSON.

Dapat diimport dari notebook lain:
    from modules.analytics import (
        compute_sla_breach_by_category,
        compute_sla_breach_by_urgency,
        compute_avg_resolution_time,
        compute_monthly_trend,
        detect_trend_anomalies,
        compute_stakeholder_monthly,
        build_sla_analytics_payload,
        build_trend_analytics_payload,
    )
"""

import json
import numpy as np
import pandas as pd
from pathlib import Path
from datetime import datetime
from typing import Optional


# ── SLA Analytics ─────────────────────────────────────────────────────────────

def compute_sla_breach_by_category(df: pd.DataFrame) -> list[dict]:
    """
    Hitung persentase SLA breach per kategori_true.

    Parameters
    ----------
    df : DataFrame dari suaralens_dummy_simulasi.jsonl

    Returns
    -------
    list[dict] : [{"kategori": str, "total": int, "breach": int, "breach_pct": float}]
                 Diurutkan dari breach_pct tertinggi.
    """
    grouped = (
        df.groupby("kategori_true")["sla_breach_true"]
        .agg(total="count", breach="sum")
        .reset_index()
    )
    grouped["breach_pct"] = (grouped["breach"] / grouped["total"] * 100).round(2)
    grouped = grouped.sort_values("breach_pct", ascending=False)
    return grouped.rename(columns={"kategori_true": "kategori"}).to_dict(orient="records")


def compute_sla_breach_by_urgency(df: pd.DataFrame) -> list[dict]:
    """
    Hitung persentase SLA breach per urgency_label_true.

    Returns
    -------
    list[dict] : [{"urgency": str, "total": int, "breach": int, "breach_pct": float}]
    """
    order = {"Low": 0, "Medium": 1, "High": 2, "Critical": 3}
    grouped = (
        df.groupby("urgency_label_true")["sla_breach_true"]
        .agg(total="count", breach="sum")
        .reset_index()
    )
    grouped["breach_pct"] = (grouped["breach"] / grouped["total"] * 100).round(2)
    grouped["_order"]     = grouped["urgency_label_true"].map(order)
    grouped = grouped.sort_values("_order").drop(columns=["_order"])
    return grouped.rename(columns={"urgency_label_true": "urgency"}).to_dict(orient="records")


def compute_avg_resolution_time(df: pd.DataFrame) -> list[dict]:
    """
    Hitung rata-rata hari penyelesaian per kategori (hanya status='Selesai').

    Returns
    -------
    list[dict] : [{"kategori": str, "avg_days": float, "count": int}]
                 Diurutkan dari avg_days tertinggi.
    """
    done = df[df["status"] == "Selesai"].copy()
    done["tanggal_masuk"]   = pd.to_datetime(done["tanggal_masuk"])
    done["tanggal_selesai"] = pd.to_datetime(done["tanggal_selesai"])
    done["resolution_days"] = (done["tanggal_selesai"] - done["tanggal_masuk"]).dt.days

    result = (
        done.groupby("kategori_true")["resolution_days"]
        .agg(avg_days="mean", count="count")
        .reset_index()
    )
    result["avg_days"] = result["avg_days"].round(2)
    result = result.sort_values("avg_days", ascending=False)
    return result.rename(columns={"kategori_true": "kategori"}).to_dict(orient="records")


# ── Trend Analytics ───────────────────────────────────────────────────────────

def compute_monthly_trend(df: pd.DataFrame,
                           category: Optional[str] = None,
                           top_n: int = 5) -> list[dict]:
    """
    Hitung jumlah masukan per bulan (opsional filter per kategori).

    Parameters
    ----------
    df       : DataFrame
    category : filter kategori spesifik (None = semua, atau list kategori)
    top_n    : jika category=None, hanya tampilkan top_n kategori terbanyak

    Returns
    -------
    list[dict] : [{"bulan": "YYYY-MM", "kategori": str, "jumlah": int}]
    """
    df = df.copy()
    df["tanggal_masuk"] = pd.to_datetime(df["tanggal_masuk"])
    df["bulan"]         = df["tanggal_masuk"].dt.to_period("M").astype(str)

    if category is not None:
        cats = [category] if isinstance(category, str) else category
        df   = df[df["kategori_true"].isin(cats)]
    else:
        # Ambil top_n kategori
        top_cats = df["kategori_true"].value_counts().nlargest(top_n).index.tolist()
        df       = df[df["kategori_true"].isin(top_cats)]

    grouped = (
        df.groupby(["bulan", "kategori_true"])
        .size()
        .reset_index(name="jumlah")
    )
    return grouped.rename(columns={"kategori_true": "kategori"}).to_dict(orient="records")


def detect_trend_anomalies(df: pd.DataFrame,
                            category: Optional[str] = None,
                            std_multiplier: float = 1.0) -> list[dict]:
    """
    Deteksi bulan dengan jumlah masukan di atas rata-rata + std_multiplier * std dev.

    Parameters
    ----------
    df              : DataFrame
    category        : kategori spesifik (None = semua kategori gabungan)
    std_multiplier  : threshold = mean + std_multiplier * std

    Returns
    -------
    list[dict] : [{"bulan": str, "kategori": str, "jumlah": int,
                   "mean": float, "threshold": float, "is_anomaly": bool}]
    """
    df = df.copy()
    df["tanggal_masuk"] = pd.to_datetime(df["tanggal_masuk"])
    df["bulan"]         = df["tanggal_masuk"].dt.to_period("M").astype(str)

    if category:
        df = df[df["kategori_true"] == category]
        group_cols = ["bulan"]
        cat_label  = category
    else:
        group_cols = ["bulan", "kategori_true"]
        cat_label  = None

    monthly = df.groupby(group_cols).size().reset_index(name="jumlah")

    results = []
    if cat_label:
        mean  = monthly["jumlah"].mean()
        std   = monthly["jumlah"].std()
        thresh = mean + std_multiplier * std
        for _, row in monthly.iterrows():
            results.append({
                "bulan":      row["bulan"],
                "kategori":   cat_label,
                "jumlah":     int(row["jumlah"]),
                "mean":       round(mean, 2),
                "threshold":  round(thresh, 2),
                "is_anomaly": bool(row["jumlah"] >= thresh),
            })
    else:
        for cat in monthly["kategori_true"].unique():
            sub    = monthly[monthly["kategori_true"] == cat]
            mean   = sub["jumlah"].mean()
            std    = sub["jumlah"].std(ddof=0)
            thresh = mean + std_multiplier * std
            for _, row in sub.iterrows():
                results.append({
                    "bulan":      row["bulan"],
                    "kategori":   cat,
                    "jumlah":     int(row["jumlah"]),
                    "mean":       round(mean, 2),
                    "threshold":  round(thresh, 2),
                    "is_anomaly": bool(row["jumlah"] >= thresh),
                })

    return sorted(results, key=lambda x: (x["kategori"], x["bulan"]))


def compute_stakeholder_monthly(df: pd.DataFrame) -> list[dict]:
    """
    Breakdown jumlah masukan per stakeholder_type per bulan.

    Returns
    -------
    list[dict] : [{"bulan": str, "stakeholder_type": str, "jumlah": int}]
    """
    df = df.copy()
    df["tanggal_masuk"] = pd.to_datetime(df["tanggal_masuk"])
    df["bulan"]         = df["tanggal_masuk"].dt.to_period("M").astype(str)

    grouped = (
        df.groupby(["bulan", "stakeholder_type"])
        .size()
        .reset_index(name="jumlah")
    )
    return grouped.to_dict(orient="records")


# ── Payload Builder (untuk JSON output & API) ─────────────────────────────────

def build_sla_analytics_payload(df: pd.DataFrame) -> dict:
    """
    Build payload JSON lengkap untuk SLA analytics.
    Siap disimpan ke data/output/sla_analytics.json dan di-serve via API.

    Returns
    -------
    dict dengan struktur:
    {
        "generated_at": str (ISO),
        "total_records": int,
        "overall_breach_pct": float,
        "by_category": [...],
        "by_urgency": [...],
        "avg_resolution_days": [...],
    }
    """
    overall_breach = round(df["sla_breach_true"].mean() * 100, 2)
    return {
        "generated_at":        datetime.now().isoformat(),
        "total_records":       len(df),
        "overall_breach_pct":  overall_breach,
        "by_category":         compute_sla_breach_by_category(df),
        "by_urgency":          compute_sla_breach_by_urgency(df),
        "avg_resolution_days": compute_avg_resolution_time(df),
    }


def build_trend_analytics_payload(df: pd.DataFrame, top_n: int = 5) -> dict:
    """
    Build payload JSON lengkap untuk trend analytics.
    Siap disimpan ke data/output/trend_analytics.json dan di-serve via API.

    Returns
    -------
    dict dengan struktur:
    {
        "generated_at": str,
        "total_records": int,
        "date_range": {"start": str, "end": str},
        "monthly_trend": [...],
        "anomalies": [...],
        "stakeholder_monthly": [...],
    }
    """
    df["tanggal_masuk"] = pd.to_datetime(df["tanggal_masuk"])
    return {
        "generated_at":       datetime.now().isoformat(),
        "total_records":      len(df),
        "date_range": {
            "start": df["tanggal_masuk"].min().strftime("%Y-%m-%d"),
            "end":   df["tanggal_masuk"].max().strftime("%Y-%m-%d"),
        },
        "monthly_trend":      compute_monthly_trend(df, top_n=top_n),
        "anomalies":          detect_trend_anomalies(df),
        "stakeholder_monthly": compute_stakeholder_monthly(df),
    }


def save_json(payload: dict, output_path: str) -> None:
    """Simpan dict ke file JSON dengan encoding UTF-8."""
    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2, default=str)
    print(f"[INFO] Saved: {path}")


if __name__ == "__main__":
    df = pd.read_json("../data/suaralens_dummy_simulasi.jsonl", lines=True)
    sla_payload   = build_sla_analytics_payload(df)
    trend_payload = build_trend_analytics_payload(df)

    save_json(sla_payload,   "../data/output/sla_analytics.json")
    save_json(trend_payload, "../data/output/trend_analytics.json")
    print("Done.")
