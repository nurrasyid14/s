# SuaraLens — Design Direction & System Specification

> Berkas panduan arah desain (Direction) untuk SuaraLens, portal aspirasi dan pengaduan kampus terpadu Politeknik Elektronika Negeri Surabaya (EEPIS).
> Berkas ini dibaca bersamaan dengan `antislop.md` sebagai filter anti AI-slop.

---

## 1. Identitas & Kepribadian (Identity & Personality)

- **Produk:** SuaraLens — Portal Aspirasi dan Pengaduan Sivitas Akademika Kampus.
- **Tujuan:** Menjadi kanal pelaporan publik yang jujur, transparan, terukur (berbasis SLA), dan akuntabel tanpa rasa takut.
- **Karakter Visual:**
  - **Kredibel & Institusional:** Memancarkan ketegasan tata kelola, presisi, dan keseriusan layanan publik kampus.
  - **Jelas & Berbasis Data:** Tidak ada hiasan tanpa makna; informasi status tiket, disposisi unit, dan riwayat penanganan disajikan dengan hirarki tipografi yang tajam dan pembagian tabel yang bersih.
  - **Empatik & Terbuka:** Antarmuka pengaduan pelapor ramah, mudah dipahami di perangkat seluler, dengan indikator progres yang menenangkan.

---

## 2. Pengaturan Dials (Liveliness Dials)

| Dial | Level | Nilai | Alasan Desain (R-31) |
|---|---|---|---|
| **ENERGY** | Level 2 | Balanced | Menghadirkan wibawa institusional tanpa kaku, lebih hidup dibanding formulir birokrasi konvensional, namun jauh dari kesan halaman promosi startup AI yang penuh kilau. |
| **RHYTHM** | Level 2 | Balanced with Breaks | Memadukan alur linier pelaporan dengan blok informasi terstruktur, membedakan seksi alur pelaporan, unit layanan, dan status tindak lanjut. |
| **MOTION** | Level 3 | Expressive, tetap cepat | Setiap section landing punya pengalaman berbeda (judul kata per kata, parallax gedung, marquee unit, timeline alur yang terisi mengikuti scroll, kartu sorotan kursor, foto tirai). Dashboard: section muncul saat terlihat, angka menghitung naik, batang grafik tumbuh. Durasi UI tetap di bawah 300ms; animasi masuk 600 sampai 900ms hanya sekali. Semua menghormati `prefers-reduced-motion` (gerak dihapus, fade dipertahankan). |

---

## 3. Sistem Palet Warna (Color System: Biru 60 · Putih 20 · Emas 10)

Komposisi dihitung per aplikasi, bukan per layar. Sisa 10% untuk teks navy/abu dan warna status.

| Peran | Token | Terang | Gelap | Dipakai untuk |
|---|---|---|---|---|
| Biru navy (60%) | `--color-navy` | `#0A2463` | `#0A1C4D` | Hero, CTA, footer, sidebar, banner dashboard, pita unit |
| Biru aksi | `--color-primary` | `#1E4FD8` | `#5B86F7` | Link, fokus, grafik, chip aktif |
| Biru muda | `--color-bg-secondary` | `#F3F6FD` | `#081430` | Latar section dan area kerja dashboard |
| Putih (20%) | `--color-surface` | `#FFFFFF` | `#0C1A3B` | Kartu, tabel, form |
| Emas (10%) | `--color-gold` | `#F5B700` | `#F5B700` | CTA utama (`.btn-gold`), item sidebar aktif, highlight judul, badge |
| Teks di atas emas | `--color-on-gold` | `#0A2463` | `#0A2463` | Selalu navy, jangan putih |
| Emas muda | `--color-gold-soft` / `--color-gold-ink` | `#FFF4CC` / `#5C4300` | 14% emas / `#FFD54D` | Badge dan label lembut |

Aturan:
- Emas hanya untuk satu aksi utama per layar dan penanda aktif. Jangan dipakai sebagai teks di atas putih (kontras kurang).
- Status peringatan memakai **oranye** (`--color-status-warning`: `#C2410C` / `#FB923C`) agar tidak tertukar dengan emas merek. Sentimen netral memakai abu.
- Dashboard: biru ada di sidebar, banner sapaan, kartu sorotan, dan grafik; area data tetap putih agar mudah dibaca.

## 4. Tipografi (Typography — R-06)

- **Font Utama (Sans-serif):** `Geist`
  - *Alasan:* Tipografi modern berkarakter geometris terstruktur dengan legibilitas angka dan teks densitas tinggi yang sangat baik untuk portal pelacakan tiket.
- **Font Monospace:** `Geist Mono`
  - *Alasan:* Khusus untuk ID Tiket (contoh: `#SL-0247`), tanggal berkas, dan indikator metrik SLA agar angka sejajar secara vertikal.
- **Hierarki & Berat:**
  - Heading: 600 - 700 (Semi-bold / Bold), tracking `-0.03em`.
  - Body: 400 - 500 (Regular / Medium), tracking normal, leading terukur `1.5 - 1.6`.

---

## 5. Bentuk & Struktur Geometri (Geometry & Ergonomics: R-11 & R-05)

- **Arah Visual:** Profesional, Modern, dan Ramah Pengguna (Friendly & Human-Centered). Tidak kaku kotak-kotak (anti-brutalist kaku), tetapi tetap rapi dan terpercaya.
- **Sistem Border Radius Ergonomis:**
  - **Containers & Kartu Utama:** `14px` hingga `16px` (`rounded-xl` / `rounded-2xl`) untuk memberikan impresi lembut, mengundang, dan ramah pengguna.
  - **Tombol & Elemen Interaktif:** `8px` hingga `10px` (`rounded-lg`) untuk kemudahan interaksi tactile yang natural.
  - **Inputs & Form Controls:** `8px` hingga `10px` (`rounded-lg`) dengan inset focus ring lembut.
  - **Chips, Badges & Avatars:** `rounded-full` atau `rounded-md` untuk penanda status yang cepat dipindai mata.
  - **Frame Mockup Perangkat:** `28px` - `32px` meniru kontur fisik smartphone modern yang ergonomis.
- **Elevasi & Bayangan Halus (Ambient Shadows: R-12):**
  - Menggunakan bayangan ambient mikro yang halus (`0 4px 20px -2px rgba(15, 23, 42, 0.05)`) untuk membedakan lapisan permukaan secara natural tanpa kontras border yang terlalu keras.
  - Hover states memiliki transisi halus (`translateY(-2px)` dengan peningkatan bayangan lembut).

---

## 6. Salinan Teks & Komunikasi (Copywriting Tone — R-02 & R-16)

- Tidak menggunakan karakter em dash (`—`) di seluruh teks antarmuka. Digunakan tanda baca koma, titik dua, tanda kurung, atau titik.
- Bahasa lugas, ramah, dan solutif.
- Menghindari kata-kata hiperbolis seperti "Sistem AI Tercanggih Generasi Baru", diganti dengan penjelasan manfaat nyata: "Analisis Kategori Otomatis", "Pelacakan Tiket Berbasis SLA", "Disposisi Cepat ke Unit Terkait".
