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
  - Vite 6 mengompilasi 45 chunks dalam 4.47s (0 errors).
  - ESLint lolos dengan 0 errors (Exit code 0).

---

### 5. Follow-Up Security Hardening — Filesystem Containment & Protected Attachment
- **`backend/app/Services/EvidenceService.php`:**
  - **Strict Containment `deleteFile()`:** Menghapus fallback `unlink()` tanpa batas direktori. Memvalidasi bahwa path target wajib berada di dalam `$realUploadRoot = realpath(WRITEPATH . 'uploads') . DIRECTORY_SEPARATOR`. Menolak path traversal, karakter null-byte (`\0`), dan symlink (`is_link`). Menangani file non-existent dengan aman (`false` tanpa exception).
  - **MIME Type Fail-Closed:** Pemeriksaan fisik hanya melalui `finfo(FILEINFO_MIME_TYPE)` tanpa fallback ke MIME header client. MIME yang tidak terdeteksi otomatis ditolak (`fail-closed`).
  - **Validasi Struktur DOCX & DOC:** Untuk DOCX, memeriksa arsip ZIP wajib memuat `[Content_Types].xml` dan `word/document.xml` (menolak plain ZIP yang di-rename). Untuk DOC, memeriksa magic bytes OLE2 `\xD0\xCF\x11\xE0\xA1\xB1\x1A\xE1`.
- **`backend/app/Services/ComplaintService.php`:**
  - **Standarisasi Metadata JSON:** Mengubah pencatatan metadata lampiran pada balasan menjadi JSON terstruktur (`[Lampiran Bukti] {"name":...,"path":...,"size":...,"type":...}`) untuk mencegah *delimiter injection*.
  - **Parser `parseAttachmentMeta()`:** Mendukung deserialisasi JSON modern dan format legacy delimiter (`Nama: ... | Path: ...`) secara backward-compatible.
  - **Independensi Path Fisik:** Path fisik pada `getComplaintAttachment()` selalu dibangun dari server (`WRITEPATH . uploads/complaints/ . safeFilename`) dan diverifikasi terdaftar di database pengaduan tersebut.
- **`backend/app/Controllers/ComplaintController.php`:**
  - **Protected Download Headers:** Membersihkan karakter `\r`, `\n`, dan `\0` pada nama file asli untuk mencegah HTTP Response Splitting / CRLF injection.
  - **Kepatuhan RFC 5987 / RFC 6266:** Membentuk `Content-Disposition` dengan fallback ASCII (`filename="..."`) dan encoding UTF-8 (`filename*=UTF-8''...`).
  - **Least-Privilege Disposition:** Hanya MIME gambar aman dan PDF yang diizinkan `inline`, sedangkan dokumen Word (`doc`, `docx`) dan biner dipaksa `attachment`. Menjaga header `X-Content-Type-Options: nosniff`.
- **`backend/tests/run_tests.php`:**
  - Menambah kasus uji komprehensif sehingga total pengujian backend meningkat dari 199 menjadi **217 kasus uji**.
  - Hasil: **217 / 217 PASS (100% Success Rate)**.

---

### 6. Final Review Fix — DOCX ZIP Bomb Protection, Fault-Injected Transaction Rollback & Symlink Test Fix
- **`backend/app/Services/EvidenceService.php`:**
  - **DOCX ZIP Bomb Protection:** Menyempurnakan `isValidDocxArchive()` dengan batasan ketat tanpa ekstraksi ke filesystem dan tanpa memuat seluruh arsip ke RAM:
    - `DOCX_MAX_TOTAL_UNCOMPRESSED_SIZE = 25 MB` (mencegah bom dekompresi).
    - `DOCX_MAX_ENTRY_UNCOMPRESSED_SIZE = 10 MB` (mencegah single entry exhaustion).
    - `DOCX_MAX_ENTRY_COUNT = 500` (mencegah inode/descriptor exhaustion).
    - `DOCX_MAX_COMPRESSION_RATIO = 100:1` (mencegah bom dekompresi rasio tinggi).
    - Validasi entri menolak path traversal (`../`, `..\`) dan path absolut (`/`, `\`, `C:`).
    - Mempertahankan verifikasi `[Content_Types].xml` dan `word/document.xml`.
- **`backend/tests/run_tests.php`:**
  - **Matriks 9 Uji Nyata DOCX:** Menambahkan pengujian berkas fisik DOCX riil: (1) valid, (2) ZIP biasa, (3) total uncompressed > 25MB, (4) entry > 10MB, (5) entries > 500, (6) rasio kompresi > 100:1, (7) traversal `../`, (8) path absolut, (9) arsip korup.
  - **Real Fault-Injected Transaction Rollback:** Menghapus seluruh assertion statis (`assertTest(..., true)`) pada Seksi 18. Mengimplementasikan model fault injection (`FailingReplyModel`, `FailingAnalysisModel`) untuk menguji 8 operasi multi-mutasi (`createComplaint`, `verifyComplaint`, `dispatchComplaint`, `acceptByUnit`, `followupByUnit`, `answerByUnit`, `submitFeedback`, `updateStatus`). Seluruh tes membaca kembali database PostgreSQL dan membuktikan data pulih ke kondisi awal 100% tanpa partial write.
  - **Perbaikan Symlink Test:** Mengganti assertion fallback statis dengan `skipTest()` pada lingkungan Windows non-admin, melaporkan hasil secara transparan sebagai `SKIPPED` alih-alih klaim `PASS` palsu.
  - **Hasil Pengujian Aktual:** **232 PASS, 0 FAIL, 1 SKIPPED**.

---

## Matriks Perubahan File

| Nama File | Kategori | Perubahan Utama |
|---|---|---|
| `backend/app/Services/EvidenceService.php` | Backend / Security | DOCX ZIP Bomb protection (total size <= 25MB, entry size <= 10MB, count <= 500, ratio <= 100, anti-traversal, anti-absolute path), containment filesystem |
| `backend/app/Services/ComplaintService.php` | Backend / Security | Metadata lampiran JSON terstruktur, parser `parseAttachmentMeta()`, sanitasi path download berbasis server `WRITEPATH . uploads/complaints/` |
| `backend/app/Controllers/ComplaintController.php` | Backend / Controller | Sanitasi anti-CRLF nama file, header Content-Disposition RFC 5987/6266, restriksi `inline` vs `attachment`, header nosniff |
| `backend/app/Config/Routes.php` | Backend / Routing | Rute terproteksi `complaints/(:num)/attachments/(:segment)` dengan filter `authRole:user,stakeholder,admin` |
| `backend/tests/run_tests.php` | QA / Testing | 9 uji DOCX nyata, 8 uji rollback transaksi fault-injected dengan pembuktian DB PostgreSQL riil, symlink test dengan status SKIPPED transparan (232 PASS, 0 FAIL, 1 SKIPPED) |
| `TEST_REPORT.md` | Dokumentasi | Laporan aktual 232 backend tests (1 skipped) + 26 ML tests + Vite build |
| `SECURITY_AUDIT.md` | Dokumentasi | Dokumentasi batas ZIP bomb, verifikasi transaksi ACID, dan proteksi protected attachment |
