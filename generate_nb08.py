"""
generate_nb08.py
================
Generate notebook 08 — Data Mining untuk SuaraLens.

Jalankan dari folder SuaraLens/:
    python generate_nb08.py
"""

import nbformat as nbf
from pathlib import Path

OUTPUT_DIR = Path("notebooks")
OUTPUT_DIR.mkdir(exist_ok=True)

def md(text):   return nbf.v4.new_markdown_cell(text)
def code(text): return nbf.v4.new_code_cell(text)

nb08 = nbf.v4.new_notebook()
nb08.metadata = {
    "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
    "language_info": {"name": "python", "version": "3.11.0"}
}

nb08.cells = [

# ── HEADER ───────────────────────────────────────────────────────────────────
md("""# 08 — Data Mining
**SuaraLens** | Analitik Masukan, Aduan & Aspirasi Berbasis NLP — PENS

Notebook ini menerapkan teknik data mining pada dataset SuaraLens untuk menggali
pola tersembunyi yang tidak terlihat dari statistik deskriptif biasa.

| Teknik | Tujuan |
|---|---|
| K-Means Clustering | Kelompokkan aduan berdasarkan kemiripan semantik |
| Topic Modeling (LDA) | Temukan tema tersembunyi dalam teks |
| Association Rule Mining | Pola hubungan antar atribut (kategori, urgency, stakeholder) |
| Klasifikasi TF-IDF (baseline) | Bandingkan performa ML tradisional vs LLM (NB 05) |
| Anomaly Detection | Identifikasi aduan yang tidak biasa / outlier |

Semua output disimpan ke `../data/output/data_mining_results.json` untuk dashboard web.
"""),

# ── SETUP ─────────────────────────────────────────────────────────────────────
md("## 0. Setup & Load Data"),

code("""import subprocess, sys

# Install dependencies tambahan jika belum ada
_PKGS = ['mlxtend', 'umap-learn', 'wordcloud', 'Sastrawi', 'scikit-learn']
for pkg in _PKGS:
    try:
        __import__(pkg.replace('-', '_').lower())
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

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
import seaborn as sns
from pathlib import Path

# NLP
from sklearn.feature_extraction.text import TfidfVectorizer, CountVectorizer
from sklearn.decomposition import LatentDirichletAllocation
from sklearn.cluster import KMeans, DBSCAN
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    classification_report, silhouette_score,
    accuracy_score, confusion_matrix
)
from sklearn.pipeline import Pipeline

from modules.preprocessing import clean_text, load_embedding_model, encode_texts

sns.set_theme(style='whitegrid', palette='muted')
plt.rcParams.update({'figure.dpi': 120, 'font.size': 11})

DATA_PATH   = '../data/suaralens_dummy_simulasi.jsonl'
OUTPUT_PATH = '../data/output/data_mining_results.json'

df = pd.read_json(DATA_PATH, lines=True)
df['teks_cleaned'] = df['teks_aduan'].apply(clean_text)
df['tanggal_masuk'] = pd.to_datetime(df['tanggal_masuk'])

print(f'Dataset: {len(df):,} baris | {df.shape[1]} kolom')
print(f'Rentang: {df[\"tanggal_masuk\"].min().date()} s.d. {df[\"tanggal_masuk\"].max().date()}')
"""),

# ── STOPWORDS INDONESIA ───────────────────────────────────────────────────────
code("""# Stopwords Bahasa Indonesia (Sastrawi + tambahan domain)
try:
    from Sastrawi.StopWordRemover.StopWordRemoverFactory import StopWordRemoverFactory
    factory   = StopWordRemoverFactory()
    stop_list = factory.get_stop_words()
except ImportError:
    stop_list = []

DOMAIN_STOPWORDS = [
    'pens', 'kampus', 'mohon', 'tolong', 'terimakasih', 'terima', 'kasih',
    'saya', 'kami', 'bapak', 'ibu', 'pak', 'bu', 'teman', 'sudah', 'sudah',
    'sangat', 'sekali', 'juga', 'sudah', 'belum', 'ada', 'tidak', 'bisa',
    'akan', 'untuk', 'dengan', 'yang', 'dan', 'di', 'ke', 'dari', 'ini',
    'itu', 'atau', 'jika', 'kalau', 'karena', 'namun', 'tapi', 'agar',
    'supaya', 'serta', 'juga', 'bahwa', 'lebih', 'lagi', 'masih', 'harus',
    'perlu', 'banyak', 'semua', 'setiap', 'selama', 'sejak', 'setelah',
    'minta', 'mau', 'mau', 'ingin', 'harap', 'diharapkan', 'dimohon',
]
STOPWORDS = list(set(stop_list + DOMAIN_STOPWORDS))
print(f'Total stopwords: {len(STOPWORDS)}')
"""),

# ═════════════════════════════════════════════════════════════════════════════
# 1. CLUSTERING
# ═════════════════════════════════════════════════════════════════════════════
md("""---
## 1. Clustering Teks Berbasis Embedding Semantik

Tujuan: Kelompokkan aduan berdasarkan **kemiripan makna** (bukan kata kunci),
menggunakan embedding dari `paraphrase-multilingual-MiniLM-L12-v2`.
"""),

code("""# Load embedding (gunakan subset 2000 agar tidak terlalu lama)
SAMPLE_N  = 2000
df_sample = df.sample(SAMPLE_N, random_state=42).reset_index(drop=True)

print(f'Loading embedding model untuk {SAMPLE_N} sampel...')
model      = load_embedding_model()
embeddings = encode_texts(model, df_sample['teks_cleaned'].tolist(), show_progress=True)
print(f'Embeddings shape: {embeddings.shape}')
"""),

code("""# Elbow Method — cari K optimal
from sklearn.cluster import KMeans

inertias   = []
sil_scores = []
K_RANGE    = range(4, 16)

print('Menghitung elbow curve...')
for k in K_RANGE:
    km  = KMeans(n_clusters=k, random_state=42, n_init=10, max_iter=200)
    lbl = km.fit_predict(embeddings)
    inertias.append(km.inertia_)
    sil = silhouette_score(embeddings, lbl, sample_size=500, random_state=42)
    sil_scores.append(sil)
    print(f'  k={k}: inertia={km.inertia_:.1f}, silhouette={sil:.4f}')

fig, axes = plt.subplots(1, 2, figsize=(13, 4))
axes[0].plot(K_RANGE, inertias, 'o-', color='steelblue', linewidth=2)
axes[0].set_title('Elbow Method — Inertia')
axes[0].set_xlabel('Jumlah Cluster (K)')
axes[0].set_ylabel('Inertia')

axes[1].plot(K_RANGE, sil_scores, 's-', color='darkorange', linewidth=2)
axes[1].set_title('Silhouette Score per K')
axes[1].set_xlabel('Jumlah Cluster (K)')
axes[1].set_ylabel('Silhouette Score (lebih tinggi = lebih baik)')
axes[1].axhline(max(sil_scores), color='red', linestyle='--', alpha=0.5,
                label=f'Best: {max(sil_scores):.4f} (k={K_RANGE[sil_scores.index(max(sil_scores))]})')
axes[1].legend()

plt.tight_layout()
plt.show()

BEST_K = K_RANGE[sil_scores.index(max(sil_scores))]
print(f'\\nK optimal berdasarkan Silhouette Score: {BEST_K}')
"""),

code("""# Fit K-Means dengan K optimal
km_final = KMeans(n_clusters=BEST_K, random_state=42, n_init=10, max_iter=300)
df_sample['cluster'] = km_final.fit_predict(embeddings)

# Distribusi cluster
cluster_dist = df_sample['cluster'].value_counts().sort_index()
print('Distribusi per cluster:')
print(cluster_dist.to_string())
"""),

code("""# Visualisasi dengan t-SNE (2D)
from sklearn.manifold import TSNE

print('Menghitung t-SNE proyeksi (2D)...')
tsne = TSNE(n_components=2, perplexity=40, random_state=42, n_iter=1000)
emb_2d = tsne.fit_transform(embeddings)

df_sample['tsne_x'] = emb_2d[:, 0]
df_sample['tsne_y'] = emb_2d[:, 1]

fig, axes = plt.subplots(1, 2, figsize=(16, 6))

# Plot by cluster
palette_c = sns.color_palette('tab10', BEST_K)
for c in range(BEST_K):
    mask = df_sample['cluster'] == c
    axes[0].scatter(df_sample.loc[mask, 'tsne_x'],
                    df_sample.loc[mask, 'tsne_y'],
                    s=12, alpha=0.6, color=palette_c[c], label=f'C{c}')
axes[0].set_title(f't-SNE — K-Means Cluster (K={BEST_K})')
axes[0].legend(markerscale=2, fontsize=8, ncol=2)
axes[0].axis('off')

# Plot by kategori_true
cats      = df_sample['kategori_true'].unique()
palette_k = sns.color_palette('tab20', len(cats))
cat_map   = {c: i for i, c in enumerate(cats)}
for cat in cats:
    mask = df_sample['kategori_true'] == cat
    axes[1].scatter(df_sample.loc[mask, 'tsne_x'],
                    df_sample.loc[mask, 'tsne_y'],
                    s=12, alpha=0.6, color=palette_k[cat_map[cat]], label=cat)
axes[1].set_title('t-SNE — Ground Truth Kategori')
axes[1].legend(markerscale=2, fontsize=7, ncol=2, loc='lower right')
axes[1].axis('off')

plt.suptitle('Proyeksi t-SNE: Cluster vs Kategori', fontsize=14, fontweight='bold')
plt.tight_layout()
plt.show()
"""),

code("""# Profil tiap cluster: distribusi kategori dominan
print('=== Profil Cluster — Kategori Dominan ===\\n')
cluster_profiles = {}
for c in sorted(df_sample['cluster'].unique()):
    subset   = df_sample[df_sample['cluster'] == c]
    top_cats = subset['kategori_true'].value_counts().head(3)
    top_urg  = subset['urgency_label_true'].value_counts().iloc[0]
    top_sent = subset['sentiment_true'].value_counts().iloc[0]

    cluster_profiles[f'cluster_{c}'] = {
        'size':         int(len(subset)),
        'top_kategori': top_cats.to_dict(),
        'urgency_mode': top_urg,
        'sentiment_mode': top_sent,
    }

    print(f'Cluster {c} (n={len(subset)}):')
    print(f'  Kategori   : {top_cats.to_dict()}')
    print(f'  Urgency    : {top_urg}')
    print(f'  Sentimen   : {top_sent}')
    print()
"""),

# ═════════════════════════════════════════════════════════════════════════════
# 2. TOPIC MODELING (LDA)
# ═════════════════════════════════════════════════════════════════════════════
md("""---
## 2. Topic Modeling — Latent Dirichlet Allocation (LDA)

Tujuan: Temukan **tema laten** dalam korpus teks tanpa menggunakan label.
LDA cocok sebagai eksplorasi tambahan di luar 12 kategori yang sudah ada.
"""),

code("""# Vectorize dengan CountVectorizer (LDA butuh count matrix, bukan TF-IDF)
cv = CountVectorizer(
    max_df=0.85,        # hapus kata yang ada di > 85% dokumen
    min_df=5,           # hapus kata yang ada di < 5 dokumen
    max_features=3000,
    stop_words=STOPWORDS,
    ngram_range=(1, 2),
    token_pattern=r'\\b[a-z]{3,}\\b'   # minimal 3 karakter
)

X_count = cv.fit_transform(df['teks_cleaned'])
vocab   = cv.get_feature_names_out()

print(f'Vocab size: {len(vocab)} terms')
print(f'Matrix shape: {X_count.shape}')
"""),

code("""# Cari jumlah topic optimal via perplexity
N_TOPICS_RANGE = [6, 8, 10, 12, 14]
perplexities   = []

print('Melatih LDA untuk berbagai jumlah topic...')
for n in N_TOPICS_RANGE:
    lda = LatentDirichletAllocation(
        n_components=n, max_iter=15,
        learning_method='online', random_state=42
    )
    lda.fit(X_count)
    perp = lda.perplexity(X_count)
    perplexities.append(perp)
    print(f'  n_topics={n}: perplexity={perp:.2f}')

fig, ax = plt.subplots(figsize=(8, 4))
ax.plot(N_TOPICS_RANGE, perplexities, 'o-', color='purple', linewidth=2)
ax.set_title('Perplexity LDA per Jumlah Topic (lebih rendah = lebih baik)')
ax.set_xlabel('Jumlah Topic')
ax.set_ylabel('Perplexity')
plt.tight_layout()
plt.show()

BEST_N_TOPICS = N_TOPICS_RANGE[perplexities.index(min(perplexities))]
print(f'\\nJumlah topic terbaik: {BEST_N_TOPICS}')
"""),

code("""# Fit LDA final
lda_final = LatentDirichletAllocation(
    n_components=BEST_N_TOPICS, max_iter=30,
    learning_method='online', random_state=42
)
lda_final.fit(X_count)

# Tampilkan top kata per topic
N_TOP_WORDS = 12
topic_data  = []
print(f'=== Top {N_TOP_WORDS} Kata per Topic ===\\n')
for topic_idx, topic in enumerate(lda_final.components_):
    top_words = [vocab[i] for i in topic.argsort()[:-N_TOP_WORDS-1:-1]]
    topic_data.append({'topic': topic_idx, 'top_words': top_words})
    print(f'Topic {topic_idx:2d}: {" | ".join(top_words)}')
"""),

code("""# Word Cloud per Topic (tampilkan 4 topic pertama)
try:
    from wordcloud import WordCloud
    N_SHOW = min(4, BEST_N_TOPICS)
    fig, axes = plt.subplots(1, N_SHOW, figsize=(5 * N_SHOW, 4))
    if N_SHOW == 1: axes = [axes]

    for i in range(N_SHOW):
        topic     = lda_final.components_[i]
        word_freq = {vocab[j]: float(topic[j]) for j in topic.argsort()[-50:][::-1]}
        wc = WordCloud(
            width=400, height=300, background_color='white',
            colormap='viridis', max_words=40,
        ).generate_from_frequencies(word_freq)
        axes[i].imshow(wc, interpolation='bilinear')
        axes[i].set_title(f'Topic {i}', fontsize=12, fontweight='bold')
        axes[i].axis('off')

    plt.suptitle('Word Cloud — Top 4 LDA Topics', fontsize=14, fontweight='bold')
    plt.tight_layout()
    plt.show()
except ImportError:
    print('wordcloud tidak tersedia. Install: pip install wordcloud')
"""),

code("""# Assign dominant topic ke tiap dokumen
doc_topics   = lda_final.transform(X_count)
df['dominant_topic'] = doc_topics.argmax(axis=1)

# Mapping topic → kategori dominan
print('=== Mapping Topic ke Kategori Dominan ===\\n')
topic_category_map = {}
for topic_idx in range(BEST_N_TOPICS):
    subset   = df[df['dominant_topic'] == topic_idx]
    top_cat  = subset['kategori_true'].value_counts().iloc[0] if len(subset) > 0 else 'N/A'
    coverage = subset['kategori_true'].value_counts().iloc[0] / len(subset) * 100 if len(subset) > 0 else 0
    topic_category_map[topic_idx] = {'dominant_category': top_cat, 'coverage_pct': round(coverage, 1)}
    print(f'  Topic {topic_idx:2d}: {top_cat} ({coverage:.1f}% dari {len(subset)} dokumen)')
"""),

# ═════════════════════════════════════════════════════════════════════════════
# 3. ASSOCIATION RULE MINING
# ═════════════════════════════════════════════════════════════════════════════
md("""---
## 3. Association Rule Mining

Tujuan: Temukan **pola hubungan** antar atribut diskrit — misalnya:
*"Aduan dari Mahasiswa tentang Keuangan dengan urgency High → 80% SLA Breach"*

Menggunakan Apriori (mlxtend).
"""),

code("""from mlxtend.frequent_patterns import apriori, association_rules
from mlxtend.preprocessing import TransactionEncoder

# Buat transaction per baris: gabungan item dari beberapa kolom
transactions = []
for _, row in df.iterrows():
    items = [
        f"KAT:{row['kategori_true']}",
        f"URG:{row['urgency_label_true']}",
        f"SENT:{row['sentiment_true']}",
        f"STATUS:{row['status']}",
        f"SH:{row['stakeholder_type']}",
        f"KANAL:{row['kanal']}" if pd.notna(row['kanal']) else "KANAL:Unknown",
        f"BREACH:{row['sla_breach_true']}",
    ]
    transactions.append(items)

te      = TransactionEncoder()
te_arr  = te.fit(transactions).transform(transactions)
df_te   = pd.DataFrame(te_arr, columns=te.columns_)

print(f'Transaction matrix: {df_te.shape}')
print(f'Item set size: {len(te.columns_)}')
"""),

code("""# Jalankan Apriori
MIN_SUPPORT    = 0.05   # minimal 5% transaksi
MIN_CONFIDENCE = 0.60   # minimal 60% confidence

print(f'Apriori dengan min_support={MIN_SUPPORT}, min_confidence={MIN_CONFIDENCE}...')
frequent_itemsets = apriori(df_te, min_support=MIN_SUPPORT, use_colnames=True)
frequent_itemsets['length'] = frequent_itemsets['itemsets'].apply(len)

print(f'Frequent itemsets: {len(frequent_itemsets)}')
print(f'  2-itemset: {len(frequent_itemsets[frequent_itemsets[\"length\"]==2])}')
print(f'  3-itemset: {len(frequent_itemsets[frequent_itemsets[\"length\"]==3])}')
"""),

code("""# Association Rules
rules = association_rules(
    frequent_itemsets,
    metric='confidence',
    min_threshold=MIN_CONFIDENCE
)
rules = rules.sort_values('lift', ascending=False)
rules['antecedents_str'] = rules['antecedents'].apply(lambda x: ' & '.join(sorted(x)))
rules['consequents_str'] = rules['consequents'].apply(lambda x: ' & '.join(sorted(x)))

print(f'Total rules: {len(rules)}')
print()
print('=== Top 15 Rules (by lift) ===')
display(rules[['antecedents_str', 'consequents_str', 'support', 'confidence', 'lift']].head(15).round(4))
"""),

code("""# Filter: rules yang konsekuennya mengandung BREACH (paling relevan untuk SLA)
breach_rules = rules[rules['consequents_str'].str.contains('BREACH')]
breach_rules = breach_rules.sort_values('confidence', ascending=False)

print(f'Rules yang memprediksi SLA Breach: {len(breach_rules)}')
print()
display(breach_rules[['antecedents_str', 'consequents_str', 'support', 'confidence', 'lift']].head(10).round(4))
"""),

code("""# Visualisasi: scatter support vs confidence (warna = lift)
if len(rules) > 0:
    fig, ax = plt.subplots(figsize=(10, 6))
    scatter = ax.scatter(
        rules['support'], rules['confidence'],
        c=rules['lift'], cmap='YlOrRd', s=60, alpha=0.7
    )
    plt.colorbar(scatter, ax=ax, label='Lift')
    ax.set_xlabel('Support')
    ax.set_ylabel('Confidence')
    ax.set_title('Association Rules — Support vs Confidence (warna = Lift)')

    # Highlight BREACH rules
    if len(breach_rules) > 0:
        ax.scatter(
            breach_rules['support'], breach_rules['confidence'],
            edgecolors='blue', facecolors='none', s=100, linewidths=1.5,
            label='Rules → BREACH'
        )
        ax.legend()

    plt.tight_layout()
    plt.show()
"""),

# ═════════════════════════════════════════════════════════════════════════════
# 4. KLASIFIKASI TF-IDF (BASELINE)
# ═════════════════════════════════════════════════════════════════════════════
md("""---
## 4. Klasifikasi TF-IDF + Random Forest (Baseline)

Tujuan: Bandingkan performa ML tradisional vs LLM (NB 05).
Model ringan ini bisa menjadi **fallback** saat Ollama tidak tersedia.
"""),

code("""# Split data
X = df['teks_cleaned']
y = df['kategori_true']

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)
print(f'Train: {len(X_train)} | Test: {len(X_test)}')
"""),

code("""# Pipeline TF-IDF + Random Forest
pipeline = Pipeline([
    ('tfidf', TfidfVectorizer(
        max_features=5000,
        stop_words=STOPWORDS,
        ngram_range=(1, 2),
        sublinear_tf=True,
        min_df=3,
    )),
    ('clf', RandomForestClassifier(
        n_estimators=200,
        random_state=42,
        n_jobs=-1,
        class_weight='balanced',
    ))
])

print('Melatih model TF-IDF + Random Forest...')
pipeline.fit(X_train, y_train)
y_pred = pipeline.predict(X_test)

acc = accuracy_score(y_test, y_pred)
print(f'\\nAkurasi test set: {acc*100:.2f}%')
"""),

code("""from sklearn.metrics import classification_report
from modules.llm_engine import VALID_CATEGORIES

print('=== Classification Report — TF-IDF + RF ===')
print(classification_report(y_test, y_pred, zero_division=0))
print('(Bandingkan dengan akurasi LLM di data/output/evaluation_report.json)')
"""),

code("""# Confusion Matrix
cm    = confusion_matrix(y_test, y_pred, labels=VALID_CATEGORIES)
fig, ax = plt.subplots(figsize=(13, 9))
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
            xticklabels=VALID_CATEGORIES, yticklabels=VALID_CATEGORIES,
            linewidths=0.5, ax=ax)
ax.set_title('Confusion Matrix — TF-IDF + Random Forest (Baseline)')
ax.set_xlabel('Prediksi')
ax.set_ylabel('Ground Truth')
plt.xticks(rotation=45, ha='right')
plt.yticks(rotation=0)
plt.tight_layout()
plt.show()
"""),

code("""# Feature Importance: top TF-IDF terms per kategori
tfidf_feat  = pipeline.named_steps['tfidf'].get_feature_names_out()
rf_model    = pipeline.named_steps['clf']
classes     = rf_model.classes_
importances = rf_model.feature_importances_

top_terms_per_cat = {}

print('=== Top 8 Kata per Kategori (Feature Importance Global) ===\\n')
top_global = sorted(zip(importances, tfidf_feat), reverse=True)[:20]
print('Top 20 term global:')
for imp, term in top_global:
    print(f'  {term:<30} {imp:.5f}')
"""),

# ═════════════════════════════════════════════════════════════════════════════
# 5. ANOMALY DETECTION
# ═════════════════════════════════════════════════════════════════════════════
md("""---
## 5. Anomaly Detection — Aduan Tidak Biasa

Tujuan: Identifikasi aduan yang **secara semantik tidak biasa** — terlalu pendek/panjang,
konten tidak relevan, atau outlier yang perlu perhatian khusus.

Menggunakan **Isolation Forest** pada embedding vektor.
"""),

code("""print('Menjalankan Isolation Forest pada embedding 2000 sampel...')

# Gunakan embedding dari seksi clustering (df_sample)
iso_forest = IsolationForest(
    contamination=0.05,   # estimasi 5% outlier
    random_state=42,
    n_estimators=200
)
anomaly_labels  = iso_forest.fit_predict(embeddings)    # -1 = anomali, 1 = normal
anomaly_scores  = iso_forest.score_samples(embeddings)  # lebih negatif = lebih anomali

df_sample['anomaly_label'] = anomaly_labels
df_sample['anomaly_score'] = anomaly_scores

n_anomalies = (anomaly_labels == -1).sum()
print(f'Total anomali terdeteksi: {n_anomalies} ({n_anomalies/len(df_sample)*100:.1f}%)')
"""),

code("""# Visualisasi anomali di t-SNE
fig, ax = plt.subplots(figsize=(10, 7))

normal = df_sample[df_sample['anomaly_label'] == 1]
anom   = df_sample[df_sample['anomaly_label'] == -1]

ax.scatter(normal['tsne_x'], normal['tsne_y'], s=10, alpha=0.4, color='steelblue', label='Normal')
ax.scatter(anom['tsne_x'],   anom['tsne_y'],   s=30, alpha=0.8, color='red',       label='Anomali', marker='x')

ax.set_title(f'Anomaly Detection — Isolation Forest ({n_anomalies} anomali merah)')
ax.legend(markerscale=2)
ax.axis('off')
plt.tight_layout()
plt.show()
"""),

code("""# Tampilkan 10 aduan paling anomali
top_anomalies = (
    df_sample[df_sample['anomaly_label'] == -1]
    .nsmallest(10, 'anomaly_score')
    [['id_aduan', 'kategori_true', 'urgency_label_true', 'sentiment_true',
      'anomaly_score', 'teks_aduan']]
)

pd.set_option('display.max_colwidth', 100)
print('=== 10 Aduan Paling Anomali ===')
display(top_anomalies)
"""),

code("""# Distribusi anomali per kategori
anom_by_cat = df_sample[df_sample['anomaly_label'] == -1]['kategori_true'].value_counts()
total_by_cat = df_sample['kategori_true'].value_counts()
anom_rate    = (anom_by_cat / total_by_cat * 100).dropna().sort_values(ascending=False)

fig, ax = plt.subplots(figsize=(10, 4))
ax.bar(anom_rate.index, anom_rate.values, color=sns.color_palette('Reds_r', len(anom_rate)))
ax.set_title('Anomaly Rate per Kategori (%)')
ax.set_ylabel('%')
ax.tick_params(axis='x', rotation=30)
plt.tight_layout()
plt.show()
"""),

# ═════════════════════════════════════════════════════════════════════════════
# 6. SIMPAN SEMUA HASIL
# ═════════════════════════════════════════════════════════════════════════════
md("""---
## 6. Simpan Semua Hasil ke JSON

Output ini akan dikonsumsi oleh web dashboard via FastAPI.
"""),

code("""from sklearn.metrics import classification_report as cr
import json
from pathlib import Path

report_dict = classification_report(
    y_test, y_pred, output_dict=True, zero_division=0
)

output = {
    'generated_at': pd.Timestamp.now().isoformat(),
    'dataset_size': len(df),
    'sample_size_clustering': SAMPLE_N,

    # 1. Clustering
    'clustering': {
        'algorithm':        'KMeans',
        'n_clusters':       int(BEST_K),
        'silhouette_score': round(max(sil_scores), 4),
        'cluster_profiles': cluster_profiles,
        'elbow_data': [
            {'k': int(k), 'inertia': float(i), 'silhouette': round(s, 4)}
            for k, i, s in zip(K_RANGE, inertias, sil_scores)
        ],
    },

    # 2. Topic Modeling
    'topic_modeling': {
        'algorithm':    'LDA',
        'n_topics':     int(BEST_N_TOPICS),
        'vocab_size':   len(vocab),
        'topics':       topic_data,
        'topic_category_map': {str(k): v for k, v in topic_category_map.items()},
    },

    # 3. Association Rules
    'association_rules': {
        'min_support':     MIN_SUPPORT,
        'min_confidence':  MIN_CONFIDENCE,
        'total_rules':     int(len(rules)),
        'breach_rules':    breach_rules[
            ['antecedents_str', 'consequents_str', 'support', 'confidence', 'lift']
        ].head(10).round(4).to_dict(orient='records') if len(breach_rules) > 0 else [],
        'top_rules': rules[
            ['antecedents_str', 'consequents_str', 'support', 'confidence', 'lift']
        ].head(20).round(4).to_dict(orient='records'),
    },

    # 4. Klasifikasi TF-IDF Baseline
    'tfidf_baseline': {
        'model':           'TF-IDF + RandomForest',
        'test_accuracy':   round(float(acc) * 100, 2),
        'train_size':      int(len(X_train)),
        'test_size':       int(len(X_test)),
        'classification_report': {
            k: v for k, v in report_dict.items()
            if k in VALID_CATEGORIES or k in ['accuracy', 'macro avg', 'weighted avg']
        },
    },

    # 5. Anomaly Detection
    'anomaly_detection': {
        'algorithm':       'IsolationForest',
        'contamination':   0.05,
        'n_anomalies':     int(n_anomalies),
        'anomaly_rate_pct': round(n_anomalies / len(df_sample) * 100, 2),
        'anomaly_rate_by_category': anom_rate.round(2).to_dict(),
        'sample_anomalies': top_anomalies[
            ['id_aduan', 'kategori_true', 'anomaly_score']
        ].to_dict(orient='records'),
    },
}

output_path = Path(OUTPUT_PATH)
output_path.parent.mkdir(parents=True, exist_ok=True)
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(output, f, ensure_ascii=False, indent=2, default=str)

print(f'Semua hasil data mining disimpan ke: {OUTPUT_PATH}')
"""),

# ═════════════════════════════════════════════════════════════════════════════
# 7. RINGKASAN
# ═════════════════════════════════════════════════════════════════════════════
md("""---
## 7. Ringkasan Temuan Data Mining

### 1. Clustering Semantik
- Embedding multilingual mampu mengelompokkan aduan dengan makna serupa meski menggunakan kata berbeda
- Bandingkan `cluster_profiles` dengan `kategori_true` — jika cluster overlap tinggi, artinya label kategori sudah menangkap pola semantik dengan baik
- Cluster dengan kategori campuran mengindikasikan aduan yang ambigu → relevan untuk routing review

### 2. Topic Modeling (LDA)
- LDA menemukan tema laten di luar 12 kategori eksplisit
- Topic dengan `coverage_pct` rendah (banyak kategori berbeda) = tema lintas-kategori (mis. "kepuasan layanan umum")
- Top words per topic dapat dijadikan seed untuk sistem keyword alert di dashboard

### 3. Association Rules
- Rules dengan `lift > 1.5` menunjukkan hubungan yang signifikan (jauh di atas chance)
- Rules yang konsekuennya `BREACH:True` sangat berharga untuk **prediksi SLA breach** proaktif
- Contoh actionable: jika suatu kombinasi (kategori + urgency + stakeholder) memiliki confidence BREACH tinggi → flagging otomatis

### 4. Baseline TF-IDF + Random Forest
- Bandingkan akurasi model ini dengan hasil LLM di `evaluation_report.json` (NB 05)
- Model ini dapat digunakan sebagai **fallback ringan** saat Ollama tidak tersedia (inference jauh lebih cepat)
- TF-IDF feature importance mengungkap kata kunci diskriminatif per kategori

### 5. Anomaly Detection
- Aduan anomali perlu diinvestigasi manual: bisa spam, aduan tidak jelas, atau justru kasus kritis yang tidak umum
- Integrasikan ke dashboard sebagai **"Perlu Perhatian Khusus"** queue terpisah dari antrian utama

> **Untuk web dashboard**: gunakan `data/output/data_mining_results.json` sebagai data source.
> Endpoint FastAPI yang disarankan: `GET /api/mining/clustering`, `GET /api/mining/rules`, `GET /api/mining/anomalies`
"""),
]

# Save
path = OUTPUT_DIR / "08_data_mining.ipynb"
with open(path, "w", encoding="utf-8") as f:
    nbf.write(nb08, f)

size_kb = path.stat().st_size / 1024
print(f"[OK] {path} ({size_kb:.1f} KB)")
print()
print("Notebook 08_data_mining.ipynb berhasil dibuat!")
print("Teknik yang dicakup:")
print("  1. K-Means Clustering + t-SNE visualization")
print("  2. Topic Modeling (LDA) + Word Cloud")
print("  3. Association Rule Mining (Apriori)")
print("  4. TF-IDF + Random Forest (baseline vs LLM)")
print("  5. Anomaly Detection (Isolation Forest)")
print("  Output -> data/output/data_mining_results.json")
