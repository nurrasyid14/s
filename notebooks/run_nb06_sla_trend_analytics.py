"""
run_nb06_sla_trend_analytics.py
================================
NB 06 — SLA & Trend Analytics
SuaraLens | PENS

Script ini mengerjakan:
  - SLA Breach per kategori & urgency
  - Rata-rata waktu penyelesaian per kategori
  - Tren bulanan (top 5 kategori)
  - Deteksi lonjakan/anomali
  - Breakdown stakeholder per bulan
  - Simpan payload JSON & PKL

Tidak menggunakan LLM — murni agregasi data.
Estimasi waktu: < 1 menit.

Cara menjalankan:
  cd c:\\EEPIS\\PROJECT\\SuaraLens
  python notebooks/run_nb06_sla_trend_analytics.py
"""

import sys
import warnings
import pickle
warnings.filterwarnings('ignore')

from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.ticker as mtick
import seaborn as sns

from modules.analytics import (
    compute_sla_breach_by_category,
    compute_sla_breach_by_urgency,
    compute_avg_resolution_time,
    compute_monthly_trend,
    detect_trend_anomalies,
    compute_stakeholder_monthly,
    build_sla_analytics_payload,
    build_trend_analytics_payload,
    save_json,
)

sns.set_theme(style='whitegrid')

# ── Konfigurasi Path ──────────────────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATA_PATH    = PROJECT_ROOT / "data" / "suaralens_dummy_simulasi.jsonl"
OUTPUT_DIR   = PROJECT_ROOT / "data" / "output"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

OUTPUT_SLA_JSON   = str(OUTPUT_DIR / "sla_analytics.json")
OUTPUT_TREND_JSON = str(OUTPUT_DIR / "trend_analytics.json")
OUTPUT_PKL        = OUTPUT_DIR / "nb06_sla_trend_analytics.pkl"
OUTPUT_PLOT_SLA   = OUTPUT_DIR / "nb06_sla_breach_kategori.png"
OUTPUT_PLOT_TREND = OUTPUT_DIR / "nb06_trend_bulanan.png"
OUTPUT_PLOT_STAKE = OUTPUT_DIR / "nb06_stakeholder_monthly.png"

print("=" * 60)
print("NB 06 — SLA & Trend Analytics")
print("  (Murni agregasi data — tanpa LLM)")
print("=" * 60)

# ── Load Data ─────────────────────────────────────────────────────────────────
print("\n[1/6] Load dataset...")
df = pd.read_json(DATA_PATH, lines=True)
print(f"  Dataset     : {len(df):,} baris")
print(f"  Periode     : {df['tanggal_masuk'].min()} → {df['tanggal_masuk'].max()}")
print(f"  Kategori    : {df['kategori_true'].nunique()} unik")
print(f"  Stakeholder : {df['stakeholder_type'].value_counts().to_dict()}")

# ── 1. SLA Breach per Kategori ────────────────────────────────────────────────
print("\n[2/6] SLA Breach per Kategori...")
sla_by_cat = compute_sla_breach_by_category(df)
df_sla_cat = pd.DataFrame(sla_by_cat)

print(df_sla_cat.to_string(index=False))

fig, ax = plt.subplots(figsize=(10, 6))
colors = sns.color_palette('RdYlGn_r', len(df_sla_cat))
bars = ax.barh(df_sla_cat['kategori'], df_sla_cat['breach_pct'], color=colors)
ax.set_xlabel('SLA Breach (%)')
ax.set_title('Persentase SLA Breach per Kategori (SuaraLens)')
mean_breach = df_sla_cat['breach_pct'].mean()
ax.axvline(mean_breach, color='navy', linestyle='--', alpha=0.7,
           label=f'Rata-rata: {mean_breach:.1f}%')
ax.legend()
for bar, row in zip(bars, df_sla_cat.itertuples()):
    ax.text(bar.get_width() + 0.3, bar.get_y() + bar.get_height()/2,
            f'{row.breach_pct:.1f}%', va='center', fontsize=9)
ax.invert_yaxis()
plt.tight_layout()
plt.savefig(OUTPUT_PLOT_SLA, dpi=150, bbox_inches='tight')
plt.close()
print(f"  Plot disimpan: {OUTPUT_PLOT_SLA}")

# ── 2. SLA Breach per Urgency & Rata-rata Resolusi ────────────────────────────
print("\n[3/6] SLA Breach per Urgency & Waktu Penyelesaian...")
sla_by_urg = compute_sla_breach_by_urgency(df)
df_sla_urg = pd.DataFrame(sla_by_urg)
avg_res    = compute_avg_resolution_time(df)
df_avg     = pd.DataFrame(avg_res)

print("  SLA Breach per Urgency:")
print(df_sla_urg.to_string(index=False))
print("\n  Avg Resolution Days per Kategori:")
print(df_avg.to_string(index=False))

# ── 3. Tren Bulanan (Top 5) ───────────────────────────────────────────────────
print("\n[4/6] Tren Bulanan (Top 5 Kategori)...")
trend_data = compute_monthly_trend(df, top_n=5)
df_trend   = pd.DataFrame(trend_data)

fig, ax = plt.subplots(figsize=(13, 5))
for cat in df_trend['kategori'].unique():
    sub = df_trend[df_trend['kategori'] == cat]
    ax.plot(sub['bulan'], sub['jumlah'], marker='o', label=cat, linewidth=2)

ax.set_title('Tren Jumlah Masukan per Bulan (Top 5 Kategori)')
ax.set_xlabel('Bulan')
ax.set_ylabel('Jumlah Masukan')
ax.legend(loc='upper left', fontsize=9)
ax.tick_params(axis='x', rotation=30)
plt.tight_layout()
plt.savefig(OUTPUT_PLOT_TREND, dpi=150, bbox_inches='tight')
plt.close()
print(f"  Plot disimpan: {OUTPUT_PLOT_TREND}")

# ── 4. Deteksi Anomali ────────────────────────────────────────────────────────
print("\n[5/6] Deteksi Lonjakan (Anomali)...")
anomalies   = detect_trend_anomalies(df)
df_anom     = pd.DataFrame(anomalies)
df_flagged  = df_anom[df_anom['is_anomaly'] == True]

print(f"  Total anomali terdeteksi: {len(df_flagged)} bulan-kategori")
if len(df_flagged) > 0:
    print("\n  Top 15 anomali:")
    print(df_flagged.sort_values('jumlah', ascending=False).head(15).to_string(index=False))

# ── 5. Stakeholder per Bulan ──────────────────────────────────────────────────
print("\n  Stakeholder per Bulan:")
sh_monthly = compute_stakeholder_monthly(df)
df_sh      = pd.DataFrame(sh_monthly)

fig, ax = plt.subplots(figsize=(13, 5))
for sh in df_sh['stakeholder_type'].unique():
    sub = df_sh[df_sh['stakeholder_type'] == sh]
    ax.plot(sub['bulan'], sub['jumlah'], marker='s', label=sh, linewidth=2)

ax.set_title('Jumlah Masukan per Stakeholder per Bulan')
ax.set_xlabel('Bulan')
ax.set_ylabel('Jumlah')
ax.legend()
ax.tick_params(axis='x', rotation=30)
plt.tight_layout()
plt.savefig(OUTPUT_PLOT_STAKE, dpi=150, bbox_inches='tight')
plt.close()
print(f"  Plot disimpan: {OUTPUT_PLOT_STAKE}")

# ── 6. Simpan Payload ─────────────────────────────────────────────────────────
print(f"\n[6/6] Simpan payload JSON & PKL...")
sla_payload   = build_sla_analytics_payload(df)
trend_payload = build_trend_analytics_payload(df, top_n=5)

save_json(sla_payload,   OUTPUT_SLA_JSON)
save_json(trend_payload, OUTPUT_TREND_JSON)

# PKL — semua artefak
pkl_payload = {
    'sla_payload':     sla_payload,
    'trend_payload':   trend_payload,
    'df_sla_cat':      df_sla_cat,
    'df_sla_urg':      df_sla_urg,
    'df_avg':          df_avg,
    'df_trend':        df_trend,
    'df_anomalies':    df_anom,
    'df_flagged':      df_flagged,
    'df_sh':           df_sh,
    'generated_at':    pd.Timestamp.now().isoformat(),
}
with open(OUTPUT_PKL, 'wb') as f:
    pickle.dump(pkl_payload, f, protocol=pickle.HIGHEST_PROTOCOL)
print(f"  ✓ PKL   : {OUTPUT_PKL}")

# ── Insight ───────────────────────────────────────────────────────────────────
print("\n  === Insight Utama ===")
top_breach = df_sla_cat.iloc[0]
print(f"  1. Kategori breach tertinggi : {top_breach['kategori']} ({top_breach['breach_pct']}%)")
print(f"  2. Avg breach keseluruhan    : {sla_payload['overall_breach_pct']}%")
print(f"  3. Anomali terdeteksi        : {len(df_flagged)} bulan-kategori")
top_cat = df['kategori_true'].value_counts().index[0]
print(f"  4. Kategori terbanyak        : {top_cat} ({df['kategori_true'].value_counts().iloc[0]} masukan)")
top_stakeholder = df['stakeholder_type'].value_counts().index[0]
print(f"  5. Stakeholder dominan       : {top_stakeholder}")

print("\n✅ NB 06 selesai!")
