"""
run_nb04_sentiment_model.py
============================
NB 04 — Model Sentimen (Pretrained HuggingFace)
SuaraLens | PENS

Script ini mengerjakan NB 04:
  - Load model w11wo/indonesian-roberta-base-sentiment-classifier
  - Klasifikasi sentimen 30 sampel proporsional (10/kelas)
  - Analisis performa per kanal (Informal vs Formal)
  - Simpan hasil ke JSON + PKL

Cara menjalankan:
  cd c:\\EEPIS\\PROJECT\\SuaraLens
  python notebooks/run_nb04_sentiment_model.py

Prasyarat:
  pip install transformers torch pandas scikit-learn seaborn
"""

import sys
import json
import warnings
import pickle
warnings.filterwarnings('ignore')

from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')   # non-interactive backend untuk server/script
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import classification_report, confusion_matrix

from modules.sentiment_model import classify_sentiment, classify_sentiment_batch, load_sentiment_model

sns.set_theme(style='whitegrid')

# ── Konfigurasi Path ──────────────────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATA_PATH    = PROJECT_ROOT / "data" / "suaralens_dummy_simulasi.jsonl"
OUTPUT_DIR   = PROJECT_ROOT / "data" / "output"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

OUTPUT_JSON  = OUTPUT_DIR / "sentiment_results.json"
OUTPUT_PKL   = OUTPUT_DIR / "nb04_sentiment_results.pkl"
OUTPUT_PLOT  = OUTPUT_DIR / "nb04_confusion_matrix.png"

print("=" * 60)
print("NB 04 — Model Sentimen (HuggingFace RoBERTa)")
print("=" * 60)

# ── Load Data ─────────────────────────────────────────────────────────────────
print("\n[1/5] Load dataset...")
df = pd.read_json(DATA_PATH, lines=True)
print(f"  Dataset: {len(df):,} baris")
print(f"  Distribusi sentimen:\n{df['sentiment_true'].value_counts().to_string()}")

# ── 1. Load Model ─────────────────────────────────────────────────────────────
print("\n[2/5] Load sentiment model...")
print("  (Download model pertama kali ~400MB, pastikan koneksi internet)")
pipe = load_sentiment_model()
print("  Model siap digunakan.")

# ── 2. Uji pada 30 Sampel Proporsional ───────────────────────────────────────
print("\n[3/5] Klasifikasi 30 sampel proporsional...")
sample_parts = []
for sent in ['negative', 'neutral', 'positive']:
    n_available = (df['sentiment_true'] == sent).sum()
    n_sample    = min(10, n_available)
    part = df[df['sentiment_true'] == sent].sample(n_sample, random_state=42)
    sample_parts.append(part)
    print(f"  {sent:<12}: {n_sample} sampel")

sample_df = pd.concat(sample_parts).reset_index(drop=True)
print(f"\n  Total sampel: {len(sample_df)} baris")
print("  Menjalankan inferensi batch...")

texts  = sample_df['teks_aduan'].tolist()
preds  = classify_sentiment_batch(texts)

sample_df['sentiment_pred']  = [p['sentiment'] for p in preds]
sample_df['sentiment_score'] = [p['score']     for p in preds]

# ── 3. Hasil vs Ground Truth ──────────────────────────────────────────────────
print("\n[4/5] Evaluasi...")

print("\n  === Sample Predictions (20 pertama) ===")
print(sample_df[[
    'id_aduan', 'sentiment_true', 'sentiment_pred', 'sentiment_score'
]].head(20).to_string(index=False))

print("\n  === Classification Report (30 sampel — sanity check awal) ===")
report_str = classification_report(
    sample_df['sentiment_true'],
    sample_df['sentiment_pred'],
    target_names=['negative', 'neutral', 'positive'],
    zero_division=0
)
print(report_str)

report_dict = classification_report(
    sample_df['sentiment_true'],
    sample_df['sentiment_pred'],
    target_names=['negative', 'neutral', 'positive'],
    output_dict=True,
    zero_division=0
)
print("  ⚠ CATATAN: Ini sanity check awal. Evaluasi formal (NB 05) menggunakan 500 sampel.")

# Confusion Matrix
cm = confusion_matrix(
    sample_df['sentiment_true'],
    sample_df['sentiment_pred'],
    labels=['negative', 'neutral', 'positive']
)
fig, ax = plt.subplots(figsize=(7, 5))
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
            xticklabels=['negative', 'neutral', 'positive'],
            yticklabels=['negative', 'neutral', 'positive'],
            linewidths=0.5, ax=ax)
ax.set_title('Confusion Matrix — Sentimen (30 Sampel)')
ax.set_xlabel('Prediksi')
ax.set_ylabel('Ground Truth')
plt.tight_layout()
plt.savefig(OUTPUT_PLOT, dpi=150, bbox_inches='tight')
plt.close()
print(f"\n  Plot disimpan: {OUTPUT_PLOT}")

# ── 4. Analisis: Informal vs Formal ──────────────────────────────────────────
print("\n  === Akurasi per Tipe Kanal ===")
informal_channels = ['WhatsApp', 'Medsos', 'Instagram']
formal_channels   = ['Email', 'Web Form', 'Surat']

df_sample_kanal = sample_df.copy()
df_sample_kanal['kanal_type'] = df_sample_kanal['kanal'].apply(
    lambda k: 'Informal' if k in informal_channels else
              'Formal'   if k in formal_channels   else 'Lainnya'
)

kanal_analysis = {}
for kanal_type in ['Informal', 'Formal', 'Lainnya']:
    subset = df_sample_kanal[df_sample_kanal['kanal_type'] == kanal_type]
    if len(subset) == 0:
        continue
    acc = (subset['sentiment_true'] == subset['sentiment_pred']).mean()
    kanal_analysis[kanal_type] = {'n': len(subset), 'accuracy_pct': round(acc * 100, 1)}
    print(f"  {kanal_type:<10} (n={len(subset):2d}): Accuracy = {acc*100:.1f}%")

print()
print("  Catatan: teks informal (singkatan, ALL CAPS, emoji) mungkin menurunkan akurasi.")
print("  Hasil ini adalah indikasi awal — perlu sampel lebih besar untuk kesimpulan definitif.")

# ── 5. Simpan Hasil ───────────────────────────────────────────────────────────
print(f"\n[5/5] Simpan hasil...")

results = []
for _, row in sample_df.iterrows():
    results.append({
        'id_aduan':        row['id_aduan'],
        'sentiment_true':  row['sentiment_true'],
        'sentiment_pred':  row['sentiment_pred'],
        'sentiment_score': row['sentiment_score'],
        'kanal':           row.get('kanal'),
    })

output = {
    'generated_at':  pd.Timestamp.now().isoformat(),
    'model_used':    'w11wo/indonesian-roberta-base-sentiment-classifier',
    'sample_size':   len(results),
    'accuracy_pct':  round(report_dict['accuracy'] * 100, 2),
    'classification_report': report_dict,
    'kanal_analysis': kanal_analysis,
    'results':       results,
    'caveats': [
        'Label sentiment_true adalah label sintetis dari generator data, bukan anotasi manusia.',
        'Evaluasi formal dilakukan di NB 05 dengan 500 sampel.',
        'Performa pada teks informal belum tervalidasi dengan dataset representatif.',
    ]
}

with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
    json.dump(output, f, ensure_ascii=False, indent=2)
print(f"  ✓ JSON  : {OUTPUT_JSON}")

# PKL
pkl_payload = {
    'sample_df':         sample_df,
    'preds':             preds,
    'report_dict':       report_dict,
    'kanal_analysis':    kanal_analysis,
    'confusion_matrix':  cm,
    'model_name':        'w11wo/indonesian-roberta-base-sentiment-classifier',
    'generated_at':      pd.Timestamp.now().isoformat(),
}
with open(OUTPUT_PKL, 'wb') as f:
    pickle.dump(pkl_payload, f, protocol=pickle.HIGHEST_PROTOCOL)
print(f"  ✓ PKL   : {OUTPUT_PKL}")
print(f"  ✓ Plot  : {OUTPUT_PLOT}")

print("\n✅ NB 04 selesai!")
