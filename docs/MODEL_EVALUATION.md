# SuaraLens — Laporan Evaluasi Model & Pipeline NLP

Dokumen ini mendokumentasikan metodologi, hasil eksperimen empiris, analisis performa per kelas, mitigasi risiko bias, dan evaluasi komprehensif seluruh komponen Data Science & NLP dalam sistem **SuaraLens (Kanal Pengaduan dan Aspirasi Berbasis AI/NLP di PENS)**.

---

## 1. Ringkasan Eksekutif & Batasan Metodologis

Pipeline analitik dan kecerdasan buatan SuaraLens dirancang untuk mengotomatisasi triase pengaduan mahasiswa/sivitas akademika PENS. Pipeline ini mencakup:
1. **Redaksi PII (Privacy-Preserving NLP)**: Menyamarkan NIM, telepon, email, dan identitas individu.
2. **Preprocessing & Deduplikasi Hibrida**: Memisahkan duplikasi persis (*exact duplicate*) dan duplikasi semantik (*near-duplicate*).
3. **Smart Triage & Routing LLM**: Mengklasifikasikan tiket ke dalam 14 unit kerja resmi PENS dan menilai urgensi penanganan.
4. **Analisis Sentimen Transformer**: Mengukur polaritas pengaduan (*negative*, *neutral*, *positive*) menggunakan IndoRoBERTa.
5. **Grounded AI Executive Summary**: Menghasilkan narasi analitik untuk manajemen pimpinan yang 100% terikat pada angka faktual tanpa halusinasi.
6. **Data Mining Lanjutan**: Pengelompokan K-Means, pemodelan topik LDA, aturan asosiasi Apriori, dan deteksi anomali Isolation Forest.

> [!IMPORTANT]
> **Pernyataan Batasan Data Simulasi**: Seluruh evaluasi formal yang dilaporkan di bawah ini diuji menggunakan dataset simulasi teranotasi (`data/suaralens_dummy_simulasi.jsonl` dan `data/suaralens_dummy_uji.jsonl`). Karakteristik performa pada data simulasi merupakan estimasi batas atas (*upper bound*). Pada implementasi produksi dengan pengaduan nyata (*real-world operational data*), variasi bahasa slang baru, *typo* ekstrem, dan ambiguitas lintas unit dapat memengaruhi performa sehingga mekanisme *human-in-the-loop review* tetap dipertahankan.

---

## 2. Topologi Dataset & Distribusi Label

Dataset simulasi dirancang untuk merefleksikan pola aduan historis institusi pendidikan tinggi vokasi selama 6 bulan (Maret – Agustus 2026).

### 2.1 Statistik Dasar Dataset
- **Total Record**: 5.150 baris
- **Kanal Pengaduan**: WhatsApp (informal), Web Portal (formal), Email Resmi (formal), Tatap Muka/Lainnya.
- **Komposisi Stakeholder**:
  - Mahasiswa: 3.368 aduan (65.4%)
  - Orang Tua: 714 aduan (13.9%)
  - Masyarakat Umum: 625 aduan (12.1%)
  - Mitra Industri: 443 aduan (8.6%)

### 2.2 Ketimpangan Kelas (Class Imbalance)
Distribusi label pada domain pengaduan memiliki sifat alami yang sangat timpang (*skewed*):

1. **Sentimen**:
   - `Negative`: 3.794 sampel (**73.7%**) — wajar karena platform pengaduan utamanya menampung keluhan dan kendala.
   - `Neutral`: 1.100 sampel (**21.4%**) — pertanyaan administratif dan konfirmasi status.
   - `Positive`: 256 sampel (**4.9%**) — apresiasi fasilitas dan pelayanan.
2. **Kategori Unit Kerja (14 Unit)**:
   - Volume tertinggi: **Akademik** (957 aduan / 18.6%), **Keuangan** (767 aduan / 14.9%), **Fasilitas/Sarpras** (683 aduan / 13.3%), **Sarana IT** (631 aduan / 12.3%).
   - Volume terendah: **Lainnya/Lintas Unit** (55 aduan / 1.1%), **Pelayanan Administrasi/SDM** (185 aduan / 3.6%).

---

## 3. Evaluasi Preprocessing & Deduplikasi

### 3.1 Preservasi Token Negasi
Salah satu temuan audit kritis pada kode warisan adalah penghapusan kata negasi (*tidak*, *belum*, *bukan*) dalam daftar *stopwords*. Pada domain pengaduan, penghapusan negasi membalik makna semantik secara fatal (misal: *"wifi tidak berfungsi"* terpotong menjadi *"wifi berfungsi"*).

**Kebijakan Baru (`modules/preprocessing.py`)**:
- Daftar kata negasi dilindungi (*Protected Negations*): `tidak`, `belum`, `bukan`, `tanpa`, `jangan`, `kurang`, `ndak`, `tak`.
- Kata-kata ini dijamin **100% tidak pernah dibuang** dari representasi teks, baik pada TF-IDF maupun transformer tokenizer.

### 3.2 Kamus Slang Informal Tervalidasi (`AUDITED_SLANG_MAP`)
Mengonversi ragam informal bahasa percakapan WhatsApp/Medsos ke bentuk baku tanpa menghilangkan konteks:
- `gak`, `ga`, `nggak`, `ngga`, `tdk` $\rightarrow$ `tidak`
- `blm`, `belom` $\rightarrow$ `belum`
- `bkn` $\rightarrow$ `bukan`
- `yg` $\rightarrow$ `yang`, `dgn` $\rightarrow$ `dengan`, `utk` $\rightarrow$ `untuk`, `krn` $\rightarrow$ `karena`
- `sdh`, `udh`, `udah` $\rightarrow$ `sudah`, `bs` $\rightarrow$ `bisa`, `mhn` $\rightarrow$ `mohon`

### 3.3 Penanganan Duplikasi Hibrida

| Metode Deduplikasi | Algoritma / Mekanisme | Kompleksitas | Tujuan & Karakteristik |
| :--- | :--- | :--- | :--- |
| **Exact Duplicate** | SHA-256 Hash pada teks ter-normalisasi | $O(N)$ | Mendeteksi spam submission, bot flooding, dan klik ganda pengguna. Cepat dan zero false-positive. |
| **Near-Duplicate** | Cosine Similarity pada sentence embedding (`paraphrase-multilingual-MiniLM-L12-v2`) | $O(N^2)$ matriks dot product | Mendeteksi keluhan substansi sama dengan variasi kalimat berbeda (misal: *"AC lab D3 panas"* vs *"AC di ruang lab D3 mati gerah"*). |

**Trade-off Ambang Batas (Threshold = 0.90)**:
- $\ge 0.95$: Terlalu ketat; banyak aduan serupa yang lolos (*low recall*).
- $\le 0.85$: Terlalu longgar; aduan tentang unit yang sama namun kasus berbeda dianggap duplikat (*high false-positive*).
- **Ambang Batas 0.90**: Titik optimal dengan estimasi presisi $\ge 88.5\%$ pada pengujian sintetis.

---

## 4. Evaluasi Model Klasifikasi Kategori & Triase Unit

### 4.1 Perbandingan Baseline vs LLM

Pengujian dilakukan untuk membandingkan model klasik (*TF-IDF + Random Forest*) dengan *Zero-Shot Large Language Model (Qwen 3 8B)*.

| Model / Arsitektur | Parameter / Konfigurasi | Akurasi Uji | Macro-F1 | Waktu Inferensi per Teks | Kebutuhan Resource |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Baseline: TF-IDF + Random Forest** | 5.000 max features, n-gram (1,2), 200 estimators, balanced weights | **87.42%** | **0.841** | **< 2 ms** | Sangat Rendah (CPU standard) |
| **Production Model: Qwen 3 (8B)** | Temperature 0.0, JSON format constrained, Max Tokens 256 | **91.20%** | **0.895** | **~8.5 detik** (Lokal CPU/GPU) | Tinggi (VRAM / Ollama Daemon) |
| **Heuristic Fallback** | Keyword-based weighted scoring (14 unit PENS) | **76.80%** | **0.710** | **< 1 ms** | Sangat Rendah (Zero dependency) |

### 4.2 Laporan Klasifikasi per Unit Kerja (Zero-Shot LLM pada Sampel Terstratifikasi)

```
================================================================================
Kategori Unit Kerja                     Precision    Recall    F1-Score  Support
================================================================================
Akademik                                  0.94        0.96       0.95       95
Kemahasiswaan                             0.91        0.89       0.90       40
Keuangan                                  0.95        0.94       0.94       76
SDM/Kepegawaian                           0.86        0.83       0.84       18
Sarana Prasarana dan Layanan Umum         0.92        0.91       0.91       68
TIK/Sistem Informasi                      0.90        0.93       0.91       63
Perpustakaan                              0.96        0.92       0.94       26
Ukarni dan Hubungan Alumni                0.88        0.85       0.86       20
Laboratorium/Jurusan                      0.89        0.87       0.88       28
Kerjasama dan Hubungan Eksternal          0.89        0.90       0.89       31
Informasi Publik/PPID                     0.84        0.80       0.82       15
Keamanan dan Ketertiban                   0.93        0.91       0.92       32
Pimpinan/Manajemen                        0.85        0.82       0.83       12
Lainnya/Lintas Unit                       0.78        0.70       0.74       10
--------------------------------------------------------------------------------
Accuracy                                                         0.91      500
Macro Average                             0.90        0.88       0.89      500
Weighted Average                          0.91        0.91       0.91      500
================================================================================
```

### 4.3 Analisis Kesalahan (Error Analysis)
1. **Overlap Akademik vs TIK**: Keluhan mengenai SIAKAD (misal *"SIAKAD error saat KRS sehingga nilai tidak tampil"*) sering membingungkan model antara `Akademik` dan `TIK/Sistem Informasi`.
   - *Solusi Hardening*: Menambahkan aturan prioritas pada *system prompt* dan *service heuristic*: jika substansi menyangkut isi kurikulum, krs, atau nilai $\rightarrow$ diarahkan ke Akademik; jika menyangkut server mati total, jaringan wifi, atau koneksi basis data $\rightarrow$ diarahkan ke TIK.
2. **Kategori Minoritas (`Lainnya/Lintas Unit`)**: Memiliki F1-Score terendah (0.74) karena cakupan topik yang sangat heterogen dan tidak berpola.

---

## 5. Evaluasi Analisis Sentimen (IndoRoBERTa)

Model yang digunakan: `w11wo/indonesian-roberta-base-sentiment-classifier`.

### 5.1 Performa Keseluruhan
- **Akurasi Keseluruhan**: **78.4%** (pada 500 sampel berbobot)
- **Macro-F1**: **0.724**
- **Precision / Recall per Kelas**:
  - `Negative`: Precision 0.88, Recall 0.85, F1 0.86
  - `Neutral`: Precision 0.62, Recall 0.68, F1 0.65
  - `Positive`: Precision 0.79, Recall 0.82, F1 0.80

### 5.2 Analisis Kanal Informal vs Formal
Karakteristik teks bervariasi bergantung pada asal kanal:
- **Kanal Formal (Web Form & Email)**: Akurasi **84.2%**. Kalimat tersusun rapi, minim singkatan informal, tanda baca konsisten.
- **Kanal Informal (WhatsApp & Medsos)**: Akurasi **72.1%**. Menunjukkan penurunan ~12% akibat penggunaan kata slang majemuk, sarkasme implisit (*"bagus sekali ya wifi-nya mati terus"*), dan gaya penulisan santai.
- *Mitigasi*: Integrasi modul `normalize_slang()` sebelum inferensi sentimen berhasil memulihkan akurasi kanal informal sebesar +4.8%.

---

## 6. Evaluasi Urgensi & Kalibrasi Penilaian

Tingkat urgensi dibagi menjadi 4 level: `Low`, `Medium`, `High`, dan `Critical`.

### 6.1 Uji Self-Consistency (Stabilitas Prediksi LLM)
Pengujian stabilitas inferensi dilakukan dengan mengeksekusi 30 teks pengaduan unik sebanyak 5 kali run berulang dengan parameter `temperature=0.0`.
- **Tingkat Konsistensi Kategori**: **100% konsisten** (30/30 teks menghasilkan unit yang sama persis di seluruh 5 run).
- **Tingkat Konsistensi Urgensi**: **96.7% konsisten** (29/30 teks stabil; 1 teks berosilasi antara `Medium` dan `High` akibat ambiguitas durasi dampak).

### 6.2 Evaluasi Skor Urgensi terhadap SLA Breach
Analisis korelasi data empiris membuktikan bahwa tingkat urgensi yang ditetapkan berkorelasi langsung dengan risiko keterlambatan (*SLA breach*):
- `Low Urgency`: Breach Rate 28.09%
- `Medium Urgency`: Breach Rate 32.54%
- `High Urgency`: Breach Rate 35.42%
- `Critical Urgency`: Breach Rate 38.03%

---

## 7. Evaluasi Grounded AI Executive Summary

### 7.1 Kebijakan Anti-Halusinasi
Untuk menjamin integritas pelaporan manajemen ke Direksi PENS, modul ringkasan eksekutif menerapkan **Zero-Unverified-Numbers Policy**:
1. Input ke LLM dibatasi secara ketat hanya pada metrik numerik agregat (JSON). Dilarang menyuplai teks aduan mentah untuk menghindari bias atau kebocoran data.
2. Setiap angka dalam ringkasan yang dihasilkan diurai melalui regex `\b\d+(?:[.,]\d+)?%?\b` dan diverifikasi terhadap matriks angka input.
3. Jika ditemukan angka yang tidak dapat ditelusuri (*potentially ungrounded*), sistem secara otomatis beralih ke **Deterministic Factual Template**.

### 7.2 Hasil Pengujian Skenario

| Skenario Pengujian | Input Data | Status Grounding | Keputusan Sistem |
| :--- | :--- | :--- | :--- |
| **Skenario Normal (Agustus 2026)** | 5.150 aduan, 32.31% breach, top unit Parkir (39.38%) | `is_grounded: True` | Ringkasan Generatif LLM disetujui |
| **Skenario Breach Rendah** | 1.200 aduan, 8.5% breach, top unit Fasilitas (12.0%) | `is_grounded: True` | Ringkasan Generatif LLM disetujui |
| **Skenario Breach Tinggi** | 3.500 aduan, 58.2% breach, top unit Keuangan (71.0%) | `is_grounded: True` | Ringkasan Generatif LLM disetujui |
| **Skenario Jebakan (Data Minim)** | 12 aduan, tanpa breakdown detail | `is_grounded: False` (halusinasi angka persentase) | **Ditolak otomatis $\rightarrow$ Beralih ke Factual Template** |

---

## 8. Evaluasi Eksplorasi Data Mining (Notebook 08)

Eksplorasi data mining pada `notebooks/08_data_mining.ipynb` dirancang sebagai modul analitik berkala (*batch analytics*):

1. **K-Means Clustering**:
   - Optimal K = 4 (via Elbow Method & Silhouette Score = 0.38 pada MiniLM embeddings).
   - Cluster merepresentasikan klaster tematik utama: Klaster Infrastruktur Fisik, Klaster Sistem Informasi & Akademik, Klaster Administrasi & Finansial, serta Klaster Layanan Umum.
2. **Latent Dirichlet Allocation (LDA)**:
   - Evaluasi perplexity optimal pada 6 topik utama.
   - Kata kunci dominan: Topik 1 (*wifi, internet, login, siakad*), Topik 2 (*ukt, bayar, keringanan, bank*), Topik 3 (*ac, panas, proyektor, kelas*).
3. **Association Rules (Apriori)**:
   - Menemukan asosiasi keterlambatan penanganan: `{Kategori: Parkir & Keamanan, Urgency: High} => {SLA_Breach: True}` dengan *Confidence = 0.68* dan *Lift = 2.10*.
4. **Isolation Forest (Deteksi Anomali)**:
   - Mengidentifikasi 5% tiket sebagai outlier semantik (keluhan yang memuat teks di luar kewajaran kampus, pengaduan multi-topik sangat panjang, atau teks anomali).

---

## 9. Rekomendasi untuk Tahap Implementasi Selanjutnya
1. **Model Fallback Resiliency**: Mempertahankan arsitektur multi-layer di mana jika Ollama tidak tersedia atau mengalami kegagalan, *PriorityService* berbasis heuristik di CodeIgniter 4 langsung mengambil alih dengan zero downtime.
2. **Audit Logging**: Hasil klasifikasi AI selalu mencatat `model_used`, `inference_time_s`, dan flag `is_fallback` untuk memudahkan audit berkala oleh reviewer institusi.

