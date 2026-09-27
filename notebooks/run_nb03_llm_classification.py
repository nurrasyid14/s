"""
run_nb03_llm_classification.py
================================
NB 03 — LLM Engine: Klasifikasi Kategori & Urgency
SuaraLens | PENS

Script ini mengerjakan NB 03:
  - Diagnosa koneksi Ollama (cloud/lokal)
  - Klasifikasi 20 sampel stratified menggunakan LLM (qwen3:8b)
  - Benchmark waktu inference
  - Simpan hasil ke JSON + PKL

Cara menjalankan:
  cd c:\\EEPIS\\PROJECT\\SuaraLens
  python notebooks/run_nb03_llm_classification.py

Prasyarat:
  - Isi OLLAMA_API_KEY di file .env
  - pip install openai python-dotenv pandas scikit-learn
"""

import sys
import json
import time
import warnings
import pickle
warnings.filterwarnings('ignore')

from pathlib import Path

# Tambahkan path agar bisa import modules
sys.path.insert(0, str(Path(__file__).parent))

import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

from modules.llm_engine import (
    classify_llm, classify_llm_batch,
    check_ollama_status, VALID_CATEGORIES, SYSTEM_PROMPT,
    OLLAMA_API_MODE, OPENAI_BASE_URL
)

sns.set_theme(style='whitegrid')

# ── Konfigurasi Path ──────────────────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATA_PATH    = PROJECT_ROOT / "data" / "suaralens_dummy_simulasi.jsonl"
OUTPUT_DIR   = PROJECT_ROOT / "data" / "output"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

OUTPUT_JSON  = OUTPUT_DIR / "classification_results.json"
OUTPUT_PKL   = OUTPUT_DIR / "nb03_classification_results.pkl"

print("=" * 60)
print("NB 03 — LLM Klasifikasi Kategori & Urgency")
print(f"Project root : {PROJECT_ROOT}")
print(f"API Mode     : {OLLAMA_API_MODE.upper()}")
print(f"API URL      : {OPENAI_BASE_URL}")
print("=" * 60)


# ── Load Data ─────────────────────────────────────────────────────────────────
print("\n[1/6] Load dataset...")
df = pd.read_json(DATA_PATH, lines=True)
print(f"  Dataset: {len(df):,} baris")
print(f"  Kolom  : {df.columns.tolist()}")

# ── 1. Diagnostik Ollama ──────────────────────────────────────────────────────
print("\n[2/6] Diagnostik Ollama...")
status = check_ollama_status()
print("  === Status Ollama ===")
print(f"  Running        : {status['running']}")
print(f"  Mode           : {status.get('mode', 'unknown')}")
print(f"  Base URL       : {status.get('base_url', '-')}")
print(f"  Model tersedia : {status['available_models']}")
print(f"  Model dipilih  : {status['recommended_model']}")

if not status['running']:
    print("\n⚠ Ollama tidak dapat diakses!")
    print(f"  Error: {status.get('error')}")
    print("\n  Pastikan:")
    print("  1. OLLAMA_API_KEY sudah diset di .env")
    print("  2. Jika lokal: jalankan 'ollama serve'")
    print("  3. Jika cloud: API key valid dari https://ollama.com/settings/api-keys")
    sys.exit(1)

# ── 2. Review System Prompt ───────────────────────────────────────────────────
print("\n[3/6] Review System Prompt...")
print(f"  Panjang prompt : {len(SYSTEM_PROMPT)} karakter")
print(f"  Kategori valid : {len(VALID_CATEGORIES)} kategori")
for cat in VALID_CATEGORIES:
    print(f"    - {cat}")

# ── 3. Uji pada 20 Sampel Stratified ─────────────────────────────────────────
print("\n[4/6] Klasifikasi 20 sampel stratified...")

sample_df = (
    df.groupby('kategori_true', group_keys=False)
      .apply(lambda x: x.sample(max(1, min(2, len(x))), random_state=42))
      .sample(min(20, len(df)), random_state=42)
      .reset_index(drop=True)
)

model_name = status.get('recommended_model')
print(f"  Model          : {model_name}")
print(f"  Sampel         : {len(sample_df)} baris")
print(f"  (Estimasi waktu: ~20-60 detik tergantung hardware/jaringan)\n")

llm_results = []
times       = []

for idx, (_, row) in enumerate(sample_df.iterrows()):
    start  = time.time()
    result = classify_llm(row['teks_aduan'], model=model_name)
    elapsed = time.time() - start
    times.append(elapsed)

    pred_kat = result.get('kategori') if result else "ERR"
    true_kat = row['kategori_true']
    match    = "✓" if pred_kat == true_kat else "✗"

    llm_results.append({
        'id_aduan':        row['id_aduan'],
        'kategori_true':   true_kat,
        'kategori_pred':   result.get('kategori')      if result else None,
        'urgency_true':    row['urgency_label_true'],
        'urgency_pred':    result.get('urgency_label') if result else None,
        'urgency_score':   result.get('urgency_score') if result else None,
        'confidence':      result.get('confidence')    if result else None,
        'urgency_reason':  result.get('urgency_reason', '')[:80] if result else None,
        'inference_time':  round(elapsed, 2),
        'error':           result.get('error')         if result else 'None returned',
    })

    print(f"  [{idx+1:02d}/20] {match} | {row['id_aduan']} | "
          f"pred={pred_kat:<30} | true={true_kat}")

df_results = pd.DataFrame(llm_results)
print(f"\n  Selesai. Avg inference time: {sum(times)/len(times):.2f}s / teks")

# ── 4. Hasil vs Ground Truth ──────────────────────────────────────────────────
print("\n[5/6] Evaluasi hasil...")
n_correct = (df_results['kategori_true'] == df_results['kategori_pred']).sum()
n_total   = len(df_results)
n_error   = df_results['error'].notna().sum()

print(f"\n  === Ringkasan 20 Sampel ===")
print(f"  Akurasi kategori : {n_correct}/{n_total} ({n_correct/n_total*100:.1f}%)")
print(f"  Error / None     : {n_error}/{n_total}")
print(f"  (Ini hanya sanity check awal — evaluasi formal ada di NB 05)")
print()
print(df_results[[
    'id_aduan', 'kategori_true', 'kategori_pred',
    'urgency_true', 'urgency_pred', 'confidence', 'inference_time'
]].to_string(index=False))

# ── 5. Benchmark Waktu Inference ──────────────────────────────────────────────
avg_time        = sum(times) / len(times)
total_estimated = avg_time * len(df) / 60

print(f"\n  === Benchmark Inference ===")
print(f"  Sampel diukur   : {len(times)} teks")
print(f"  Rata-rata        : {avg_time:.2f} detik/teks")
print(f"  Estimasi total   : {total_estimated:.1f} menit untuk {len(df):,} baris")
print(f"  Model digunakan  : {model_name}")

# ── 6. Simpan Hasil ───────────────────────────────────────────────────────────
print(f"\n[6/6] Simpan hasil...")

# JSON
output = {
    'generated_at':     pd.Timestamp.now().isoformat(),
    'model_used':       model_name,
    'api_mode':         OLLAMA_API_MODE,
    'sample_size':      len(llm_results),
    'accuracy_pct':     round(n_correct / n_total * 100, 2),
    'avg_inference_s':  round(avg_time, 3),
    'results':          llm_results,
}
with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
    json.dump(output, f, ensure_ascii=False, indent=2, default=str)
print(f"  ✓ JSON  : {OUTPUT_JSON}")

# PKL — simpan semua artefak penting
pkl_payload = {
    'df_results':     df_results,
    'llm_results':    llm_results,
    'model_name':     model_name,
    'api_mode':       OLLAMA_API_MODE,
    'times':          times,
    'accuracy_pct':   round(n_correct / n_total * 100, 2),
    'avg_time':       round(avg_time, 3),
    'status':         status,
    'generated_at':   pd.Timestamp.now().isoformat(),
}
with open(OUTPUT_PKL, 'wb') as f:
    pickle.dump(pkl_payload, f, protocol=pickle.HIGHEST_PROTOCOL)
print(f"  ✓ PKL   : {OUTPUT_PKL}")

print("\n✅ NB 03 selesai!")
