# PRODUCTION CHECKLIST — SUARALENS DEPLOYMENT

Checklist kesiapan produksi aplikasi **SuaraLens** sebelum rilis ke pengguna akhir (*Go-Live Checklist*).

---

## 1. Konfigurasi Lingkungan & Variabel Rahasia (Secrets)

- [x] **Tidak Ada Kredensial Hardcoded:** Kredensial database, JWT secret, dan API key dipisahkan ke variabel lingkungan `.env`.
- [x] **File `.gitignore` Lengkap:** Memastikan `.env`, `node_modules`, `vendor/`, `__pycache__`, dan direktori upload tidak ter-commit ke Git.
- [ ] **Ubah JWT_SECRET_KEY:** Ganti nilai default `JWT_SECRET_KEY` pada produksi dengan string acak dengan entropi tinggi (minimal 64 karakter heksadesimal).
- [ ] **Mode CI_ENVIRONMENT:** Pastikan backend berjalan pada mode `CI_ENVIRONMENT=production` agar stack trace error tidak bocor ke publik.
- [ ] **Display Errors Nonaktif:** Parameter `display_errors` pada `php.ini` dinonaktifkan di container produksi.

---

## 2. Keamanan & Akses Jaringan (Security Hardening)

- [x] **Proteksi IDOR:** Validasi kepemilikan pengaduan (`user_id` untuk mahasiswa, `unit_id` untuk unit kerja) aktif pada seluruh endpoint percakapan dan riwayat analisis.
- [x] **RBAC Multi-Role:** Akses dibatasi secara ketat untuk peran `mahasiswa`, `unit`, `admin`, dan `pimpinan`.
- [x] **SQL Injection Defense:** Seluruh query menggunakan parameter binding CodeIgniter 4 / PDO.
- [x] **Validasi Upload Berkas:** Whitelist MIME type (`image/jpeg`, `image/png`, `application/pdf`) dan batas ukuran berkas maksimum 5 MB.
- [x] **Anonimisasi PII:** Model NER / Presidio / Regex menyensor nomor kontak, email, dan NIM dari teks aduan.
- [ ] **HTTPS / TLS Enforced:** Seluruh lalu lintas HTTP dialihkan secara otomatis ke HTTPS melalui reverse proxy / Cloudflare / Railway domain.
- [ ] **CORS Production Whitelist:** Header CORS backend dibatasi hanya ke domain frontend produksi (bukan `*`).

---

## 3. Database & Integritas Data (PostgreSQL)

- [x] **Migrasi Lengkap:** Seluruh 11 migrasi (Batch 1-10) telah diaplikasikan tanpa error.
- [x] **Relasi Foreign Key & Index:** Relasi kunci asing dan indeks query utama telah terpasang.
- [x] **Audit Trail & Immutability:** Riwayat analisis ML tersimpan secara *append-only* di tabel `complaint_analysis`.
- [ ] **Automated Backup Strategy:** Mengonfigurasi snapshot harian atau dump otomatis PostgreSQL (`pg_dump`) ke penyimpanan terpisah (S3 / R2).
- [ ] **Connection Pooling:** Memastikan konfigurasi koneksi database Railway / Cloud cukup untuk menangani lonjakan koneksi pengguna.

---

## 4. Layanan Machine Learning (ML Service & Ollama)

- [x] **Port Dinamis Uvicorn:** Dockerfile dikonfigurasi dengan `exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}` untuk kompatibilitas Railway.
- [x] **Dynamic Healthcheck:** Docker healthcheck memeriksa endpoint `GET /health` sesuai port dinamis container.
- [x] **Offline Resiliency Fallback:** Jika LLM atau koneksi HuggingFace offline, ML Service beralih ke rule-based sentiment & category fallback tanpa membuat aplikasi backend crash.
- [ ] **Model Ollama Ready:** Pastikan server host LLM telah mengunduh model `qwen3.5:4b` dan memiliki alokasi VRAM/RAM yang memadai (minimal 4GB RAM bebas).

---

## 5. Frontend & UI/UX

- [x] **Production Bundle Build:** Vite build berhasil mengompilasi bundel statis tanpa error (`dist/`).
- [x] **ESLint Validated:** Tidak ada syntax error atau blocker pada codebase frontend.
- [x] **Client-Side Routing Rewrite:** Konfigurasi `vercel.json` rewrite rule diterapkan untuk mencegah error 404 saat merefresh halaman selain root.
- [ ] **Environment Variable Frontend:** `VITE_API_URL` telah diarahkan ke domain publik backend produksi.

---

## 6. Lembar Persetujuan Rilis (Sign-off)

| Kriteria | Status Evaluasi | Catatan |
|---|:---:|---|
| Pengujian Unit Backend (92 Tests) | **PASSED (100%)** | Semua logika SLA, RBAC, dan audit trail valid |
| Pengujian ML Service (26 Tests) | **PASSED (100%)** | NLP, PII anonymization, dan fallback lolos |
| Build & Lint Frontend | **PASSED** | 0 errors |
| Keamanan Data & IDOR | **VERIFIED** | Bebas celah IDOR pada pengaduan |
| Kesiapan Deployment | **READY FOR STAGING / DEMO** | Siap ditinjau oleh pimpinan proyek |

