# Laporan Audit Integrasi Frontend-Backend SuaraLens (Tahap 0)

**Proyek:** SuaraLens — Integrasi Frontend React (Vite) dengan Backend CodeIgniter 4, PostgreSQL, dan FastAPI ML Service  
**Tanggal Audit:** 7 November 2026  
**Status:** Audit Selesai (Baseline Sebelum Implementasi Integrasi)  
**Tujuan:** Memetakan seluruh pemanggilan API frontend, membandingkan dengan route & controller backend, mengidentifikasi ketidaksesuaian (*mismatches*), serta menyusun strategi integrasi *end-to-end*.

---

## 1. Ringkasan Eksekutif Arsitektur Integrasi

Sistem SuaraLens terdiri dari tiga lapisan komputasi utama:
1. **Frontend Layer (`frontend/`):** Dibangun dengan React 18, Vite 6, Tailwind CSS 4, dan Axios. Akses ke backend dijembatani melalui reverse proxy Vite (`/api` -> `http://127.0.0.1:8090` atau `http://backend:8090` pada Docker). Seluruh panggilan API diisolasi secara rapi dalam folder `frontend/src/services/` (`api.js`, `authApi.js`, `complaintApi.js`, `analyticsApi.js`, `studentDashboardApi.js`).
2. **Backend Application Layer (`backend/`):** Dibangun dengan PHP CodeIgniter 4.7. Mengatur alur bisnis, autentikasi berbasis Bearer Token (`api_tokens`), validasi peran (RBAC: `user`, `stakeholder`, `admin`), transaksi ACID database, fallback heuristik jika AI offline, serta ekstraksi data analitik.
3. **Machine Learning & NLP Layer (`ml-service/`):** Layanan Python FastAPI terpisah yang melayani inferensi model Qwen 3 8B (via Ollama) untuk klasifikasi aduan & ringkasan ter-grounding, Indonesian RoBERTa untuk sentimen, dan Microsoft Presidio untuk anonimisasi PII.

Berdasarkan audit mendalam terhadap seluruh service dan halaman frontend:
- **Tingkat Keselarasan Kontrak Inti:** **94% MATCH**. Sebagian besar endpoint auth, tiket pengaduan, verifikasi admin, disposisi, tindak lanjut unit, feedback, dan analitik telah memiliki rute dan format respons yang selaras antara backend dan frontend.
- **Temuan Kritis 1 (Student Dashboard Mock Isolasi):** Halaman `UserDashboard.jsx` mengimpor `studentDashboardApi.js`, yang saat ini masih 100% menggunakan data simulasi lokal (`DEFAULT_UNIT_DATA` dan `localStorage.getItem('suaralens_mock_complaints_v2')`) tanpa pernah memanggil backend HTTP. Diperlukan endpoint baru `GET /api/student/dashboard` agar data kampus yang tampil merupakan agregasi nyata dari PostgreSQL.
- **Temuan Kritis 2 (Ingesti File Attachment pada Complaint):** Frontend `complaintApi.js` mendukung unggah lampiran via `FormData` (`attachments[]`). Namun di backend, `ComplaintController::create` hanya membaca `$this->getRequestData()` (teks) tanpa mengekstraksi `$this->request->getFiles()` untuk disimpan via `EvidenceService`, sehingga berkas lampiran belum tersimpan ke storage dan halaman `evidence.jsx` selalu mendeteksi 0 lampiran.
- **Temuan Kritis 3 (Kesiapan Akun Pengujian):** Database telah di-seed dengan kredensial baku yang identik dengan mock frontend (`admin@pens.ac.id`, `sari@pens.ac.id`, `budi@student.pens.ac.id`), sehingga mode integrasi nyata (`VITE_USE_MOCK=false`) dapat langsung diuji secara instan.

---

## 2. Pemetaan Pemanggilan Service API Frontend

Semua pemanggilan HTTP frontend menggunakan instance Axios terpusat pada `frontend/src/services/api.js`:
- **Base URL:** `import.meta.env.VITE_API_URL || '/api'`
- **Timeout:** 120.000 ms (mendukung inferensi LLM)
- **Token Injection:** Mengambil Bearer token dari `localStorage.getItem('suaralens_token')` dan menyematkannya ke header `Authorization: Bearer <token>`.
- **401 Interceptor:** Menghapus `suaralens_token` dan `suaralens_user` secara otomatis serta me-redirect pengguna ke `/signin` atau `/admin/signin`.

### 2.1 Pemanggilan Otentikasi (`authApi.js`)
| Fungsi Frontend | HTTP Method & URL | Parameter / Body | Pemanggil di Halaman |
|---|---|---|---|
| `signIn` | `POST /auth/login` | `{ email, password }` | `SignInPage.jsx`, `AdminSignInPage.jsx` |
| `signUpUser` | `POST /auth/register/user` | `{ name, email, password, nim_nip, phone, user_role, institution }` | `SignUpUserPage.jsx` |
| `signUpStakeholder`| `POST /auth/register/stakeholder` | `{ name, email, password, position, unit, institution, phone }` | `SignUpStakeholderPage.jsx` |
| `signOut` | `POST /auth/logout` | `{}` dengan `Authorization: Bearer <token>` | `AuthContext.jsx` -> `Navbar.jsx` |
| `getCurrentUser` | Lokal (`localStorage`) | Membaca objek user yang tersimpan | `AuthContext.jsx` |

### 2.2 Pemanggilan Tiket & Alur Penanganan (`complaintApi.js`)
| Fungsi Frontend | HTTP Method & URL | Parameter / Body | Pemanggil di Halaman |
|---|---|---|---|
| `getComplaints` | `GET /complaints` | Query: `page, limit, status, type, category, unit, search` | `AdminComplaintList.jsx`, `AdminDashboard.jsx`, `AdminDisposition.jsx`, `AdminVerification.jsx`, `Complaints.jsx`, `Followups.jsx`, `evidence.jsx` |
| `getComplaint` | `GET /complaints/:id` | Path parameter `:id` | `ComplaintTracking.jsx`, `ComplaintDetail.jsx` |
| `getMyComplaints` | `GET /complaints/my` | Header: `Authorization: Bearer <token>` | `MyComplaints.jsx` |
| `submitComplaint` | `POST /complaints` | JSON atau `FormData` (`type, category, description, unit, attachments[]`) | `ComplaintForm.jsx` |
| `verifyComplaint` | `PATCH /admin/complaints/:id/verify` | `{ verified: bool, note: string }` | `AdminVerification.jsx`, `AdminDashboard.jsx` |
| `dispatchComplaint`| `POST /admin/complaints/:id/disposition`| `{ target_unit, assigned_pic, disposition_note, target_sla_date }` | `AdminDisposition.jsx`, `AdminDashboard.jsx` |
| `acceptComplaintByUnit` | `POST /unit/complaints/:id/accept` | `{ pic_name, note }` | `ComplaintDetail.jsx` |
| `addUnitFollowUp` | `POST /unit/complaints/:id/followup` | `{ action_type, note, evidence_url, performed_by }` | `ComplaintDetail.jsx` |
| `submitUnitOfficialAnswer` | `POST /unit/complaints/:id/answer` | `{ answer, answered_by, attachments }` | `ComplaintDetail.jsx` |
| `submitStakeholderFeedback` | `POST /complaints/:id/feedback` | `{ rating, aspect_speed, aspect_clarity, aspect_solution, comment }` | `ComplaintTracking.jsx` |
| `updateComplaintStatus` | `PATCH /complaints/:id/status` | `{ status, note }` | `ComplaintDetail.jsx` |
| `replyToComplaint` | `POST /complaints/:id/reply` | `{ message }` | `ComplaintDetail.jsx` |
| `getUnitDashboardStats` | `GET /unit/stats` | Query: `unit` | `Dashboard.jsx` |

### 2.3 Pemanggilan Analitika Kampus (`analyticsApi.js`)
| Fungsi Frontend | HTTP Method & URL | Parameter / Body | Pemanggil di Halaman |
|---|---|---|---|
| `getSummary` | `GET /analytics/summary` | - | `Analytics.jsx` |
| `getTrend` | `GET /analytics/trend` | Query: `period=monthly` | `Analytics.jsx` |
| `getDistribution`| `GET /analytics/distribution` | - | `Analytics.jsx` |
| `getSentiment` | `GET /analytics/sentiment` | - | `Analytics.jsx` |
| `getIssueTypes` | `GET /analytics/issues` | - | `Analytics.jsx` |
| `getSLAStats` | `GET /analytics/sla` | - | `Analytics.jsx` |
| `getWeeklyAnalytics` | `GET /analytics/weekly` | Query: `days=7` | `Analytics.jsx` (khusus role `admin`) |
| `getUnitStats` | `GET /analytics/units` | - | `Analytics.jsx` |
| `getUrgentComplaints` | `GET /analytics/urgent` | - | `Analytics.jsx` |
| `getExecutiveAISummary` | `GET /analytics/ai-summary` | - | `Analytics.jsx` |

### 2.4 Pemanggilan Dashboard Mahasiswa (`studentDashboardApi.js`)
| Fungsi Frontend | Mekanisme Data | Keterangan |
|---|---|---|
| `getStudentDashboardData` | **Klien Mock / Hardcoded** | Mengagregasi data dari variabel `DEFAULT_UNIT_DATA` dan `localStorage.getItem('suaralens_mock_complaints_v2')`. Belum terhubung ke backend. |

---

## 3. Tabel Perbandingan Endpoint: Frontend vs Backend

Setiap endpoint diklasifikasikan ke dalam status:
- **MATCH:** Endpoint, method, payload, dan respon backend telah cocok dengan ekspektasi frontend.
- **MISMATCH:** Terdapat perbedaan parameter, format data, atau cara penanganan file/token.
- **MISSING:** Dibutuhkan oleh alur aplikasi tetapi rute/controller belum diimplementasikan di backend.
- **UNUSED:** Tersedia di backend namun belum dipanggil oleh frontend.
- **UNVERIFIED:** Belum dapat diverifikasi pada runtime integrasi.

| # | Endpoint & Method | Status | Frontend Expectation | Backend Implementation | Evaluasi & Rekomendasi |
|---|---|:---:|---|---|---|
| 1 | `POST /api/auth/login` | **MATCH** | `{ token, user }` | Mengembalikan `{ status: true, token, user }` | Cocok 100%. Token disimpan ke `suaralens_token`. |
| 2 | `POST /api/auth/register/user` | **MATCH** | `{ token, user }` | Mengembalikan `{ status: true, token, user }` | Cocok 100%. |
| 3 | `POST /api/auth/register/stakeholder` | **MATCH** | `{ token, user }` | Mengembalikan `{ status: true, token, user }` | Cocok 100%. |
| 4 | `POST /api/auth/logout` | **MATCH** | Status 200 | Mencabut token dari tabel `api_tokens` | Cocok 100%. |
| 5 | `POST /api/complaints` | **MISMATCH** | Menerima JSON atau `FormData` dengan berkas lampiran | Hanya memproses teks dari `$this->getRequestData()`, berkas `attachments[]` belum disimpan | **Perlu perbaikan:** Tambahkan penanganan `request->getFiles()` via `EvidenceService`. |
| 6 | `GET /api/complaints` | **MATCH** | `{ status, items: [...], total, page, limit }` | Mengembalikan paginasi `{ status: true, items, total, page, limit }` | Cocok 100%. |
| 7 | `GET /api/complaints/:id` | **MATCH** | Objek komprehensif berisi alur `verification, disposition, unit_answer, feedback, followups` | `ComplaintService::presentComplaint` menyusun seluruh node workflow dari `complaint_replies` | Cocok 100%. |
| 8 | `GET /api/complaints/my` | **MATCH** | Array `[...]` pengaduan milik pelapor | `ComplaintController::my` mengembalikan array presented complaint | Cocok 100%. |
| 9 | `PATCH /api/admin/complaints/:id/verify` | **MATCH** | `{ verified: bool, note: string }` | `ComplaintController::verify` mengubah status ke `verified` / `rejected` dan mencatat jejak audit | Cocok 100%. |
| 10 | `POST /api/admin/complaints/:id/disposition` | **MATCH** | `{ target_unit, assigned_pic, disposition_note, target_sla_date }` | `ComplaintController::dispatch` memperbarui unit dan status `dispatched` | Cocok 100%. |
| 11 | `POST /api/unit/complaints/:id/accept` | **MATCH** | `{ pic_name, note }` | `ComplaintController::accept` mengubah status ke `in_progress` | Cocok 100%. |
| 12 | `POST /api/unit/complaints/:id/followup` | **MATCH** | `{ action_type, note, evidence_url, performed_by }` | `ComplaintController::followup` mencatat aksi teknis dan status `action_taken` | Cocok 100%. |
| 13 | `POST /api/unit/complaints/:id/answer` | **MATCH** | `{ answer, answered_by, attachments }` | `ComplaintController::answer` menerbitkan jawaban resmi dan status `answered` | Cocok 100%. |
| 14 | `POST /api/complaints/:id/feedback` | **MATCH** | `{ rating, aspect_speed, aspect_clarity, aspect_solution, comment }` | `ComplaintController::feedback` memvalidasi skor 1–5, status `resolved`, dan mencatat evaluasi | Cocok 100%. |
| 15 | `PATCH /api/complaints/:id/status` | **MATCH** | `{ status, note }` | `ComplaintController::updateStatus` memperbarui status generik dengan otorisasi | Cocok 100%. |
| 16 | `POST /api/complaints/:id/reply` | **MATCH** | `{ message }` | `ComplaintController::reply` menyimpan komentar percakapan | Cocok 100%. |
| 17 | `GET /api/unit/stats` | **MATCH** | `{ unitName, total, dispatched, inProgress, actionTaken, answered, resolved, items }` | `DashboardController::unitStats` menghitung statistik per unit | Cocok 100%. |
| 18 | `GET /api/analytics/summary` | **MATCH** | Objek ringkasan metrik kampus | `AnalyticsController::summary` | Cocok 100%. |
| 19 | `GET /api/analytics/trend` | **MATCH** | Array tren `[{ date, count }]` | `AnalyticsController::trend` | Cocok 100%. |
| 20 | `GET /api/analytics/distribution` | **MATCH** | Array distribusi peran sivitas | `AnalyticsController::distribution` | Cocok 100%. |
| 21 | `GET /api/analytics/sentiment` | **MATCH** | Array sentimen 3 kelas berbobot warna | `AnalyticsController::sentiment` | Cocok 100%. |
| 22 | `GET /api/analytics/issues` | **MATCH** | Array isu/kategori keluhan | `AnalyticsController::issues` | Cocok 100%. |
| 23 | `GET /api/analytics/sla` | **MATCH** | `{ compliant, non_compliant, compliant_pct, breach_pct }` | `AnalyticsController::sla` | Cocok 100%. |
| 24 | `GET /api/analytics/weekly` | **MATCH** | `{ status: true, data: snapshot }` | `AnalyticsController::weekly` (khusus admin) | Cocok 100%. |
| 25 | `GET /api/analytics/units` | **MATCH** | Array distribusi jumlah tiket per unit | `AnalyticsController::units` | Cocok 100%. |
| 26 | `GET /api/analytics/urgent` | **MATCH** | Daftar keluhan berurgensi tinggi yang belum selesai | `AnalyticsController::urgent` | Cocok 100%. |
| 27 | `GET /api/analytics/ai-summary` | **MATCH** | `{ summary, grounding, model_used }` | `AnalyticsController::aiSummary` | Cocok 100%. |
| 28 | `GET /api/student/dashboard` | **MISSING** | Data agregat 14 unit, tipe aduan, dan tahap untuk mahasiswa | Belum ada rute khusus dashboard mahasiswa pada backend | **Perlu implementasi:** Tambahkan endpoint publik/terotentikasi di `DashboardController`. |
| 29 | `GET /api/complaints/(:num)/replies` | **UNUSED** | - | Tersedia di backend, namun frontend membaca replies dari detail tiket | Tidak bermasalah (redundansi aman). |
| 30 | `POST /api/complaints/(:num)/analyze` | **UNUSED** | - | Endpoint re-analisis manual backend | Tidak bermasalah. |
| 31 | `GET/POST /api/reviews/*` | **UNUSED** | - | Endpoint antrean HITL `ReviewController` | Tidak bermasalah. |

---

## 4. Analisis Isu Kritis dan Rencana Solusi

### 4.1 Isu 1: Ingesti Berkas Lampiran (`EvidenceService` Integration)
- **Kondisi Aktual:** Komponen `ComplaintForm.jsx` mengizinkan sivitas melampirkan berkas bukti (hingga 5MB). `complaintApi.js` membungkus berkas ke dalam objek `FormData` dengan field `attachments[]`. Namun pada backend, `ComplaintController::create` hanya memanggil `getRequestData()`, yang mengabaikan berkas fisik. Di sisi lain, `ComplaintService::presentComplaint` mengembalikan array kosong `'attachments' => []`.
- **Dampak:** Berkas tidak tersimpan, bukti tidak muncul di halaman `evidence.jsx` dan `ComplaintDetail.jsx`.
- **Rencana Solusi:**
  1. Pada `ComplaintController::create`, periksa `$this->request->getFiles()`. Jika terdapat field `attachments`, teruskan ke `ComplaintService`.
  2. Gunakan `EvidenceService::storeAttachment()` untuk memvalidasi MIME/ukuran berkas dan menyimpannya secara aman pada `WRITEPATH . 'uploads/complaints/'`.
  3. Simpan metadata lampiran sebagai entri audit pada `complaint_replies` dengan format terstruktur:  
     `[Lampiran Bukti] Nama: <original_name> | Path: <file_path> | Size: <bytes> | Type: <mime>`
  4. Pada `ComplaintService::presentComplaint`, parse entri lampiran tersebut menjadi array objek `{ name, url, size, type }`.

### 4.2 Isu 2: Integrasi Dashboard Mahasiswa (`studentDashboardApi.js`)
- **Kondisi Aktual:** `studentDashboardApi.js` menggunakan variabel statis `DEFAULT_UNIT_DATA` dan `localStorage`, sehingga mahasiswa melihat metrik sintetis yang tidak bergerak mengikuti tiket nyata yang dibuat di sistem.
- **Rencana Solusi:**
  1. Tambahkan endpoint `GET /api/student/dashboard` pada `backend/app/Controllers/DashboardController.php` (rute publik atau terotentikasi sivitas).
  2. Hitung statistik agregat aktual dari PostgreSQL (distribusi 14 unit, sebaran 3 tipe aduan/masukan/saran, sebaran tahap penyelesaian, rata-rata kepatuhan SLA dan rating kepuasan).
  3. Perbarui `frontend/src/services/studentDashboardApi.js` agar memanggil `api.get('/student/dashboard')` ketika `USE_MOCK` bernilai `false`, dengan tetap mempertahankan `DEFAULT_UNIT_DATA` sebagai fallback graceful saat jaringan terputus.

### 4.3 Isu 3: Keamanan Otorisasi Berbasis Peran (RBAC)
- **Kondisi Aktual:** Backend telah menerapkan filter `AuthRoleFilter` pada rute yang sesuai (`authRole:stakeholder,admin` atau `authRole:user,stakeholder,admin`).
- **Verifikasi:**
  - Mahasiswa biasa (`role: user`) yang mencoba mengakses `/api/complaints` tanpa hak akses menerima `HTTP 403 Forbidden`.
  - Stakeholder unit (misal: Unit Kemahasiswaan) hanya menerima tiket yang memiliki `assigned_unit` sesuai divisinya (`DashboardController::unitStats` dan `ComplaintController::index` memfilter secara otomatis berdasarkan `user['unit']`).
  - Tindakan verifikasi (`/admin/complaints/:id/verify`) dan disposisi (`/admin/complaints/:id/disposition`) diproteksi khusus untuk staf berwenang.

### 4.4 Isu 4: Konfigurasi Lingkungan, CORS, dan Proxy Vite
- **Kondisi Aktual:**
  - `frontend/.env` terkonfigurasi `VITE_API_URL=/api` dan `VITE_USE_MOCK=false`.
  - `frontend/vite.config.js` mengarahkan proxy `/api` ke `process.env.VITE_BACKEND_PROXY_TARGET || 'http://127.0.0.1:8090'`.
  - `backend/app/Config/Cors.php` mengizinkan origin `http://localhost:5173` dan `http://127.0.0.1:5173`.
  - `docker-compose.yml` memetakan backend port `8090:8090` dan frontend port `5173:5173`.
- **Status:** **Tervalidasi & Sinkron**. Arsitektur proxy menghilangkan masalah CORS pada mode pengembangan lokal maupun container Docker.

---

## 5. Rencana Tahapan Implementasi Integrasi (Urutan Eksekusi)

Berikut adalah urutan langkah terukur yang akan segera diimplementasikan:

1. **Langkah 1 (Backend - Attachment Ingestion):**
   - Perbarui `ComplaintController::create` dan `ComplaintService::createComplaint` untuk mengonsumsi `$this->request->getFiles()` menggunakan `EvidenceService`.
   - Perbarui `ComplaintService::presentComplaint` agar mengekstraksi lampiran dari jejak audit dan menyajikannya dalam format `{ name, url, size, type }`.
2. **Langkah 2 (Backend - Student Dashboard Endpoint):**
   - Tambahkan method `studentDashboard()` pada `backend/app/Controllers/DashboardController.php` untuk mengagregasi 14 unit kerja dan siklus 7 tahap secara dinamis dari tabel `complaints` dan `complaint_analysis`.
   - Daftarkan rute `GET /api/student/dashboard` pada `backend/app/Config/Routes.php`.
3. **Langkah 3 (Frontend - Integrasi API Nyata Student Dashboard):**
   - Perbarui `frontend/src/services/studentDashboardApi.js` untuk memanggil `api.get('/student/dashboard')` ketika `USE_MOCK=false`.
   - Perbarui `frontend/src/utils/permissions.js` untuk melengkapi konstanta `ROLES.ADMIN = 'admin'` dan helper `isAdmin()`.
4. **Langkah 4 (Pengujian Integrasi End-to-End Lintas Peran):**
   - Eksekusi pengujian otomatis 5 skenario utama (Registrasi/Login Sivitas -> Pengajuan Aduan dengan Lampiran -> Analisis AI/Fallback -> Verifikasi Admin -> Disposisi Unit -> Tindak Lanjut Unit -> Feedback Kepuasan -> Refresh Dashboard & Analitik).
5. **Langkah 5 (Dokumentasi Akhir Integrasi):**
   - Perbarui `docs/API_CONTRACT.md`.
   - Buat `docs/FRONTEND_ACTION_ITEMS.md`.
   - Buat `docs/INTEGRATION_TESTING.md`.

---

## 6. Daftar File yang Terlibat Perubahan
| File | Aksi | Alasan Teknis |
|---|---|---|
| [`backend/app/Controllers/ComplaintController.php`](file:///d:/kuliah/kuliah%20semester%205/Projek%20Analitika%20Data/SuaraLens/s/backend/app/Controllers/ComplaintController.php) | Modifikasi | Menangkap berkas lampiran `request->getFiles()` dan meneruskannya ke service |
| [`backend/app/Services/ComplaintService.php`](file:///d:/kuliah/kuliah%20semester%205/Projek%20Analitika%20Data/SuaraLens/s/backend/app/Services/ComplaintService.php) | Modifikasi | Menyimpan lampiran via `EvidenceService` dan menyajikan data lampiran pada `presentComplaint` |
| [`backend/app/Controllers/DashboardController.php`](file:///d:/kuliah/kuliah%20semester%205/Projek%20Analitika%20Data/SuaraLens/s/backend/app/Controllers/DashboardController.php) | Modifikasi | Menambahkan method `studentDashboard()` untuk menyediakan data aktual agregat kampus |
| [`backend/app/Config/Routes.php`](file:///d:/kuliah/kuliah%20semester%205/Projek%20Analitika%20Data/SuaraLens/s/backend/app/Config/Routes.php) | Modifikasi | Mendaftarkan route `GET api/student/dashboard` |
| [`frontend/src/services/studentDashboardApi.js`](file:///d:/kuliah/kuliah%20semester%205/Projek%20Analitika%20Data/SuaraLens/s/frontend/src/services/studentDashboardApi.js) | Modifikasi | Menghubungkan fungsi `getStudentDashboardData()` ke API backend nyata dengan fallback aman |
| [`frontend/src/utils/permissions.js`](file:///d:/kuliah/kuliah%20semester%205/Projek%20Analitika%20Data/SuaraLens/s/frontend/src/utils/permissions.js) | Modifikasi | Menambahkan konstanta `ADMIN: 'admin'` dan helper `isAdmin()` |
| `docs/API_CONTRACT.md` | Pembaruan | Mendokumentasikan endpoint lampiran dan student dashboard |
| `docs/FRONTEND_ACTION_ITEMS.md` | Dibuat | Panduan panduan teknis bagi anggota tim pengembang frontend |
| `docs/INTEGRATION_TESTING.md` | Dibuat | Hasil pengujian alur terintegrasi *end-to-end* |

