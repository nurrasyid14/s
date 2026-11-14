# CHANGELOG TESTING & HARDENING — SUARALENS

Dokumen ini mencatat kronologi perbaikan, hardening keamanan, audit service-layer, dan hasil verifikasi pengujian otomatis pada repositori **SuaraLens**.

---

## Kronologi Perbaikan & Hardening Terkini

### 1. Keamanan & Otorisasi Service-Layer (Prioritas 1)
- **`backend/app/Services/ComplaintService.php`:**
  - Menambahkan metode sentral `assertComplaintAccess(array $complaint, array $user, string $action)` yang menegakkan otorisasi multi-peran dan prinsip *default deny*:
    - Admin: Memiliki akses menyeluruh.
    - Stakeholder: Dibatasi hanya pada pengaduan yang ditugaskan ke divisi unitnya (`strcasecmp($userUnit, $assignedUnit) === 0`).
    - User/Mahasiswa: Dibatasi hanya pada pengaduan miliknya sendiri (`user_id === complaint.user_id`).
    - Role tidak dikenal: Ditolak dengan exception `InvalidArgumentException` (menghasilkan HTTP 403).
  - Menambahkan metode `addReply(int $complaintId, string $replyText, array $user)` dan `getReplies(int $complaintId, array $user)` langsung di lapisan service, sehingga otorisasi balasan tidak hanya bertumpu pada filter controller.
  - Memperkuat `reanalyzeComplaint()` dan `getAnalysisHistory()` dengan validasi `assertComplaintAccess()`.
- **`backend/app/Controllers/ComplaintController.php`:**
  - Merefaktor `reply()` dan `replies()` untuk mendelegasikan pemrosesan ke `ComplaintService::addReply()` dan `ComplaintService::getReplies()`.
- **`backend/app/Config/Routes.php`:**
  - Menyelaraskan filter rute pada endpoint `reply`, `replies`, dan `analysis-history` menjadi `authRole:user,stakeholder,admin` agar mahasiswa pelapor dapat menambahkan dan melihat percakapan pada tiket miliknya secara sah.

---

### 2. Lingkungan, Docker & Ollama (Prioritas 2)
- **`.env.example`:**
  - Mengubah konfigurasi port PostgreSQL host menjadi `5433` (`DB_PORT_BINDING=127.0.0.1:5433`) dengan port internal container `5432`.
  - Mengubah default model LLM menjadi `OLLAMA_MODEL=qwen3.5:4b`.
  - Menambahkan variabel `ML_SERVICE_URL=http://ml-service:8000`.
  - Menambahkan dokumentasi perbedaan alamat Ollama (Local Docker `http://host.docker.internal:11434`, Local Host `http://localhost:11434`, dan Cloud VPS `https://your-gpu-server:11434`).
- **`docker-compose.yml`:**
  - Menyelaraskan default model Ollama menjadi `qwen3.5:4b`.
  - Menyelaraskan environment backend dengan `ML_SERVICE_URL: ${ML_SERVICE_URL:-http://ml-service:8000}`.

---

### 3. Timeout, Batas Retry & Resiliensi (Prioritas 3)
- Memastikan rantai batas waktu (timeout) terdefinisi secara terikat (*bounded*):
  - Frontend Axios: `120.000 ms` (120 detik).
  - Backend PHP execution: `180 detik` (`set_time_limit(180)`).
  - Backend cURL ke ML Service: `90 detik` dengan maksimal `2 percobaan` (1 awal + 1 retry jeda 300ms).
  - ML Service ke Ollama: `3 detik` connect timeout, `90 detik` read timeout dengan maksimal `2 retry`.
- Jika Ollama atau ML Service tidak dapat dijangkau, proses pembuatan pengaduan dan analisis ulang tetap berhasil menyelesaikan tiket menggunakan *heuristic fallback*, tanpa membuat response terputus.

---

### 4. Validasi Testing Komprehensif (Prioritas 4)
- **`backend/tests/run_tests.php`:**
  - Diperluas menjadi **18 seksi pengujian** mencakup 199 kasus uji:
    - Seksi 1-7: Unit service (Priority, SLA, Feedback, DataExtraction, WeeklyAnalytics, DB Transactions, Matrix Role).
    - Seksi 8: Keamanan upload file nyata (Magic bytes JPG/PNG/PDF, penolakan ekstensi PHP/EXE, penolakan MIME mismatch, batas 5MB, file 0-byte, isolasi nama acak, proteksi .htaccess, kompensasi deleteFile & purgeFiles).
    - Seksi 9-12: ML Resilience, Student Dashboard Auth & Defense-in-depth, Re-Analysis History, Controller Endpoints.
    - Seksi 13: Siklus token otentikasi (Issue, Bearer auth, password hash hidden, invalid/malformed token, revoke/logout).
    - Seksi 14: RBAC & Default Deny (Admin full access, stakeholder unit matching, user boundary, unknown role deny, non-mutation check).
    - Seksi 15: Matriks isolasi IDOR silang pengguna dan silang unit (Detail, reply, replies).
    - Seksi 16: Pengujian integrasi alur hidup pengaduan dari submit hingga penilaian kepuasan 5 bintang.
    - Seksi 17: Siklus hidup lampiran, fail-fast validasi, zero orphan compensation, dan protected attachment serving dengan verifikasi IDOR.
    - Seksi 18: Uji ketahanan atomisitas transaksi multi-tabel dan rollback bersih pada seluruh method mutasi.
  - Hasil: **199 / 199 PASS (100% Success Rate)**.
- **`ml-service/tests/run_tests.py`:**
  - Penanganan mode offline aman (`TRANSFORMERS_OFFLINE=1`).
  - Hasil: **26 / 26 PASS (100% Success Rate)**.
- **Frontend Build & Linter:**
  - Vite 6 mengompilasi 44 chunks dalam 4.36s (0 errors).
  - ESLint lolos dengan 0 errors (Exit code 0).

---

## Matriks Perubahan File

| Nama File | Kategori | Perubahan Utama |
|---|---|---|
| `backend/app/Services/EvidenceService.php` | Backend / Security | Validasi MIME type fisik via `finfo`, whitelist ekstensi, proteksi .htaccess, kompensasi `deleteFile()` dan `purgeFiles()` |
| `backend/app/Services/ComplaintService.php` | Backend / Security | Validasi lampiran fail-fast, kompensasi zero orphan files saat transaksi rollback, endpoint protected attachment `getComplaintAttachment()`, pengetatan `updateStatus()`, dan return check transaksi |
| `backend/app/Controllers/ComplaintController.php` | Backend / Controller | Endpoint terproteksi `attachment()` dengan sanitasi basename, anti-traversal, dan header nosniff |
| `backend/app/Config/Routes.php` | Backend / Routing | Rute terproteksi `complaints/(:num)/attachments/(:segment)` dengan filter `authRole:user,stakeholder,admin` |
| `backend/tests/run_tests.php` | QA / Testing | Penambahan Seksi 8 (Upload security) dan Seksi 17–18 (199 uji terverifikasi lolos 100%) |
| `TEST_REPORT.md` | Dokumentasi | Laporan aktual 199 backend tests + 26 ML tests + Vite build |
| `SECURITY_AUDIT.md` | Dokumentasi | Dokumentasi upload security, zero orphan compensation, ACID integrity, dan protected attachment serving |
