# SECURITY AUDIT — SUARALENS APPLICATION

**Tanggal Audit:** 15 November 2026  
**Auditor:** Automated Hardening & Security Assessment Suite  
**Klasifikasi:** Internal Security & Compliance  
**Status Evaluasi:** **PASS WITH WARNINGS (LAYAK UNTUK DEMO LOKAL & STAGING; PERLU LOAD TEST SEBELUM PRODUKSI)**

---

## 1. Matriks Otorisasi Multi-Peran (RBAC) & Default Deny

SuaraLens menerapkan prinsip *Defense-in-Depth* dengan validasi ganda: pada filter rute (`AuthRoleFilter`) dan di dalam lapisan logika bisnis (`ComplaintService::assertComplaintAccess`):

| Fitur / Endpoint | Mahasiswa (`user`) | Petugas Unit (`stakeholder`) | Admin Sentral (`admin`) | Role Tidak Dikenal (`guest`, dll) |
|---|:---:|:---:|:---:|:---:|
| Mengajukan Pengaduan (`POST /api/complaints`) | ✅ | ✅ | ✅ | ❌ (401/403) |
| Melihat Pengaduan Sendiri (`GET /api/complaints/my`) | ✅ | ✅ | ✅ | ❌ (401/403) |
| Melihat Detail Pengaduan (`GET /api/complaints/{id}`) | ✅ (Milik sendiri) | ✅ (Unit ditugaskan) | ✅ (Semua) | ❌ (403/404) |
| Menambahkan Balasan (`POST /api/complaints/{id}/reply`) | ✅ (Milik sendiri) | ✅ (Unit ditugaskan) | ✅ (Semua) | ❌ (403/404) |
| Melihat Daftar Balasan (`GET /api/complaints/{id}/replies`) | ✅ (Milik sendiri) | ✅ (Unit ditugaskan) | ✅ (Semua) | ❌ (403/404) |
| Mengunduh/Melihat Lampiran (`GET .../attachments/{file}`) | ✅ (Milik sendiri) | ✅ (Unit ditugaskan) | ✅ (Semua) | ❌ (401/403/404) |
| Memberikan Ulasan/Feedback (`POST .../feedback`) | ✅ (Milik sendiri) | ❌ | ❌ | ❌ (403) |
| Melihat Daftar Semua Aduan (`GET /api/complaints`) | ❌ | ✅ (Terfilter unit) | ✅ (Semua) | ❌ (403) |
| Disposisi ke Unit (`POST .../disposition`) | ❌ | ❌ | ✅ | ❌ (403) |
| Menerima Penugasan (`POST .../accept`) | ❌ | ✅ (Unit ditugaskan) | ❌ | ❌ (403) |
| Tindak Lanjut Teknis (`POST .../followup`) | ❌ | ✅ (Unit ditugaskan) | ❌ | ❌ (403) |
| Menerbitkan Jawaban Resmi (`POST .../answer`) | ❌ | ✅ (Unit ditugaskan) | ❌ | ❌ (403) |
| Perubahan Status Umum (`PATCH .../status`) | ❌ | ⚠️ (Operasional saja: `in_progress`, `action_taken`, `answered`) | ✅ (Semua status sah) | ❌ (403) |
| Verifikasi Aduan (`PATCH .../verify`) | ❌ | ❌ | ✅ | ❌ (403) |
| Memicu Analisis Ulang AI (`POST .../analyze`) | ❌ | ✅ (Unit ditugaskan) | ✅ | ❌ (403) |
| Riwayat Analisis AI (`GET .../analysis-history`) | ✅ (Milik sendiri) | ✅ (Unit ditugaskan) | ✅ (Semua) | ❌ (403/404) |
| Dashboard Mahasiswa (`GET /api/student/dashboard`) | ✅ | ❌ | ✅ (Monitoring) | ❌ (401/403) |

> **Pencegahan Default Deny:** Setiap request dengan peran yang tidak terdaftar (`role != 'admin' && role != 'stakeholder' && role != 'user'`) secara otomatis dilemparkan exception `InvalidArgumentException('Akses ditolak: Role pengguna tidak dikenal atau tidak memiliki hak akses.')` dan menghasilkan HTTP `403 Forbidden`.

---

## 2. Keamanan Upload Lampiran & Konsistensi Transaksi (Zero Orphan Files)

### A. Validasi Multi-Lapis Upload (`EvidenceService`)
1. **Whitelist Ekstensi:** Hanya ekstensi aman yang diizinkan (`jpg`, `jpeg`, `png`, `pdf`, `doc`, `docx`). Ekstensi berbahaya (`php`, `phtml`, `exe`, `sh`, `bat`, `cgi`, `py`, dll.) ditolak.
2. **Validasi MIME Type Fisik via `finfo`:** Pemeriksaan tidak hanya membaca nama file atau header client, melainkan membaca magic bytes fisik file via PHP `finfo(FILEINFO_MIME_TYPE)`. File berbahaya yang disamarkan (misal file PHP berekstensi `.jpg` atau `.pdf`) ditolak seketika karena *MIME type mismatch*.
3. **Batas Ukuran & File Kosong:** File dibatasi maksimal 5MB (5.242.880 bytes). File 0 byte (kosong) ditolak.
4. **Isolasi Nama & Direktori:** Nama file penyimpanan di-generate secara acak unik kriptografis via `$file->getRandomName()`, bebas dari karakter path traversal klien.
5. **Direktori Non-Executable:** Direktori upload dilindungi konfigurasi `.htaccess` yang mematikan eksekusi script handler PHP/CGI di level server.

### B. Mekanisme Kompensasi Transaksi (Zero Orphan Files)
Transaksi PostgreSQL tidak dapat melakukan rollback terhadap file fisik di hard disk. Oleh karena itu, SuaraLens menerapkan mekanisme kompensasi otomatis:
1. Validasi seluruh lampiran terlebih dahulu (*fail-fast*) sebelum penyimpanan.
2. Simpan file fisik dengan nama unik dan lacak path fisiknya.
3. Mulai transaksi database PostgreSQL (`$db->transBegin()`).
4. Catat referensi lampiran ke tabel `complaint_replies` di dalam transaksi.
5. Jika transaksi database gagal atau dibatalkan, blok `catch` secara otomatis mengeksekusi `$this->evidenceService->purgeFiles()` untuk menghapus seluruh file fisik yang terlanjur disimpan, sehingga tidak ada *orphan files* yang tersisa di storage.

---

## 3. Batasan Otoritas dan Penegakan Hak Akses `updateStatus()`

Audit mendalam terhadap method `ComplaintService::updateStatus()` membuktikan:
1. **Pencegahan Bypass Stakeholder:**
   - Petugas unit (stakeholder) **dilarang keras** mengubah status menjadi `verified`, `dispatched`, `rejected`, atau `resolved`.
   - Stakeholder hanya diizinkan memperbarui status ke tahapan operasional yang menjadi kewenangannya: `in_progress`, `action_taken`, dan `answered`.
   - Upaya pengubahan `assigned_unit` oleh stakeholder ditolak dengan pesan kesalahan eksplisit.
2. **Penyelesaian Akhir (`resolved`):**
   - Status `resolved` hanya dapat dipicu melalui pengisian feedback kepuasan resmi oleh mahasiswa pelapor tiket (`submitFeedback`) setelah unit memberikan jawaban resmi (`answered`), atau alur penanganan resmi yang sah.
3. **Pencegahan Akses Pengguna Biasa & Asing:**
   - Mahasiswa (`user`) dan peran asing ditolak secara mutlak pada `updateStatus()`.
4. **Verifikasi Non-Mutasi Database:**
   - Seluruh penolakan akses dieksekusi sebelum ada penulisan data. Uji integritas membuktikan status tiket dan penugasan unit di PostgreSQL tidak berubah (non-mutation) ketika percobaan akses ilegal terjadi.

---

## 4. Audit Endpoint `GET /api/student/dashboard`

1. **Autentikasi & Otorisasi Rute:**
   - Dilindungi di rute CodeIgniter dengan filter `authRole:user,admin`.
   - Dilengkapi validasi ganda di level controller (`DashboardController::studentDashboard`), menolak request tanpa token dengan HTTP 401 dan menolak role stakeholder atau role asing dengan HTTP 403.
2. **Privasi & Eliminasi PII:**
   - Endpoint hanya mengompilasi statistik agregat: distribusi unit, jumlah pengaduan, tingkat penyelesaian (SLA), dan breakdown status 7 alur.
   - Tidak ada kolom deskripsi, nama pengirim, NIM, email, nomor telepon, atau ID pengadu yang dipaparkan.
3. **Kompatibilitas Frontend:**
   - Klien React mengirimkan `Authorization: Bearer <token>` via Axios interceptor, memastikan dashboard mahasiswa tampil mulus tanpa kebocoran data.

---

## 5. Eliminasi Kerentanan IDOR & Protected Attachment Serving

### Implementasi Service-Layer
Otorisasi kepemilikan ditegakkan langsung di `ComplaintService`:
- Pengguna A mengakses detail pengaduan Pengguna B: **Ditolak (HTTP 404/403)**.
- Pengguna A menambahkan reply pada pengaduan Pengguna B: **Ditolak (HTTP 403)**.
- Pengguna A memberikan feedback kepuasan untuk tiket Pengguna B: **Ditolak (HTTP 403)**.
- Pengguna A mencoba mengunduh/melihat lampiran tiket Pengguna B: **Ditolak (HTTP 403)**.
- Stakeholder unit X mencoba mengakses lampiran atau detail unit Y: **Ditolak (HTTP 403)**.
- Percobaan *Path Traversal* nama file lampiran (`../../etc`): **Ditolak (HTTP 403)**.

---

## 6. Perlindungan Integritas Transaksi Database (ACID)

Seluruh operasi mutasi data (`createComplaint`, `verifyComplaint`, `dispatchComplaint`, `acceptByUnit`, `followupByUnit`, `answerByUnit`, `submitFeedback`, `updateStatus`) mengimplementasikan validasi return value model CI4:
```php
$updated = $this->complaintModel->update($id, $updateFields);
if ($updated === false) {
    throw new RuntimeException('Gagal memperbarui status pengaduan di database.');
}

$replyId = $this->replyModel->insert([...]);
if (!$replyId) {
    throw new RuntimeException('Gagal mencatat jejak audit percakapan.');
}

$db->transCommit();
```
Jika operasi update atau insert gagal, `$db->transRollback()` dieksekusi secara otomatis, mencegah partial write atau korupsi state database.

---

## 7. Perlindungan Privasi Data & Sensor PII

1. **Penyensoran Berlapis:**
   - **NIM:** Disamarkan menjadi `<NIM>` / `[NOMOR_IDENTITAS]`.
   - **Telepon:** Disamarkan menjadi `<TELEPON>` / `[NOMOR_KONTAK]`.
   - **Email:** Disamarkan menjadi `<EMAIL>`.
2. **Sanitasi Database:** Teks yang disimpan di kolom `complaints.description` merupakan hasil sanitasi `redacted_text`. Teks mentah berisi nomor kontak dan identitas mahasiswa tidak pernah disimpan di database utama.
3. **Resiliensi Sensor:** Jika koneksi NLP HuggingFace tidak tersedia, pembersih regex lokal tetap mengeksekusi penyensoran sebelum teks disimpan.

---

## 8. Keamanan File Upload Tingkat Lanjut, Validasi Fail-Closed & Filesystem Containment

### A. Strict Filesystem Containment (`EvidenceService::deleteFile`)
1. **Peniadaan Fallback Tak Terverifikasi:** Menghapus fallback penghapusan `unlink()` langsung tanpa containment.
2. **Validasi Direktori Upload Ketat:** Target path diverifikasi dengan `realpath()` dan diwajibkan berada di dalam `$realUploadRoot = realpath(WRITEPATH . 'uploads') . DIRECTORY_SEPARATOR`. File di luar direktori upload (termasuk folder `logs`, `cache`, atau di luar `WRITEPATH`) ditolak secara mutlak dan mengembalikan `false`.
3. **Pencegahan Path Traversal & Injeksi:** String path diperiksa dari karakter null-byte (`\0`) dan direktori traversal (`..`).
4. **Anti-Symlink Hijacking:** File bertipe symbolic link (`is_link()`) ditolak untuk mencegah symlink escape atau penghapusan file di luar sandbox.
5. **Penanganan Graceful:** File yang tidak ditemukan tidak memicu *fatal error* melainkan dicatat dalam log dan mengembalikan `false` secara aman.

### B. Validasi Fail-Closed & Integritas Dokumen Office
1. **Fail-Closed MIME Detection:** MIME type fisik file diperiksa menggunakan PHP `finfo(FILEINFO_MIME_TYPE)`. Jika MIME tidak dapat dideteksi atau file rusak, validasi otomatis ditolak (fail-closed). MIME header dari klien tidak dipercaya sebagai sumber otentik.
2. **Verifikasi Arsip OpenXML (DOCX) & Proteksi ZIP Bomb:**
   - Memeriksa struktur arsip ZIP secara nyata menggunakan `ZipArchive` tanpa mengekstrak ke filesystem dan tanpa memuat seluruh konten ke RAM.
   - Dokumen `.docx` diwajibkan memuat entri XML standar OpenXML: `[Content_Types].xml` dan `word/document.xml`. File ZIP biasa yang sekadar di-rename menjadi `.docx` otomatis ditolak.
   - **Batas Total Uncompressed Size:** Maksimal 25 MB (`DOCX_MAX_TOTAL_UNCOMPRESSED_SIZE`). Memberikan ruang dekompresi hingga 5x dari batas upload 5MB (sangat cukup untuk dokumen teks ratusan halaman dengan lampiran gambar), sekaligus menghentikan serangan dekompresi raksasa.
   - **Batas Uncompressed Size per Entry:** Maksimal 10 MB (`DOCX_MAX_ENTRY_UNCOMPRESSED_SIZE`). Melindungi dari satu file XML tunggal yang sengaja dibuat masif.
   - **Batas Jumlah Entry:** Maksimal 500 file (`DOCX_MAX_ENTRY_COUNT`). Struktur OpenXML Word normal memuat 10–100 file internal; batas 500 mencegah *descriptor/inode exhaustion*.
   - **Batas Rasio Kompresi:** Maksimal 100:1 (`DOCX_MAX_COMPRESSION_RATIO`). Rasio kompresi teks normal berkisar 5:1 hingga 30:1; rasio > 100:1 pada entri berukuran > 1KB ditolak sebagai bom arsip.
   - **Anti-Traversal & Anti-Absolute Path (Zip Slip):** Seluruh nama entri diperiksa. Entri yang memuat `../`, `..\`, atau diawali dengan path absolut (`/`, `\`, `C:`) serta karakter null-byte (`\0`) langsung ditolak.
3. **Verifikasi Magic Bytes OLE2 (DOC):** Dokumen legacy `.doc` diverifikasi memiliki 8-byte magic number OLE2 Compound Document (`\xD0\xCF\x11\xE0\xA1\xB1\x1A\xE1`).

### C. Standarisasi Metadata Lampiran Terstruktur (JSON)
1. **Pencegahan Delimiter Injection:** Metadata lampiran disimpan di tabel riwayat (`complaint_replies`) dalam format JSON terstruktur:
   `[Lampiran Bukti] {"name":"...","path":"...","size":...,"type":"..."}`
   Hal ini mencegah kerentanan pemisahan token (*delimiter injection*) ketika nama file asli memuat karakter pipa `|`, kutip ganda, atau spasi.
2. **Backward-Compatible Parsing:** Method `parseAttachmentMeta()` di `ComplaintService` mendukung pemrosesan format JSON modern sekaligus format legacy delimiter (`Nama: ... | Path: ... | Size: ... | Type: ...`).
3. **Resolusi Path Fisik Independen:** Path fisik tidak pernah diambil mentah dari input pengguna. Path fisik selalu direkonstruksi di sisi server melalui direktori sah `WRITEPATH . 'uploads/complaints/'` digabungkan dengan `basename()` yang terdaftar sah di database tiket bersangkutan.

### D. Protected Download Headers (Anti-CRLF & RFC 5987)
1. **Pencegahan CRLF Injection / HTTP Response Splitting:** Karakter `\r`, `\n`, dan `\0` pada nama file asli dibersihkan sebelum masuk ke header HTTP.
2. **Kepatuhan RFC 5987 / RFC 6266:** Header `Content-Disposition` disusun dengan fallback nama ASCII yang aman serta parameter `filename*=UTF-8''` yang di-encode menggunakan `rawurlencode()`.
3. **Prinsip Least-Privilege Disposition:** Hanya MIME type aman (`image/jpeg`, `image/png`, `application/pdf`) yang diizinkan untuk ditampilkan secara `inline`. Tipe dokumen dan biner (`doc`, `docx`, `octet-stream`) dipaksa menggunakan mode `attachment` (download langsung).
4. **MIME Sniffing Prevention:** Header `X-Content-Type-Options: nosniff` selalu disertakan pada seluruh respons download berkas.
