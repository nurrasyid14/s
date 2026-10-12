# PRD (Product Requirements Document)
## Peningkatan Performa Tampilan & UI/UX SuaraLens

**Status Dokumen:** Draf Rencana untuk Konfirmasi Pengguna  
**Tanggal:** 2026-10-11  
**Lingkup Perubahan:** Tampilan antarmuka (UI) dan pengalaman pengguna (UX) tanpa mengubah isi/fitur bisnis web.  
**Prinsip Desain:** Standar Anti-Slop (`antislop.md`) & `DESIGN.md`.

---

## 1. Latar Belakang & Tujuan (Background & Objective)

### 1.1 Latar Belakang
SuaraLens merupakan aplikasi web portal aspirasi dan pengaduan kampus terintegrasi bagi sivitas akademika EEPIS. Saat ini, fungsionalitas dan logika bisnis telah berjalan (pengajuan aduan, verifikasi admin, disposisi stakeholder, analitik sentimen, pelacakan tiket). Namun, sisi tampilan masih memiliki beberapa pola generik (AI-slop tells), seperti mockup ponsel statis yang rentan clipping di mobile, ornamen icon marquee tanpa tujuan data, kontras teks abu-abu yang belum sepenuhnya memenuhi standar WCAG AA di kedua tema, serta ketiadaan indikator fokus keyboard yang konsisten.

### 1.2 Tujuan Utama
1. **Meningkatkan Kualitas & Performa Visual:** Menghilangkan semua indikasi template generik/AI-slop dan menggantinya dengan antarmuka institusional modern yang tegas, bersih, dan berbobot.
2. **Memperkuat Pengalaman Pengguna (UX):**
   - Responsivitas mobile yang mulus tanpa overflow atau pergeseran posisi janggal.
   - Umpan balik interaksi yang jelas (loading, empty, and error states di seluruh halaman).
   - Aksesibilitas WCAG AA (kontras rasio teks > 4.5:1 dan navigasi keyboard lengkap).
3. **Mempertahankan Integritas Fungsional & Konten:** Seluruh struktur formulir, endpoint API, alur tiket, autentikasi, dan isi web tidak berubah; yang disempurnakan adalah tata letak visual, konsistensi styling, dan keterbacaan antarmuka.

---

## 2. Cakupan Perubahan (Scope of Work)

### 2.1 Halaman Publik (Landing Page)
- **Hero Section:**
  - Menghilangkan degradasi gradien penuh (full-page vertical gradient) dan menggantinya dengan tata letak header-hero yang tegas dan seimbang (ENERGY 2).
  - Menyempurnakan komponen visual showcase aplikasi: menggantikan mockup ponsel SVG dengan layout cuplikan tiket nyata yang responsif di seluruh breakpoint seluler.
- **Unit Layanan:**
  - Menyajikan daftar unit kampus dalam grid teratur dengan penataan ikon dan label yang seimbang.
- **Seksi Fitur & Transparansi:**
  - Mengganti dekorasi waveform acak dan icon marquee berputar dengan visualisasi alur aduan konkret: *Pengajuan Terenkripsi → Triage Cerdas NLP → Disposisi Unit → Penyelesaian & Umpan Balik*.
- **Footer:**
  - Mengeliminasi form newsletter dummy atau menggantinya dengan ringkasan kanal informasi resmi kampus, menautkan tautan navigasi ke seksi yang benar-benar ada.

### 2.2 Alur Pengguna (User Portal)
- **ComplaintForm (Pengajuan Aduan):**
  - Mempertahankan 5 langkah (step wizard), meningkatkan kejelasan tahapan, memperjelas batas input dan upload lampiran, memperkuat pesan validasi karakter minimal.
- **ComplaintTracking (Pelacakan Tiket):**
  - Memperjelas timeline tahapan disposisi dan SLA.
  - Memastikan tampilan status (Badges) memiliki kontras warna tinggi di mode terang maupun gelap.
- **MyComplaints (Daftar Aduan Saya):**
  - Standarisasi tabel dan kartu aduan dengan navigasi pagination/filter yang nyaman disentuh di perangkat seluler (min. tap target 44px).

### 2.3 Dashboard Admin & Stakeholder
- **AdminDashboard, AdminVerification, AdminDisposition:**
  - Merapikan kartu ringkasan metrik (Stat Cards) agar angka metrik mudah dipindai secara visual.
  - Menstandarkan modal disposisi dengan penanganan penutupan tombol `Escape` dan navigasi Tab.
  - Memastikan tersedianya Empty State dan Error State yang informatif jika koneksi ke backend mengalami kendala.
- **Stakeholder Dashboard & Detail:**
  - Mempertegas visual analitik kepuasan dan prioritas SLA tiket darurat tanpa menggunakan warna neon.

---

## 3. Kebutuhan Non-Fungsional (Non-Functional Requirements)

1. **Aksesibilitas (WCAG 2.1 AA):**
   - Kontras warna teks normal terhadap background minimal 4.5:1.
   - Seluruh tombol dan input wajib memiliki `:focus-visible` ring kontras untuk pengguna keyboard.
2. **Kesesuaian Mobile (Mobile Responsiveness):**
   - Zero horizontal scroll pada viewport lebar 320px hingga 1920px.
   - Ukuran tap target tombol interaktif minimal 44x44px.
3. **Performa Render & CSS:**
   - Menghindari perulangan layout repaint yang tidak perlu.
   - Konsolidasi variabel CSS tokens di `index.css` tanpa hardcoded string hex di dalam komponen.
4. **Bebas Em Dash (R-02 Compliance):**
   - Menghapus seluruh karakter em dash (`—`) pada salinan teks bahasa Indonesia dan Inggris.
