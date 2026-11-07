# Laporan Pengujian Integrasi End-to-End SuaraLens (Integration Testing)

**Proyek:** SuaraLens — Pengujian Integrasi Lintas Subsistem (Frontend React, Backend CI4, PostgreSQL, FastAPI ML Service)  
**Tanggal Pengujian:** 7 November 2026  
**Status:** **100% WORKING & VERIFIED**  
**Metodologi:** Pengujian otomatis unit & integrasi, pengujian skenario alur peran (*role-based workflow*), serta validasi build statis.

---

## 1. Ringkasan Hasil Pengujian

Seluruh rangkaian pengujian lintas komponen telah dieksekusi dengan hasil sebagai berikut:

| Kategori Pengujian | Test Suite Runner | Total Test | Berhasil (PASS) | Gagal (FAIL) | Status |
|---|---|:---:|:---:|:---:|:---:|
| **Backend Unit & Services** | `php backend/tests/run_tests.php` | 70 | 70 | 0 | **PASS** |
| **ML Service & NLP Pipelines** | `py -3.11 ml-service/tests/run_tests.py` | 26 | 26 | 0 | **PASS** |
| **Data Science Preprocessing** | `py -3.11 -m unittest discover notebooks/tests` | 14 | 14 | 0 | **PASS** |
| **Frontend Production Build** | `cd frontend; npm run build` | 2.351 modul | 44 chunks | 0 | **PASS** |
| **Docker Compose Config** | `docker compose config -q` | 4 services | Valid | 0 | **PASS** |
| **TOTAL KESELURUHAN** | - | **110** | **110** | **0** | **100% PASS** |

---

## 2. Pengujian Skenario Alur Penggunaan Utama (Acceptance Scenarios)

### SKENARIO 1: Alur Sivitas / Pelapor (User Workflow)
1. **Otentikasi Pelapor:**
   - Masuk (*login*) menggunakan akun `budi@student.pens.ac.id` / `password123`.
   - Backend memverifikasi hash sandi dan menerbitkan bearer token via `api_tokens`.
   - Frontend menyimpan token dan objek profil pengguna ke `localStorage`.
   - **Status:** **WORKING**
2. **Pembuatan Pengaduan dengan Lampiran:**
   - Sivitas mengisi form di `/user/submit` (Tipe: `complaint`, Deskripsi >= 50 karakter, memilih unit sasaran, melampirkan berkas bukti).
   - Backend menerima payload multipart via `ComplaintController::create`, memproses berkas via `EvidenceService::storeAttachment()`, dan menghubungi ML Service untuk anonimisasi PII dan evaluasi urgensi.
   - Database menyimpan tiket di tabel `complaints`, hasil di `complaint_analysis`, dan jejak berkas di `complaint_replies` secara atomik (`transCommit()`).
   - Tiket memperoleh status awal `received` dan ID publik unik (contoh: `SL-20261107...`).
   - **Status:** **WORKING**
3. **Pelacakan Tiket (Tracking):**
   - Sivitas membuka `/user/complaints` dan `/user/complaints/:id`.
   - Data tersaji lengkap dengan status tahapan, tanggal estimasi SLA, dan ringkasan anonim tanpa membocorkan identitas pribadi.
   - **Status:** **WORKING**

---

### SKENARIO 2: Alur Administrator Sentral (Admin Workflow)
1. **Otentikasi Administrator:**
   - Masuk melalui `/admin/signin` dengan akun `admin@pens.ac.id` / `admin123`.
   - Sistem mengenali `role: admin` dan memberikan hak akses ke area `/admin/*`.
   - **Status:** **WORKING**
2. **Tinjauan & Verifikasi Tiket (`/admin/verifikasi`):**
   - Admin melihat antrean tiket berstatus `received`.
   - Admin menyetujui validitas aduan dengan memanggil `PATCH /api/admin/complaints/:id/verify`.
   - Status tiket berubah menjadi `verified` dan jejak verifikasi terekam.
   - **Status:** **WORKING**
3. **Disposisi ke Unit Kerja (`/admin/disposisi`):**
   - Admin mendisposisikan tiket yang telah diverifikasi ke salah satu dari 14 unit resmi (misal: `Kemahasiswaan`) dengan catatan penugasan.
   - Sistem memanggil `POST /api/admin/complaints/:id/disposition`.
   - Status tiket diperbarui menjadi `dispatched` dengan batas waktu SLA otomatis terkalibrasi.
   - **Status:** **WORKING**

---

### SKENARIO 3: Alur Tindak Lanjut Stakeholder Unit (Stakeholder Workflow)
1. **Otentikasi Stakeholder & Isolasi Unit:**
   - Masuk melalui `/signin` dengan akun `sari@pens.ac.id` / `password123` (Unit: `Kemahasiswaan`).
   - Sistem mengarahkan stakeholder ke area `/stakeholder`.
   - Endpoint `GET /api/unit/stats` dan `GET /api/complaints` otomatis membatasi data hanya untuk tiket yang ditugaskan ke Unit Kemahasiswaan (`assertUnitPermission`).
   - **Status:** **WORKING**
2. **Penerimaan Disposisi:**
   - Stakeholder membuka detail tiket dan menekan tombol "Terima Disposisi".
   - Sistem memanggil `POST /api/unit/complaints/:id/accept`. Status tiket berubah menjadi `in_progress` (Diproses).
   - **Status:** **WORKING**
3. **Pencatatan Tindak Lanjut Teknis:**
   - Teknisi/koordinator unit mencatat aksi lapangan melalui form tindak lanjut (`POST /api/unit/complaints/:id/followup`).
   - Status tiket diperbarui menjadi `action_taken` (Ditindaklanjuti).
   - **Status:** **WORKING**
4. **Penerbitan Jawaban Resmi:**
   - Kepala unit menerbitkan klarifikasi dan solusi resmi (`POST /api/unit/complaints/:id/answer`).
   - Status tiket berubah menjadi `answered` (Dijawab).
   - **Status:** **WORKING**

---

### SKENARIO 4: Alur Evaluasi Kepuasan & Penyelesaian (Resolution & Feedback Workflow)
1. **Pemberian Ulasan oleh Pelapor:**
   - Pelapor melihat bahwa tiket miliknya telah berstatus `answered` dan form feedback evaluasi layanan menjadi aktif di `/user/complaints/:id`.
   - Pelapor memberikan rating (skala 1–5 bintang) beserta aspek kecepatan, kejelasan, dan solusi (`POST /api/complaints/:id/feedback`).
   - Aturan bisnis backend memastikan: jika tiket belum berstatus `answered`, pengiriman feedback ditolak (`HTTP 400`).
   - Setelah feedback divalidasi, status tiket resmi ditutup menjadi `resolved` (Selesai).
   - **Status:** **WORKING**

---

### SKENARIO 5: Alur Dashboard & Analitika Lintas Peran (Dashboard & Analytics Workflow)
1. **Dashboard Mahasiswa (`/user/dashboard`):**
   - Mengambil data agregat nyata dari `GET /api/student/dashboard`.
   - Menampilkan metrik transparansi kampus (total aduan, tingkat penyelesaian, rata-rata kepatuhan SLA 14 unit kerja, dan sebaran 3 tipe aduan/masukan/saran).
   - **Status:** **WORKING**
2. **Dashboard Stakeholder (`/stakeholder`):**
   - Menampilkan beban aktif unit, rata-rata kepuasan rating mahasiswa, dan antrean aduan berurgensi tinggi yang memerlukan tindakan segera.
   - **Status:** **WORKING**
3. **Analitika Sentral & AI Summary (`/stakeholder/analytics`):**
   - Menampilkan sebaran sentimen 3 kelas (IndoRoBERTa), ringkasan eksekutif berbasis angka ter-grounding (Qwen 3 8B), dan metrik kepatuhan SLA rolling windows (khusus admin).
   - **Status:** **WORKING**

---

## 3. Matriks Pengujian Hak Akses dan Keamanan (Security Matrix)

| Aksi / Endpoint | User (Mahasiswa) | Stakeholder (Unit) | Admin Sentral |
|---|:---:|:---:|:---:|
| Buat Pengaduan (`POST /complaints`) | Diizinkan (201) | Diizinkan (201) | Diizinkan (201) |
| Lihat Aduan Sendiri (`GET /complaints/my`) | Diizinkan (200) | Diizinkan (200) | Diizinkan (200) |
| Lihat Seluruh Aduan Kampus (`GET /complaints`) | Ditolak (403) | Filter Unit (200) | Semua Unit (200) |
| Verifikasi Aduan (`PATCH /admin/complaints/:id/verify`) | Ditolak (403) | Ditolak (403) | Diizinkan (200) |
| Disposisi Unit (`POST /admin/complaints/:id/disposition`) | Ditolak (403) | Ditolak (403) | Diizinkan (200) |
| Terima Disposisi (`POST /unit/complaints/:id/accept`) | Ditolak (403) | Khusus Unitnya (200) | Diizinkan (200) |
| Tindak Lanjut Teknis (`POST /unit/complaints/:id/followup`)| Ditolak (403) | Khusus Unitnya (200) | Diizinkan (200) |
| Jawaban Resmi Unit (`POST /unit/complaints/:id/answer`) | Ditolak (403) | Khusus Unitnya (200) | Diizinkan (200) |
| Beri Feedback (`POST /complaints/:id/feedback`) | Khusus Pelapor (200)| Ditolak (400) | Diizinkan (200) |
| Analitik Mingguan (`GET /analytics/weekly`) | Ditolak (403) | Ditolak (403) | Diizinkan (200) |

---

## 4. Kesimpulan Kesiapan Sistem

Aplikasi SuaraLens telah diverifikasi secara menyeluruh dan memenuhi seluruh kriteria **Definition of Done**:
1. Frontend dan backend terintegrasi menggunakan API nyata tanpa modifikasi desain visual.
2. Seluruh endpoint terpetakan, terdokumentasi, dan lolos uji integrasi otomatis.
3. Otentikasi sesi, otorisasi multi-peran, dan penanganan status berjalan konsisten.
4. Nilai fallback heuristik berjalan jujur tanpa fabrikasi angka probabilitas.
5. Ingesti lampiran dan streaming data analitik mematuhi standar privasi mutlak (*Zero-PII*).

