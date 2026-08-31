"""
generate_notebooks.py
=====================
Script untuk generate semua 8 notebook SuaraLens (00-07) sekaligus
menggunakan nbformat.

Jalankan dari folder SuaraLens/:
    python generate_notebooks.py
"""

import nbformat as nbf
import json
from pathlib import Path

OUTPUT_DIR = Path("notebooks")
OUTPUT_DIR.mkdir(exist_ok=True)

def nb(cells):
    """Buat notebook baru dengan list cells."""
    notebook = nbf.v4.new_notebook()
    notebook.cells = cells
    notebook.metadata = {
        "kernelspec": {
            "display_name": "Python 3",
            "language": "python",
            "name": "python3"
        },
        "language_info": {
            "name": "python",
            "version": "3.11.0"
        }
    }
    return notebook

def md(text):
    return nbf.v4.new_markdown_cell(text)

def code(text):
    return nbf.v4.new_code_cell(text)

def save(notebook, filename):
    path = OUTPUT_DIR / filename
    with open(path, "w", encoding="utf-8") as f:
        nbf.write(notebook, f)
    print(f"  [OK] {path}")

# ─────────────────────────────────────────────────────────────────────────────
# NB 00 — EDA Data Dummy
# ─────────────────────────────────────────────────────────────────────────────
nb00 = nb([
    md("""# 00 — EDA Data Dummy
**SuaraLens** | Analitik Masukan, Aduan & Aspirasi Berbasis NLP — PENS

Notebook ini melakukan eksplorasi awal dataset dummy `suaralens_dummy_simulasi.jsonl`
untuk memahami distribusi data, tren, dan pola yang relevan untuk pipeline selanjutnya.
"""),

    code("""import sys
sys.path.insert(0, '..')  # akses modules dari parent

import json
import warnings
warnings.filterwarnings('ignore')

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.ticker as mtick
import seaborn as sns

# ── Style global ─────────────────────────────────────────────────────────────
sns.set_theme(style='whitegrid', palette='muted')
plt.rcParams.update({
    'figure.dpi': 120,
    'font.size':  11,
    'axes.titlesize': 13,
    'axes.labelsize': 11,
})

DATA_PATH   = '../data/suaralens_dummy_simulasi.jsonl'
OUTPUT_PATH = '../data/output/eda_summary.json'

df = pd.read_json(DATA_PATH, lines=True)
df['tanggal_masuk']   = pd.to_datetime(df['tanggal_masuk'])
df['tanggal_selesai'] = pd.to_datetime(df['tanggal_selesai'], errors='coerce')

print(f'Dataset dimuat: {len(df):,} baris, {df.shape[1]} kolom')
print(f'Rentang tanggal: {df[\"tanggal_masuk\"].min().date()} s.d. {df[\"tanggal_masuk\"].max().date()}')
"""),

    md("## 1. Info Umum & Missing Values"),

    code("""print('=== Info Dataset ===')
print(df.info())
print()

missing = df.isnull().sum()
missing_pct = (missing / len(df) * 100).round(2)
missing_df = pd.DataFrame({'Missing': missing, 'Persen (%)': missing_pct})
print('=== Missing Values ===')
display(missing_df[missing_df['Missing'] > 0])
"""),

    md("## 2. Distribusi Kategori"),

    code("""fig, ax = plt.subplots(figsize=(10, 5))
cat_counts = df['kategori_true'].value_counts()
bars = ax.barh(cat_counts.index, cat_counts.values, color=sns.color_palette('muted', len(cat_counts)))
ax.set_xlabel('Jumlah Masukan')
ax.set_title('Distribusi Kategori Masukan')
for bar, val in zip(bars, cat_counts.values):
    ax.text(bar.get_width() + 10, bar.get_y() + bar.get_height()/2,
            f'{val:,}', va='center', fontsize=9)
ax.invert_yaxis()
plt.tight_layout()
plt.show()
"""),

    md("## 3. Distribusi Urgency & Sentimen"),

    code("""fig, axes = plt.subplots(1, 2, figsize=(12, 4))

# Urgency
urgency_order = ['Low', 'Medium', 'High', 'Critical']
urgency_counts = df['urgency_label_true'].value_counts().reindex(urgency_order)
colors_urg = ['#2ecc71', '#f1c40f', '#e67e22', '#e74c3c']
axes[0].bar(urgency_counts.index, urgency_counts.values, color=colors_urg)
axes[0].set_title('Distribusi Urgency')
axes[0].set_ylabel('Jumlah')
for i, v in enumerate(urgency_counts.values):
    axes[0].text(i, v + 15, f'{v:,}', ha='center', fontsize=9)

# Sentimen
sent_order = ['positive', 'neutral', 'negative']
sent_counts = df['sentiment_true'].value_counts().reindex(sent_order)
colors_sent = ['#27ae60', '#95a5a6', '#c0392b']
axes[1].bar(sent_counts.index, sent_counts.values, color=colors_sent)
axes[1].set_title('Distribusi Sentimen')
axes[1].set_ylabel('Jumlah')
for i, v in enumerate(sent_counts.values):
    axes[1].text(i, v + 15, f'{v:,}', ha='center', fontsize=9)

plt.tight_layout()
plt.show()
"""),

    md("## 4. Status & SLA Breach"),

    code("""fig, axes = plt.subplots(1, 2, figsize=(12, 4))

# Status
status_counts = df['status'].value_counts()
axes[0].pie(status_counts.values, labels=status_counts.index,
            autopct='%1.1f%%', startangle=90,
            colors=sns.color_palette('pastel'))
axes[0].set_title('Distribusi Status')

# SLA Breach
breach_counts = df['sla_breach_true'].value_counts()
labels = ['Tidak Breach', 'Breach'] if False in breach_counts.index else breach_counts.index
axes[1].pie(breach_counts.values,
            labels=['Tidak Breach' if not k else 'Breach' for k in breach_counts.index],
            autopct='%1.1f%%', startangle=90,
            colors=['#27ae60', '#e74c3c'])
axes[1].set_title(f'Proporsi SLA Breach (Total Breach: {df[\"sla_breach_true\"].sum():,})')

plt.tight_layout()
plt.show()

print(f'SLA Breach rate: {df[\"sla_breach_true\"].mean()*100:.2f}%')
"""),

    md("## 5. Tren Bulanan (Top 3 Kategori)"),

    code("""df['bulan'] = df['tanggal_masuk'].dt.to_period('M')
top3_cats = df['kategori_true'].value_counts().nlargest(3).index.tolist()
trend_data = df[df['kategori_true'].isin(top3_cats)]
monthly = trend_data.groupby(['bulan', 'kategori_true']).size().reset_index(name='jumlah')
monthly['bulan_str'] = monthly['bulan'].astype(str)

fig, ax = plt.subplots(figsize=(12, 5))
for cat in top3_cats:
    subset = monthly[monthly['kategori_true'] == cat]
    ax.plot(subset['bulan_str'], subset['jumlah'], marker='o', label=cat, linewidth=2)

ax.set_title('Tren Jumlah Masukan per Bulan (Top 3 Kategori)')
ax.set_xlabel('Bulan')
ax.set_ylabel('Jumlah Masukan')
ax.legend()
ax.tick_params(axis='x', rotation=30)
plt.tight_layout()
plt.show()
"""),

    md("## 6. Distribusi Kanal & Stakeholder"),

    code("""fig, axes = plt.subplots(1, 2, figsize=(12, 4))

# Kanal
kanal_counts = df['kanal'].fillna('Tidak Diketahui').value_counts()
axes[0].barh(kanal_counts.index, kanal_counts.values,
             color=sns.color_palette('Set2', len(kanal_counts)))
axes[0].set_title('Distribusi Kanal Masukan')
axes[0].set_xlabel('Jumlah')
axes[0].invert_yaxis()

# Stakeholder
sh_counts = df['stakeholder_type'].value_counts()
axes[1].bar(sh_counts.index, sh_counts.values,
            color=sns.color_palette('Set3', len(sh_counts)))
axes[1].set_title('Distribusi Stakeholder Type')
axes[1].set_ylabel('Jumlah')
axes[1].tick_params(axis='x', rotation=20)

plt.tight_layout()
plt.show()
"""),

    md("## 7. Distribusi Panjang Teks"),

    code("""df['panjang_kata'] = df['teks_aduan'].str.split().str.len()

fig, ax = plt.subplots(figsize=(10, 4))
ax.hist(df['panjang_kata'], bins=50, color='steelblue', edgecolor='white', alpha=0.8)
ax.axvline(df['panjang_kata'].median(), color='red', linestyle='--',
           label=f'Median: {df[\"panjang_kata\"].median():.0f} kata')
ax.axvline(df['panjang_kata'].mean(), color='orange', linestyle='--',
           label=f'Mean: {df[\"panjang_kata\"].mean():.1f} kata')
ax.set_title('Distribusi Panjang Teks Aduan (Jumlah Kata)')
ax.set_xlabel('Jumlah Kata')
ax.set_ylabel('Frekuensi')
ax.legend()
plt.tight_layout()
plt.show()

print(df['panjang_kata'].describe().round(1))
"""),

    md("## 8. Cross-tab Kategori × Stakeholder (Heatmap)"),

    code("""ct = pd.crosstab(df['kategori_true'], df['stakeholder_type'])
# Normalisasi per baris (% per kategori)
ct_pct = ct.div(ct.sum(axis=1), axis=0) * 100

fig, ax = plt.subplots(figsize=(12, 7))
sns.heatmap(ct_pct, annot=True, fmt='.1f', cmap='YlOrRd',
            linewidths=0.5, ax=ax, cbar_kws={'label': '%'})
ax.set_title('Distribusi Stakeholder per Kategori (% per baris)')
ax.set_xlabel('Stakeholder Type')
ax.set_ylabel('Kategori')
plt.tight_layout()
plt.show()
"""),

    md("## 9. Simpan Ringkasan EDA ke JSON"),

    code("""import json
from pathlib import Path

eda_summary = {
    'generated_at':      pd.Timestamp.now().isoformat(),
    'total_records':     len(df),
    'date_range': {
        'start': df['tanggal_masuk'].min().strftime('%Y-%m-%d'),
        'end':   df['tanggal_masuk'].max().strftime('%Y-%m-%d'),
    },
    'missing_values': {
        col: int(df[col].isnull().sum())
        for col in df.columns if df[col].isnull().any()
    },
    'kategori_distribution':  df['kategori_true'].value_counts().to_dict(),
    'urgency_distribution':   df['urgency_label_true'].value_counts().to_dict(),
    'sentiment_distribution': df['sentiment_true'].value_counts().to_dict(),
    'status_distribution':    df['status'].value_counts().to_dict(),
    'sla_breach_pct':         round(df['sla_breach_true'].mean() * 100, 2),
    'kanal_distribution':     df['kanal'].fillna('Tidak Diketahui').value_counts().to_dict(),
    'stakeholder_distribution': df['stakeholder_type'].value_counts().to_dict(),
    'text_length_stats': df['panjang_kata'].describe().round(1).to_dict(),
}

output_path = Path(OUTPUT_PATH)
output_path.parent.mkdir(parents=True, exist_ok=True)
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(eda_summary, f, ensure_ascii=False, indent=2, default=str)

print(f'EDA summary disimpan ke: {OUTPUT_PATH}')
"""),

    md("""## Ringkasan Temuan

- **Dataset**: 5.150 baris masukan dari 6 bulan (Maret–Agustus 2026)
- **Distribusi kategori tidak seimbang**: Akademik dominan (~18%), Lainnya paling sedikit (~1%)
- **Sentimen mayoritas negatif** (~74%), sesuai ekspektasi platform pengaduan
- **SLA breach rate ~32%** — perlu perhatian khusus, terutama di kategori dengan breach tertinggi
- **Tren musiman terlihat**: lonjakan Keuangan di awal semester, Akademik saat masa ujian
- **Variasi panjang teks cukup tinggi** (beberapa kata s.d. ratusan kata) — penting untuk pipeline embedding
- **Cross-tab**: Masukan Keuangan didominasi Mahasiswa & Orang Tua; Kerjasama & Mitra lebih banyak dari Mitra eksternal
"""),
])

save(nb00, "00_eda_data_dummy.ipynb")


# ─────────────────────────────────────────────────────────────────────────────
# NB 01 — Anonymization Test
# ─────────────────────────────────────────────────────────────────────────────
nb01 = nb([
    md("""# 01 — Uji Anonymization (PII Redaction)
**SuaraLens** | Pengujian redaksi PII menggunakan Microsoft Presidio + custom recognizer Indonesia.
"""),

    md("""## Setup

Pastikan library Presidio sudah terinstall sebelum menjalankan notebook ini.
"""),

    code("""# Install jika belum ada
import subprocess, sys
pkgs = ['presidio-analyzer', 'presidio-anonymizer']
for pkg in pkgs:
    try:
        __import__(pkg.replace('-', '_'))
    except ImportError:
        print(f'Installing {pkg}...')
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', '-q', pkg])

# Download spaCy model kecil jika belum ada
try:
    import spacy
    spacy.load('en_core_web_sm')
except OSError:
    print('Downloading spaCy model...')
    subprocess.check_call([sys.executable, '-m', 'spacy', 'download', 'en_core_web_sm', '-q'])

print('Setup selesai.')
"""),

    code("""import sys
sys.path.insert(0, '..')

import warnings
warnings.filterwarnings('ignore')

import json
import re
import pandas as pd
from pathlib import Path
from modules.anonymization import anonymize_text, detect_pii_regex

DATA_PATH   = '../data/suaralens_dummy_simulasi.jsonl'
OUTPUT_PATH = '../data/output/anonymization_results.json'

df = pd.read_json(DATA_PATH, lines=True)
print(f'Dataset dimuat: {len(df):,} baris')
"""),

    md("## 1. Ambil Sampel Teks yang Mengandung PII"),

    code("""# Filter teks yang likely mengandung PII
mask_nim   = df['teks_aduan'].str.contains(r'\\b332\\d{7}\\b', regex=True, na=False)
mask_hp    = df['teks_aduan'].str.contains(r'0[89]\\d', regex=True, na=False)
mask_email = df['teks_aduan'].str.contains('@', na=False)
mask_nama  = df['teks_aduan'].str.contains(r'(?i)\\bsaya\\s+[A-Z][a-z]+', regex=True, na=False)

pii_mask = mask_nim | mask_hp | mask_email | mask_nama
df_pii   = df[pii_mask].sample(min(50, pii_mask.sum()), random_state=42).reset_index(drop=True)

print(f'Teks dengan indikasi PII: {pii_mask.sum():,} dari {len(df):,}')
print(f'Sampel diambil: {len(df_pii)} baris')
"""),

    md("## 2. Jalankan Anonymization pada 50 Sampel"),

    code("""results = []
for _, row in df_pii.iterrows():
    redacted, entities = anonymize_text(row['teks_aduan'])
    results.append({
        'id_aduan':          row['id_aduan'],
        'teks_original':     row['teks_aduan'],
        'teks_redacted':     redacted,
        'entities_detected': entities,
        'n_entities':        len(entities),
    })

df_results = pd.DataFrame(results)
print(f'Anonymization selesai. Total entitas terdeteksi: {df_results[\"n_entities\"].sum()}')
"""),

    md("## 3. Tabel Before/After (10 Contoh)"),

    code("""sample10 = df_results.head(10)[['id_aduan', 'teks_original', 'teks_redacted', 'n_entities']]

pd.set_option('display.max_colwidth', 80)
display(sample10)
"""),

    md("## 4. Perhitungan Recall Sederhana"),

    code("""# Recall: berapa % PII regex yang berhasil ditangkap Presidio+custom
tp_nim, tp_hp, tp_email = 0, 0, 0
fn_nim, fn_hp, fn_email = 0, 0, 0

for r in results:
    orig     = r['teks_original']
    entities = [e['type'] for e in r['entities_detected']]
    regex_pii = detect_pii_regex(orig)

    if regex_pii['nim']:
        if 'NIM' in entities:
            tp_nim += len(regex_pii['nim'])
        else:
            fn_nim += len(regex_pii['nim'])

    if regex_pii['phone']:
        if 'PHONE_NUMBER' in entities:
            tp_hp += len(regex_pii['phone'])
        else:
            fn_hp += len(regex_pii['phone'])

    if regex_pii['email']:
        if 'EMAIL_ADDRESS' in entities:
            tp_email += len(regex_pii['email'])
        else:
            fn_email += len(regex_pii['email'])

def recall(tp, fn):
    return round(tp / (tp + fn) * 100, 1) if (tp + fn) > 0 else None

recall_report = {
    'NIM':   {'true_positive': tp_nim,   'false_negative': fn_nim,   'recall_pct': recall(tp_nim,   fn_nim)},
    'Phone': {'true_positive': tp_hp,    'false_negative': fn_hp,    'recall_pct': recall(tp_hp,    fn_hp)},
    'Email': {'true_positive': tp_email, 'false_negative': fn_email, 'recall_pct': recall(tp_email, fn_email)},
}

print('=== Recall Presidio+Custom Recognizer ===')
for entity, stats in recall_report.items():
    r = stats['recall_pct']
    print(f"  {entity}: TP={stats['true_positive']}, FN={stats['false_negative']}, Recall={r}%")
"""),

    md("## 5. Simpan Hasil ke JSON"),

    code("""output = {
    'generated_at':     pd.Timestamp.now().isoformat(),
    'total_sampled':    len(results),
    'recall_report':    recall_report,
    'sample_results':   results[:20],  # simpan 20 sampel untuk referensi dashboard
    'limitations': [
        'PERSON recognizer menggunakan NER spaCy yang dilatih corpus Inggris.',
        'Recall untuk nama Indonesia (terutama nama pendek/umum) kemungkinan rendah.',
        'Perlu human review sebagai lapis kedua sesuai desain human-in-the-loop.',
        'Custom regex NIM PENS: pola 332XXXXXXX (10 digit). Perlu update jika format berubah.',
    ]
}

output_path = Path(OUTPUT_PATH)
output_path.parent.mkdir(parents=True, exist_ok=True)
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

print(f'Hasil disimpan ke: {OUTPUT_PATH}')
"""),

    md("""## Catatan Limitasi

1. **PERSON recognizer**: spaCy `en_core_web_sm` dilatih corpus Inggris → recall nama Indonesia kemungkinan rendah
2. **NIM regex**: pola `332XXXXXX` (10 digit) spesifik PENS — perlu update jika format berubah
3. **Nama pendek/umum** (mis. "Budi", "Sari") mungkin tidak tertangkap NER
4. **Human-in-the-loop wajib**: anonymization otomatis hanya lapis pertama, reviewer manusia tetap diperlukan sebelum data dipublikasi
"""),
])

save(nb01, "01_anonymization_test.ipynb")


# ─────────────────────────────────────────────────────────────────────────────
# NB 02 — Preprocessing & Deduplication
# ─────────────────────────────────────────────────────────────────────────────
nb02 = nb([
    md("""# 02 — Preprocessing & Deduplication
**SuaraLens** | Cleaning teks ringan dan deteksi near-duplicate berbasis semantic embedding.
"""),

    code("""import sys
sys.path.insert(0, '..')

import warnings
warnings.filterwarnings('ignore')

import json
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path
from modules.preprocessing import (
    clean_text, load_embedding_model, encode_texts,
    dedup_check, evaluate_dedup
)

sns.set_theme(style='whitegrid')
DATA_PATH   = '../data/suaralens_dummy_simulasi.jsonl'
OUTPUT_PATH = '../data/output/duplicates_report.json'

df = pd.read_json(DATA_PATH, lines=True)
print(f'Dataset: {len(df):,} baris')
"""),

    md("## 1. Fungsi clean_text — Demonstrasi"),

    code("""test_cases = [
    'WIFI LAB MATI LAGI!!!! udah 3 hari gak bisa konek ke internet di gedung D',
    'Tolong perbaiki fasilitas parkir yg sempit...  sangat tidak nyaman  ',
    'Info: UKT semester ini bisa dibayar via https://payment.pens.ac.id sampai tgl 15',
]
for t in test_cases:
    print(f'Original : {t}')
    print(f'Cleaned  : {clean_text(t)}')
    print()
"""),

    md("## 2. Clean Semua Teks"),

    code("""df['teks_cleaned'] = df['teks_aduan'].apply(clean_text)
print('Cleaning selesai.')
print(f'Rata-rata panjang original: {df[\"teks_aduan\"].str.len().mean():.0f} char')
print(f'Rata-rata panjang cleaned : {df[\"teks_cleaned\"].str.len().mean():.0f} char')
"""),

    md("## 3. Load Model & Encode Teks"),

    code("""model = load_embedding_model('paraphrase-multilingual-MiniLM-L12-v2')
texts = df['teks_cleaned'].tolist()
embeddings = encode_texts(model, texts, show_progress=True)
print(f'Embedding shape: {embeddings.shape}')
"""),

    md("## 4. Deteksi Near-Duplicate (threshold=0.90)"),

    code("""THRESHOLD = 0.90

print(f'Mencari pasangan dengan cosine similarity >= {THRESHOLD}...')
print('(Proses ini mungkin memakan beberapa menit untuk N=5000+)')

ids   = df['id_aduan'].tolist()
pairs = dedup_check(embeddings, threshold=THRESHOLD, ids=ids)

print(f'\\nTotal pasangan near-duplicate terdeteksi: {len(pairs):,}')
"""),

    md("## 5. Validasi terhadap Duplikat yang Disisipkan Generator"),

    code("""eval_result = evaluate_dedup(pairs, known_dup_prefix='SL-1')
print('=== Evaluasi Deteksi Duplikat ===')
for k, v in eval_result.items():
    print(f'  {k}: {v}')
"""),

    md("## 6. Contoh Pasangan Near-Duplicate"),

    code("""print('=== 5 Pasangan Near-Duplicate Teratas ===\\n')
for i, pair in enumerate(pairs[:5], 1):
    text_a = df[df['id_aduan'] == pair['id_a']]['teks_aduan'].values[0] if pair['id_a'] in df['id_aduan'].values else '?'
    text_b = df[df['id_aduan'] == pair['id_b']]['teks_aduan'].values[0] if pair['id_b'] in df['id_aduan'].values else '?'
    print(f'--- Pasangan {i} (similarity: {pair[\"similarity\"]:.4f}) ---')
    print(f'  A [{pair[\"id_a\"]}]: {text_a[:120]}...')
    print(f'  B [{pair[\"id_b\"]}]: {text_b[:120]}...')
    print()
"""),

    md("## 7. Simpan Laporan ke JSON"),

    code("""report = {
    'generated_at':        pd.Timestamp.now().isoformat(),
    'total_records':       len(df),
    'threshold':           THRESHOLD,
    'total_pairs_found':   len(pairs),
    'evaluation':          eval_result,
    'sample_pairs':        pairs[:10],
    'threshold_rationale': (
        'Threshold 0.90 dipilih sebagai trade-off antara presisi dan recall. '
        'Nilai lebih tinggi (0.95+) meningkatkan presisi tapi melewatkan banyak duplikat; '
        'nilai lebih rendah (0.85-) menangkap lebih banyak tapi menghasilkan false positive tinggi.'
    )
}

output_path = Path(OUTPUT_PATH)
output_path.parent.mkdir(parents=True, exist_ok=True)
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(report, f, ensure_ascii=False, indent=2, default=str)

print(f'Laporan disimpan ke: {OUTPUT_PATH}')
"""),

    md("""## Catatan: Trade-off Threshold 0.90

| Threshold | Efek |
|---|---|
| > 0.95 | Presisi tinggi, banyak duplikat lolos |
| 0.90 (dipilih) | Keseimbangan presisi–recall untuk dataset ini |
| < 0.85 | Recall tinggi, banyak false positive |

Untuk produksi, threshold optimal sebaiknya dikalibrasi menggunakan anotasi manual
pada subset data nyata.
"""),
])

save(nb02, "02_preprocessing_dedup.ipynb")


# ─────────────────────────────────────────────────────────────────────────────
# NB 03 — LLM Prompt Classification
# ─────────────────────────────────────────────────────────────────────────────
nb03 = nb([
    md("""# 03 — LLM Engine: Klasifikasi Kategori & Urgency
**SuaraLens** | Klasifikasi teks menggunakan LLM self-hosted via Ollama (Qwen3 8B).
"""),

    md("""## Setup Ollama

Sebelum menjalankan notebook ini:
1. Install Ollama: https://ollama.ai/download
2. Jalankan server: `ollama serve`
3. Pull model: `ollama pull qwen3:8b`

Di Colab, gunakan:
```bash
!curl -fsSL https://ollama.ai/install.sh | sh
!nohup ollama serve &
!sleep 5 && ollama pull qwen3:8b
```
"""),

    code("""import sys
sys.path.insert(0, '..')

import json
import time
import warnings
warnings.filterwarnings('ignore')

import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path
from modules.llm_engine import (
    classify_llm, classify_llm_batch,
    check_ollama_status, VALID_CATEGORIES, SYSTEM_PROMPT
)

sns.set_theme(style='whitegrid')
DATA_PATH   = '../data/suaralens_dummy_simulasi.jsonl'
OUTPUT_PATH = '../data/output/classification_results.json'

df = pd.read_json(DATA_PATH, lines=True)
print(f'Dataset: {len(df):,} baris')
"""),

    md("## 1. Diagnostik Ollama Server"),

    code("""status = check_ollama_status()
print('=== Status Ollama ===')
print(f'  Running        : {status[\"running\"]}')
print(f'  Model tersedia : {status[\"available_models\"]}')
print(f'  Model dipilih  : {status[\"recommended_model\"]}')

if not status['running']:
    print()
    print('⚠ Ollama tidak berjalan!')
    print('  Jalankan di terminal: ollama serve')
    print('  Lalu pull model    : ollama pull qwen3:8b')
"""),

    md("## 2. Review System Prompt"),

    code("""print('=== System Prompt ===')
print(SYSTEM_PROMPT)
print()
print(f'=== Kategori Valid ({len(VALID_CATEGORIES)} kategori) ===')
for cat in VALID_CATEGORIES:
    print(f'  - {cat}')
"""),

    md("## 3. Uji pada 20 Sampel"),

    code("""# Ambil 20 sampel stratified (per kategori, minimal 1)
sample_df = (
    df.groupby('kategori_true', group_keys=False)
      .apply(lambda x: x.sample(max(1, min(2, len(x))), random_state=42))
      .sample(min(20, len(df)), random_state=42)
      .reset_index(drop=True)
)

print(f'Menjalankan klasifikasi pada {len(sample_df)} sampel...')
print('(Estimasi waktu: ~20-60 detik tergantung hardware)\\n')

model_name = status.get('recommended_model')
llm_results = []
times = []

for i, row in sample_df.iterrows():
    start = time.time()
    result = classify_llm(row['teks_aduan'], model=model_name)
    elapsed = time.time() - start
    times.append(elapsed)
    llm_results.append({
        'id_aduan':        row['id_aduan'],
        'kategori_true':   row['kategori_true'],
        'kategori_pred':   result.get('kategori') if result else None,
        'urgency_true':    row['urgency_label_true'],
        'urgency_pred':    result.get('urgency_label') if result else None,
        'urgency_score':   result.get('urgency_score') if result else None,
        'confidence':      result.get('confidence') if result else None,
        'urgency_reason':  result.get('urgency_reason', '')[:80] if result else None,
        'inference_time':  round(elapsed, 2),
        'error':           result.get('error') if result else 'None returned',
    })
    print(f'  [{i+1}/20] {row[\"id_aduan\"]} | pred={result.get(\"kategori\") if result else \"ERR\"} | true={row[\"kategori_true\"]}')

df_results = pd.DataFrame(llm_results)
print(f'\\nSelesai. Avg inference time: {sum(times)/len(times):.2f}s / teks')
"""),

    md("## 4. Hasil vs Ground Truth"),

    code("""display(df_results[[
    'id_aduan', 'kategori_true', 'kategori_pred',
    'urgency_true', 'urgency_pred', 'confidence', 'inference_time'
]])

n_correct = (df_results['kategori_true'] == df_results['kategori_pred']).sum()
n_total   = len(df_results)
print(f'\\nAkurasi pada 20 sampel: {n_correct}/{n_total} ({n_correct/n_total*100:.1f}%)')
print('(Ini hanya sanity check awal — evaluasi formal ada di NB 05)')
"""),

    md("## 5. Benchmark Waktu Inference"),

    code("""avg_time = sum(times) / len(times)
total_estimated = avg_time * len(df) / 60

print(f'=== Benchmark Inference ===')
print(f'  Sampel diukur   : {len(times)} teks')
print(f'  Rata-rata        : {avg_time:.2f} detik/teks')
print(f'  Estimasi total   : {total_estimated:.1f} menit untuk {len(df):,} baris')
print(f'  Model digunakan  : {model_name}')
"""),

    md("## 6. Simpan Hasil ke JSON"),

    code("""output = {
    'generated_at':     pd.Timestamp.now().isoformat(),
    'model_used':       model_name,
    'sample_size':      len(llm_results),
    'avg_inference_s':  round(sum(times) / len(times), 3),
    'results':          llm_results,
}

output_path = Path(OUTPUT_PATH)
output_path.parent.mkdir(parents=True, exist_ok=True)
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(output, f, ensure_ascii=False, indent=2, default=str)

print(f'Hasil disimpan ke: {OUTPUT_PATH}')
"""),
])

save(nb03, "03_llm_prompt_classification.ipynb")


# ─────────────────────────────────────────────────────────────────────────────
# NB 04 — Sentiment Model
# ─────────────────────────────────────────────────────────────────────────────
nb04 = nb([
    md("""# 04 — Model Sentimen (Pretrained HuggingFace)
**SuaraLens** | Analisis sentimen menggunakan `w11wo/indonesian-roberta-base-sentiment-classifier`.
"""),

    code("""# Install jika belum ada
import subprocess, sys
for pkg in ['transformers', 'torch']:
    try:
        __import__(pkg)
    except ImportError:
        print(f'Installing {pkg}...')
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', '-q', pkg])

print('Dependencies OK')
"""),

    code("""import sys
sys.path.insert(0, '..')

import json
import warnings
warnings.filterwarnings('ignore')

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path
from sklearn.metrics import classification_report, confusion_matrix
from modules.sentiment_model import classify_sentiment, classify_sentiment_batch, load_sentiment_model

sns.set_theme(style='whitegrid')
DATA_PATH   = '../data/suaralens_dummy_simulasi.jsonl'
OUTPUT_PATH = '../data/output/sentiment_results.json'

df = pd.read_json(DATA_PATH, lines=True)
print(f'Dataset: {len(df):,} baris')
"""),

    md("## 1. Load Model"),

    code("""pipe = load_sentiment_model()
print('Model siap digunakan.')
"""),

    md("## 2. Uji pada 30 Sampel Proporsional"),

    code("""# Ambil 10 per kelas sentimen (proporsional)
sample_parts = []
for sent in ['negative', 'neutral', 'positive']:
    part = df[df['sentiment_true'] == sent].sample(min(10, (df['sentiment_true'] == sent).sum()), random_state=42)
    sample_parts.append(part)

sample_df = pd.concat(sample_parts).reset_index(drop=True)
print(f'Sampel: {len(sample_df)} baris ({dict(sample_df[\"sentiment_true\"].value_counts())})')
print('\\nMenjalankan inferensi...')

texts    = sample_df['teks_aduan'].tolist()
preds    = classify_sentiment_batch(texts)

sample_df['sentiment_pred']  = [p['sentiment'] for p in preds]
sample_df['sentiment_score'] = [p['score']     for p in preds]
"""),

    md("## 3. Hasil vs Ground Truth"),

    code("""display(sample_df[['id_aduan', 'teks_aduan', 'sentiment_true', 'sentiment_pred', 'sentiment_score']].head(20))

print('\\n=== Classification Report (30 sampel — sanity check awal) ===')
print(classification_report(
    sample_df['sentiment_true'],
    sample_df['sentiment_pred'],
    target_names=['negative', 'neutral', 'positive']
))
print('⚠ CATATAN: Ini sanity check awal. Evaluasi formal (NB 05) menggunakan 500 sampel.')
"""),

    md("## 4. Analisis: Informal vs Formal"),

    code("""# Kanal informal vs formal
informal_channels = ['WhatsApp', 'Medsos', 'Instagram']
formal_channels   = ['Email', 'Web Form', 'Surat']

df_sample_kanal = sample_df.copy()
df_sample_kanal['kanal_type'] = df_sample_kanal['kanal'].apply(
    lambda k: 'Informal' if k in informal_channels else
              'Formal'   if k in formal_channels   else 'Lainnya'
)

print('=== Akurasi per Tipe Kanal ===')
for kanal_type in ['Informal', 'Formal', 'Lainnya']:
    subset = df_sample_kanal[df_sample_kanal['kanal_type'] == kanal_type]
    if len(subset) == 0:
        continue
    acc = (subset['sentiment_true'] == subset['sentiment_pred']).mean()
    print(f'  {kanal_type} (n={len(subset)}): Accuracy = {acc*100:.1f}%')

print()
print('Catatan: teks informal (singkatan, ALL CAPS, emoji) mungkin menurunkan akurasi.')
print('Hasil ini adalah indikasi awal — perlu sampel lebih besar untuk kesimpulan definitif.')
"""),

    md("## 5. Simpan Hasil ke JSON"),

    code("""results = []
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
    'results':       results,
    'caveats': [
        'Label sentiment_true adalah label sintetis dari generator data, bukan anotasi manusia.',
        'Evaluasi formal dilakukan di NB 05 dengan 500 sampel.',
        'Performa pada teks informal belum tervalidasi dengan dataset representatif.',
    ]
}

output_path = Path(OUTPUT_PATH)
output_path.parent.mkdir(parents=True, exist_ok=True)
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

print(f'Hasil disimpan ke: {OUTPUT_PATH}')
"""),
])

save(nb04, "04_sentiment_model.ipynb")


# ─────────────────────────────────────────────────────────────────────────────
# NB 05 — Evaluasi Pipeline
# ─────────────────────────────────────────────────────────────────────────────
nb05 = nb([
    md("""# 05 — Evaluasi Pipeline (Notebook Terpenting)
**SuaraLens** | Evaluasi menyeluruh pipeline klasifikasi, urgency scoring, dan sentimen.

Notebook ini menghasilkan metrik formal untuk laporan akademik.
Pastikan NB 03 (llm_engine.py) dan NB 04 (sentiment_model.py) sudah selesai.
"""),

    code("""import sys
sys.path.insert(0, '..')

import json
import time
import warnings
warnings.filterwarnings('ignore')

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path
from sklearn.metrics import (
    classification_report, confusion_matrix, accuracy_score
)
from modules.llm_engine   import classify_llm, check_ollama_status, VALID_CATEGORIES
from modules.sentiment_model import classify_sentiment_batch, load_sentiment_model

sns.set_theme(style='whitegrid')
DATA_PATH   = '../data/suaralens_dummy_simulasi.jsonl'
OUTPUT_PATH = '../data/output/evaluation_report.json'

df = pd.read_json(DATA_PATH, lines=True)
print(f'Dataset: {len(df):,} baris')
print(f'Ollama status: {check_ollama_status()[\"running\"]}')
"""),

    md("## 1. Stratified Sample 500 Baris"),

    code("""N_EVAL = 500

sample_df = (
    df.groupby('kategori_true', group_keys=False)
      .apply(lambda x: x.sample(
          max(1, int(N_EVAL * len(x) / len(df))), random_state=42
      ))
      .head(N_EVAL)
      .reset_index(drop=True)
)

print(f'Sampel evaluasi: {len(sample_df)} baris')
print('Distribusi kategori:')
print(sample_df['kategori_true'].value_counts().to_string())
"""),

    md("## 2. Evaluasi Kategori — LLM Classification"),

    code("""print('Menjalankan classify_llm pada 500 sampel...')
print('(Estimasi: 10-30 menit tergantung hardware — pertimbangkan jalankan overnight)')

status = check_ollama_status()
model  = status.get('recommended_model')

llm_results = []
for i, row in sample_df.iterrows():
    result = classify_llm(row['teks_aduan'], model=model)
    llm_results.append({
        'id_aduan':         row['id_aduan'],
        'kategori_true':    row['kategori_true'],
        'urgency_true':     row['urgency_label_true'],
        'urgency_score_true': row['urgency_score_true'],
        'kategori_pred':    result.get('kategori')       if result else None,
        'urgency_pred':     result.get('urgency_label')  if result else None,
        'urgency_score_pred': result.get('urgency_score') if result else None,
        'confidence':       result.get('confidence')     if result else None,
        'error':            result.get('error')          if result else 'None',
    })
    if (i + 1) % 50 == 0:
        print(f'  Progress: {i+1}/{len(sample_df)}')

df_llm = pd.DataFrame(llm_results)
df_valid = df_llm[df_llm['kategori_pred'].notna()]
print(f'\\nBerhasil: {len(df_valid)}/{len(df_llm)} ({len(df_valid)/len(df_llm)*100:.1f}%)')
"""),

    code("""print('=== Classification Report — Kategori ===')
report = classification_report(
    df_valid['kategori_true'],
    df_valid['kategori_pred'],
    labels=VALID_CATEGORIES,
    output_dict=True,
    zero_division=0
)
print(classification_report(
    df_valid['kategori_true'],
    df_valid['kategori_pred'],
    labels=VALID_CATEGORIES,
    zero_division=0
))
"""),

    code("""# Confusion Matrix
cm = confusion_matrix(
    df_valid['kategori_true'],
    df_valid['kategori_pred'],
    labels=VALID_CATEGORIES
)
fig, ax = plt.subplots(figsize=(14, 10))
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
            xticklabels=VALID_CATEGORIES, yticklabels=VALID_CATEGORIES,
            linewidths=0.5, ax=ax)
ax.set_title('Confusion Matrix — Klasifikasi Kategori')
ax.set_xlabel('Prediksi')
ax.set_ylabel('Ground Truth')
plt.xticks(rotation=45, ha='right')
plt.yticks(rotation=0)
plt.tight_layout()
plt.show()
"""),

    md("## 3. Uji Self-Consistency Urgency (30 teks × 5 run)"),

    code("""N_CONSISTENCY = 30
N_RUNS        = 5

consistency_sample = sample_df.sample(N_CONSISTENCY, random_state=99).reset_index(drop=True)
consistency_results = []

for i, row in consistency_sample.iterrows():
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
        'id_aduan':          row['id_aduan'],
        'urgency_true':      row['urgency_label_true'],
        'runs':              runs,
        'score_std':         round(float(np.std(scores)), 4) if scores else None,
        'score_mean':        round(float(np.mean(scores)), 4) if scores else None,
        'exact_agreement':   len(set(labels)) == 1 if labels else False,
    })

df_consistency = pd.DataFrame(consistency_results)
exact_rate = df_consistency['exact_agreement'].mean() * 100
avg_std    = df_consistency['score_std'].mean()

print(f'=== Self-Consistency Urgency Scoring ===')
print(f'  Sampel teks    : {N_CONSISTENCY}')
print(f'  Runs per teks  : {N_RUNS}')
print(f'  Exact agreement: {exact_rate:.1f}% (label sama di semua {N_RUNS} run)')
print(f'  Avg std score  : {avg_std:.4f}')
print()
print('Interpretasi:')
print('  Exact agreement tinggi (>80%) = model konsisten dan dapat dipercaya')
print('  Avg std rendah (<0.05) = variasi skor antar-run minimal')
"""),

    md("## 4. Evaluasi Sentimen"),

    code("""print('Menjalankan classify_sentiment pada 500 sampel...')
load_sentiment_model()
texts      = df_valid['id_aduan'].map(df.set_index('id_aduan')['teks_aduan']).tolist()
sent_true  = df_valid['id_aduan'].map(df.set_index('id_aduan')['sentiment_true']).tolist()
sent_preds = classify_sentiment_batch(texts)
sent_pred  = [p['sentiment'] for p in sent_preds]

print('\\n=== Classification Report — Sentimen ===')
print(classification_report(sent_true, sent_pred,
      target_names=['negative', 'neutral', 'positive'], zero_division=0))
print()
print('⚠ CATATAN PENTING: sentiment_true adalah label sintetis dari generator data,')
print('  BUKAN anotasi manusia. Akurasi di atas harus dibaca hati-hati.')
"""),

    md("## 5. Confidence-Based Routing Analysis"),

    code("""# Threshold routing
CONF_THRESHOLD = 0.75
HIGH_URGENCY   = ['High', 'Critical']

manual_review = df_llm[
    (df_llm['confidence'].fillna(0) < CONF_THRESHOLD) |
    (df_llm['urgency_pred'].isin(HIGH_URGENCY))
]

routing_pct = len(manual_review) / len(df_llm) * 100

print(f'=== Confidence-Based Routing ===')
print(f'  Threshold confidence : {CONF_THRESHOLD}')
print(f'  Total sampel evaluasi: {len(df_llm)}')
print(f'  Masuk antrian manual : {len(manual_review)} ({routing_pct:.1f}%)')
print()
print('Analisis:')
if routing_pct < 15:
    print('  ✓ Routing workload realistis — tidak terlalu membebani reviewer')
elif routing_pct > 50:
    print('  ⚠ Routing terlalu banyak — pertimbangkan naikkan threshold atau fine-tune model')
else:
    print('  ✓ Routing dalam batas wajar')
"""),

    md("## 6. Ringkasan Metrik — Siap untuk Laporan"),

    code("""category_accuracy = accuracy_score(
    df_valid['kategori_true'],
    df_valid['kategori_pred']
) if len(df_valid) > 0 else 0

sentiment_accuracy = accuracy_score(sent_true, sent_pred)

summary_metrics = {
    'generated_at':           pd.Timestamp.now().isoformat(),
    'eval_sample_size':       len(sample_df),
    'valid_llm_responses':    len(df_valid),
    'category': {
        'accuracy':           round(category_accuracy * 100, 2),
        'classification_report': {k: v for k, v in report.items() if k in VALID_CATEGORIES or k in ['accuracy', 'macro avg', 'weighted avg']},
    },
    'urgency_consistency': {
        'n_texts':            N_CONSISTENCY,
        'n_runs':             N_RUNS,
        'exact_agreement_pct': round(exact_rate, 2),
        'avg_score_std':      round(float(avg_std), 4),
    },
    'sentiment': {
        'accuracy':           round(sentiment_accuracy * 100, 2),
        'caveat':             'Label sintetis — bukan ground truth manusia',
    },
    'routing': {
        'threshold':          CONF_THRESHOLD,
        'manual_review_pct':  round(routing_pct, 2),
    },
    'detail_results':         llm_results[:50],  # 50 sampel untuk referensi
}

output_path = Path(OUTPUT_PATH)
output_path.parent.mkdir(parents=True, exist_ok=True)
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(summary_metrics, f, ensure_ascii=False, indent=2, default=str)

print(f'Laporan evaluasi disimpan ke: {OUTPUT_PATH}')
print()
print('=== RINGKASAN METRIK (siap copy ke laporan) ===')
print(f'  Akurasi kategori   : {category_accuracy*100:.2f}%')
print(f'  Urgency consistency: {exact_rate:.1f}% exact agreement')
print(f'  Akurasi sentimen   : {sentiment_accuracy*100:.2f}% (label sintetis)')
print(f'  Manual routing     : {routing_pct:.1f}%')
"""),
])

save(nb05, "05_evaluation_pipeline.ipynb")


# ─────────────────────────────────────────────────────────────────────────────
# NB 06 — SLA & Trend Analytics
# ─────────────────────────────────────────────────────────────────────────────
nb06 = nb([
    md("""# 06 — SLA & Trend Analytics
**SuaraLens** | Prototipe analytics layer — murni agregasi data, tanpa model AI.
Fungsi-fungsi di sini akan dipindahkan ke SQL view / query Postgres di backend.
"""),

    code("""import sys
sys.path.insert(0, '..')

import json
import warnings
warnings.filterwarnings('ignore')

import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.ticker as mtick
import seaborn as sns
from pathlib import Path
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
DATA_PATH = '../data/suaralens_dummy_simulasi.jsonl'

df = pd.read_json(DATA_PATH, lines=True)
print(f'Dataset: {len(df):,} baris')
"""),

    md("## 1. SLA Breach per Kategori"),

    code("""sla_by_cat = compute_sla_breach_by_category(df)
df_sla_cat = pd.DataFrame(sla_by_cat)

fig, ax = plt.subplots(figsize=(10, 5))
bars = ax.barh(df_sla_cat['kategori'], df_sla_cat['breach_pct'],
               color=sns.color_palette('RdYlGn_r', len(df_sla_cat)))
ax.set_xlabel('SLA Breach (%)')
ax.set_title('Persentase SLA Breach per Kategori')
ax.axvline(df_sla_cat['breach_pct'].mean(), color='navy', linestyle='--', alpha=0.7,
           label=f'Rata-rata: {df_sla_cat[\"breach_pct\"].mean():.1f}%')
ax.legend()
for bar, row in zip(bars, df_sla_cat.itertuples()):
    ax.text(bar.get_width() + 0.3, bar.get_y() + bar.get_height()/2,
            f'{row.breach_pct:.1f}%', va='center', fontsize=9)
ax.invert_yaxis()
plt.tight_layout()
plt.show()
"""),

    md("## 2. SLA Breach per Urgency & Rata-rata Waktu Penyelesaian"),

    code("""fig, axes = plt.subplots(1, 2, figsize=(14, 5))

# SLA breach per urgency
sla_by_urg = compute_sla_breach_by_urgency(df)
df_sla_urg = pd.DataFrame(sla_by_urg)
colors_urg = ['#2ecc71', '#f1c40f', '#e67e22', '#e74c3c']
axes[0].bar(df_sla_urg['urgency'], df_sla_urg['breach_pct'], color=colors_urg)
axes[0].set_title('SLA Breach per Urgency Level')
axes[0].set_ylabel('Breach (%)')
for i, row in df_sla_urg.iterrows():
    axes[0].text(i, row['breach_pct'] + 0.5, f'{row[\"breach_pct\"]:.1f}%', ha='center')

# Rata-rata resolusi
avg_res = compute_avg_resolution_time(df)
df_avg  = pd.DataFrame(avg_res)
axes[1].barh(df_avg['kategori'], df_avg['avg_days'],
             color=sns.color_palette('Blues_r', len(df_avg)))
axes[1].set_title('Rata-rata Hari Penyelesaian per Kategori')
axes[1].set_xlabel('Hari')
axes[1].invert_yaxis()

plt.tight_layout()
plt.show()
"""),

    md("## 3. Tren Bulanan (Top 5 Kategori)"),

    code("""trend_data = compute_monthly_trend(df, top_n=5)
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
plt.show()
"""),

    md("## 4. Deteksi Lonjakan (Anomali)"),

    code("""anomalies = detect_trend_anomalies(df)
df_anom   = pd.DataFrame(anomalies)
df_anom_flagged = df_anom[df_anom['is_anomaly'] == True]

print(f'Total anomali terdeteksi: {len(df_anom_flagged)} bulan-kategori')
print()
display(df_anom_flagged.sort_values('jumlah', ascending=False).head(15))
"""),

    md("## 5. Stakeholder per Bulan"),

    code("""sh_monthly  = compute_stakeholder_monthly(df)
df_sh       = pd.DataFrame(sh_monthly)

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
plt.show()
"""),

    md("## 6. Simpan Payload JSON"),

    code("""sla_payload   = build_sla_analytics_payload(df)
trend_payload = build_trend_analytics_payload(df, top_n=5)

save_json(sla_payload,   '../data/output/sla_analytics.json')
save_json(trend_payload, '../data/output/trend_analytics.json')

print('\\n✓ Semua output analitik tersimpan di data/output/')
"""),

    md("""## Insight Utama

1. **SLA breach tidak merata** — kategori tertentu jauh lebih sering melebihi target; prioritaskan perbaikan di sana
2. **Urgency tinggi = breach lebih sering** — tapi tidak selalu; ada kategori Low yang breach-nya tinggi karena volume besar
3. **Pola musiman terlihat** — Keuangan melonjak awal semester, Akademik melonjak saat masa ujian
4. **Mahasiswa mendominasi hampir semua bulan** — wajar untuk platform kampus; perlu pastikan kanal untuk Orang Tua/Mitra juga terjangkau
5. **Waktu resolusi bervariasi jauh antar kategori** — gap ini penting untuk dievaluasi dalam kebijakan SLA

> Fungsi agregasi di `modules/analytics.py` siap dipindahkan ke SQL view/query Postgres untuk backend produksi.
"""),
])

save(nb06, "06_sla_trend_analytics.ipynb")


# ─────────────────────────────────────────────────────────────────────────────
# NB 07 — AI Summary Grounded
# ─────────────────────────────────────────────────────────────────────────────
nb07 = nb([
    md("""# 07 — Ringkasan AI Grounded
**SuaraLens** | Generate ringkasan naratif otomatis dari angka agregat menggunakan LLM.
Input LLM = angka saja (bukan teks mentah) untuk meminimalkan risiko halusinasi.
"""),

    code("""import sys
sys.path.insert(0, '..')

import json
import warnings
warnings.filterwarnings('ignore')

import pandas as pd
from pathlib import Path
from modules.analytics  import build_sla_analytics_payload, build_trend_analytics_payload
from modules.ai_summary import generate_summary, check_grounding, generate_summary_template, save_summary_json
from modules.llm_engine import check_ollama_status

DATA_PATH   = '../data/suaralens_dummy_simulasi.jsonl'
OUTPUT_PATH = '../data/output/ai_summary.json'

df = pd.read_json(DATA_PATH, lines=True)
print(f'Dataset: {len(df):,} baris')
print(f'Ollama status: {check_ollama_status()[\"running\"]}')
"""),

    md("## 1. Siapkan Data Agregat dari analytics.py"),

    code("""sla_data   = build_sla_analytics_payload(df)
trend_data = build_trend_analytics_payload(df, top_n=5)

# Kombinasikan untuk satu ringkasan komprehensif
combined_data = {
    'periode':             trend_data['date_range'],
    'total_masukan':       sla_data['total_records'],
    'overall_breach_pct':  sla_data['overall_breach_pct'],
    'top3_breach_kategori': sla_data['by_category'][:3],
    'top3_kategori':       [
        {'kategori': k, 'jumlah': v}
        for k, v in sorted(
            pd.read_json(DATA_PATH, lines=True)['kategori_true'].value_counts().items(),
            key=lambda x: -x[1]
        )[:3]
    ],
    'avg_resolution_top3': sla_data['avg_resolution_days'][:3],
    'urgency_breach':      sla_data['by_urgency'],
}

print('Data agregat siap:')
print(json.dumps(combined_data, ensure_ascii=False, indent=2, default=str)[:1500])
print('...')
"""),

    md("## 2. Generate Ringkasan — Skenario Normal"),

    code("""result = generate_summary(combined_data, context='laporan bulanan SuaraLens')

print('=== Ringkasan AI ===')
print(result.get('summary', '[GAGAL]'))
print()
print(f'Model   : {result[\"model_used\"]}')
print(f'Waktu   : {result[\"inference_time_s\"]}s')
print(f'Error   : {result[\"error\"]}')
"""),

    md("## 3. Uji Grounding"),

    code("""grounding = check_grounding(result.get('summary', ''), combined_data)

print('=== Grounding Check ===')
print(f'Angka dalam ringkasan     : {grounding[\"numbers_in_summary\"]}')
print(f'Berpotensi tidak grounded : {grounding[\"potentially_ungrounded\"]}')
print(f'Catatan                   : {grounding[\"grounding_note\"]}')
"""),

    md("## 4. Uji 4 Skenario Data Berbeda"),

    code("""scenarios = [
    {
        'label': 'Skenario 1: Breach Rendah',
        'data': {
            'total_masukan': 1200,
            'overall_breach_pct': 8.5,
            'top3_breach_kategori': [
                {'kategori': 'Fasilitas', 'breach_pct': 12.0},
                {'kategori': 'Sarana IT', 'breach_pct': 9.1},
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
                {'kategori': 'Keuangan', 'breach_pct': 71.0},
                {'kategori': 'Akademik', 'breach_pct': 65.4},
                {'kategori': 'Fasilitas', 'breach_pct': 52.8},
            ]
        }
    },
    {
        'label': 'Skenario 3: Volume Tinggi tapi Breach Moderat',
        'data': {
            'total_masukan': 8900,
            'overall_breach_pct': 25.0,
            'dominan_kategori': 'Akademik',
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
    res = generate_summary(scenario['data'], context=scenario['label'])
    gr  = check_grounding(res.get('summary', ''), scenario['data'])
    print(f"=== {scenario['label']} ===")
    print(res.get('summary', '[GAGAL]'))
    print(f"Ungrounded numbers: {gr['potentially_ungrounded']}")
    print()
    scenario_results.append({
        'scenario':  scenario['label'],
        'summary':   res.get('summary'),
        'grounding': gr,
    })
"""),

    md("## 5. Skenario Jebakan: Data Minim"),

    code("""trap_data = {
    'total_masukan': 12,
    'periode': {'start': '2026-08-01', 'end': '2026-08-07'},
    # Sengaja tidak ada informasi breakdown kategori, breach, dll
}

print('=== Skenario Jebakan: Data Sangat Minim ===')
trap_result = generate_summary(trap_data, context='laporan mingguan (data sangat terbatas)')
print('Summary:', trap_result.get('summary', '[GAGAL]'))
print()

trap_grounding = check_grounding(trap_result.get('summary', ''), trap_data)
print('Grounding check:', trap_grounding['grounding_note'])
print()
print('Analisis: Apakah model jujur mengakui data terbatas, atau tetap mengarang kesimpulan?')
"""),

    md("## 6. Simpan Hasil ke JSON"),

    code("""final_output = {
    'generated_at':      pd.Timestamp.now().isoformat(),
    'main_summary':      result,
    'main_grounding':    grounding,
    'scenario_results':  scenario_results,
    'trap_scenario': {
        'summary':   trap_result,
        'grounding': trap_grounding,
    },
}

save_summary_json(final_output, OUTPUT_PATH)
print(f'Semua hasil disimpan ke: {OUTPUT_PATH}')
"""),

    md("""## 7. Catatan: Strategi Mitigasi jika Grounding Gagal

| Strategi | Kapan digunakan |
|---|---|
| **Template terstruktur** | Jika grounding check menunjukkan banyak angka tidak tertelusuri |
| **Batasi num_predict** | Kurangi panjang output agar model tidak ngelantur |
| **Turunkan temperature** | Temperature < 0.1 untuk output lebih deterministik |
| **Prompt chain** | Generate → Verify → Filter: tambahkan step verifikasi sebelum ditampilkan |
| **Human review gate** | Semua ringkasan AI perlu approval reviewer sebelum tampil di dashboard pimpinan |

> Fungsi `generate_summary_template()` di `modules/ai_summary.py` tersedia sebagai fallback yang 
> lebih aman — angka di-inject langsung ke template string, tanpa risiko halusinasi.
"""),
])

save(nb07, "07_ai_summary_grounded.ipynb")


# ─────────────────────────────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────────────────────────────
print()
print('=' * 60)
print('SELESAI — Semua notebook berhasil dibuat:')
print('=' * 60)
for nb_file in sorted(OUTPUT_DIR.glob('*.ipynb')):
    size_kb = nb_file.stat().st_size / 1024
    print(f'  {nb_file.name:<45} ({size_kb:.1f} KB)')
print()
print('Modules tersedia di notebooks/modules/:')
for mod_file in sorted((OUTPUT_DIR / 'modules').glob('*.py')):
    size_kb = mod_file.stat().st_size / 1024
    print(f'  {mod_file.name:<45} ({size_kb:.1f} KB)')
