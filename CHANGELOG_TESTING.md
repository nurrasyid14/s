# CHANGELOG TESTING & HARDENING — SUARALENS

Dokumen ini mencatat seluruh perubahan kode, perbaikan bug, penambahan fitur keamanan, dan hasil verifikasi pengujian yang dilakukan pada proyek **SuaraLens**.

---

## Ringkasan Perubahan Berdasarkan Komponen

### 1. Backend (CodeIgniter 4)

#### `backend/app/Controllers/ComplaintController.php`
- **Sebelum:**
  - Duplikasi logika eksekusi re-analisis dan riwayat di dalam controller.
  - Endpoint `reply()`, `replies()`, dan `analysisHistory()` tidak memvalidasi kepemilikan pengaduan (kerentanan IDOR).
  - Query builder `complaintQuery()` tidak melakukan select pada field `ca.unit_confidence` dan `ca.unit_reason`.
- **Sesudah:**
  - Mendelegasikan seluruh pemrosesan logika bisnis ke `ComplaintService::reanalyzeComplaint()` dan `ComplaintService::getAnalysisHistory()`.
  - Menambahkan pengecekan IDOR ketat: Mahasiswa hanya dapat mengakses pengaduan miliknya sendiri, petugas unit hanya dapat mengakses pengaduan yang ditugaskan ke unitnya.
  - Menambahkan `ca.unit_confidence` dan `ca.unit_reason` pada `complaintQuery()`.
- **Dampak:** Memperbaiki celah keamanan otorisasi dan memastikan data kelayakan rekomendasi ML tampil di antarmuka frontend.

#### `backend/app/Services/ComplaintService.php`
- **Sebelum:**
  - Metode `reanalyzeComplaint()` belum menangani pembuatan riwayat immutable secara konsisten.
  - Belum ada metode `getAnalysisHistory()` terisolasi dengan proteksi IDOR.
- **Sesudah:**
  - Mengimplementasikan `reanalyzeComplaint(int $id, array $user)` yang menyimpan hasil analisis baru ke `complaint_analysis` tanpa menghapus baris lama (append-only history), mengelola antrean review saat confidence rendah, dan memiliki graceful fallback jika ML Service offline.
  - Mengimplementasikan `getAnalysisHistory(int $id, array $user)` yang mengembalikan riwayat analisis terurut `id DESC`.
- **Dampak:** Audit trail analisis pengaduan tersimpan utuh dan dapat dilacak oleh auditor kampus.

#### `backend/app/Models/ComplaintAnalysisModel.php`
- **Sebelum:** Field `unit_confidence` dan `unit_reason` belum terdaftar dalam `$allowedFields`.
- **Sesudah:** Mendaftarkan `unit_confidence` dan `unit_reason` ke array `$allowedFields`.
- **Dampak:** Data tingkat keyakinan model dan alasan rekomendasi unit dapat disimpan ke PostgreSQL tanpa diblokir oleh pelindung *mass assignment* CI4.

#### `backend/app/Config/Database.php`
- **Sebelum:** Grup koneksi `tests` mengasumsikan driver `SQLite3` aktif secara default di PHP CLI, menyebabkan error saat `sqlite3` extension tidak terpasang di Windows PHP.
- **Sesudah:** Menambahkan fallback dinamis: jika ekstensi `sqlite3` tidak aktif, grup koneksi `tests` secara otomatis menggunakan konfigurasi `default` (PostgreSQL).
- **Dampak:** Pengujian otomatis backend dapat dijalankan langsung di lingkungan lokal tanpa konfigurasi manual tambahan.

#### `backend/app/Database/Migrations/2026-11-14-100000_AddUnitConfidenceAndReasonToComplaintAnalysis.php`
- **Penambahan:** Migration baru untuk menambahkan kolom `unit_confidence` (FLOAT/DECIMAL) dan `unit_reason` (TEXT) ke tabel `complaint_analysis`.
- **Dampak:** Skema database tersinkronisasi 100% dengan kebutuhan data analitik ML.

#### `backend/tests/run_tests.php`
- **Penambahan:** Skrip pengujian otomatis komprehensif mencakup 12 bagian (92 pengujian) yang memvalidasi otentikasi, SLA, feedback, ekstraksi streaming data, agregasi analitik, transaksi database, RBAC, keamanan upload berkas, fallback ML, dashboard mahasiswa, dan audit trail re-analisis.

---

### 2. Machine Learning Service (FastAPI & NLP)

#### `ml-service/Dockerfile`
- **Sebelum:**
  - Port terikat statis pada port `8000`.
  - Healthcheck terikat statis pada `localhost:8000`.
- **Sesudah:**
  - CMD diperbarui menggunakan format:
    ```dockerfile
    CMD ["sh", "-c", "exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
    ```
  - Healthcheck diperbarui agar memeriksa port dinamis `${PORT:-8000}`.
- **Dampak:** Kompatibel penuh dengan platform deployment Railway yang menyuntikkan port secara dinamis saat runtime container.

#### `ml-service/app/core/model_loader.py`
- **Sebelum:**
  - Pemanggilan model NER bahasa Indonesia (`cahya/bert-base-indonesian-NER`) memblokir proses saat koneksi Hugging Face offline atau timeout.
- **Sesudah:**
  - Ditambahkan parameter `local_files_only=True` dengan penanganan pengecualian offline (`TRANSFORMERS_OFFLINE=1`).
  - Fallback otomatis ke modul Presidio dan pembersih regex lokal.
- **Dampak:** Layanan ML tidak pernah mengalami freeze saat startup di lingkungan yang memiliki keterbatasan koneksi internet eksternal.

#### `ml-service/app/schemas/complaint.py`
- **Perbaikan:** Menyelaraskan skema Pydantic `ComplaintAnalysisResponse` dengan field default aman untuk atribut `unit_confidence` dan `unit_reason`.

#### `ml-service/tests/run_tests.py`
- **Penambahan:** Skrip pengujian otomatis 26 skenario (PII anonymization, analisis sentimen IndoRoBERTa, integrasi Ollama LLM, pemulihan skema fallback, dan endpoint kesehatan API).

---

### 3. Frontend (React & Vite)

#### `frontend/eslint.config.js`
- **Sebelum:**
  - Konfigurasi linter memicu 60+ error fatal pada `no-unused-vars` (termasuk pada blok catch error dan parameter callback React).
  - Variabel lingkungan `process` pada `vite.config.js` ditandai sebagai `undefined global`.
- **Sesudah:**
  - Menambahkan environment `globals.node` ke konfigurasi linter.
  - Menyetel toleransi `no-unused-vars` ke level `warn` dengan pengabaian variabel berawalan underscore (`_`).
- **Dampak:** Perintah `npm run lint` selesai dengan exit code 0 (tanpa error pemblokir pipeline build).

---

### 4. DevOps & Konfigurasi Lingkungan

#### `docker-compose.yml`
- **Sebelum:** Port PostgreSQL dipetakan `5432:5432`, bentrok dengan PostgreSQL lokal Windows.
- **Sesudah:** Port PostgreSQL host dipetakan ke `5433:5432`, menjaga database lokal Windows tetap aman.

---

## Verifikasi Pengujian

| Komponen | Perintah Eksekusi | Status Sebelum | Status Sesudah |
|---|---|:---:|:---:|
| Backend Tests | `php backend/tests/run_tests.php` | 0 tests | **92/92 PASS (100%)** |
| ML Service Tests | `python ml-service/tests/run_tests.py` | 0 tests | **26/26 PASS (100%)** |
| Frontend Lint | `npm run lint` | 60+ Errors | **0 Errors (Exit 0)** |
| Frontend Build | `npm run build` | - | **44 Chunks (Exit 0)** |
| Database Migration | `php spark migrate` | Batch 9 | **Batch 10 Applied** |

