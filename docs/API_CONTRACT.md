# Kontrak API SuaraLens (API Contract Specification)

**Versi:** 1.0.0  
**Tujuan Dokumen:** Menetapkan kontrak antarmuka API antara Frontend (React + Vite) dan Backend (PHP CodeIgniter 4) serta komunikasi internal ke ML Service (FastAPI).  
**Aturan Utama:** Dilarang mengubah nama field, struktur envelope, tipe data, maupun status code yang telah digunakan oleh frontend.

---

## 1. Konvensi Umum API

### 1.1. Base URL
- Lingkungan Pengembangan Lokal (Backend): `http://localhost:8090/api`
- Melalui Vite Reverse Proxy (Frontend): `/api`
- Internal Docker Network: `http://backend:8090/api`
- Layanan ML Service Internal: `http://ml-service:8000` (atau `http://127.0.0.1:8000` lokal)

### 1.2. Format Header & Autentikasi
- Format Data: `Content-Type: application/json`
- Accept Header: `Accept: application/json`
- Header Autentikasi: `Authorization: Bearer <API_TOKEN>`
- Pengiriman file/lampiran: `multipart/form-data`

### 1.3. Struktur Standar Respon (Response Envelope)
Respon sukses:
```json
{
  "status": true,
  "message": "Pesan deskriptif operasi.",
  "data": { ... }
}
```
Respon error:
```json
{
  "status": false,
  "message": "Pesan error yang aman untuk pengguna.",
  "errors": { "field_name": "Keterangan kesalahan validasi" }
}
```

---

## 2. Modul Autentikasi (`/api/auth`)

### 2.1. Login Pengguna / Stakeholder / Admin
- **Endpoint:** `POST /api/auth/login`
- **Akses:** Publik
- **Request Body:**
  ```json
  {
    "email": "user@student.pens.ac.id",
    "password": "PasswordRahasia123!"
  }
  ```
- **Respon Sukses (`200 OK`):**
  ```json
  {
    "status": true,
    "message": "Login berhasil.",
    "token": "sl_tok_672b1234567890abcdef...",
    "user": {
      "id": 1,
      "name": "Budi Santoso",
      "email": "user@student.pens.ac.id",
      "role": "user",
      "user_role": "Mahasiswa",
      "institution": "PENS",
      "unit": null
    }
  }
  ```
- **Respon Gagal (`401 Unauthorized` / `400 Bad Request`):**
  ```json
  {
    "status": false,
    "message": "Email atau password salah."
  }
  ```

### 2.2. Registrasi Mahasiswa / Sivitas Umum
- **Endpoint:** `POST /api/auth/register/user`
- **Akses:** Publik
- **Request Body:**
  ```json
  {
    "name": "Budi Santoso",
    "email": "budi@student.pens.ac.id",
    "password": "PasswordAman123!",
    "nim_nip": "3324600001",
    "phone": "081234567890",
    "user_role": "Mahasiswa",
    "institution": "PENS"
  }
  ```
- **Respon Sukses (`201 Created`):**
  ```json
  {
    "status": true,
    "message": "Registrasi berhasil.",
    "token": "sl_tok_...",
    "user": {
      "id": 1,
      "name": "Budi Santoso",
      "email": "budi@student.pens.ac.id",
      "role": "user",
      "user_role": "Mahasiswa",
      "institution": "PENS"
    }
  }
  ```

### 2.3. Registrasi Stakeholder / Unit Kerja
- **Endpoint:** `POST /api/auth/register/stakeholder`
- **Akses:** Publik
- **Request Body:**
  ```json
  {
    "name": "Ir. Bambang S., M.T.",
    "email": "bambang@pens.ac.id",
    "password": "PasswordUnit2026!",
    "position": "Kepala Unit",
    "institution": "PENS",
    "unit": "Sarana Prasarana dan Layanan Umum"
  }
  ```
- **Respon Sukses (`201 Created`):**
  ```json
  {
    "status": true,
    "message": "Registrasi stakeholder berhasil.",
    "token": "sl_tok_...",
    "user": {
      "id": 2,
      "name": "Ir. Bambang S., M.T.",
      "email": "bambang@pens.ac.id",
      "role": "stakeholder",
      "position": "Kepala Unit",
      "unit": "Sarana Prasarana dan Layanan Umum"
    }
  }
  ```

### 2.4. Logout
- **Endpoint:** `POST /api/auth/logout`
- **Akses:** Wajib Bearer Token (`user`, `stakeholder`, `admin`)
- **Respon Sukses (`200 OK`):**
  ```json
  {
    "status": true,
    "message": "Logout berhasil."
  }
  ```

---

## 3. Modul Pengaduan & Aspirasi (`/api/complaints`)

### 3.1. Daftar Pengaduan Publik / Unit
- **Endpoint:** `GET /api/complaints`
- **Akses:** `stakeholder`, `admin`
- **Query Parameters:**
  - `page` (int, default: 1)
  - `limit` (int, default: 10, max: 100)
  - `status` (string, filter status: `received`, `verified`, `dispatched`, `in_progress`, `action_taken`, `answered`, `resolved`)
  - `type` (string, filter tipe: `complaint`, `feedback`, `suggestion`)
  - `unit` (string, filter nama unit)
  - `search` (string, pencarian tiket atau teks)
- **Respon Sukses (`200 OK`):**
  ```json
  {
    "status": true,
    "items": [
      {
        "id": 101,
        "ticket_id": "SL-20261107142010A1B2",
        "type": "complaint",
        "category": "Sarana Prasarana dan Layanan Umum",
        "description": "AC Ruang D4 Lt. 2 bocor dan berisik saat kuliah.",
        "unit": "Sarana Prasarana dan Layanan Umum",
        "target_unit": "Sarana Prasarana dan Layanan Umum",
        "is_anonymous": true,
        "sender_name": null,
        "sender_role": "Mahasiswa",
        "status": "dispatched",
        "urgency_score": 7.5,
        "nlp_category": "Sarana Prasarana dan Layanan Umum",
        "nlp_confidence": 0.92,
        "sentiment": "negative",
        "created_at": "2026-11-07T14:20:10+07:00",
        "updated_at": "2026-11-07T14:35:00+07:00"
      }
    ],
    "total": 45,
    "page": 1,
    "limit": 10
  }
  ```

### 3.2. Pengaduan Saya (User Logged In)
- **Endpoint:** `GET /api/complaints/my`
- **Akses:** `user`, `stakeholder`, `admin`
- **Respon Sukses (`200 OK`):** Mengembalikan array objek keluhan milik user bersangkutan (tanpa envelope `total/page` untuk kompatibilitas frontend).

### 3.3. Detail Pengaduan
- **Endpoint:** `GET /api/complaints/{id}`
- **Akses:** Pemilik tiket (`user`), atau `stakeholder` (unit terkait), atau `admin`.
- **Respon Sukses (`200 OK`):**
  ```json
  {
    "id": 101,
    "ticket_id": "SL-20261107142010A1B2",
    "type": "complaint",
    "category": "Sarana Prasarana dan Layanan Umum",
    "description": "AC Ruang D4 Lt. 2 bocor dan berisik saat kuliah.",
    "unit": "Sarana Prasarana dan Layanan Umum",
    "target_unit": "Sarana Prasarana dan Layanan Umum",
    "status": "dispatched",
    "urgency_score": 7.5,
    "nlp_category": "Sarana Prasarana dan Layanan Umum",
    "nlp_confidence": 0.92,
    "sentiment": "negative",
    "is_anonymous": true,
    "sender_name": null,
    "sender_role": "Mahasiswa",
    "attachments": [],
    "verification": {
      "verified_by": "Admin Sentral PENS",
      "verified_at": "2026-11-07T14:25:00+07:00",
      "note": "Aduan valid dan telah diperiksa.",
      "approved": true
    },
    "disposition": {
      "target_unit": "Sarana Prasarana dan Layanan Umum",
      "assigned_pic": "Koordinator Sarpras",
      "disposition_note": "Segera periksa teknisi AC lantai 2.",
      "disposition_by": "Admin Sentral PENS",
      "disposition_at": "2026-11-07T14:35:00+07:00",
      "target_sla_date": "2026-11-10T14:35:00+07:00"
    },
    "followups": [
      {
        "id": 1,
        "by": "Teknisi Sarpras",
        "action_type": "investigation",
        "note": "Pengecekan freon dan pipa buang AC.",
        "status": "process",
        "created_at": "2026-11-07T15:00:00+07:00"
      }
    ],
    "unit_answer": null,
    "feedback": null,
    "created_at": "2026-11-07T14:20:10+07:00",
    "updated_at": "2026-11-07T15:00:00+07:00"
  }
  ```

### 3.4. Pembuatan Pengaduan Baru
- **Endpoint:** `POST /api/complaints`
- **Akses:** `user`, `stakeholder`, `admin`
- **Format:** `application/json` atau `multipart/form-data`
- **Payload Input:**
  ```json
  {
    "type": "complaint",
    "category": "facility",
    "description": "Proyektor di lab elektronika mati total saat praktikum berlangsung.",
    "unit": "Laboratorium/Jurusan",
    "is_anonymous": true
  }
  ```
- **Respon Sukses (`201 Created`):**
  ```json
  {
    "status": true,
    "message": "Pengaduan berhasil dibuat dan dianalisis.",
    "id": 102,
    "ticket_id": "SL-20261107153012C3D4",
    "data": {
      "complaint_id": 102,
      "analysis_id": 102,
      "review_id": null,
      "ticket_id": "SL-20261107153012C3D4",
      "status": "submitted",
      "category": "Laboratorium/Jurusan",
      "category_confidence": 0.94,
      "urgency_label": "Tinggi",
      "urgency_score": 0.82,
      "sentiment": "negative",
      "sentiment_score": 0.88,
      "inference_time_ms": 320
    }
  }
  ```

---

## 4. Modul Alur Kerja & Disposisi Admin / Unit

### 4.1. Verifikasi Admin
- **Endpoint:** `PATCH /api/admin/complaints/{id}/verify` (atau `PATCH /api/complaints/{id}/verify`)
- **Akses:** `admin`, `stakeholder`
- **Request Body:**
  ```json
  {
    "verified": true,
    "note": "Aduan valid sesuai ketentuan layanan PENS."
  }
  ```
- **Respon Sukses (`200 OK`):**
  ```json
  {
    "status": true,
    "message": "Aduan berhasil diverifikasi.",
    "complaint": {
      "id": 102,
      "status": "verified",
      "verification": {
        "verified_by": "Admin Sentral PENS",
        "verified_at": "2026-11-07T15:35:00+07:00",
        "note": "Aduan valid sesuai ketentuan layanan PENS."
      }
    }
  }
  ```

### 4.2. Disposisi ke Unit Kerja
- **Endpoint:** `POST /api/admin/complaints/{id}/disposition` (atau `POST /api/complaints/{id}/disposition`)
- **Akses:** `admin`
- **Request Body:**
  ```json
  {
    "target_unit": "Laboratorium/Jurusan",
    "assigned_pic": "Pak Hendra Lab Kalibrasi",
    "disposition_note": "Segera kalibrasi kabel osiloskop meja 4.",
    "target_sla_date": "2026-11-10T17:00:00+07:00"
  }
  ```
- **Respon Sukses (`200 OK`):**
  ```json
  {
    "status": true,
    "message": "Aduan berhasil didisposisikan ke unit.",
    "complaint": {
      "id": 102,
      "status": "dispatched",
      "target_unit": "Laboratorium/Jurusan",
      "unit": "Laboratorium/Jurusan",
      "disposition": {
        "target_unit": "Laboratorium/Jurusan",
        "assigned_pic": "Pak Hendra Lab Kalibrasi",
        "disposition_note": "Segera kalibrasi kabel osiloskop meja 4.",
        "disposition_by": "Admin Sentral PENS",
        "disposition_at": "2026-11-07T15:40:00+07:00",
        "target_sla_date": "2026-11-10T17:00:00+07:00"
      }
    }
  }
  ```

### 4.3. Penerimaan Tugas oleh Unit Kerja
- **Endpoint:** `POST /api/unit/complaints/{id}/accept`
- **Akses:** `stakeholder`, `admin`
- **Request Body:**
  ```json
  {
    "pic_name": "Hendra Teknisi",
    "note": "Disposisi diterima, teknisi sedang menuju lokasi lab."
  }
  ```
- **Respon Sukses (`200 OK`):**
  ```json
  {
    "status": true,
    "message": "Disposisi berhasil diterima dan status diperbarui ke Diproses.",
    "data": { "id": 102, "status": "in_progress" }
  }
  ```

### 4.4. Tindak Lanjut Teknis Unit
- **Endpoint:** `POST /api/unit/complaints/{id}/followup`
- **Akses:** `stakeholder`, `admin`
- **Request Body:**
  ```json
  {
    "action_type": "maintenance",
    "note": "Kabel osiloskop telah diganti dengan part baru dan diuji akurasinya.",
    "performed_by": "Tim Lab Elektro",
    "evidence_url": null
  }
  ```
- **Respon Sukses (`200 OK`):**
  ```json
  {
    "status": true,
    "message": "Tindak lanjut berhasil dicatat dan status diperbarui ke Ditindaklanjuti.",
    "data": { "id": 102, "status": "action_taken" }
  }
  ```

### 4.5. Jawaban Resmi Unit
- **Endpoint:** `POST /api/unit/complaints/{id}/answer`
- **Akses:** `stakeholder`, `admin`
- **Request Body:**
  ```json
  {
    "answer": "Perbaikan alat praktikum selesai. Mahasiswa dapat menggunakannya kembali di sesi praktikum besok.",
    "answered_by": "Kepala Lab Sistem Elektronika",
    "attachments": []
  }
  ```
- **Respon Sukses (`200 OK`):**
  ```json
  {
    "status": true,
    "message": "Jawaban resmi unit berhasil diterbitkan.",
    "data": { "id": 102, "status": "answered" }
  }
  ```

### 4.6. Feedback Pengguna / Stakeholder
- **Endpoint:** `POST /api/complaints/{id}/feedback`
- **Akses:** `user` (pemilik), `stakeholder`, `admin`
- **Request Body:**
  ```json
  {
    "rating": 5,
    "aspect_speed": 5,
    "aspect_clarity": 5,
    "aspect_solution": 5,
    "comment": "Respon sangat cepat dan alat berfungsi kembali."
  }
  ```
- **Respon Sukses (`200 OK`):**
  ```json
  {
    "status": true,
    "message": "Feedback kepuasan berhasil disimpan dan tiket selesai.",
    "complaint": {
      "id": 102,
      "status": "resolved",
      "feedback": {
        "rating": 5,
        "aspect_speed": 5,
        "aspect_clarity": 5,
        "aspect_solution": 5,
        "comment": "Respon sangat cepat dan alat berfungsi kembali.",
        "submitted_at": "2026-11-07T16:00:00+07:00"
      }
    }
  }
  ```

---

## 5. Modul Statistik & Analitik (`/api/analytics`, `/api/unit/stats`)

### 5.1. Statistik Dashboard Unit
- **Endpoint:** `GET /api/unit/stats?unit={nama_unit}`
- **Akses:** `stakeholder`, `admin`
- **Respon Sukses (`200 OK`):**
  ```json
  {
    "unitName": "Sarana Prasarana dan Layanan Umum",
    "total": 68,
    "dispatched": 5,
    "inProgress": 11,
    "actionTaken": 8,
    "answered": 7,
    "resolved": 32,
    "activePending": 24,
    "avgRating": 4.8,
    "feedbackCount": 28,
    "slaComplianceRate": 95.6,
    "avgResolutionDays": 1.6,
    "items": [ ... ]
  }
  ```

### 5.2. Ringkasan Eksekutif AI (Grounded AI Summary)
- **Endpoint:** `GET /api/analytics/ai-summary`
- **Akses:** `stakeholder`, `admin`
- **Respon Sukses (`200 OK`):**
  ```json
  {
    "status": true,
    "data": {
      "summary": "Dalam periode ini, terdapat 247 aduan masuk dengan tingkat kepatuhan SLA 78%. Sarana Prasarana dan Layanan Umum mencatat beban tertinggi (89 tiket)...",
      "grounding": {
        "numbers_in_summary": ["247", "78%", "89", "34%", "8"],
        "grounding_note": "Semua angka dalam ringkasan terverifikasi 100% dari data agregat. ✓"
      },
      "model_used": "qwen3.5:4b",
      "generated_at": "2026-11-07T15:00:00+07:00",
      "is_fallback": false
    }
  }
  ```

### 5.3. Metrik Analitik Lainnya
- `GET /api/analytics/summary`: Ringkasan metrik total, tren bulanan, sentimen negatif %, dan tiket urgensi tinggi.
- `GET /api/analytics/trend?period=daily|weekly|monthly`: Volume pengaduan sepanjang waktu.
- `GET /api/analytics/distribution`: Distribusi pengaduan berdasarkan peran pengirim (`Mahasiswa`, `Dosen`, dll).
- `GET /api/analytics/sentiment`: Distribusi persentase sentimen (`Negatif`, `Netral`, `Positif`).
- `GET /api/analytics/issues`: Top 5 kategori keluhan terbanyak.
- `GET /api/analytics/sla`: Tingkat kepatuhan SLA (`compliant`, `non_compliant`, `compliant_pct`, `breach_pct`).
- `GET /api/analytics/units`: Distribusi jumlah tiket per unit kerja PENS.
- `GET /api/analytics/urgent`: Top 10 pengaduan dengan skor urgensi tertinggi yang masih berstatus pending.
- `GET /api/analytics/weekly?days=7|30|90|180`: Snapshot analitik berkala dari data lake.

---

## 6. Kontrak Internal ML Service (`FastAPI`)

### 6.1. Endpoint Analisis Pengaduan
- **Endpoint:** `POST http://ml-service:8000/analyze`
- **Request Body:**
  ```json
  {
    "complaint_id": 0,
    "text": "Teks mentah keluhan dari pengguna.",
    "submission_type": "complaint"
  }
  ```
- **Respon Sukses (`200 OK`):**
  ```json
  {
    "status": true,
    "data": {
      "redacted_text": "Teks yang sudah dibersihkan dari PII seperti <NIM>, <TELEPON>.",
      "category": "TIK/Sistem Informasi",
      "category_confidence": 0.94,
      "target_unit": "TIK/Sistem Informasi",
      "urgency_label": "High",
      "urgency_score": 0.85,
      "urgency_reason": "Gangguan jaringan meluas mempengaruhi ujian praktikum.",
      "sentiment": "negative",
      "sentiment_score": 0.91,
      "sentiment_scores": {
        "negative": 0.91,
        "neutral": 0.07,
        "positive": 0.02
      },
      "submission_type": "complaint",
      "requires_review": true,
      "is_fallback": false,
      "model_version": "qwen3.5:4b + indonesian-roberta"
    }
  }
  ```

### 6.2. Endpoint Ringkasan Eksekutif AI
- **Endpoint:** `POST http://ml-service:8000/summary`
- **Request Body:**
  ```json
  {
    "metrics": {
      "total_records": 150,
      "overall_compliant_pct": 92.5,
      "overall_breach_pct": 7.5,
      "top_units": [...],
      "top_categories": [...],
      "sentiment": { "negative_pct": 28.5, "neutral_pct": 51.5, "positive_pct": 20.0 },
      "high_urgency_pending": 4
    },
    "context": "Laporan Eksekutif Bulanan SuaraLens PENS"
  }
  ```
- **Respon Sukses (`200 OK`):**
  ```json
  {
    "status": true,
    "data": {
      "summary": "Ringkasan grounded berdasar angka metrics...",
      "grounding": { "numbers_in_summary": [...], "grounding_note": "..." },
      "model_used": "qwen3.5:4b",
      "is_fallback": false
    }
  }
  ```

