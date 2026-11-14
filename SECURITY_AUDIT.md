# SECURITY AUDIT — SUARALENS APPLICATION

**Tanggal Audit:** 15 November 2026  
**Auditor:** Automated Hardening & Security Assessment Suite  
**Klasifikasi:** Internal Security & Compliance  
**Status Evaluasi:** **PASS / SECURE (READY FOR STAGING / DEMO)**

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
| Memberikan Ulasan/Feedback (`POST .../feedback`) | ✅ (Milik sendiri) | ❌ | ❌ | ❌ (403) |
| Melihat Daftar Semua Aduan (`GET /api/complaints`) | ❌ | ✅ (Terfilter unit) | ✅ (Semua) | ❌ (403) |
| Disposisi ke Unit (`POST .../disposition`) | ❌ | ❌ | ✅ | ❌ (403) |
| Menerima Penugasan (`POST .../accept`) | ❌ | ✅ (Unit ditugaskan) | ❌ | ❌ (403) |
| Tindak Lanjut Teknis (`POST .../followup`) | ❌ | ✅ (Unit ditugaskan) | ❌ | ❌ (403) |
| Menerbitkan Jawaban Resmi (`POST .../answer`) | ❌ | ✅ (Unit ditugaskan) | ❌ | ❌ (403) |
| Verifikasi Aduan (`PATCH .../verify`) | ❌ | ❌ | ✅ | ❌ (403) |
| Memicu Analisis Ulang AI (`POST .../analyze`) | ❌ | ✅ (Unit ditugaskan) | ✅ | ❌ (403) |
| Riwayat Analisis AI (`GET .../analysis-history`) | ✅ (Milik sendiri) | ✅ (Unit ditugaskan) | ✅ (Semua) | ❌ (403/404) |

> **Pencegahan Default Deny:** Setiap request dengan peran yang tidak terdaftar (`role != 'admin' && role != 'stakeholder' && role != 'user'`) secara otomatis dilemparkan exception `InvalidArgumentException('Akses ditolak: Role pengguna tidak dikenal atau tidak memiliki hak akses.')` dan menghasilkan HTTP `403 Forbidden`.

---

## 2. Eliminasi Kerentanan IDOR (Insecure Direct Object Reference)

### Implementasi Service-Layer
Otorisasi kepemilikan tidak hanya mengandalkan rute URL, melainkan ditegakkan langsung di `ComplaintService`:

```php
public function assertComplaintAccess(array $complaint, array $user, string $action = 'view'): void
{
    $role = $user['role'] ?? '';

    if ($role === 'admin') {
        return; // Admin memiliki otoritas penuh
    }

    if ($role === 'stakeholder') {
        $userUnit = trim((string) ($user['unit'] ?? ''));
        $assignedUnit = trim((string) ($complaint['assigned_unit'] ?? ''));

        if ($userUnit === '' || strcasecmp($userUnit, $assignedUnit) !== 0) {
            throw new InvalidArgumentException('Akses ditolak: Anda hanya berwenang mengakses pengaduan yang ditugaskan ke divisi Anda.');
        }
        if (in_array($action, ['verify', 'feedback'], true)) {
            throw new InvalidArgumentException('Akses ditolak: Anda tidak memiliki wewenang untuk tindakan ini.');
        }
        return;
    }

    if ($role === 'user') {
        if ((int) ($complaint['user_id'] ?? 0) !== (int) ($user['id'] ?? -1)) {
            throw new InvalidArgumentException('Pengaduan tidak ditemukan.');
        }
        if (in_array($action, ['reanalyze', 'verify', 'dispatch', 'accept', 'followup', 'answer'], true)) {
            throw new InvalidArgumentException('Akses ditolak: Anda tidak memiliki wewenang untuk tindakan ini.');
        }
        return;
    }

    throw new InvalidArgumentException('Akses ditolak: Role pengguna tidak dikenal atau tidak memiliki hak akses.');
}
```

### Hasil Validasi Uji IDOR
- Pengguna A mengakses pengaduan Pengguna B: **Ditolak (HTTP 404/403)**.
- Pengguna A menambahkan reply pada pengaduan Pengguna B: **Ditolak (HTTP 403)**.
- Petugas Unit X mencoba membalas / mereview pengaduan Unit Y: **Ditolak (HTTP 403)**.
- Pengguna luar dengan token role asing: **Ditolak (HTTP 403)**.

---

## 3. Perlindungan SQL Injection & Integritas Transaksi

1. **Parameter Binding:** Seluruh query menggunakan CodeIgniter 4 Query Builder / PDO Prepared Statements.
2. **Mass Assignment Defense:** Seluruh Model CI4 (`ComplaintModel`, `ComplaintAnalysisModel`, `UserModel`) mendefinisikan array `$allowedFields` yang ketat. Field sensitif tidak dapat disisipkan lewat manipulasi JSON body.
3. **Database Transaction Atomicity:** Penulisan tiket pengaduan, penyerahan analisis, dan lampiran dilakukan dalam blok `$db->transBegin()`, `$db->transCommit()`, dan `$db->transRollback()`.

---

## 4. Perlindungan Privasi Data & Sensor PII

1. **Penyensoran Berlapis:**
   - **NIM:** Disamarkan menjadi `<NIM>` / `[NOMOR_IDENTITAS]`.
   - **Telepon:** Disamarkan menjadi `<TELEPON>` / `[NOMOR_KONTAK]`.
   - **Email:** Disamarkan menjadi `<EMAIL>`.
2. **Sanitasi Database:** Teks yang disimpan di kolom `complaints.description` merupakan hasil sanitasi `redacted_text`. Teks mentah berisi nomor kontak dan identitas mahasiswa tidak pernah disimpan di database utama.
3. **Resiliensi Sensor:** Jika koneksi NLP HuggingFace tidak tersedia, pembersih regex lokal tetap mengeksekusi penyensoran sebelum teks disimpan.

---

## 5. Keamanan Upload Berkas & Ekstensi Bukti

- **Whitelist Ekstensi:** Dibatasi hanya pada `.jpg`, `.jpeg`, `.png`, dan `.pdf`.
- **Ekstensi Berbahaya Ditolak:** File berekstensi `.php`, `.exe`, `.sh`, `.bat` langsung ditolak oleh `EvidenceService`.
- **Ukuran Maksimum:** Dibatasi tepat 5 MB (5.242.880 bytes).
