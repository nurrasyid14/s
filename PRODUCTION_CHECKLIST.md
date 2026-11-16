# PRODUCTION CHECKLIST — SUARALENS DEPLOYMENT

Checklist kesiapan deployment aplikasi **SuaraLens** sebelum rilis ke staging dan produksi (*Go-Live Verification*).

---

## 1. Konfigurasi Lingkungan & Variabel Rahasia (Secrets)

- [x] **Pemisahan Kredensial:** Seluruh kredensial sensitif dipisahkan ke `.env` dan tidak ada rahasia yang ter-commit ke Git.
- [x] **File Template `.env.example`:** Telah disinkronkan dengan port host `5433`, model `qwen3.5:4b`, dan dokumentasi alamat Ollama.
- [ ] **Ganti `JWT_SECRET_KEY` Produksi:** Pastikan nilai default `JWT_SECRET_KEY` pada platform hosting produksi menggunakan string acak minimal 64 karakter heksadesimal.
- [ ] **Mode Produksi Backend:** Setel `CI_ENVIRONMENT=production` di Railway agar pesan debug PHP tidak bocor ke publik.

---

## 2. Keamanan & Akses Kontrol (Security Hardening)

- [x] **Pencegahan IDOR Service-Layer:** Validasi kepemilikan aduan dilakukan di `ComplaintService::assertComplaintAccess()` untuk `reply`, `replies`, `reanalyze`, dan `analysis-history`.
- [x] **Matriks Otorisasi RBAC:** Pembatasan hak akses untuk `user`, `stakeholder`, dan `admin` telah diverifikasi lolos 100%.
- [x] **Default Deny:** Role asing / tidak dikenal secara otomatis diblokir dengan kode HTTP 403.
- [x] **Sanitasi SQL Injection:** Seluruh query menggunakan parameter binding PDO / CI4 Model.
- [x] **Validasi Upload Berkas:** Whitelist ekstensi `.jpg`, `.png`, `.pdf` dengan ukuran maksimal 5 MB.
- [x] **Anonimisasi PII:** Penyensoran otomatis nomor HP, email, dan NIM pada deskripsi aduan sebelum disimpan ke basis data.
- [ ] **Enforce HTTPS / TLS:** Memastikan seluruh lalu lintas HTTP diarahkan ke HTTPS melalui Cloudflare / Railway domain.

---

## 3. Resiliensi, Timeout & Layanan AI/ML

- [x] **Bounded Timeout Backend:** cURL MLService dibatasi 90 detik dengan 1 retry.
- [x] **Bounded Timeout ML Service:** Panggilan Ollama dibatasi connect timeout 3 detik dan total 90 detik dengan 2 retry.
- [x] **Heuristic Fallback:** Jika Ollama atau ML Service tidak dapat dijangkau, proses pembuatan pengaduan dan analisis ulang tetap berhasil dengan status fallback terdata.
- [x] **Port Dinamis Uvicorn:** Dockerfile ML Service mendukung environment variable `PORT` dari Railway.
- [x] **Healthcheck Dinamis:** Healthcheck Docker ML memeriksa endpoint `/health` sesuai port dinamis.
- [ ] **Alokasi RAM ML Service:** Container ML Service di Railway direkomendasikan dialokasikan minimal 1 GB - 2 GB RAM.
- [ ] **Model Ollama Aktif:** Pastikan server Ollama host/cloud telah selesai mengunduh model `qwen3.5:4b`.

---

## 4. Frontend & Antarmuka Pengguna

- [x] **Vite 6 Production Build:** Bundel statis React 19 terkompilasi dalam 5.14s (44 chunks, 0 errors).
- [x] **ESLint Check:** 0 errors (43 warnings allowed) dengan exit code 0.
- [x] **Client-Side Routing Rewrite:** Konfigurasi `vercel.json` rewrite rule diterapkan untuk mencegah error 404 saat merefresh halaman selain root.
- [ ] **Setel `VITE_API_URL`:** Arahkan environment variable frontend di Vercel ke domain API backend Railway publik.

---

## 5. Lembar Persetujuan Status Sistem

| Evaluasi | Status | Catatan Verifikasi |
|---|:---:|---|
| Backend Test Suite (125 Uji) | **100% PASS** | RBAC, IDOR, Token Auth, Transaksi DB, dan SLA lolos |
| ML Service Test Suite (26 Uji) | **100% PASS** | Sensor PII, Sentimen IndoRoBERTa, LLM fallback lolos |
| Frontend Build & Lint | **100% PASS** | React 19 SPA terkompilasi bersih |
| Konsistensi Skema Database | **100% PASS** | 11 migrasi (Batch 1–10) diaplikasikan |
| Status Kesiapan | **READY FOR STAGING / DEMO** | Siap dipresentasikan dan diuji di staging |
