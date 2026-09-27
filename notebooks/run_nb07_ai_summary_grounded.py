"""
run_nb07_ai_summary_grounded.py
================================
NB 07 — Ringkasan AI Grounded
SuaraLens | PENS

Script ini mengerjakan:
  - Siapkan data agregat dari analytics (bukan teks mentah!)
  - Generate ringkasan naratif menggunakan LLM (grounded)
  - Uji 4 skenario data berbeda
  - Skenario jebakan: data minim
  - Grounding check (verifikasi angka terhadap input)
  - Simpan hasil ke JSON + PKL

Prinsip grounded AI: LLM hanya menerima angka agregat,
BUKAN teks aduan mentah, untuk meminimalkan risiko halusinasi.

Cara menjalankan:
  cd c:\\EEPIS\\PROJECT\\SuaraLens
  python notebooks/run_nb07_ai_summary_grounded.py
"""

import sys
import json
import warnings
import pickle
warnings.filterwarnings('ignore')

from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import pandas as pd

from modules.analytics  import build_sla_analytics_payload, build_trend_analytics_payload
from modules.ai_summary import generate_summary, check_grounding, generate_summary_template, save_summary_json
from modules.llm_engine import check_ollama_status, OLLAMA_API_MODE

# ── Konfigurasi Path ──────────────────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATA_PATH    = PROJECT_ROOT / "data" / "suaralens_dummy_simulasi.jsonl"
OUTPUT_DIR   = PROJECT_ROOT / "data" / "output"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

OUTPUT_JSON = str(OUTPUT_DIR / "ai_summary.json")
OUTPUT_PKL  = OUTPUT_DIR / "nb07_ai_summary.pkl"

print("=" * 60)
print("NB 07 — Ringkasan AI Grounded")
print(f"API Mode  : {OLLAMA_API_MODE.upper()}")
print("Prinsip   : LLM hanya terima angka, bukan teks mentah")
print("=" * 60)

# ── Load Data & Cek Ollama ─────────────────────────────────────────────────────
print("\n[1/6] Load data & cek Ollama...")
df = pd.read_json(DATA_PATH, lines=True)
print(f"  Dataset: {len(df):,} baris")

status = check_ollama_status()
print(f"  Ollama  : {status['running']} | model: {status.get('recommended_model')}")
if not status['running']:
    print(f"  ⚠ Ollama error: {status.get('error')}")
    sys.exit(1)

model = status.get('recommended_model')

# ── 1. Siapkan Data Agregat ────────────────────────────────────────────────────
print("\n[2/6] Siapkan data agregat...")
sla_data   = build_sla_analytics_payload(df)
trend_data = build_trend_analytics_payload(df, top_n=5)

# Kombinasikan untuk ringkasan komprehensif
top3_kategori = [
    {'kategori': k, 'jumlah': int(v)}
    for k, v in df['kategori_true'].value_counts().head(3).items()
]

combined_data = {
    'periode':             trend_data['date_range'],
    'total_masukan':       sla_data['total_records'],
    'overall_breach_pct':  sla_data['overall_breach_pct'],
    'top3_breach_kategori': sla_data['by_category'][:3],
    'top3_kategori':       top3_kategori,
    'avg_resolution_top3': sla_data['avg_resolution_days'][:3],
    'urgency_breach':      sla_data['by_urgency'],
}

print("  Data agregat siap:")
preview = json.dumps(combined_data, ensure_ascii=False, indent=2, default=str)
print(preview[:800] + "\n  ...")

# ── 2. Generate Ringkasan — Skenario Normal ────────────────────────────────────
print("\n[3/6] Generate ringkasan utama...")
result = generate_summary(combined_data, model=model, context='laporan bulanan SuaraLens PENS')

print("\n  === Ringkasan AI ===")
print(f"  {result.get('summary', '[GAGAL]')}")
print(f"\n  Model   : {result['model_used']}")
print(f"  Waktu   : {result['inference_time_s']}s")
print(f"  Error   : {result['error']}")

# ── 3. Uji Grounding ──────────────────────────────────────────────────────────
print("\n[4/6] Grounding check...")
grounding = check_grounding(result.get('summary', ''), combined_data)
print(f"  Angka dalam ringkasan     : {grounding['numbers_in_summary']}")
print(f"  Berpotensi tidak grounded : {grounding['potentially_ungrounded']}")
print(f"  Catatan                   : {grounding['grounding_note']}")

# ── 4. Uji 4 Skenario Data Berbeda ────────────────────────────────────────────
print("\n[5/6] Uji 4 skenario & skenario jebakan...")

scenarios = [
    {
        'label': 'Skenario 1: Breach Rendah',
        'data': {
            'total_masukan': 1200,
            'overall_breach_pct': 8.5,
            'top3_breach_kategori': [
                {'kategori': 'Fasilitas',        'breach_pct': 12.0},
                {'kategori': 'Sarana IT',         'breach_pct': 9.1},
                {'kategori': 'Parkir & Keamanan', 'breach_pct': 7.3},
            ]
        }
    },
    {
        'label': 'Skenario 2: Breach Sangat Tinggi',
        'data': {
            'total_masukan': 3500,
            'overall_breach_pct': 58.2,
            'top3_breach_kategori': [
                {'kategori': 'Keuangan',  'breach_pct': 71.0},
                {'kategori': 'Akademik',  'breach_pct': 65.4},
                {'kategori': 'Fasilitas', 'breach_pct': 52.8},
            ]
        }
    },
    {
        'label': 'Skenario 3: Volume Tinggi tapi Breach Moderat',
        'data': {
            'total_masukan':      8900,
            'overall_breach_pct': 25.0,
            'dominan_kategori':   'Akademik',
            'avg_resolution_days': 7.2,
        }
    },
    {
        'label': 'Skenario 4: Data Lengkap Multiaspek',
        'data': combined_data
    },
]

scenario_results = []
for scenario in scenarios:
    print(f"\n  --- {scenario['label']} ---")
    res = generate_summary(scenario['data'], model=model, context=scenario['label'])
    gr  = check_grounding(res.get('summary', ''), scenario['data'])

    summary_text = res.get('summary', '[GAGAL]')
    print(f"  {summary_text}")
    print(f"  Ungrounded numbers: {gr['potentially_ungrounded']}")

    scenario_results.append({
        'scenario':  scenario['label'],
        'summary':   summary_text,
        'grounding': gr,
        'model':     res.get('model_used'),
        'time_s':    res.get('inference_time_s'),
    })

# ── 5. Skenario Jebakan: Data Minim ───────────────────────────────────────────
print("\n  --- Skenario Jebakan: Data Sangat Minim ---")
trap_data = {
    'total_masukan': 12,
    'periode': {'start': '2026-08-01', 'end': '2026-08-07'},
    # Sengaja tidak ada breakdown kategori, breach, dll
}

trap_result   = generate_summary(trap_data, model=model, context='laporan mingguan (data sangat terbatas)')
trap_grounding = check_grounding(trap_result.get('summary', ''), trap_data)

print(f"  Summary: {trap_result.get('summary', '[GAGAL]')}")
print(f"  Grounding: {trap_grounding['grounding_note']}")
print()
print("  Analisis: Apakah model jujur mengakui data terbatas, atau tetap mengarang?")
if trap_result.get('summary'):
    word_count = len(trap_result['summary'].split())
    print(f"  Jumlah kata output : {word_count}")
    print(f"  Ungrounded numbers : {trap_grounding['potentially_ungrounded']}")

# Template Fallback Demo
print("\n  --- Template Fallback (Zero-Hallucination) ---")
template_result = generate_summary_template(sla_data)
print(f"  {template_result['summary']}")

# ── 6. Simpan Hasil ───────────────────────────────────────────────────────────
print(f"\n[6/6] Simpan hasil...")

final_output = {
    'generated_at':      pd.Timestamp.now().isoformat(),
    'model_used':        model,
    'api_mode':          OLLAMA_API_MODE,
    'main_summary':      result,
    'main_grounding':    grounding,
    'scenario_results':  scenario_results,
    'trap_scenario': {
        'summary':   trap_result,
        'grounding': trap_grounding,
    },
    'template_fallback': template_result,
}

# JSON
save_summary_json(final_output, OUTPUT_JSON)
print(f"  ✓ JSON  : {OUTPUT_JSON}")

# PKL
pkl_payload = {
    'final_output':      final_output,
    'combined_data':     combined_data,
    'sla_data':          sla_data,
    'trend_data':        trend_data,
    'result':            result,
    'grounding':         grounding,
    'scenario_results':  scenario_results,
    'trap_result':       trap_result,
    'trap_grounding':    trap_grounding,
    'template_result':   template_result,
    'model_used':        model,
    'api_mode':          OLLAMA_API_MODE,
    'generated_at':      pd.Timestamp.now().isoformat(),
}
with open(OUTPUT_PKL, 'wb') as f:
    pickle.dump(pkl_payload, f, protocol=pickle.HIGHEST_PROTOCOL)
print(f"  ✓ PKL   : {OUTPUT_PKL}")

# ── Strategi Mitigasi Grounding ────────────────────────────────────────────────
print("\n  === Strategi Mitigasi Grounding ===")
print("  | Template terstruktur | Jika grounding check menunjukkan banyak angka tidak tertelusuri |")
print("  | Batasi max_tokens    | Kurangi panjang output agar model tidak ngelantur              |")
print("  | Temperature < 0.1   | Untuk output lebih deterministik                               |")
print("  | Human review gate   | Semua ringkasan AI perlu approval sebelum tampil di dashboard  |")

print("\n✅ NB 07 selesai!")
