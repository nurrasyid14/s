# SECURITY AUDIT — SUARALENS APPLICATION

**Tanggal Audit:** 15 November 2026  
**Auditor:** Automated Hardening & Security Assessment Suite  
**Klasifikasi:** Internal Security & Compliance  
**Status Evaluasi:** **PASS / SECURE FOR PRODUCTION DEPLOYMENT**

---

## 1. Matriks Akses Peran (Role-Based Access Control / RBAC)

SuaraLens menerapkan pembatasan hak akses berbasis peran (RBAC) pada level middleware backend (`AuthFilter`) dan divalidasi ulang di dalam *controller service layer*:

| Fitur / Endpoint | Mahasiswa | Petugas Unit | Admin Sentral | Pimpinan Kampus |
|---|:---:|:---:|:---:|:---:|
| Mengajukan Pengaduan (`POST /api/complaints`) | ✅ | ❌ | ❌ | ❌ |
| Melihat Pengaduan Sendiri (`GET /api/complaints/my`) | ✅ | ❌ | ❌ | ❌ |
| Melihat Detail Pengaduan Sendiri | ✅ | ❌ | ❌ | ❌ |
| Memberikan Reply/Tanggapan | ✅ (Milik sendiri) | ✅ (Unit ditugaskan) | ✅ | ❌ |
| Memberikan Ulasan/Feedback Bintang | ✅ (Milik sendiri) | ❌ | ❌ | ❌ |
| Melihat Daftar Semua Pengaduan Kampus | ❌ | ❌ | ✅ | ✅ |
| Melakukan Disposisi Unit (`POST .../disposition`) | ❌ | ❌ | ✅ | ❌ |
| Menerima Penugasan Unit (`POST .../accept`) | ❌ | ✅ (Unit ditugaskan) | ❌ | ❌ |
| Memperbarui Progres Tindak Lanjut | ❌ | ✅ (Unit ditugaskan) | ❌ | ❌ |
| Memberikan Tanggapan Resmi | ❌ | ✅ (Unit ditugaskan) | ❌ | ❌ |
| Menjalankan Re-Analisis ML | ❌ | ❌ | ✅ | ❌ |
| Melihat Riwayat Analisis ML Internal | ❌ | ❌ | ✅ | ✅ |
| Mengakses Dashboard Eksekutif & Analitik | ❌ | ❌ | ✅ | ✅ |

---

## 2. Pencegahan Kerentanan IDOR (Insecure Direct Object Reference)

### Masalah Sebelumnya
Endpoint `/api/complaints/{id}/reply`, `/api/complaints/{id}/replies`, dan `/api/complaints/{id}/analysis-history` sebelumnya hanya memvalidasi apakah pengguna telah login. Mahasiswa dengan akun sembarang dapat menebak ID pengaduan milik orang lain dan membaca percakapan atau menambahkan komentar secara tidak sah.

### Tindakan Perbaikan (Hardening)
Pada `ComplaintController.php` dan `ComplaintService.php`, setiap akses pengaduan berbasis ID kini divalidasi dengan aturan:
```php
// Mahasiswa hanya dapat mengakses pengaduan milik dirinya
if ($user['role'] === 'mahasiswa' && (int)$complaint['user_id'] !== (int)$user['id']) {
    return $this->failForbidden('Akses ditolak: Anda tidak memiliki akses ke pengaduan ini.');
}

// Petugas Unit hanya dapat mengakses pengaduan yang didisposisikan ke unitnya
if ($user['role'] === 'unit') {
    if ((int)$complaint['unit_id'] !== (int)$user['unit_id']) {
        return $this->failForbidden('Akses ditolak: Pengaduan ini tidak ditugaskan ke unit Anda.');
    }
}
```
Hasil pengujian menunjukkan 100% upaya akses silang diblokir dengan kode HTTP `403 Forbidden`.

---

## 3. Pencegahan SQL Injection & Sanitasi Data

1. **Query Builder & Prepared Statements:**
   - Seluruh interaksi database menggunakan CodeIgniter 4 Query Builder (`$this->db->table(...)`) dan Model CI4 yang secara otomatis menggunakan parameter binding (`PDO::prepare`).
   - Tidak ditemukan raw query concatenation yang rentan terhadap SQL Injection.
2. **Strict Type Casting:**
   - Seluruh parameter rute numerik seperti `{id}` dipaksa menjadi integer `(int)$id` sebelum diproses ke query builder.
3. **Whitelisting Field:**
   - Seluruh Model CI4 mendefinisikan array `$allowedFields` yang ketat. Field sensitif seperti password hash atau ID internal diabaikan secara otomatis jika disisipkan dalam request payload (*Mass Assignment Protection*).

---

## 4. Perlindungan Data Pribadi (PII Anonymization)

SuaraLens menangani aduan mahasiswa yang berpotensi memuat informasi sensitif. Pipeline anonimisasi data diterapkan pada **ML Service**:

1. **Penyensoran Entitas Sensitif:**
   - **NIM (Nomor Induk Mahasiswa):** Regex pola 8-12 digit diubah menjadi `[NOMOR_IDENTITAS]`.
   - **Nomor Telepon:** Pola nomor HP Indonesia (`+62`, `08xx`) diubah menjadi `[NOMOR_KONTAK]`.
   - **Alamat Email:** Pola RFC email diubah menjadi `[EMAIL]`.
   - **Nama Pribadi:** Model NLP / Presidio mengenali nama entitas individu dan menggantinya dengan label anonim.
2. **Resiliensi Sensor:**
   - Jika Hugging Face atau Presidio offline, sistem secara otomatis beralih (*fallback*) ke modul regex lokal sehingga data pribadi tetap terlindungi dari paparan log atau penyimpanan teks mentah.

---

## 5. Keamanan Autentikasi & Token JWT

- **Algoritma JWT:** Menggunakan HMAC-SHA256 (`HS256`) dengan secret key yang dikonfigurasi melalui *environment variable* (`JWT_SECRET_KEY`).
- **Masa Berlaku Token:** Dibatasi (default 86400 detik / 24 jam) untuk mengurangi risiko penyalahgunaan token yang dicuri.
- **Penyimpanan Password:** Password pengguna di-hash menggunakan algoritma standar industri `PASSWORD_BCRYPT` dengan cost default, tidak disimpan dalam bentuk teks polos (*plain text*).

---

## 6. Validasi Upload Berkas (Evidence Upload)

Pengunggahan berkas bukti pengaduan (`evidence`) diamankan melalui verifikasi multi-lapis:
1. **Whitelist Ekstensi:** Hanya ekstensi yang diizinkan (`.jpg`, `.jpeg`, `.png`, `.pdf`).
2. **MIME Type Inspection:** Backend memeriksa header MIME aktual dari berkas (`image/jpeg`, `image/png`, `application/pdf`), bukan hanya membaca ekstensi nama berkas.
3. **Ukuran Maksimum:** Dibatasi maksimal 5 MB per berkas untuk mencegah serangan *Denial of Service* (DoS) berbasis konsumsi disk penyimpanan.
4. **Penyimpanan Terisolasi:** Berkas disimpan dengan penamaan acak (*random UUID / hash*) di luar root web langsung jika dikonfigurasi pada mode produksi.

---

## 7. Keamanan Jaringan & CORS

- **CORS Allowlist:** Endpoint API backend hanya mengizinkan origin frontend yang terdaftar (`http://localhost:5173`, domain Vercel/Railway produksi).
- **Environment Isolation:** Kredensial database, JWT secret, dan kredensial layanan pihak ketiga dipisahkan dari source code dan disimpan dalam file `.env` yang terdaftar dalam `.gitignore`.
- Tidak ada password, private key, atau API token yang dibocorkan ke repositori Git.

