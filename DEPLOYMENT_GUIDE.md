# DEPLOYMENT GUIDE — SUARALENS APPLICATION

Panduan komprehensif deployment aplikasi **SuaraLens** untuk lingkungan lokal (Docker Compose) dan lingkungan cloud (Railway & Vercel).

---

## 1. Topologi Layanan & Pemetaan Port

```
[ Frontend: React 19 + Vite 6 ] (Port 5173 / Vercel)
               │
               ▼ (VITE_API_URL -> Backend)
[ Backend: CodeIgniter 4.7.4 ] (Port Host 8090 / Container 8080 / Railway)
      │                                │
      ▼ (PostgreSQL Driver)             ▼ (cURL HTTP / Timeout 90s)
[ PostgreSQL 16 ]               [ ML Service: FastAPI ] (Port 8000 / Railway)
 (Port Host: 5433                       │
  Port Container: 5432)                 ▼ (OpenAI-compatible HTTP / Timeout 90s, Connect 3s)
                                [ Ollama LLM (qwen3.5:4b) ]
```

### Konfigurasi Alamat Ollama Berdasarkan Lingkungan
| Lingkungan | Parameter `OLLAMA_BASE_URL` | Penjelasan |
|---|---|---|
| **Local Docker Compose** | `http://host.docker.internal:11434` | Container Docker mengakses Ollama yang berjalan pada sistem operasi Host. |
| **Local Non-Docker (Host Python)** | `http://localhost:11434` | Skrip Python/FastAPI berjalan langsung di OS Host tempat Ollama aktif. |
| **Cloud / Railway Deployment** | `https://your-gpu-server:11434` | Container Railway mengakses server Ollama publik / VPS GPU dengan reverse proxy HTTPS. |

---

## 2. Deployment Lokal Menggunakan Docker Compose

### Prasyarat
- Docker Desktop aktif.
- Port Host: `5173` (Frontend), `8090` (Backend), `8000` (ML Service), `5433` (PostgreSQL), `11434` (Ollama di Host).
- Unduh model Ollama di host machine:
  ```powershell
  ollama pull qwen3.5:4b
  ```

### Langkah-langkah Menjalankan
1. **Periksa File `.env`:**
   Salin dari template `.env.example`:
   ```powershell
   Copy-Item .env.example .env
   ```
   > **PENTING:** Port PostgreSQL host disetel ke `5433` (`DB_PORT_BINDING=127.0.0.1:5433`) agar tidak bentrok dengan PostgreSQL bawaan Windows di port 5432.

2. **Jalankan Seluruh Layanan:**
   ```powershell
   docker compose up -d --build
   ```

3. **Jalankan Migrasi Database:**
   ```powershell
   docker compose exec backend php spark migrate
   ```

4. **Verifikasi Endpoint Kesehatan Layanan:**
   - **Backend Health:** `http://localhost:8090/health` (Respon: `{"status":"healthy"}`)
   - **ML Service Health:** `http://localhost:8000/health` (Respon: `{"status":true}`)
   - **Frontend UI:** `http://localhost:5173`

---

## 3. Konfigurasi Deployment Railway (Backend & ML Service)

### A. Railway PostgreSQL Service
1. Tambahkan service **PostgreSQL** pada Railway project.
2. Catat variabel: `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`.

### B. Railway Backend Service (CodeIgniter 4)
1. Tautkan repository GitHub dengan **Root Directory**: `/backend`.
2. Environment Variables:
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
3. Jalankan migrasi via one-off command:
   ```bash
   php spark migrate --force
   ```

### C. Railway ML Service (FastAPI)
1. Tautkan repository dengan **Root Directory**: `/ml-service`.
2. Railway otomatis mendeteksi `ml-service/Dockerfile`.
3. CMD Dockerfile SuaraLens telah mendukung port dinamis Railway:
   ```dockerfile
   CMD ["sh", "-c", "exec uvicorn main:app --app-dir ml-service --host 0.0.0.0 --port ${PORT:-8000}"]
   ```
4. Environment Variables:
   - `PORT`: (Dikelola otomatis oleh Railway)
   - `OLLAMA_BASE_URL`: URL endpoint Ollama GPU eksternal Anda.
   - `OLLAMA_MODEL`: `qwen3.5:4b`
   - `OLLAMA_REASONING_EFFORT`: `none`

---

## 4. Konfigurasi Deployment Vercel (Frontend React 19)

1. Impor repository di Vercel Dashboard.
2. Konfigurasi build:
   - **Framework Preset:** `Vite`
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. Environment Variables:
   - `VITE_API_URL`: `https://<your-railway-backend-domain>/api`
4. File `vercel.json` di root repository telah mengonfigurasi SPA rewrite rule:
   ```json
   {
     "rewrites": [
       { "source": "/(.*)", "destination": "/index.html" }
     ]
   }
   ```
   sehingga routing halaman React Router DOM 7 tidak menghasilkan error 404 saat direfresh.

---

## 5. Bounded Timeouts & Resiliency

| Komponen | Batas Waktu (Timeout) | Kebijakan Retry | Perilaku Saat Gagal |
|---|---|---|---|
| **Frontend Axios** | 120 detik | 0 retry | Menampilkan notifikasi error terstruktur pada UI pengguna. |
| **Backend CI4 cURL** | 90 detik | 1 retry (jeda 300ms) | Beralih ke *heuristic fallback* otomatis tanpa memutus response ke pengguna. |
| **ML Service Ollama** | 90 detik (Connect: 3s) | 2 retry ekponensial | Beralih ke *rule-based keyword classifier* dan *factual template summary*. |
| **PHP Script Exec** | 180 detik (`set_time_limit`) | - | Mencegah proses backend terputus sebelum inferensi selesai. |
