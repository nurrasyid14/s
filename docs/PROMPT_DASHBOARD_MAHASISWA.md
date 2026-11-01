# Prompt: Dashboard Transparansi untuk Mahasiswa

> Salin seluruh isi dokumen ini ke AI coding agent yang bekerja di repository SuaraLens.
> Bagian **Pertanyaan Terbuka** di akhir wajib dikonfirmasi ke pemilik proyek sebelum implementasi final.

---

## 1. Peran dan tujuan

Kamu adalah senior full-stack engineer yang bekerja pada repository **SuaraLens** (CodeIgniter 4 + React/Vite + MySQL). Tugasmu: menambahkan **dashboard khusus mahasiswa** yang menampilkan ringkasan aduan kampus secara agregat dan transparan.

Dashboard harus menjawab empat pertanyaan:

1. **Berapa banyak laporan** yang masuk.
2. **Berapa banyak laporan di setiap tahapan, per divisi/unit**.
3. **Bagaimana distribusi laporan per divisi/unit**.
4. **Bagaimana kinerja setiap divisi/unit**.

Dashboard ini bersifat **read-only**, **agregat**, dan **tidak boleh menampilkan data pribadi** (nama pelapor, NIM, isi aduan, nomor tiket, atau identitas apa pun).

---

## 2. Konteks teknis repository

- Backend: CodeIgniter 4, route di `backend/app/Config/Routes.php`, controller di `backend/app/Controllers/`, model di `backend/app/Models/`.
- Frontend: React 19 + Vite + React Router + Tailwind CSS 4 + Recharts + i18next.
- Autentikasi: token Bearer, filter `authRole` (`user`, `stakeholder`, `admin`).
- Role mahasiswa di aplikasi adalah **`user`**.
- Halaman mahasiswa saat ini:
  - `/user/submit` → `frontend/src/pages/user/ComplaintForm.jsx`
  - `/user/complaints` → `frontend/src/pages/user/MyComplaints.jsx`
  - `/user/complaints/:id` → `frontend/src/pages/user/ComplaintTracking.jsx`
  - `/user/dashboard` saat ini **juga** diarahkan ke `MyComplaints` (lihat `frontend/src/App.jsx`).
- Layout mahasiswa memakai `Navbar` dengan `variant="user"` (bukan sidebar).
- Tema memakai CSS variable di `frontend/src/index.css` (`--color-*`), mendukung light/dark mode.
- Grafik memakai `recharts`; util tema ada di `frontend/src/utils/chartTheme.js`.
- i18n ada di `frontend/src/locales/id.js` dan `frontend/src/locales/en.js`.

### Skema data yang benar-benar tersedia

Tabel utama: `complaints`, `complaint_analysis`, `complaint_replies`, `complaint_reviews`, `users`, `api_tokens`.

Kolom penting pada `complaints`:
`id`, `ticket_id`, `user_id`, `type`, `description`, `is_anonymous`, `status`, `assigned_unit`, `created_at`, `updated_at`.

Catatan penting:

- `assigned_unit` bertipe string dan berisi nama unit (contoh: `Akademik`, `TIK/Sistem Informasi`).
- **Tidak ada tabel riwayat status** dan **tidak ada tabel feedback/SLA events** yang aktif. File migration `006_CreateFollowUps.php`, `007_CreateSLAEvents.php`, `008_CreateFeedback.php`, dan model terkait masih berupa stub kosong.
- Rating kepuasan saat ini hanya ditulis sebagai teks di `complaint_replies` dengan format `[Feedback Stakeholder] Rating: X/5`.
- Daftar 14 unit dan `slaDays` saat ini hanya ada di `frontend/src/data/units.js`.
- Status yang mungkin muncul: `submitted`, `received`, `verified`, `dispatched`, `in_progress`, `process`, `action_taken`, `answered`, `resolved`, `done`, `escalated`, `escalate`, `rejected`.

**Jangan mengarang metrik.** Jangan menyalin nilai hardcoded seperti `avgRating = 4.8` atau `avgResolutionDays = 2.0` yang ada di `DashboardController::unitStats`. Semua angka harus dihitung dari database.

---

## 3. Keputusan definisi (asumsi awal — konfirmasi dulu)

### 3.1 Cakupan data
Dashboard menampilkan **agregat seluruh kampus**, bukan hanya aduan milik mahasiswa yang login. Ringkasan pribadi boleh ditambahkan sebagai kartu kecil jika tidak mengganggu fokus, tetapi bukan keharusan.

### 3.2 Arti "setiap tahapan per divisi"
Karena belum ada tabel riwayat status, tampilkan **snapshot status saat ini** per divisi:

| Bucket tampilan | Status database |
|---|---|
| Baru | `submitted`, `received` |
| Terverifikasi | `verified` |
| Didisposisikan | `dispatched` |
| Diproses | `in_progress`, `process` |
| Ditindaklanjuti | `action_taken` |
| Dijawab | `answered` |
| Selesai | `resolved`, `done` |
| Ditolak | `rejected` |
| Eskalasi (opsional) | `escalated`, `escalate` |

Jika pemilik proyek menginginkan **funnel kumulatif** (berapa laporan pernah melewati setiap tahap), maka perlu tabel riwayat status baru dan pencatatan transisi di `ComplaintController`. Jangan diam-diam menganggap snapshot sama dengan funnel.

### 3.3 Metrik kinerja divisi
Hitung dari data yang tersedia:

- `total`: seluruh aduan unit pada periode.
- `active` / backlog: status Baru + Terverifikasi + Didisposisikan + Diproses + Ditindaklanjuti.
- `completed`: status Dijawab + Selesai.
- `rejected`: status Ditolak.
- `completion_rate`: `completed / total * 100` (0 jika total 0).
- `avg_resolution_days`: rata-rata `(updated_at - created_at)` dalam hari untuk aduan berstatus Dijawab/Selesai; `null` jika tidak ada.
- `sla_days`: dari konfigurasi unit.
- `sla_compliance_rate`: persentase aduan selesai dengan durasi ≤ `sla_days`; `null` jika tidak ada aduan selesai.
- **Jangan** menampilkan rating kepuasan kecuali pemilik proyek menyetujui penambahan tabel feedback yang proper.

### 3.4 Periode
Sediakan filter periode: **7 hari, 30 hari, 90 hari, dan semua data**. Default 30 hari. Filter memakai `complaints.created_at`.

### 3.5 Privasi
Payload API hanya berisi agregat. Dilarang mengirim `user_id`, `ticket_id`, `description`, nama pelapor, atau data mentah lainnya. Untuk sel agregat yang sangat kecil, pertimbangkan masking opsional (mis. tampilkan `<3`) — konfirmasi dulu.

---

## 4. Backend yang harus dibuat

### 4.1 Route baru

Tambahkan di `backend/app/Config/Routes.php`:

```php
$routes->get('dashboard/student', 'DashboardController::studentOverview', [
    'filter' => 'authRole:user,stakeholder,admin',
]);
```

Endpoint: `GET /api/dashboard/student?days=7|30|90|all`

- `days` default `30`.
- Validasi nilai; kembalikan `400` untuk nilai lain.
- Wajib autentikasi; mahasiswa (`user`) boleh mengakses.
- Jangan mengubah atau merusak endpoint analitik yang sudah ada.

### 4.2 Implementasi controller

Tambahkan method `studentOverview()` pada `backend/app/Controllers/DashboardController.php` (atau controller baru yang jelas, tetapi jangan duplikasi logika yang ada).

Gunakan query agregasi SQL yang efisien. Hindari mengambil seluruh baris lalu menghitung di PHP jika bisa dilakukan di database. Jika tetap memakai PHP, jelaskan alasannya dan pastikan aman untuk data besar.

### 4.3 Bentuk response

```json
{
  "status": true,
  "data": {
    "generated_at": "2026-11-01T20:00:00+07:00",
    "period": {
      "days": 30,
      "start_at": "2026-10-02T00:00:00+07:00",
      "end_at": "2026-11-01T23:59:59+07:00"
    },
    "totals": {
      "total": 120,
      "active": 34,
      "completed": 80,
      "rejected": 6,
      "completion_rate": 66.7
    },
    "stages": [
      { "key": "new", "label": { "id": "Baru", "en": "New" }, "count": 12 }
    ],
    "units": [
      {
        "unit": "Akademik",
        "code": "AKD",
        "total": 30,
        "active": 12,
        "completed": 14,
        "rejected": 4,
        "completion_rate": 46.7,
        "avg_resolution_days": 2.4,
        "sla_days": 3,
        "sla_compliance_rate": 85.7,
        "stages": {
          "new": 2,
          "verified": 3,
          "dispatched": 2,
          "in_progress": 3,
          "action_taken": 2,
          "answered": 4,
          "resolved": 10,
          "rejected": 4,
          "escalated": 0
        }
      }
    ]
  }
}
```

Ketentuan:

- `units` harus selalu berisi **14 unit resmi**, termasuk unit dengan count 0.
- Nama dan urutan unit mengikuti `frontend/src/data/units.js`.
- Sediakan konfigurasi backend untuk daftar unit + `sla_days` (mis. `backend/app/Config/Units.php`) agar tidak duplikasi tersebar.
- `totals` adalah agregat seluruh unit, termasuk aduan yang belum memiliki `assigned_unit` (bucket `Belum ditugaskan`) — tampilkan sebagai entri terpisah di akhir daftar, bukan bagian dari 14 unit resmi.
- Semua angka numerik harus konsisten (jumlah bucket = total).
- Tanggal memakai format ISO 8601.

### 4.4 Keamanan dan kualitas

- Gunakan query builder / binding; jangan interpolasi input user ke SQL.
- Terapkan filter role dengan benar; pastikan `user` tidak bisa mengakses endpoint analytics yang memang khusus stakeholder/admin.
- Tangani database kosong tanpa error (semua count 0).
- Jangan mengembalikan data pribadi.
- Tambahkan komentar singkat pada logika normalisasi status yang tidak jelas.

---

## 5. Frontend yang harus dibuat

### 5.1 Halaman baru

Buat `frontend/src/pages/user/UserDashboard.jsx`.

Gunakan:

- `Navbar` dengan `variant="user"`.
- Container responsif `max-w-7xl mx-auto px-4 sm:px-6 py-8`.
- Judul halaman, deskripsi singkat, dan filter periode.
- Tombol/tautan ke `Aduan Saya` (`/user/complaints`) dan `Ajukan Aduan` (`/user/submit`).

### 5.2 Service API

Buat `frontend/src/services/dashboardApi.js`:

```js
export async function getStudentDashboard(days = 30) { ... }
```

- Panggil `GET /api/dashboard/student?days=...`.
- Ikuti pola `frontend/src/services/analyticsApi.js` (axios instance, `USE_MOCK` bila ada).
- Kembalikan `data` atau `null` dengan aman.

### 5.3 Komponen dashboard

Susun dashboard dalam urutan berikut:

1. **KPI cards** (4 kartu):
   - Total laporan
   - Laporan aktif/berjalan
   - Laporan selesai
   - Tingkat penyelesaian (%)
2. **Distribusi laporan per divisi**
   - Horizontal bar chart (Recharts) karena ada 14 unit.
   - Tampilkan jumlah dan persentase pada tooltip.
3. **Tahapan per divisi**
   - Stacked horizontal bar chart atau matriks tabel.
   - Setiap segmen mewakili bucket status.
   - Harus tetap terbaca di layar kecil (tabel dengan scroll horizontal boleh).
4. **Kinerja divisi**
   - Tabel: unit, total, aktif, selesai, completion rate, rata-rata hari, SLA, status kepatuhan.
   - Beri indikator visual (mis. progress bar / badge) yang tetap aksesibel.
5. **Empty state** jika semua data 0.
6. **Error state** dengan tombol `Coba lagi`.
7. **Loading skeleton** yang menyerupai layout akhir.

### 5.4 Routing dan navigasi

- Ubah route di `frontend/src/App.jsx`:
  - `/user/dashboard` → `UserDashboard`
  - `/user/complaints` tetap → `MyComplaints`
- Pastikan tombol `Dashboard` di `Navbar` (desktop dan mobile) tetap mengarah ke `/user/dashboard`.
- Tambahkan akses ke `Aduan Saya` agar `MyComplaints` tidak “hilang” setelah route dashboard diganti. Minimal berupa link di header dashboard; idealnya juga di menu Navbar untuk role `user`.

### 5.5 Desain dan aksesibilitas

- Gunakan design token yang sudah ada (`--color-surface`, `--color-border`, `--color-text`, `--color-text-muted`, `--color-primary`, `--color-status-*`).
- Jangan menambahkan dependency baru.
- Semua chart harus punya label/aria yang jelas; jangan hanya mengandalkan warna.
- Pastikan tampilan light dan dark mode benar.
- Gunakan `font-mono` untuk angka metrik bila sesuai gaya yang ada.
- Format angka dan tanggal mengikuti utilitas yang sudah ada (`frontend/src/utils/formatter.js`).

### 5.6 i18n

Tambahkan key baru di `frontend/src/locales/id.js` dan `en.js` (namespace mis. `userDashboard`):

- judul & deskripsi
- label KPI
- label filter periode
- judul chart
- header tabel kinerja
- status bucket
- empty/error/loading text
- label tombol

Jangan hardcode teks Indonesia di JSX jika key i18n tersedia.

---

## 6. File yang diperkirakan berubah

Baru:

- `frontend/src/pages/user/UserDashboard.jsx`
- `frontend/src/services/dashboardApi.js`
- `backend/app/Config/Units.php` (jika dipakai untuk daftar unit + SLA)

Diubah:

- `backend/app/Controllers/DashboardController.php`
- `backend/app/Config/Routes.php`
- `frontend/src/App.jsx`
- `frontend/src/components/layout/Navbar.jsx` (hanya jika menambah link `Aduan Saya`)
- `frontend/src/locales/id.js`
- `frontend/src/locales/en.js`

Jangan menyentuh halaman stakeholder/admin lain kecuali benar-benar diperlukan.

---

## 7. Kriteria penerimaan

- [ ] Mahasiswa (`user`) dapat membuka `/user/dashboard` dan melihat data agregat.
- [ ] Total laporan, distribusi per divisi, tahapan per divisi, dan kinerja divisi tampil dan saling konsisten.
- [ ] `GET /api/dashboard/student?days=30` mengembalikan 14 unit (plus `Belum ditugaskan` bila ada) dan tidak membocorkan data pribadi.
- [ ] `days` tidak valid → HTTP 400.
- [ ] Tanpa token → HTTP 401; role yang tidak diizinkan tidak bisa mengakses endpoint analytics lama.
- [ ] Database kosong → dashboard menampilkan empty state, bukan error.
- [ ] Light/dark mode, mobile, dan desktop berfungsi.
- [ ] Tidak ada angka hardcoded; semua metrik berasal dari database.
- [ ] `npm run build` dan `npm run lint` berhasil (minimal tidak menambah error baru).
- [ ] `php -l` pada file PHP yang diubah berhasil.
- [ ] Tidak ada dependency baru.

---

## 8. Batasan / non-goals

- Jangan menambahkan fitur edit/hapus aduan dari dashboard mahasiswa.
- Jangan menampilkan detail tiket atau identitas pelapor.
- Jangan mengubah alur bisnis status yang sudah ada.
- Jangan membuat tabel feedback/SLA baru kecuali pemilik proyek menyetujuinya.
- Jangan melakukan refactor besar di luar ruang lingkup.
- Jangan mengubah data seed atau database secara permanen saat verifikasi.

---

## 9. Cara verifikasi

1. Jalankan backend di port 8090 dan frontend di port 5173.
2. Login sebagai mahasiswa (`budi@student.pens.ac.id` / `password123`).
3. Buka `/user/dashboard`.
4. Uji endpoint dengan `curl`/PowerShell untuk role `user`, `stakeholder`, dan `admin`.
5. Uji `days=7`, `30`, `90`, `all`, dan nilai invalid.
6. Uji dengan unit yang tidak memiliki aduan.
7. Jalankan `npm run build`.

---

## 10. Pertanyaan terbuka (wajib dikonfirmasi)

1. **Cakupan:** apakah dashboard menampilkan agregat seluruh kampus, hanya aduan milik mahasiswa yang login, atau gabungan keduanya?
2. **Tahapan:** cukup snapshot status saat ini, atau harus funnel kumulatif yang memerlukan tabel riwayat status baru?
3. **Kinerja:** apakah metrik yang disetujui cukup completion rate, backlog, rata-rata waktu selesai, dan SLA? Apakah rating kepuasan perlu ditambahkan (memerlukan tabel feedback baru)?
4. **Penempatan:** ganti `/user/dashboard` menjadi dashboard baru (riwayat pindah ke `/user/complaints`), atau buat route terpisah seperti `/user/insights`?
5. **Periode:** perlu filter 7/30/90/semua, atau cukup satu periode tetap?
