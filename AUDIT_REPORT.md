# AUDIT REPORT — SUARALENS SYSTEM

**Tanggal Audit:** 15 November 2026  
**Auditor:** Senior Full-Stack, ML, DevOps & Security Engineering Team  
**Sistem:** SuaraLens (Aplikasi Pengaduan & Aspirasi Kampus Berbasis AI/ML)  
**Status Evaluasi:** **READY FOR STAGING / READY FOR DEMO**

---

## 1. Arsitektur Aktual Sistem

SuaraLens menggunakan arsitektur *distributed multi-service* yang menghubungkan aplikasi web modern, REST API backend, layanan inferensi Machine Learning / NLP, database relasional PostgreSQL, dan model Large Language Model (LLM) Qwen 3.5 4B:

```
[ Frontend: React 19 + Vite 6 + Tailwind CSS 4 ] (Port Host 5173 / Vercel SPA)
                       │
                       ▼ (HTTP REST / Bearer Token)
[ Backend: CodeIgniter 4.7.4 (PHP 8.2) ] (Port Host 8090 / Port Container 8080)
      │                                       │
      ▼ (PostgreSQL Driver)                    ▼ (cURL HTTP JSON / Timeout 90s)
[ Database: PostgreSQL 16 ]           [ ML Service: FastAPI (Python 3.10/3.11) ] (Port 8000)
 (Port Host 5433 / Container 5432)             │
                                               ▼ (HTTP API / Timeout 90s, Connect 3s)
                                      [ LLM: Ollama (qwen3.5:4b) ]
                                       - Local Docker: http://host.docker.internal:11434
                                       - Local Host: http://localhost:11434
                                       - Cloud / VPS: https://ollama-remote:11434
```

### Rincian Komponen & Pemetaan Port
| Komponen | Versi & Teknologi | Port Host | Port Internal | Endpoint Health & Utama |
|---|---|---:|---:|---|
| **Frontend** | React 19.0.0, Vite 6.0.5, Tailwind CSS 4.0.0, React Router DOM 7 | 5173 | 5173 | `/`, `/signin`, `/dashboard`, `/complaints` |
| **Backend API** | CodeIgniter 4.7.4, PHP 8.2 | 8090 | 8080 | `GET /health`, `/api/auth/*`, `/api/complaints/*` |
| **Database** | PostgreSQL 16 Alpine | 5433 | 5432 | `suaralens_db` |
| **ML Service** | FastAPI, PyTorch (CPU), Transformers, Presidio | 8000 | 8000 | `GET /health`, `GET /ready`, `POST /analyze`, `POST /summary` |
| **LLM Engine** | Ollama (`qwen3.5:4b`) | 11434 | 11434 | `/api/generate`, `/v1/chat/completions` |

---

## 2. Alur Komunikasi Antarlayanan & Timeout Bounded

1. **Pembuatan Pengaduan (`POST /api/complaints`):**
   - Frontend memanggil backend dengan timeout Axios **120 detik**.
   - Backend memproses pembuatan tiket dengan batas waktu eksekusi PHP `set_time_limit(180)`.
   - Backend memanggil ML Service (`POST http://ml-service:8000/analyze`) dengan timeout cURL **90 detik** dan maksimal **2 percobaan** (1 awal + 1 retry jeda 300ms).
   - ML Service memproses sensor PII dan memanggil Ollama dengan connect timeout **3 detik** dan read timeout **90 detik**.
   - **Resiliensi Fallback:** Jika ML Service atau Ollama offline, sistem secara otomatis beralih ke heuristic fallback berbasis rule tanpa crash, status `is_fallback: true`, dan pengaduan tetap tersimpan aman di database.

2. **Analisis Ulang Pengaduan (`POST /api/complaints/{id}/analyze`):**
   - Dilakukan oleh Admin Sentral atau Stakeholder unit terkait.
   - Menghasilkan rekaman analisis baru di tabel `complaint_analysis` tanpa menghapus analisis terdahulu (*immutable audit trail*).

3. **Disposisi & Alur 7 Tahap Penanganan Unit:**
   - Admin mendisposisikan tiket (`POST /api/complaints/{id}/disposition`).
   - Unit menerima penugasan (`POST /api/unit/complaints/{id}/accept`), mencatat progres (`POST /api/unit/complaints/{id}/followup`), dan memberikan jawaban resmi (`POST /api/unit/complaints/{id}/answer`).
   - Mahasiswa pelapor memberikan penilaian bintang & ulasan kepuasan (`POST /api/complaints/{id}/feedback`), menandai status pengaduan menjadi `resolved`.

---

## 3. Temuan Audit & Solusi yang Telah Diterapkan

### A. Keamanan Otorisasi & Pencegahan IDOR
| Kode Temuan | Deskripsi Temuan Awal | Tingkat Keparahan | Status | Tindakan Perbaikan |
|---|---|---|---|---|
| **SEC-01** | `ComplaintController::reply()` & `replies()` hanya memvalidasi role user, stakeholder unit lain dapat mengakses aduan unit berbeda. | **HIGH** | **RESOLVED** | Memindahkan seluruh logika validasi otorisasi ke `ComplaintService::addReply()` dan `getReplies()`, memberlakukan pengecekan unit yang ketat. |
| **SEC-02** | `ComplaintService::reanalyzeComplaint()` tidak memvalidasi role pemanggil di service layer. | **HIGH** | **RESOLVED** | Menambahkan `assertComplaintAccess($complaint, $user, 'reanalyze')` yang menolak peran `user` biasa dan peran asing. |
| **SEC-03** | `Routes.php` membatasi `reply` dan `replies` hanya untuk `stakeholder,admin`, memblokir mahasiswa pelapor. | **HIGH** | **RESOLVED** | Menyelaraskan filter rute menjadi `authRole:user,stakeholder,admin` yang konsisten dengan validasi service layer. |
| **SEC-04** | Role tidak dikenal (*unknown role*) berpotensi lolos jika filter rute terlewati. | **HIGH** | **RESOLVED** | Menerapkan *default deny* pada `assertComplaintAccess()` di mana setiap role di luar `admin`, `stakeholder`, dan `user` langsung ditolak. |

### B. Lingkungan & Konfigurasi Ollama
| Kode Temuan | Deskripsi Temuan Awal | Tingkat Keparahan | Status | Tindakan Perbaikan |
|---|---|---|---|---|
| **ENV-01** | `.env.example` mencantumkan model lama `qwen3:8b` dan host port `5432` yang bentrok di Windows. | **MEDIUM** | **RESOLVED** | Menyelaraskan `.env.example` ke host port `5433`, model `qwen3.5:4b`, dan menambahkan penjelasan perbedaan alamat Ollama (Docker vs Host vs Cloud). |
| **ENV-02** | Fallback model pada `docker-compose.yml` masih mengarah ke `qwen3:8b`. | **LOW** | **RESOLVED** | Mengubah default model pada `docker-compose.yml` menjadi `qwen3.5:4b`. |

---

## 4. Evaluasi Kesiapan Rilis

- **Fungsionalitas Inti:** Berjalan 100% tanpa regresi.
- **Resiliensi:** Kegagalan jaringan atau offline model tidak menggagalkan penyimpanan tiket.
- **Keamanan:** Bebas dari celah IDOR di tingkat service layer maupun controller.

**Status Akhir:** Sistem SuaraLens berstatus **READY FOR STAGING / READY FOR DEMO**.
