# Panduan Tindak Lanjut Tim Frontend (Frontend Action Items)

**Proyek:** SuaraLens — Integrasi Frontend React dengan Backend CodeIgniter 4  
**Tanggal:** 7 November 2026  
**Status:** Dokumen Referensi Anggota Tim Frontend  
**Tujuan:** Memberikan daftar petunjuk teknis, kontrak pemanggilan, penanganan status, serta catatan perubahan yang telah diselaraskan oleh API Integration Engineer.

---

## 1. Ringkasan Perubahan yang Telah Diterapkan oleh Agent

Perubahan pada codebase frontend telah dilakukan secara **sangat selektif dan minimal** (tanpa mengubah desain visual, layout, palet warna, maupun estetika UI/UX):

1. **`frontend/src/services/studentDashboardApi.js`:**
   - Telah ditambahkan koneksi HTTP nyata ke endpoint backend `GET /api/student/dashboard` ketika `VITE_USE_MOCK=false`.
   - Menggunakan fallback otomatis ke data benchmark statis (`DEFAULT_UNIT_DATA`) jika backend sedang offline, sehingga tidak akan pernah memunculkan *white screen of death*.
2. **`frontend/src/utils/permissions.js`:**
   - Ditambahkan konstanta `ADMIN: 'admin'` pada objek `ROLES` dan fungsi pembantu `isAdmin()` serta `requireAdmin()` untuk standarisasi pengecekan peran.
3. **`backend/app/Controllers/ComplaintController.php` & `ComplaintService.php`:**
   - Ditambahkan penanganan berkas lampiran `request->getFiles()` menggunakan `EvidenceService`. Berkas yang diunggah pelapor pada `ComplaintForm.jsx` kini otomatis tersimpan di server dan disajikan sebagai array `attachments` pada respons detail pengaduan.

---

## 2. Konfigurasi Environment & Mode Integrasi

Untuk menjalankan aplikasi secara terintegrasi dengan backend nyata (non-mock):

### 2.1 Konfigurasi Berkas `frontend/.env`
Pastikan berkas `frontend/.env` memiliki konfigurasi berikut:
```env
VITE_API_URL=/api
VITE_USE_MOCK=false
```

### 2.2 Menjalankan Aplikasi secara Lokal
1. **Jalankan PostgreSQL Database:** Port 5432 (database `suaralens`).
2. **Jalankan ML Service (Opsional / Background):**
   ```powershell
   cd ml-service
   uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```
3. **Jalankan Backend CodeIgniter 4:**
   ```powershell
   cd backend
   php spark serve --port 8090
   ```
4. **Jalankan Frontend Vite Dev Server:**
   ```powershell
   cd frontend
   npm run dev
   ```
   Akses antarmuka di peramban: `http://localhost:5173`.

> **Catatan Mock Mode:** Jika ingin kembali menggunakan simulasi mock data lokal tanpa backend, cukup ubah nilai `VITE_USE_MOCK=true` pada berkas `frontend/.env` tanpa mengubah baris kode apa pun.

---

## 3. Akun Pengujian Baku (Seed Credentials)

Database PostgreSQL telah diisi (*seeded*) dengan kredensial pengujian yang 100% identik dengan akun simulasi frontend:

| Peran (Role) | Email | Password | Penugasan / Posisi |
|---|---|---|---|
| **Administrator** | `admin@pens.ac.id` | `admin123` | Administrator Sentral PENS |
| **Stakeholder Unit** | `sari@pens.ac.id` | `password123` | Kepala Bagian Kemahasiswaan (Unit Kemahasiswaan) |
| **Pelapor Sivitas (User)** | `budi@student.pens.ac.id` | `password123` | Mahasiswa PENS |

---

## 4. Panduan Pemanggilan API & Penanganan State

### 4.1 Token & Header Authorization
- Frontend secara otomatis menyematkan token dari `localStorage.getItem('suaralens_token')` melalui request interceptor pada `api.js`:
  ```javascript
  config.headers.Authorization = `Bearer ${token}`
  ```
- **Penanganan 401 Unauthorized:** Interceptor pada `api.js` otomatis membersihkan `suaralens_token` dan `suaralens_user` saat sesi kedaluwarsa, lalu me-redirect pengguna ke `/signin` atau `/admin/signin`.

### 4.2 Pengajuan Aduan dengan Lampiran (`ComplaintForm.jsx`)
- Fungsi `submitComplaint(form)` pada `complaintApi.js` secara otomatis mendeteksi jika array `attachments` memuat objek `File`, dan mengonversinya menjadi `FormData` multipart dengan field `attachments[]`.
- **Batas Berkas:** Maksimum 5 MB per file. Format yang diizinkan: JPG, JPEG, PNG, PDF.

### 4.3 Menampilkan Lampiran pada Halaman Detail & Bukti
- Data tiket dari `getComplaint(id)` dan `getComplaints()` kini menyajikan array `attachments` dengan struktur:
  ```json
  "attachments": [
    {
      "name": "foto_ac_bocor.jpg",
      "url": "http://localhost:8090/uploads/complaints/1731000000_abcd.jpg",
      "size": 245100,
      "type": "image/jpeg"
    }
  ]
  ```
- Halaman `evidence.jsx` otomatis memfilter `c.attachments?.length > 0` dan menampilkan thumbnail bukti secara dinamis.

### 4.4 Dashboard Mahasiswa (`UserDashboard.jsx`)
- `getStudentDashboardData()` kini memanggil endpoint `GET /api/student/dashboard`.
- Struktur respons yang dikembalikan:
  - `summary`: `{ total, resolved, active, received, slaComplianceRate, avgResolutionDays, avgRating, completionRate, types }`
  - `typesBreakdown`: `{ complaint: { count, pct }, feedback: { count, pct }, suggestion: { count, pct } }`
  - `globalStages`: objek jumlah aduan pada 7 tahapan (`received`, `verified`, `dispatched`, `in_progress`, `action_taken`, `answered`, `resolved`)
  - `units`: daftar 14 unit kerja resmi lengkap dengan metrik kepatuhan dan kategori terbanyak.

---

## 5. Daftar Pekerjaan Tambahan untuk Tim Frontend (Rekomendasi Opsional)

1. **Komponen Pengunggah Lampiran:** Pertahankan batas validasi ukuran file 5 MB dan berikan umpan balik instan jika pengguna memilih ekstensi terlarang (seperti `.exe`, `.zip`).
2. **Optimasi Cache Query:** Gunakan pola debounce (yang sudah tersedia di `useDebounce.js`) pada kotak pencarian teks di halaman `AdminComplaintList.jsx` dan `Complaints.jsx` untuk mengurangi beban query backend saat pengetikan cepat.
3. **Pesan Kesalahan Bisnis:** Pada blok `catch` pemanggilan API (seperti penolakan feedback pada tiket yang belum berstatus `answered`), baca pesan error dari backend melalui `error.response?.data?.message` sebelum menampilkan teks fallback umum:
   ```javascript
   const errorMsg = error.response?.data?.message || 'Terjadi kesalahan sistem.'
   ```

