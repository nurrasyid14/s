# Kamus Data SuaraLens (Data Dictionary)

**Proyek:** SuaraLens — Platform Analitika Suara Mahasiswa PENS Berbasis LLM & NLP  
**Versi Dokumen:** 1.0.0  
**Tanggal Rilis:** 7 November 2026  
**DBMS Operasional:** PostgreSQL 16+ (`suaralens`)  
**Analytical Data Store:** JSONL Streaming & JSON Snapshots (`data/output/`)  
**Encoding:** UTF-8  

---

## 1. Pendahuluan dan Konvensi Standar

Kamus data ini mendefinisikan secara spesifik seluruh entitas, tabel, kolom, tipe data, batasan (*constraints*), indeks, serta struktur dokumen analitik yang digunakan dalam sistem SuaraLens.

### 1.1 Konvensi Penamaan
- **Tabel & Kolom:** Huruf kecil dengan pemisah garis bawah (*snake_case*).
- **Primary Key:** Kolom integer auto-increment `id`.
- **Foreign Key:** Nama tabel tunggal diikuti `_id` (contoh: `user_id`, `complaint_id`).
- **Timestamp:** Menggunakan format waktu standar ISO 8601 / SQL `YYYY-MM-DD HH:MM:SS` pada zona waktu `Asia/Jakarta` (WIB).

### 1.2 Kebijakan Privasi Data (Zero-PII pada Layer Analitik)
Sistem SuaraLens menerapkan pemisahan ketat antara data operasional transaksional dan data analitik:
- Pada tabel operasional `complaints`, teks deskripsi yang tersimpan **wajib disamarkan** (*PII Redacted*) oleh modul anonimisasi sebelum disimpan permanen.
- Pada layer streaming analitik (`complaints_stream.jsonl`), atribut pengenal langsung seperti `name`, `email`, `nim_nip`, dan nomor `phone` **tidak diekstrak sama sekali** guna mematuhi prinsip *privacy-by-design*.

---

## 2. Kamus Data Relasional PostgreSQL

### 2.1 Tabel `users`
Menyimpan kredensial otentikasi dan profil pengguna internal maupun eksternal kampus.

| Kolom | Tipe Data | Nullable | Default | Relasi / Constraint | Deskripsi & Valid Values |
|---|---|:---:|---|---|---|
| `id` | `INT UNSIGNED` | Tidak | Auto | **PK** | Identifier unik pengguna |
| `name` | `VARCHAR(100)` | Tidak | - | - | Nama lengkap civitas akademika |
| `email` | `VARCHAR(150)` | Tidak | - | **UNIQUE** | Alamat email resmi (`@pens.ac.id` / `@student.pens.ac.id`) |
| `password_hash` | `VARCHAR(255)` | Tidak | - | - | Hash sandi bcrypt via PHP `password_hash()` |
| `role` | `VARCHAR(30)` | Tidak | `'user'` | Check | Peran otorisasi sistem: `'user'`, `'stakeholder'`, `'admin'` |
| `user_role` | `VARCHAR(50)` | Ya | `NULL` | - | Klasifikasi peran kampus: `'Mahasiswa'`, `'Dosen'`, `'Tendik'`, `'Mitra'` |
| `nim_nip` | `VARCHAR(50)` | Ya | `NULL` | - | Nomor Induk Mahasiswa atau Pegawai |
| `phone` | `VARCHAR(30)` | Ya | `NULL` | - | Nomor kontak WhatsApp / seluler aktif |
| `institution` | `VARCHAR(100)`| Ya | `NULL` | - | Institusi/Departemen pengusul (default: `'PENS'`) |
| `unit` | `VARCHAR(100)`| Ya | `NULL` | - | Divisi penugasan (khusus role `'stakeholder'`, salah satu dari 14 unit) |
| `position` | `VARCHAR(100)`| Ya | `NULL` | - | Jabatan fungsional/struktural |
| `created_at` | `DATETIME` | Ya | `NULL` | - | Waktu pembuatan akun pengguna |
| `updated_at` | `DATETIME` | Ya | `NULL` | - | Waktu pembaruan profil terakhir |

---

### 2.2 Tabel `api_tokens`
Menyimpan token autentikasi bearer (Personal Access Tokens) untuk sesi login web dan API eksternal.

| Kolom | Tipe Data | Nullable | Default | Relasi / Constraint | Deskripsi |
|---|---|:---:|---|---|---|
| `id` | `INT UNSIGNED` | Tidak | Auto | **PK** | Identifier unik rekaman token |
| `user_id` | `INT UNSIGNED` | Tidak | - | **FK** -> `users(id)` ON DELETE CASCADE | Pemilik token |
| `token` | `VARCHAR(255)` | Tidak | - | **UNIQUE** | String bearer token aman (hex 64-char) |
| `expires_at` | `DATETIME` | Ya | `NULL` | - | Batas waktu kedaluwarsa sesi (TTL 7 hari) |
| `created_at` | `DATETIME` | Ya | `NULL` | - | Waktu token diterbitkan |

---

### 2.3 Tabel `complaints`
Menyimpan tiket aspirasi dan pengaduan layanan yang diajukan oleh pengguna.

| Kolom | Tipe Data | Nullable | Default | Relasi / Constraint | Deskripsi & Siklus Nilai |
|---|---|:---:|---|---|---|
| `id` | `INT UNSIGNED` | Tidak | Auto | **PK** | Identifier unik internal tiket |
| `ticket_id` | `VARCHAR(30)` | Tidak | - | **UNIQUE** | Kode referensi tiket publik (contoh: `PENS-20261107-ABCD`) |
| `user_id` | `INT UNSIGNED` | Tidak | - | **FK** -> `users(id)` ON DELETE CASCADE | Pengirim pengaduan |
| `type` | `VARCHAR(30)` | Tidak | `'complaint'` | Check | Tipe pelaporan: `'complaint'`, `'suggestion'`, `'feedback'` |
| `description` | `TEXT` | Tidak | - | - | Narasi pengaduan tersamarkan (*PII-redacted text*) |
| `is_anonymous`| `BOOLEAN` | Tidak | `false` | - | Opsi kerahasiaan identitas pelapor ke publik |
| `status` | `VARCHAR(30)` | Tidak | `'received'` | Check | Status siklus hidup penanganan tiket (lihat sub-bab 2.3.1) |
| `assigned_unit`| `VARCHAR(100)`| Ya | `NULL` | - | Unit kerja resmi PENS penerima disposisi penanganan |
| `created_at` | `DATETIME` | Ya | `NULL` | **INDEX** | Waktu tiket dibuat oleh pengguna |
| `updated_at` | `DATETIME` | Ya | `NULL` | **INDEX** | Waktu pembaruan status / data tiket terakhir |

#### 2.3.1 Siklus Hidup Status Tiket (`status`)
1. `received`: Tiket baru diterima oleh sistem, teks disamarkan dan dianalisis awal.
2. `verified`: Tiket telah diperiksa validitasnya oleh verifikator / Admin.
3. `dispatched`: Tiket diteruskan/disposisi ke Unit Kerja penanggung jawab.
4. `in_progress`: Stakeholder unit kerja sedang menindaklanjuti secara teknis di lapangan.
5. `action_taken`: Tindakan perbaikan telah selesai dikerjakan oleh unit kerja.
6. `answered`: Stakeholder memberikan jawaban dan solusi tertulis pada sistem.
7. `resolved`: Masalah selesai tuntas dan dikonfirmasi penutupannya.
8. `rejected`: Tiket ditolak (duplikasi, spam, di luar wewenang kampus, atau informasi palsu).

#### 2.3.2 Indeks Kinerja Tabel `complaints`
- `idx_complaints_user_id`: Mempercepat query riwayat pengaduan per pengguna.
- `idx_complaints_status`: Mempercepat filter tab dashboard status.
- `idx_complaints_assigned_unit`: Mempercepat filter inbox unit stakeholder.
- `idx_complaints_created_at`: Mendukung pengurutan kronologis.
- `idx_complaints_updated_at`: Mendukung sinkronisasi inkremental data analitik.
- `idx_complaints_status_assigned_unit`: Composite index filter kombinasi unit dan status.
- `idx_complaints_watermark`: Composite index `(updated_at, created_at)` untuk optimasi query ekstraksi data pipeline.

---

### 2.4 Tabel `complaint_analysis`
Menyimpan hasil inferensi klasifikasi unit, evaluasi urgensi, sentimen, dan metadata inferensi AI.

| Kolom | Tipe Data | Nullable | Default | Relasi / Constraint | Deskripsi & Interpretasi Nilai |
|---|---|:---:|---|---|---|
| `id` | `INT UNSIGNED` | Tidak | Auto | **PK** | Identifier unik catatan analisis |
| `complaint_id` | `INT UNSIGNED` | Tidak | - | **FK** -> `complaints(id)` ON DELETE CASCADE | Tiket induk yang dianalisis |
| `category` | `VARCHAR(100)` | Ya | `NULL` | **INDEX** | Rekomendasi unit penanganan dari model AI/heuristik |
| `category_confidence`| `DECIMAL(5,4)` | Ya | `NULL` | Range `0.0000 - 1.0000` | Probabilitas klasifikasi model AI (**NULL jika fallback heuristik**) |
| `urgency_label` | `VARCHAR(30)` | Ya | `NULL` | Check | Tingkat urgensi: `'Low'`, `'Medium'`, `'High'`, `'Critical'` |
| `urgency_score` | `DECIMAL(5,4)` | Ya | `NULL` | Range `0.0000 - 1.0000` | Skor numerik urgensi penanganan keluhan |
| `urgency_reason`| `TEXT` | Ya | `NULL` | - | Alasan tekstual justifikasi tingkat urgensi |
| `sentiment` | `VARCHAR(30)` | Ya | `NULL` | Check | Kelas polaritas sentimen: `'positive'`, `'neutral'`, `'negative'` |
| `sentiment_score`| `DECIMAL(5,4)` | Ya | `NULL` | Range `0.0000 - 1.0000` | Probabilitas kelas sentimen terpilih (**NULL jika fallback**) |
| `sentiment_scores`| `TEXT` | Ya | `NULL` | JSON String | Distribusi probabilitas 3 kelas (contoh: `{"positive":0.1,"neutral":0.2,"negative":0.7}`) |
| `submission_type`| `VARCHAR(30)` | Ya | `'complaint'`| Check | Tipe substansi: `'complaint'`, `'aspiration'` |
| `requires_review`| `BOOLEAN` | Tidak | `false` | **INDEX** | Flag penanda review manual (*Human-in-the-Loop*) |
| `model_version` | `VARCHAR(100)` | Ya | `NULL` | - | Identitas model inferensi (contoh: `qwen3:8b + indonesian-roberta` atau `keyword_heuristic_v1.0`) |
| `inference_time_ms`| `INT` | Ya | `NULL` | - | Durasi eksekusi model ML dalam satuan milidetik |
| `created_at` | `DATETIME` | Ya | `NULL` | - | Waktu analisis selesai diproses |
| `updated_at` | `DATETIME` | Ya | `NULL` | - | Waktu koreksi analisis terakhir |

---

### 2.5 Tabel `complaint_reviews`
Menyimpan riwayat verifikasi manual dan koreksi anotasi AI oleh verifikator (*Human-in-the-Loop*).

| Kolom | Tipe Data | Nullable | Default | Relasi / Constraint | Deskripsi |
|---|---|:---:|---|---|---|
| `id` | `INT UNSIGNED` | Tidak | Auto | **PK** | Identifier unik sesi review |
| `complaint_analysis_id`| `INT UNSIGNED`| Tidak | - | **FK** -> `complaint_analysis(id)` ON DELETE CASCADE | Analisis yang diverifikasi |
| `reviewer_id` | `INT UNSIGNED` | Ya | `NULL` | **FK** -> `users(id)` ON DELETE SET NULL | Akun Admin yang meninjau |
| `review_status` | `VARCHAR(30)` | Tidak | `'pending'` | Check | Status review: `'pending'`, `'approved'`, `'corrected'` |
| `original_category` | `VARCHAR(100)` | Ya | `NULL` | - | Kategori prediksi awal model sebelum dikoreksi |
| `corrected_category`| `VARCHAR(100)` | Ya | `NULL` | - | Kategori definitif hasil koreksi verifikator manusia |
| `original_urgency` | `VARCHAR(30)` | Ya | `NULL` | - | Label urgensi awal model |
| `corrected_urgency`| `VARCHAR(30)` | Ya | `NULL` | - | Label urgensi definitif hasil koreksi |
| `original_sentiment`| `VARCHAR(30)` | Ya | `NULL` | - | Sentimen awal model |
| `corrected_sentiment`| `VARCHAR(30)` | Ya | `NULL` | - | Sentimen definitif hasil koreksi |
| `notes` | `TEXT` | Ya | `NULL` | - | Catatan justifikasi koreksi dari verifikator |
| `created_at` | `DATETIME` | Ya | `NULL` | - | Waktu rekaman review dibuat |
| `updated_at` | `DATETIME` | Ya | `NULL` | - | Waktu verifikasi selesai dieksekusi |

---

### 2.6 Tabel `complaint_replies`
Menyimpan seluruh jejak audit komunikasi, tanggapan teknis, disposisi, dan evaluasi kepuasan.

| Kolom | Tipe Data | Nullable | Default | Relasi / Constraint | Deskripsi |
|---|---|:---:|---|---|---|
| `id` | `INT UNSIGNED` | Tidak | Auto | **PK** | Identifier unik balasan |
| `complaint_id` | `INT UNSIGNED` | Tidak | - | **FK** -> `complaints(id)` ON DELETE CASCADE | Tiket induk percakapan |
| `user_id` | `INT UNSIGNED` | Tidak | - | **FK** -> `users(id)` ON DELETE CASCADE | Penulis balasan |
| `message` | `TEXT` | Tidak | - | - | Isi pesan atau format terstruktur aksi sistem |
| `is_internal` | `BOOLEAN` | Tidak | `false` | - | `true` jika catatan internal khusus staf/admin |
| `created_at` | `DATETIME` | Ya | `NULL` | - | Waktu pesan dikirimkan |
| `updated_at` | `DATETIME` | Ya | `NULL` | - | Waktu pembaruan pesan |

#### 2.6.1 Format Prefix Terstruktur pada `complaint_replies`
Sistem menyimpan peristiwa alur kerja dan feedback melalui prefix terstandarisasi:
- **Verifikasi:** `[Verifikasi Disetujui] Tiket pengaduan valid dan disetujui.`
- **Disposisi:** `[Disposisi ke <Unit>] Pengaduan diteruskan ke <Unit> dengan batas SLA <N> hari.`
- **Tindak Lanjut:** `[Tindak Lanjut] Perbaikan fisik selesai dilakukan di lokasi.`
- **Penyelesaian:** `[Penyelesaian] Permasalahan telah teratasi.`
- **Feedback:** `[Feedback Stakeholder] Rating: 5/5. Aspek Kecepatan: 5, Kejelasan: 4, Solusi: 5. Komentar: Pelayanan responsif.`

---

## 3. Kamus Data Analytical Data Layer (File Storage)

Data analitik disimpan secara terpisah pada direktori `data/output/` untuk menjaga efisiensi kueri database transaksional dan mendukung analisis offline/eksploratif data mining.

### 3.1 Berkas `complaints_stream.jsonl`
Format berkas baris JSON (*JSON Lines*) hasil ekstraksi inkremental berkala dari PostgreSQL.

| Field JSON | Tipe Data | Nullable | Deskripsi |
|---|---|:---:|---|
| `id` | Integer | Tidak | ID internal complaint |
| `ticket_id` | String | Tidak | Nomor tiket publik (contoh: `PENS-202610-0012`) |
| `type` | String | Tidak | Tipe pelaporan (`complaint`, `suggestion`, `feedback`) |
| `status` | String | Tidak | Status terakhir tiket (`resolved`, `in_progress`, dll.) |
| `assigned_unit` | String | Ya | Unit kerja penanggung jawab tiket |
| `created_at` | String | Tidak | Timestamp pembuatan tiket (`YYYY-MM-DD HH:MM:SS`) |
| `updated_at` | String | Ya | Timestamp pembaruan tiket terakhir |
| `category` | String | Ya | Kategori hasil klasifikasi AI/heuristik |
| `category_confidence` | Float | Ya | Nilai confidence AI (`0.0 - 1.0` atau `null`) |
| `urgency_label` | String | Ya | Label urgensi (`Low`, `Medium`, `High`, `Critical`) |
| `urgency_score` | Float | Ya | Skor urgensi (`0.0 - 1.0`) |
| `sentiment` | String | Ya | Kelas sentimen (`positive`, `neutral`, `negative`) |
| `sentiment_score` | Float | Ya | Skor sentimen (`0.0 - 1.0` atau `null`) |
| `submission_type` | String | Ya | Tipe substansi (`complaint`, `aspiration`) |
| `model_version` | String | Ya | Identitas model pemroses analisis |

> **Catatan Privasi:** Seluruh atribut identitas langsung pelapor (`name`, `email`, `nim_nip`, `phone`) serta deskripsi teks mentah **tidak disertakan** dalam dokumen ini.

---

### 3.2 Berkas `extraction_watermark.json`
Menyimpan status penanda waktu (*watermark*) ekstraksi inkremental untuk mencegah redundansi pembacaan database.

```json
{
  "last_extracted_updated_at": "2026-11-07 13:35:57",
  "last_run_timestamp": "2026-11-07 13:35:57",
  "status": "success",
  "pipeline_version": "1.2.0",
  "records_extracted_total": 450
}
```

| Field JSON | Tipe Data | Deskripsi |
|---|---|---|
| `last_extracted_updated_at` | String (Timestamp) | Batas atas `updated_at` data terakhir yang berhasil diekstrak |
| `last_run_timestamp` | String (Timestamp) | Waktu proses ekstraksi dijalankan terakhir kali |
| `status` | String | Status integritas ekstraksi (`success` / `error`) |
| `pipeline_version` | String | Versi spesifikasi data extraction service |
| `records_extracted_total` | Integer | Akumulasi jumlah rekaman yang berhasil diekspor |

---

### 3.3 Berkas `weekly_snapshots.json`
Menyimpan hasil agregasi pra-kalkulasi untuk konsumsi instan API dashboard analitik.

```json
{
  "generated_at": "2026-11-07T20:30:00+07:00",
  "timezone": "Asia/Jakarta",
  "schema_version": 2,
  "aggregates": {
    "7": { "...": "Metrik 7 Hari Terakhir" },
    "30": { "...": "Metrik 30 Hari Terakhir" },
    "90": { "...": "Metrik 90 Hari Terakhir" },
    "180": { "...": "Metrik 180 Hari Terakhir" }
  }
}
```

#### Struktur Objek Rolling Window (`aggregates[days]`):
| Field | Tipe | Deskripsi |
|---|---|---|
| `window_days` | Integer | Rentang hari jendela observasi (`7`, `30`, `90`, `180`) |
| `record_count` | Integer | Total tiket yang masuk pada periode observasi |
| `previous_period_comparison` | Object | Perbandingan dengan periode sebelumnya (`previous_count`, `count_change_pct`, `trend_direction`) |
| `summary` | Object | Ringkasan naratif eksekutif dwibahasa (`id` dan `en`) |
| `category_breakdown` | Object | Distribusi jumlah keluhan per unit kerja |
| `urgency` | Object | Distribusi jumlah tiket per tingkat urgensi (`low`, `medium`, `high`, `critical`) |
| `sentiment` | Object | Distribusi per sentimen (`positive`, `neutral`, `negative`, `avg_score`) |
| `sla` | Object | Metrik kepatuhan penanganan SLA (`compliant_count`, `breach_count`, `compliance_pct`, `breach_pct`, `avg_resolution_days`) |

---

## 4. Standar Domain dan Nilai Valid (Master Enums)

### 4.1 14 Unit Kerja Resmi PENS
Berikut adalah 14 unit kerja resmi yang diakui dalam seluruh logika routing dan validasi sistem SuaraLens:
1. `Akademik`
2. `Kemahasiswaan`
3. `Keuangan dan Akuntansi`
4. `Sarana Prasarana dan Layanan Umum`
5. `TIK/Sistem Informasi`
6. `Perpustakaan`
7. `Laboratorium dan Bengkel`
8. `Keamanan dan Ketertiban`
9. `Kerjasama dan Hubungan Alumni`
10. `Pengembangan Karir dan Kewirausahaan`
11. `Penelitian dan Pengabdian Masyarakat (P3M)`
12. `Penjaminan Mutu (PJM)`
13. `Kesehatan Kampus (Poliklinik)`
14. `Pimpinan/Manajemen`

### 4.2 Target Batas Waktu SLA per Kategori
| Unit Kerja | Target Waktu (Hari Kalender) | Tingkat Urgensi Utama |
|---|:---:|---|
| Keamanan dan Ketertiban | 1 hari | Keselamatan & Darurat |
| Sarana Prasarana dan Layanan Umum | 2 hari | Fasilitas Fisik Vital |
| TIK/Sistem Informasi | 2 hari | Jaringan & Server |
| Kesehatan Kampus (Poliklinik) | 2 hari | Medis & Layanan Darurat |
| Akademik | 3 hari | Perkuliahan & Ujian |
| Kemahasiswaan | 3 hari | Kegiatan & Beasiswa |
| Keuangan dan Akuntansi | 3 hari | Pembayaran & UKT |
| Laboratorium dan Bengkel | 3 hari | Praktikum |
| Perpustakaan | 3 hari | Pustaka & Repositori |
| Pengembangan Karir dan Kewirausahaan | 3 hari | Magang & Loker |
| Kerjasama dan Hubungan Alumni | 4 hari | Kemitraan Eksternal |
| Penelitian dan Pengabdian Masyarakat (P3M) | 4 hari | Hibah & Riset |
| Penjaminan Mutu (PJM) | 4 hari | Audit Internal |
| Pimpinan/Manajemen | 5 hari | Kebijakan Strategis |
| *(Unit Default / Tidak Dikenal)* | 3 hari | Standard SLA |

---

## 5. Ringkasan Kepatuhan & Keamanan Data
1. **Integritas Referensial:** Seluruh entitas anak (`complaint_analysis`, `complaint_reviews`, `complaint_replies`, `api_tokens`) memiliki aturan `ON DELETE CASCADE` atau `ON DELETE SET NULL` yang mencegah keberadaan data yatim (*orphan records*).
2. **ACID Transaction:** Seluruh operasi multi-tabel diproteksi oleh `$db->transBegin()`, `$db->transCommit()`, dan `$db->transRollback()`.
3. **Auditability:** Jejak status penanganan, disposisi, dan waktu respons terekam permanen dengan kepastian mikrodetik tanpa mengubah tabel frontend.

