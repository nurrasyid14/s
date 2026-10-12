# Arsitektur Desain & Sistem UI/UX SuaraLens

**Status Dokumen:** Draf Rencana untuk Konfirmasi Pengguna  
**Tanggal:** 2026-10-11  
**Kompatibilitas:** Tailwind CSS v4, React 19, Lucide React, Dayjs, Recharts

---

## 1. Arsitektur Token Desain (CSS Design Tokens Architecture)

Sistem styling dipusatkan pada `src/index.css` menggunakan CSS Variables dan Tailwind CSS `@theme` tokens:

```
[Design Tokens: index.css]
       │
       ├── Global Reset & Typography: Geist Sans & Geist Mono
       │
       ├── Theme Modes (Light & Dark)
       │    ├── Surface & Canvas:
       │    │     --color-bg (Light: #FFFFFF / Dark: #070C16)
       │    │     --color-bg-secondary (Light: #F4F7FC / Dark: #0E1726)
       │    │     --color-surface (Light: #FFFFFF / Dark: #0E1726)
       │    │     --color-border (Light: rgba(10,18,32,0.14) / Dark: rgba(255,255,255,0.18))
       │    ├── Institutional Palette:
       │    │     --color-primary (Deep Navy: #0B1F3A / Dark: #FFFFFF)
       │    │     --color-interactive (Sapphire: #1D4ED8 / Dark: #3B82F6)
       │    │     --color-interactive-hover (Light: #1E40AF / Dark: #60A5FA)
       │    └── Status & Urgency Tokens:
       │          --color-status-success (Resolving: #15803D / Dark: #22C55E)
       │          --color-status-warning (Triage/Review: #B45309 / Dark: #F59E0B)
       │          --color-status-danger (High Urgency: #B91C1C / Dark: #EF4444)
       │
       └── Geometric Rules:
            --radius-default: 0px (sudut geometris tegas)
            --focus-ring: 2px solid var(--color-interactive)
```

---

## 2. Hirarki Komponen & Layout (Component Hierarchy)

```
App.jsx (Router)
 ├── Public Routes
 │    └── LandingPage.jsx
 │         ├── PublicHeader (Navbar publik, tema, pemilihan bahasa, CTA autentikasi)
 │         ├── HeroSection (Judul terstruktur, pengantar, showcase alur tiket responsif)
 │         ├── UnitsGrid (Unit layanan kampus EEPIS terverifikasi)
 │         ├── WorkflowFlowSection (4 tahap nyata penanganan aduan tanpa ornamen generik)
 │         ├── DirectActionSection (Pilihan pelapor mahasiswa vs stakeholder)
 │         └── PublicFooter (Tautan valid dan hak cipta institusi)
 │
 ├── User Routes
 │    └── Layout: Navbar variant="user"
 │         ├── ComplaintForm (Step 1-5 Wizard)
 │         ├── ComplaintTracking (Timeline penanganan + feedback kepuasan)
 │         └── MyComplaints (Daftar tiket pelapor)
 │
 ├── Admin Routes
 │    └── AdminLayout.jsx (Header navigasi sentral, verifikasi cepat, disposisi modal)
 │         ├── AdminDashboard.jsx
 │         ├── AdminVerification.jsx
 │         └── AdminDisposition.jsx
 │
 └── Stakeholder Routes
      └── StakeholderLayout.jsx (Sidebar unit kerja, analitik SLA, detail penanganan aduan)
```

---

## 3. Strategi Penanganan State UI (UI States Resilience - R-27)

Setiap tampilan yang mengonsumsi data API wajib memiliki 3 tingkatan penanganan:

| Status | Komponen Representasi | Perilaku Pengguna |
|---|---|---|
| **Loading** | `SkeletonLoader` / Indikator pulsa halus | Menampilkan kerangka tata letak tanpa pergeseran layout (cumulative layout shift = 0). |
| **Empty** | `EmptyState.jsx` | Menampilkan pesan kontekstual spesifik (misal: "Belum ada aduan baru di antrean Sarana Prasarana") disertai tombol aksi relevan jika berlaku. |
| **Error** | `ErrorState.jsx` | Menampilkan pesan kegagalan ramah pengguna dengan tombol "Coba Lagi" (`onRetry`) tanpa memutus navigasi aplikasi. |

---

## 4. Standar Aksesibilitas & Responsivitas (A11y & Mobile)

1. **Focus Ring:**
   - Seluruh elemen yang dapat menerima fokus keyboard (`button`, `a`, `input`, `select`, `textarea`) dilengkapi kelas utilitas:
     `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-interactive)] focus-visible:ring-offset-2`
2. **Escape Key Handling:**
   - Modal disposisi admin dan popup notifikasi menutup saat tombol `Escape` ditekan.
3. **Viewport Fluidity:**
   - Menggunakan CSS Grid dengan `minmax()` dan flex-wrap teruji pada lebar layar 320px, 375px, 768px, 1024px, dan 1440px.
