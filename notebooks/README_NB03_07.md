# SuaraLens — Notebook Pipeline (NB 03–07)

## Overview

Pipeline ML/AI untuk sistem **SuaraLens** — platform manajemen pengaduan stakeholder PENS.

```
NB 03 → LLM Klasifikasi Kategori & Urgency (Ollama)
NB 04 → Sentiment Analysis (HuggingFace RoBERTa)
NB 05 → Evaluasi Pipeline Formal (500 sampel)
NB 06 → SLA & Trend Analytics (agregasi murni)
NB 07 → Ringkasan AI Grounded (LLM dari angka)
```

---

## Setup Awal

### 1. Install Dependencies

```powershell
pip install openai python-dotenv pandas numpy scikit-learn transformers torch seaborn matplotlib joblib
```

### 2. Konfigurasi API Key Ollama

Edit file `.env` di root project:

```env
OLLAMA_API_KEY=your_ollama_api_key_here
OLLAMA_BASE_URL=https://ollama.com
OLLAMA_MODEL=qwen3:8b
```

Dapatkan API key di: https://ollama.com/settings/api-keys

> **Jika menggunakan Ollama lokal:**
> - Kosongkan `OLLAMA_API_KEY`
> - Set `OLLAMA_BASE_URL=http://localhost:11434`
> - Jalankan `ollama serve` dan `ollama pull qwen3:8b`

---

## Cara Menjalankan

### Option A: Jalankan Semua Sekaligus (Quick Mode untuk demo)

```powershell
cd c:\EEPIS\PROJECT\SuaraLens
python notebooks/run_all_notebooks.py --quick
```

### Option B: Jalankan Full (untuk laporan akademik)

```powershell
python notebooks/run_all_notebooks.py
# Estimasi: 30-90 menit (tergantung kecepatan API/hardware)
```

### Option C: Jalankan Per-Notebook

```powershell
# NB 03 — LLM Klasifikasi
python notebooks/run_nb03_llm_classification.py

# NB 04 — Sentiment Model
python notebooks/run_nb04_sentiment_model.py

# NB 05 — Evaluasi Pipeline (tambah --quick untuk demo cepat)
python notebooks/run_nb05_evaluation_pipeline.py --quick
python notebooks/run_nb05_evaluation_pipeline.py           # Full 500 sampel

# NB 06 — SLA & Trend Analytics (tidak butuh LLM, cepat <1 menit)
python notebooks/run_nb06_sla_trend_analytics.py

# NB 07 — AI Summary Grounded
python notebooks/run_nb07_ai_summary_grounded.py
```

### Option D: Hanya notebook non-LLM (tidak perlu API key)

```powershell
python notebooks/run_all_notebooks.py --skip-llm
# Menjalankan NB 04 (sentiment) dan NB 06 (analytics) saja
```

---

## Output

Semua output disimpan di `data/output/`:

| File | Notebook | Keterangan |
|------|----------|-----------|
| `classification_results.json` | NB 03 | 20 sampel klasifikasi LLM |
| `nb03_classification_results.pkl` | NB 03 | DataFrame + metrik |
| `sentiment_results.json` | NB 04 | 30 sampel sentimen |
| `nb04_sentiment_results.pkl` | NB 04 | DataFrame + confusion matrix |
| `evaluation_report.json` | NB 05 | Laporan evaluasi formal 500 sampel |
| `nb05_evaluation_report.pkl` | NB 05 | Semua metrik + DataFrame |
| `sla_analytics.json` | NB 06 | SLA payload untuk API |
| `trend_analytics.json` | NB 06 | Trend payload untuk API |
| `nb06_sla_trend_analytics.pkl` | NB 06 | DataFrame SLA + trend |
| `ai_summary.json` | NB 07 | Ringkasan AI dari angka |
| `nb07_ai_summary.pkl` | NB 07 | Hasil semua skenario |
| **`suaralens_final_report.pkl`** | All | **Final report — semua artefak** |

### Load Final PKL

```python
import pickle

with open('data/output/suaralens_final_report.pkl', 'rb') as f:
    report = pickle.load(f)

# Akses metrik kunci
print(report['key_metrics'])

# Akses artefak per-notebook
nb05 = report['artifacts']['nb05']
print(nb05['summary_metrics'])

# Akses DataFrame evaluasi
df_eval = nb05['df_valid']
print(df_eval.head())
```

---

## Arsitektur API Ollama

```
Mode Cloud  : OLLAMA_API_KEY → https://ollama.com/v1 (OpenAI-compatible)
Mode Lokal  : tidak ada key  → http://localhost:11434/v1
```

Auto-detect di `modules/llm_engine.py`:
- Ada `OLLAMA_API_KEY` → mode cloud
- Tidak ada → mode lokal

---

## Estimasi Waktu

| Notebook | Non-LLM | Quick Mode | Full Mode |
|----------|---------|------------|-----------|
| NB 03 | - | ~1 menit | ~2 menit |
| NB 04 | ~3 menit | - | - |
| NB 05 | - | ~10 menit | ~30-90 menit |
| NB 06 | <1 menit | - | - |
| NB 07 | - | ~2 menit | ~5 menit |

---

## Modules

| Module | Fungsi |
|--------|--------|
| `modules/llm_engine.py` | Koneksi Ollama, klasifikasi LLM |
| `modules/sentiment_model.py` | HuggingFace sentiment pipeline |
| `modules/analytics.py` | SLA & trend aggregation |
| `modules/ai_summary.py` | Grounded AI summary generation |
| `modules/preprocessing.py` | Text cleaning |
| `modules/anonymization.py` | PII anonymization |
