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
| **MOTION** | Level 1 | Calm & Functional | Transisi mikro hanya untuk feedback interaksi nyata (hover tombol, buka accordion riwayat, indikator loading); tanpa animasi mengambang (floating) atau bouncing yang mengganggu konsentrasi. |

---

## 3. Sistem Palet Warna (Color System — R-29 & R-01)

Sistem warna dibatasi secara ketat pada 3 warna inti netral/institusional + 1 aksen fungsional:

1. **Core Primary (Deep Institutional Navy):** `#0B1F3A`
   - *Alasan:* Mewakili otoritas, keamanan, dan ketegasan institusi kampus.
2. **Core Secondary (Neutral Surface & Light Slate):**
   - Mode Terang: Background `#FFFFFF`, Secondary Surface `#F4F7FC`, Border `#0A1220` (alpha 14%)
   - Mode Gelap: Background `#070C16`, Secondary Surface `#0E1726`, Border `#FFFFFF` (alpha 18%)
   - *Alasan:* Memberikan ruang baca yang tenang dengan kontras tinggi (> 7:1) di atas standar WCAG AA.
3. **Core Interactive (Sapphire Blue):** `#1D4ED8` (Light) / `#3B82F6` (Dark)
   - *Alasan:* Warna aksi primer untuk tombol submit, tautan aktif, dan penanda tab aktif.
4. **Accent Functional (Amber Urgent & Safety Emerald):**
   - Urgent/Penting: `#D97706` (Light) / `#F59E0B` (Dark)
   - Selesai/Aman: `#15803D` (Light) / `#22C55E` (Dark)
   - *Alasan:* Aksen warna hanya muncul pada status tiket nyata dan tag urgensi, tidak dijadikan warna dekorasi liar pada latar belakang.

---

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
