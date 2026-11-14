# DEPLOYMENT GUIDE — SUARALENS APPLICATION

Panduan resmi langkah-langkah deployment aplikasi **SuaraLens** untuk lingkungan lokal (Docker Compose) dan lingkungan *cloud* (Railway & Vercel).

---

## 1. Topologi & Alur Deployment

```
[ Frontend: React / Vite ]  --> Deploy di VERCEL (Static Jamstack / SPA)
                                  │
                                  ▼ (VITE_API_URL: https://backend-production.up.railway.app)
[ Backend: CodeIgniter 4 ]  --> Deploy di RAILWAY (PHP / Apache Container)
                                  │
         ┌────────────────────────┴────────────────────────┐
         ▼                                                 ▼
[ Database: PostgreSQL 16 ] (Railway Managed DB)   [ ML Service: FastAPI ] (Railway Docker)
                                                           │
                                                           ▼ (OLLAMA_BASE_URL)
                                                   [ Ollama Host / VPS GPU ]
```

---

## 2. Deployment Lokal Menggunakan Docker Compose

### Prasyarat:
- Docker Desktop aktif.
- Port Host: `5173` (Frontend), `8090` (Backend), `8000` (ML Service), `5433` (PostgreSQL), `11434` (Ollama di Host).
- Model Ollama telah diunduh:
  ```powershell
  ollama pull qwen3.5:4b
  ```

### Langkah-langkah:
1. **Konfigurasi Environment `.env`:**
   Salin `.env.example` ke `.env` pada root direktori:
   ```powershell
   Copy-Item .env.example .env
   ```
   Pastikan variabel port database di host adalah `5433`:
   ```env
   DB_PORT=5432
   DB_HOST_PORT=5433
   DB_HOST=db
   DB_USER=suaralens_user
   DB_PASS=suaralens_password
   DB_NAME=suaralens_db
   ```

2. **Jalankan Layanan Menggunakan Docker Compose:**
   ```powershell
   docker compose up -d --build
   ```

3. **Jalankan Migrasi dan Seed Data:**
   ```powershell
   docker compose exec backend php spark migrate
   docker compose exec backend php spark db:seed DatabaseSeeder
   ```

4. **Akses Layanan:**
   - **Frontend:** `http://localhost:5173`
   - **Backend API:** `http://localhost:8090/api/health`
   - **ML Service:** `http://localhost:8000/health`
   - **Database:** `localhost:5433` (User: `suaralens_user`, Database: `suaralens_db`)

---

## 3. Deployment Backend & ML Service ke Railway

### A. Setup PostgreSQL di Railway
1. Buat project baru di [Railway Dashboard](https://railway.app).
2. Tambahkan resource **PostgreSQL**.
3. Salin connection string / variable (`DATABASE_URL`, `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`).

### B. Setup Backend CodeIgniter 4 di Railway
1. Hubungkan repository GitHub `zidanakmal24/suaralens`.
2. Set **Root Directory** ke `/backend`.
3. Set **Build Command** (jika menggunakan Nixpacks/PHP):
   ```bash
   composer install --no-dev --optimize-autoloader
   ```
4. Tambahkan **Environment Variables** di Railway:
   - `CI_ENVIRONMENT`: `production`
   - `app.baseURL`: `https://${{RAILWAY_PUBLIC_DOMAIN}}`
   - `database.default.hostname`: `${{Postgres.PGHOST}}`
   - `database.default.database`: `${{Postgres.PGDATABASE}}`
   - `database.default.username`: `${{Postgres.PGUSER}}`
   - `database.default.password`: `${{Postgres.PGPASSWORD}}`
   - `database.default.port`: `${{Postgres.PGPORT}}`
   - `database.default.DBDriver`: `Postgre`
   - `JWT_SECRET_KEY`: `<generate-random-secret-string>`
   - `ML_SERVICE_URL`: `https://${{ML-Service.RAILWAY_PUBLIC_DOMAIN}}`
5. Jalankan migrasi via Railway CLI atau One-off Command:
   ```bash
   php spark migrate --force
   ```

### C. Setup ML Service di Railway
1. Tambahkan service baru dari repository yang sama.
2. Set **Root Directory** ke `/ml-service`.
3. Railway akan mendeteksi `ml-service/Dockerfile`.
4. Tambahkan **Environment Variables** di Railway:
   - `PORT`: (Dikelola otomatis oleh Railway)
   - `OLLAMA_BASE_URL`: URL Ollama server publik atau endpoint GPU Anda.
   - `TRANSFORMERS_OFFLINE`: `0` (atau biarkan default untuk mengunduh bobot IndoRoBERTa saat startup).
5. Dockerfile SuaraLens telah diperbarui dengan:
   ```dockerfile
   CMD ["sh", "-c", "exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
   ```
   sehingga Uvicorn secara dinamis mengikat port yang ditentukan oleh Railway.

---

## 4. Deployment Frontend ke Vercel

### Langkah-langkah:
1. Buka [Vercel Dashboard](https://vercel.com) dan impor repository `zidanakmal24/suaralens`.
2. Konfigurasi proyek:
   - **Framework Preset:** `Vite`
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`
3. Tambahkan **Environment Variables** di Vercel:
   - `VITE_API_URL`: URL backend Railway Anda (contoh: `https://suaralens-backend.up.railway.app/api`)
4. Klik **Deploy**. Vercel akan mengompilasi bundel statis React SPA. File `vercel.json` di root repository telah mengonfigurasi SPA rewrite rule (`"rewrites": [{"source": "/(.*)", "destination": "/index.html"}]`) untuk navigasi routing client-side yang mulus.

---

## 5. Troubleshooting Masalah Deployment Umum

### 1. Port 5432 Sudah Digunakan di Windows Host
- **Penyebab:** Servis PostgreSQL lokal Windows sedang berjalan di port 5432.
- **Solusi:** Jangan mematikan servis lokal Windows. Konfigurasi `docker-compose.yml` telah dipetakan ke port host `5433` (`5433:5432`). Gunakan port 5433 untuk menghubungkan GUI database host (DBeaver/pgAdmin).

### 2. ML Service OOM (Out Of Memory) di Railway
- **Penyebab:** Container Railway tier gratis memiliki batas RAM 512MB - 1GB, sedangkan PyTorch dan IndoRoBERTa memerlukan ~800MB RAM.
- **Solusi:**
  - Tambahkan RAM limit minimum 1GB - 2GB pada Railway service setting.
  - Gunakan fallback regex & rule-based analyzer jika memory terbatas.

### 3. Koneksi ML Service ke Ollama Gagal
- **Penyebab:** `host.docker.internal` hanya berlaku di Docker desktop lokal, bukan di cloud Railway.
- **Solusi:** Di lingkungan Railway/Cloud, arahkan `OLLAMA_BASE_URL` ke alamat IP publik VPS GPU atau gunakan layanan API inferensi cloud yang kompatibel.

