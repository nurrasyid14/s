"""
run_nb05_evaluation_pipeline.py
================================
NB 05 — Evaluasi Pipeline (Notebook Terpenting)
SuaraLens | PENS

Script ini mengerjakan evaluasi menyeluruh:
  - Stratified sample 500 baris
  - Evaluasi kategori LLM classification (precision, recall, F1)
  - Confusion matrix kategori
  - Self-consistency urgency (30 teks × 5 run)
  - Evaluasi sentimen pada subset
  - Confidence-based routing analysis
  - Ringkasan metrik lengkap untuk laporan akademik

Cara menjalankan:
  cd c:\\EEPIS\\PROJECT\\SuaraLens
  python notebooks/run_nb05_evaluation_pipeline.py

  Gunakan --quick untuk evaluasi cepat (50 sampel, 1 consistency run):
  python notebooks/run_nb05_evaluation_pipeline.py --quick

Perhatian:
  Mode full (500 sampel) estimasi waktu 10-60 menit tergantung hardware/API.
  Pertimbangkan jalankan overnight atau gunakan --quick untuk demo.
"""

import sys
import json
import time
import warnings
import pickle
import argparse
warnings.filterwarnings('ignore')

from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import (
    classification_report, confusion_matrix, accuracy_score
)

from modules.llm_engine        import classify_llm, check_ollama_status, VALID_CATEGORIES, OLLAMA_API_MODE
from modules.sentiment_model   import classify_sentiment_batch, load_sentiment_model

sns.set_theme(style='whitegrid')

# ── Argparse: --quick mode ────────────────────────────────────────────────────
parser = argparse.ArgumentParser(description='NB 05 Evaluation Pipeline')
parser.add_argument('--quick', action='store_true',
                    help='Quick mode: 50 sampel eval, 1 consistency run (untuk demo/testing)')
parser.add_argument('--n-eval', type=int, default=500,
                    help='Jumlah sampel evaluasi (default: 500)')
parser.add_argument('--n-consistency', type=int, default=30,
                    help='Jumlah teks untuk consistency test (default: 30)')
parser.add_argument('--n-runs', type=int, default=5,
                    help='Jumlah run per teks untuk consistency (default: 5)')
args = parser.parse_args()

if args.quick:
    N_EVAL        = 50
    N_CONSISTENCY = 5
    N_RUNS        = 2
    print("⚡ QUICK MODE aktif — 50 sampel eval, 5 consistency teks, 2 runs")
else:
    N_EVAL        = args.n_eval
    N_CONSISTENCY = args.n_consistency
    N_RUNS        = args.n_runs

# ── Konfigurasi Path ──────────────────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATA_PATH    = PROJECT_ROOT / "data" / "suaralens_dummy_simulasi.jsonl"
OUTPUT_DIR   = PROJECT_ROOT / "data" / "output"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

OUTPUT_JSON   = OUTPUT_DIR / "evaluation_report.json"
OUTPUT_PKL    = OUTPUT_DIR / "nb05_evaluation_report.pkl"
OUTPUT_CM_LLM = OUTPUT_DIR / "nb05_confusion_matrix_kategori.png"
OUTPUT_CM_SEN = OUTPUT_DIR / "nb05_confusion_matrix_sentimen.png"

print("=" * 60)
print("NB 05 — Evaluasi Pipeline (Notebook Terpenting)")
print(f"API Mode  : {OLLAMA_API_MODE.upper()}")
print(f"N_EVAL    : {N_EVAL} sampel")
print(f"N_CONSIST : {N_CONSISTENCY} teks × {N_RUNS} runs")
print("=" * 60)


# ── Load Data ─────────────────────────────────────────────────────────────────
print("\n[1/7] Load dataset & cek Ollama...")
df = pd.read_json(DATA_PATH, lines=True)
print(f"  Dataset: {len(df):,} baris")

status = check_ollama_status()
print(f"  Ollama status: {status['running']} | model: {status.get('recommended_model')}")
if not status['running']:
    print(f"  ⚠ Ollama error: {status.get('error')}")
    sys.exit(1)

model = status.get('recommended_model')

# ── 1. Stratified Sample ──────────────────────────────────────────────────────
print(f"\n[2/7] Stratified sample {N_EVAL} baris...")
sample_df = (
    df.groupby('kategori_true', group_keys=False)
      .apply(lambda x: x.sample(
          max(1, int(N_EVAL * len(x) / len(df))), random_state=42
      ))
      .head(N_EVAL)
      .reset_index(drop=True)
)
print(f"  Sampel evaluasi: {len(sample_df)} baris")
print("  Distribusi kategori:")
print(sample_df['kategori_true'].value_counts().to_string())

# ── 2. Evaluasi Kategori — LLM Classification ─────────────────────────────────
print(f"\n[3/7] LLM Classification pada {len(sample_df)} sampel...")
print(f"  Model   : {model}")
t_start = time.time()

llm_results = []
for i, (_, row) in enumerate(sample_df.iterrows()):
    result = classify_llm(row['teks_aduan'], model=model)
    llm_results.append({
        'id_aduan':           row['id_aduan'],
        'kategori_true':      row['kategori_true'],
        'urgency_true':       row['urgency_label_true'],
        'urgency_score_true': row['urgency_score_true'],
        'kategori_pred':      result.get('kategori')       if result else None,
        'urgency_pred':       result.get('urgency_label')  if result else None,
        'urgency_score_pred': result.get('urgency_score')  if result else None,
        'confidence':         result.get('confidence')     if result else None,
        'error':              result.get('error')          if result else 'None',
    })
    if (i + 1) % 10 == 0 or i == 0:
        elapsed = time.time() - t_start
        avg_s   = elapsed / (i + 1)
        remain  = avg_s * (len(sample_df) - i - 1) / 60
        print(f"  Progress: {i+1}/{len(sample_df)} | avg {avg_s:.1f}s/teks | "
              f"sisa ~{remain:.1f} mnt")

df_llm   = pd.DataFrame(llm_results)
df_valid = df_llm[df_llm['kategori_pred'].notna()]
print(f"\n  Berhasil: {len(df_valid)}/{len(df_llm)} ({len(df_valid)/len(df_llm)*100:.1f}%)")

# Classification Report
print("\n  === Classification Report — Kategori ===")
labels_used = [c for c in VALID_CATEGORIES if c in df_valid['kategori_true'].values or c in df_valid['kategori_pred'].values]
report = classification_report(
    df_valid['kategori_true'],
    df_valid['kategori_pred'],
    labels=labels_used,
    output_dict=True,
    zero_division=0
)
print(classification_report(
    df_valid['kategori_true'],
    df_valid['kategori_pred'],
    labels=labels_used,
    zero_division=0
))

# Confusion Matrix Kategori
cm_kat = confusion_matrix(
    df_valid['kategori_true'],
    df_valid['kategori_pred'],
    labels=labels_used
)
fig, ax = plt.subplots(figsize=(14, 10))
sns.heatmap(cm_kat, annot=True, fmt='d', cmap='Blues',
            xticklabels=labels_used, yticklabels=labels_used,
            linewidths=0.5, ax=ax)
ax.set_title(f'Confusion Matrix — Klasifikasi Kategori (n={len(df_valid)})')
ax.set_xlabel('Prediksi')
ax.set_ylabel('Ground Truth')
plt.xticks(rotation=45, ha='right')
plt.yticks(rotation=0)
plt.tight_layout()
plt.savefig(OUTPUT_CM_LLM, dpi=150, bbox_inches='tight')
plt.close()
print(f"  Confusion matrix saved: {OUTPUT_CM_LLM}")

# ── 3. Self-Consistency Urgency ────────────────────────────────────────────────
print(f"\n[4/7] Self-Consistency Urgency ({N_CONSISTENCY} teks × {N_RUNS} runs)...")
consistency_sample  = sample_df.sample(min(N_CONSISTENCY, len(sample_df)), random_state=99).reset_index(drop=True)
consistency_results = []

for i, (_, row) in enumerate(consistency_sample.iterrows()):
    runs = []
    for run in range(N_RUNS):
        res = classify_llm(row['teks_aduan'], model=model)
        runs.append({
            'urgency_label': res.get('urgency_label') if res else None,
            'urgency_score': res.get('urgency_score') if res else None,
        })

    scores = [r['urgency_score'] for r in runs if r['urgency_score'] is not None]
    labels = [r['urgency_label'] for r in runs if r['urgency_label'] is not None]

    consistency_results.append({
        'id_aduan':        row['id_aduan'],
        'urgency_true':    row['urgency_label_true'],
        'runs':            runs,
        'score_std':       round(float(np.std(scores)), 4)  if scores else None,
        'score_mean':      round(float(np.mean(scores)), 4) if scores else None,
        'exact_agreement': len(set(labels)) == 1            if labels else False,
    })
    if (i + 1) % 5 == 0 or i == 0:
        print(f"  Consistency progress: {i+1}/{N_CONSISTENCY}")

df_consistency = pd.DataFrame(consistency_results)
exact_rate = df_consistency['exact_agreement'].mean() * 100
avg_std    = df_consistency['score_std'].mean()

print(f"\n  === Self-Consistency Urgency Scoring ===")
print(f"  Sampel teks    : {N_CONSISTENCY}")
print(f"  Runs per teks  : {N_RUNS}")
print(f"  Exact agreement: {exact_rate:.1f}% (label sama di semua {N_RUNS} run)")
print(f"  Avg std score  : {avg_std:.4f}")
print()
print("  Interpretasi:")
if exact_rate >= 80:
    print(f"  ✓ Exact agreement tinggi ({exact_rate:.1f}%) = model konsisten")
else:
    print(f"  ⚠ Exact agreement rendah ({exact_rate:.1f}%) = pertimbangkan turunkan temperature")
if avg_std < 0.05:
    print(f"  ✓ Avg std rendah ({avg_std:.4f}) = variasi skor antar-run minimal")
else:
    print(f"  ⚠ Avg std tinggi ({avg_std:.4f}) = variabilitas cukup signifikan")

# ── 4. Evaluasi Sentimen ───────────────────────────────────────────────────────
print(f"\n[5/7] Evaluasi Sentimen pada {len(df_valid)} sampel...")
load_sentiment_model()

df_map   = df.set_index('id_aduan')
texts    = df_valid['id_aduan'].map(df_map['teks_aduan']).tolist()
sent_true = df_valid['id_aduan'].map(df_map['sentiment_true']).tolist()

sent_preds = classify_sentiment_batch(texts)
sent_pred  = [p['sentiment'] for p in sent_preds]

print("\n  === Classification Report — Sentimen ===")
sent_report = classification_report(
    sent_true, sent_pred,
    target_names=['negative', 'neutral', 'positive'],
    output_dict=True,
    zero_division=0
)
print(classification_report(
    sent_true, sent_pred,
    target_names=['negative', 'neutral', 'positive'],
    zero_division=0
))
print("  ⚠ CATATAN PENTING: sentiment_true adalah label sintetis dari generator data.")

# Confusion Matrix Sentimen
cm_sen = confusion_matrix(
    sent_true, sent_pred,
    labels=['negative', 'neutral', 'positive']
)
fig, ax = plt.subplots(figsize=(7, 5))
sns.heatmap(cm_sen, annot=True, fmt='d', cmap='Purples',
            xticklabels=['negative', 'neutral', 'positive'],
            yticklabels=['negative', 'neutral', 'positive'],
            linewidths=0.5, ax=ax)
ax.set_title(f'Confusion Matrix — Sentimen (n={len(df_valid)})')
ax.set_xlabel('Prediksi')
ax.set_ylabel('Ground Truth')
plt.tight_layout()
plt.savefig(OUTPUT_CM_SEN, dpi=150, bbox_inches='tight')
plt.close()

# ── 5. Confidence-Based Routing ────────────────────────────────────────────────
print(f"\n[6/7] Confidence-Based Routing Analysis...")
CONF_THRESHOLD = 0.75
HIGH_URGENCY   = ['High', 'Critical']

manual_review = df_llm[
    (df_llm['confidence'].fillna(0) < CONF_THRESHOLD) |
    (df_llm['urgency_pred'].isin(HIGH_URGENCY))
]
routing_pct = len(manual_review) / len(df_llm) * 100

print(f"  === Confidence-Based Routing ===")
print(f"  Threshold confidence : {CONF_THRESHOLD}")
print(f"  Total sampel evaluasi: {len(df_llm)}")
print(f"  Masuk antrian manual : {len(manual_review)} ({routing_pct:.1f}%)")
if routing_pct < 15:
    print("  ✓ Routing workload realistis — tidak terlalu membebani reviewer")
elif routing_pct > 50:
    print("  ⚠ Routing terlalu banyak — pertimbangkan naikkan threshold atau fine-tune")
else:
    print("  ✓ Routing dalam batas wajar")

# ── 6. Ringkasan Metrik ────────────────────────────────────────────────────────
print(f"\n[7/7] Ringkasan & Simpan...")

category_accuracy  = accuracy_score(df_valid['kategori_true'], df_valid['kategori_pred']) if len(df_valid) > 0 else 0
sentiment_accuracy = accuracy_score(sent_true, sent_pred)

summary_metrics = {
    'generated_at':         pd.Timestamp.now().isoformat(),
    'eval_sample_size':     len(sample_df),
    'valid_llm_responses':  len(df_valid),
    'api_mode':             OLLAMA_API_MODE,
    'model_used':           model,
    'quick_mode':           args.quick,
    'category': {
        'accuracy':                  round(category_accuracy * 100, 2),
        'macro_f1':                  round(report.get('macro avg', {}).get('f1-score', 0) * 100, 2),
        'weighted_f1':               round(report.get('weighted avg', {}).get('f1-score', 0) * 100, 2),
        'classification_report':     {k: v for k, v in report.items()
                                      if k in labels_used or k in ['accuracy', 'macro avg', 'weighted avg']},
    },
    'urgency_consistency': {
        'n_texts':             N_CONSISTENCY,
        'n_runs':              N_RUNS,
        'exact_agreement_pct': round(exact_rate, 2),
        'avg_score_std':       round(float(avg_std), 4) if not np.isnan(avg_std) else 0.0,
    },
    'sentiment': {
        'accuracy':   round(sentiment_accuracy * 100, 2),
        'macro_f1':   round(sent_report.get('macro avg', {}).get('f1-score', 0) * 100, 2),
        'caveat':     'Label sintetis — bukan ground truth manusia',
        'classification_report': sent_report,
    },
    'routing': {
        'threshold':         CONF_THRESHOLD,
        'manual_review_pct': round(routing_pct, 2),
        'manual_count':      len(manual_review),
    },
    'detail_results': llm_results[:50],  # 50 sampel untuk referensi
}

# Cetak ringkasan siap laporan
print("\n  === RINGKASAN METRIK (siap copy ke laporan akademik) ===")
print(f"  Akurasi kategori   : {category_accuracy*100:.2f}%")
print(f"  Macro F1 kategori  : {summary_metrics['category']['macro_f1']:.2f}%")
print(f"  Urgency consistency: {exact_rate:.1f}% exact agreement")
print(f"  Akurasi sentimen   : {sentiment_accuracy*100:.2f}% (label sintetis)")
print(f"  Manual routing     : {routing_pct:.1f}%")

# Simpan JSON
with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
    json.dump(summary_metrics, f, ensure_ascii=False, indent=2, default=str)
print(f"\n  ✓ JSON  : {OUTPUT_JSON}")

# Simpan PKL
pkl_payload = {
    'summary_metrics':    summary_metrics,
    'df_llm':             df_llm,
    'df_valid':           df_valid,
    'df_consistency':     df_consistency,
    'cm_kategori':        cm_kat,
    'cm_sentimen':        cm_sen,
    'sent_true':          sent_true,
    'sent_pred':          sent_pred,
    'category_accuracy':  category_accuracy,
    'sentiment_accuracy': sentiment_accuracy,
    'exact_rate':         exact_rate,
    'avg_std':            float(avg_std),
    'routing_pct':        routing_pct,
    'labels_used':        labels_used,
    'model_used':         model,
    'api_mode':           OLLAMA_API_MODE,
    'generated_at':       pd.Timestamp.now().isoformat(),
}
with open(OUTPUT_PKL, 'wb') as f:
    pickle.dump(pkl_payload, f, protocol=pickle.HIGHEST_PROTOCOL)
print(f"  ✓ PKL   : {OUTPUT_PKL}")
print(f"  ✓ Plot  : {OUTPUT_CM_LLM}")
print(f"  ✓ Plot  : {OUTPUT_CM_SEN}")

print("\n✅ NB 05 selesai!")
