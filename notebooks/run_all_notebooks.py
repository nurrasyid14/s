"""
run_all_notebooks.py
====================
Master runner untuk NB 03-07 SuaraLens | PENS

Menjalankan semua notebook secara berurutan dan menghasilkan
final PKL report yang berisi semua artefak.

Cara menjalankan:
  # Full run (sangat lama ~30-60 menit)
  python notebooks/run_all_notebooks.py

  # Quick mode (untuk testing/demo, ~5-15 menit)
  python notebooks/run_all_notebooks.py --quick

  # Pilih notebook tertentu
  python notebooks/run_all_notebooks.py --only 03 04 06

Prasyarat:
  1. Isi OLLAMA_API_KEY di file .env
  2. pip install openai python-dotenv pandas numpy scikit-learn
     transformers torch seaborn matplotlib joblib
"""

import sys
import time
import pickle
import argparse
import subprocess
import warnings
warnings.filterwarnings('ignore')

from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
NOTEBOOKS_DIR = PROJECT_ROOT / "notebooks"
OUTPUT_DIR    = PROJECT_ROOT / "data" / "output"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

FINAL_PKL = OUTPUT_DIR / "suaralens_final_report.pkl"

# ── Argparse ──────────────────────────────────────────────────────────────────
parser = argparse.ArgumentParser(description='SuaraLens Master Runner NB 03-07')
parser.add_argument('--quick', action='store_true',
                    help='Quick mode untuk testing (50 sampel eval, kurangi consistency run)')
parser.add_argument('--only', nargs='+', type=str, default=['03', '04', '05', '06', '07'],
                    help='Pilih notebook yang ingin dijalankan (default: semua)')
parser.add_argument('--skip-llm', action='store_true',
                    help='Skip notebook yang butuh LLM (03, 05, 07) — hanya jalankan 04 dan 06')
args = parser.parse_args()

notebooks_map = {
    '03': ('run_nb03_llm_classification.py',    'LLM Klasifikasi Kategori & Urgency',  True),  # (script, name, needs_llm)
    '04': ('run_nb04_sentiment_model.py',        'Sentiment Model (HuggingFace)',        False),
    '05': ('run_nb05_evaluation_pipeline.py',    'Evaluasi Pipeline',                   True),
    '06': ('run_nb06_sla_trend_analytics.py',    'SLA & Trend Analytics',               False),
    '07': ('run_nb07_ai_summary_grounded.py',    'Ringkasan AI Grounded',               True),
}

# Filter notebook yang akan dijalankan
to_run = []
for nb_id in sorted(args.only):
    if nb_id in notebooks_map:
        script, name, needs_llm = notebooks_map[nb_id]
        if args.skip_llm and needs_llm:
            print(f"[SKIP] NB {nb_id} — {name} (butuh LLM, --skip-llm aktif)")
            continue
        to_run.append((nb_id, script, name))
    else:
        print(f"[WARN] Notebook ID '{nb_id}' tidak dikenal, skip.")

print("=" * 60)
print("SuaraLens — Master Runner NB 03-07")
print(f"Mode     : {'QUICK' if args.quick else 'FULL'}")
print(f"Notebook : {[nb[0] for nb in to_run]}")
print("=" * 60)
print()

# ── Jalankan Satu per Satu ─────────────────────────────────────────────────────
results = {}
t_total = time.time()

for nb_id, script, name in to_run:
    script_path = NOTEBOOKS_DIR / script
    print(f"\n{'='*60}")
    print(f"▶ Menjalankan NB {nb_id}: {name}")
    print(f"  Script: {script_path}")
    print(f"{'='*60}")

    cmd = [sys.executable, str(script_path)]
    if args.quick and nb_id == '05':
        cmd.append('--quick')

    t_start = time.time()
    proc = subprocess.run(
        cmd,
        cwd=str(PROJECT_ROOT),
        capture_output=False,   # tampilkan output langsung
        text=True,
    )
    elapsed = time.time() - t_start

    if proc.returncode == 0:
        print(f"\n  ✅ NB {nb_id} selesai dalam {elapsed:.1f} detik")
        results[nb_id] = {'status': 'success', 'elapsed_s': round(elapsed, 1)}
    else:
        print(f"\n  ❌ NB {nb_id} GAGAL (exit code {proc.returncode}) dalam {elapsed:.1f} detik")
        results[nb_id] = {'status': 'failed', 'elapsed_s': round(elapsed, 1), 'exit_code': proc.returncode}

# ── Compile Final PKL ─────────────────────────────────────────────────────────
print(f"\n{'='*60}")
print("▶ Mengompilasi Final Report PKL...")
print(f"{'='*60}")

import pandas as pd

final_report = {
    'generated_at':   pd.Timestamp.now().isoformat(),
    'run_summary':    results,
    'total_elapsed_s': round(time.time() - t_total, 1),
    'quick_mode':     args.quick,
    'notebooks_run':  [nb[0] for nb in to_run],
}

# Load semua PKL individual dan gabungkan
pkl_files = {
    'nb03': OUTPUT_DIR / "nb03_classification_results.pkl",
    'nb04': OUTPUT_DIR / "nb04_sentiment_results.pkl",
    'nb05': OUTPUT_DIR / "nb05_evaluation_report.pkl",
    'nb06': OUTPUT_DIR / "nb06_sla_trend_analytics.pkl",
    'nb07': OUTPUT_DIR / "nb07_ai_summary.pkl",
}

loaded_artifacts = {}
for key, pkl_path in pkl_files.items():
    nb_id = key[-2:]
    if pkl_path.exists():
        try:
            with open(pkl_path, 'rb') as f:
                loaded_artifacts[key] = pickle.load(f)
            print(f"  ✓ Loaded {key}: {pkl_path.name}")
        except Exception as e:
            print(f"  ⚠ Gagal load {key}: {e}")
            loaded_artifacts[key] = None
    else:
        status = results.get(nb_id, {}).get('status', 'not_run')
        print(f"  - Skip {key}: file tidak ada (status: {status})")
        loaded_artifacts[key] = None

final_report['artifacts'] = loaded_artifacts

# Buat ringkasan metrik utama (jika nb05 berhasil)
if loaded_artifacts.get('nb05'):
    nb05 = loaded_artifacts['nb05']
    sm   = nb05.get('summary_metrics', {})
    final_report['key_metrics'] = {
        'category_accuracy_pct':   sm.get('category', {}).get('accuracy', None),
        'category_macro_f1_pct':   sm.get('category', {}).get('macro_f1', None),
        'sentiment_accuracy_pct':  sm.get('sentiment', {}).get('accuracy', None),
        'urgency_exact_agree_pct': sm.get('urgency_consistency', {}).get('exact_agreement_pct', None),
        'routing_manual_pct':      sm.get('routing', {}).get('manual_review_pct', None),
        'model_used':              sm.get('model_used'),
        'api_mode':                sm.get('api_mode'),
        'eval_sample_size':        sm.get('eval_sample_size'),
    }

# Simpan Final PKL
with open(FINAL_PKL, 'wb') as f:
    pickle.dump(final_report, f, protocol=pickle.HIGHEST_PROTOCOL)
print(f"\n  ✅ Final PKL disimpan: {FINAL_PKL}")

# ── Ringkasan Akhir ────────────────────────────────────────────────────────────
print(f"\n{'='*60}")
print("RINGKASAN EKSEKUSI")
print(f"{'='*60}")
print(f"Total waktu  : {final_report['total_elapsed_s']} detik ({final_report['total_elapsed_s']/60:.1f} menit)")
print()
for nb_id, info in results.items():
    icon = "✅" if info['status'] == 'success' else "❌"
    _, _, name = notebooks_map[nb_id]
    print(f"  {icon} NB {nb_id}: {name:<40} ({info['elapsed_s']}s)")

if 'key_metrics' in final_report:
    km = final_report['key_metrics']
    print(f"\n  === Metrik Kunci (dari NB 05) ===")
    print(f"  Akurasi Kategori  : {km.get('category_accuracy_pct', 'N/A')}%")
    print(f"  Macro F1 Kategori : {km.get('category_macro_f1_pct', 'N/A')}%")
    print(f"  Akurasi Sentimen  : {km.get('sentiment_accuracy_pct', 'N/A')}%")
    print(f"  Urgency Consistency: {km.get('urgency_exact_agree_pct', 'N/A')}%")
    print(f"  Manual Routing    : {km.get('routing_manual_pct', 'N/A')}%")
    print(f"  Model             : {km.get('model_used', 'N/A')}")

print(f"\n  Final PKL: {FINAL_PKL}")
print(f"\n  Output lainnya di: {OUTPUT_DIR}")
print(f"    ├── classification_results.json")
print(f"    ├── sentiment_results.json")
print(f"    ├── evaluation_report.json")
print(f"    ├── sla_analytics.json")
print(f"    ├── trend_analytics.json")
print(f"    ├── ai_summary.json")
print(f"    └── *.pkl (per-notebook + final)")

failed = [nb for nb, info in results.items() if info['status'] == 'failed']
if failed:
    print(f"\n  ⚠ Notebook gagal: {failed}")
    print("  Cek error di atas dan pastikan:")
    print("  1. OLLAMA_API_KEY sudah benar di .env")
    print("  2. Semua dependencies terinstall")
    sys.exit(1)
else:
    print(f"\n🎉 Semua notebook berhasil dijalankan!")
