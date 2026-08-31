"""
generate_suaralens_data.py
============================
Generator dataset dummy untuk SuaraLens — Analitik Masukan, Aduan & Aspirasi
Berbasis NLP (studi kasus: layanan kampus PENS).

Menghasilkan 2 file CSV:
  1. suaralens_dummy_simulasi.csv
     -> Berisi ground truth (kategori, urgency, sentiment) hasil generator.
        Dipakai untuk EVALUASI akurasi pipeline (bandingkan output model vs
        label yang sudah diketahui saat data dibuat).
  2. suaralens_dummy_uji.csv
     -> Hanya berisi data mentah (teks aduan + metadata dasar), TANPA label.
        Dipakai untuk UJI COBA pipeline end-to-end seolah-olah data baru
        yang belum pernah dilihat sistem.

Desain data dibuat menyerupai kondisi lapangan:
  - Distribusi kategori tidak seimbang (beberapa kategori jauh lebih sering)
  - Ada pola musiman (lonjakan UKT saat awal semester, lonjakan akademik
    saat masa ujian, dll) -> penting untuk uji fitur TREND
  - Ada keterlambatan SLA yang disengaja (~15-20%) -> penting untuk uji
    fitur SLA ANALYTICS
  - Ada data mengandung PII (nama, NIM, no. HP, email) yang disisipkan
    secara alami di teks -> penting untuk uji tahap ANONYMIZATION
  - Ada noise realistis: typo ringan, huruf kapital semua (emosi tinggi),
    emoji di kanal informal, field kosong, dan duplikat/near-duplikat
    (mis. banyak orang lapor masalah yang sama di hari yang sama)
  - Ada sebagian kecil teks di luar topik/spam -> uji robustness kategori

Cara pakai:
    python generate_suaralens_data.py --n 5000 --months 6 --seed 42

Output disimpan di folder yang sama dengan script ini.
"""

import argparse
import random
import string
from datetime import datetime, timedelta

import numpy as np
import pandas as pd

# =====================================================================
# 1. KONFIGURASI DASAR (silakan sesuaikan bila perlu)
# =====================================================================

CHANNELS = ["Web Form", "WhatsApp", "Email", "Aplikasi Mobile",
            "Media Sosial", "Datang Langsung", "Kotak Saran"]
CHANNEL_WEIGHTS = [0.28, 0.27, 0.15, 0.10, 0.08, 0.07, 0.05]

STAKEHOLDERS = ["Mahasiswa", "Orang Tua", "Mitra", "Masyarakat Umum"]

STATUSES = ["Baru", "Diproses", "Selesai", "Ditolak"]

URGENCY_LEVELS = ["Low", "Medium", "High", "Critical"]
URGENCY_SCORE_RANGE = {  # dipakai untuk urgency_score_true (0-1)
    "Low": (0.05, 0.30),
    "Medium": (0.30, 0.55),
    "High": (0.55, 0.80),
    "Critical": (0.80, 0.98),
}
SLA_DAYS = {"Low": 14, "Medium": 7, "High": 3, "Critical": 1}

SENTIMENTS = ["negative", "neutral", "positive"]

FIRST_NAMES = [
    "Ahmad", "Budi", "Siti", "Dewi", "Rizky", "Putri", "Andi", "Rina",
    "Fajar", "Wulan", "Bagas", "Intan", "Yusuf", "Nabila", "Dimas",
    "Anisa", "Reza", "Larasati", "Fikri", "Salsabila", "Hafiz", "Melati",
    "Arya", "Ratna", "Ilham", "Citra", "Doni", "Kartika", "Bayu", "Yuni",
]
LAST_NAMES = [
    "Saputra", "Pratama", "Wijaya", "Santoso", "Kurniawan", "Setiawan",
    "Rahayu", "Nugroho", "Handayani", "Firmansyah", "Susanti", "Hidayat",
    "Permata", "Wahyuni", "Ramadhan", "Lestari", "Gunawan", "Anggraini",
]
COMPANIES = [
    "PT Telkom Indonesia", "PT Sinergi Elektronika", "CV Mitra Teknindo",
    "PT Bank Jatim", "Dinas Kominfo Surabaya", "PT Astra Otoparts",
    "PT Len Industri", "CV Solusi Digital Nusantara", "PT Angkasa Pura",
]
PRODI = [
    "Teknik Informatika", "Sains Data Terapan", "Teknik Elektronika",
    "Teknik Telekomunikasi", "Teknik Multimedia Kreatif",
    "Teknik Mekatronika", "Teknik Komputer", "Broadband Multimedia",
]
GEDUNG = ["Gedung A", "Gedung D3", "Gedung D4", "Gedung Robotika",
          "Gedung Perpustakaan", "Gedung Direktorat", "Gedung Aula"]

DOMAINS_EMAIL = ["gmail.com", "yahoo.com", "student.pens.ac.id", "outlook.com"]

TYPO_MAP = {"yang": "yg", "tidak": "gak", "sudah": "udah", "dengan": "dgn",
            "untuk": "utk", "saya": "sy", "karena": "krn", "juga": "jg"}

EMOJIS = ["😡", "😢", "🙏", "😞", "‼️", "😠", "🔥", "😔"]

RNG = random.Random()
NP_RNG = np.random.default_rng()


# =====================================================================
# 2. KONFIGURASI KATEGORI: bobot kemunculan, distribusi urgency,
#    pemetaan stakeholder yang relevan, dan bank contoh isu.
# =====================================================================

CATEGORY_CONFIG = {
    "Akademik": {
        "weight": 0.18,
        "stakeholders": {"Mahasiswa": 0.75, "Orang Tua": 0.20, "Mitra": 0.0, "Masyarakat Umum": 0.05},
        "urgency_dist": {"Low": 0.30, "Medium": 0.40, "High": 0.25, "Critical": 0.05},
        "issues": [
            ("Jadwal kuliah {matkul} bentrok dengan mata kuliah lain di semester ini", "Medium"),
            ("Dosen {dosen} sering membatalkan kelas {matkul} secara mendadak tanpa pemberitahuan", "Medium"),
            ("Nilai UAS {matkul} belum juga keluar padahal sudah lewat 3 minggu", "Medium"),
            ("Sistem akademik menolak proses KRS saya terus menerus menjelang batas akhir hari ini", "Critical"),
            ("Ruang kelas untuk praktikum {matkul} tidak sesuai kapasitas mahasiswa yang terdaftar", "Low"),
            ("Saya salah input nilai transkrip dan butuh koreksi segera untuk keperluan beasiswa besok", "High"),
            ("Mohon informasi jadwal her-registrasi semester depan, di web belum ada update", "Low"),
            ("Dosen pembimbing TA sangat sulit dihubungi selama lebih dari sebulan", "High"),
        ],
    },
    "Keuangan": {
        "weight": 0.16,
        "stakeholders": {"Mahasiswa": 0.55, "Orang Tua": 0.42, "Mitra": 0.0, "Masyarakat Umum": 0.03},
        "urgency_dist": {"Low": 0.15, "Medium": 0.30, "High": 0.35, "Critical": 0.20},
        "issues": [
            ("Pembayaran UKT saya sudah transfer tapi status di sistem masih tertulis belum lunas", "High"),
            ("Anak saya terancam tidak bisa ikut UAS karena sistem UKT error terus menolak pembayaran cicilan", "Critical"),
            ("Mohon penjelasan rincian biaya UKT semester ini, ada tambahan yang tidak saya mengerti", "Low"),
            ("Pengajuan keringanan UKT belum ada kabar sudah 2 bulan, sementara batas bayar semakin dekat", "High"),
            ("Bukti pembayaran tidak bisa diunduh dari portal keuangan", "Medium"),
            ("Refund kelebihan pembayaran semester lalu belum juga masuk ke rekening saya", "Medium"),
            ("Terima kasih, proses pengajuan cicilan UKT saya kemarin diproses sangat cepat dan membantu", "Low"),
        ],
    },
    "Fasilitas": {
        "weight": 0.13,
        "stakeholders": {"Mahasiswa": 0.65, "Orang Tua": 0.05, "Mitra": 0.10, "Masyarakat Umum": 0.20},
        "urgency_dist": {"Low": 0.40, "Medium": 0.35, "High": 0.20, "Critical": 0.05},
        "issues": [
            ("AC di {gedung} ruang kuliah mati sejak minggu lalu, sangat panas saat jam siang", "Medium"),
            ("Toilet di {gedung} lantai 2 rusak dan berbau tidak sedap sudah lama tidak diperbaiki", "Medium"),
            ("Kursi kuliah di {gedung} banyak yang patah dan berbahaya untuk diduduki", "High"),
            ("Lampu koridor {gedung} mati total, sangat gelap dan berbahaya saat malam hari", "High"),
            ("Atap {gedung} bocor parah saat hujan deras tadi, air masuk sampai ke area kelas", "Critical"),
            ("Mohon penambahan tempat sampah di sekitar kantin, area itu selalu penuh sampah", "Low"),
            ("Fasilitas mushola sudah bagus dan bersih, terima kasih atas perawatannya", "Low"),
        ],
    },
    "Sarana IT": {
        "weight": 0.12,
        "stakeholders": {"Mahasiswa": 0.85, "Orang Tua": 0.0, "Mitra": 0.05, "Masyarakat Umum": 0.10},
        "urgency_dist": {"Low": 0.20, "Medium": 0.30, "High": 0.35, "Critical": 0.15},
        "issues": [
            ("WiFi kampus di {gedung} mati total sejak pagi, tidak bisa akses e-learning untuk ujian online", "Critical"),
            ("Koneksi internet sangat lambat setiap jam sibuk siang hari, sulit upload tugas", "Medium"),
            ("Sistem e-learning tidak bisa diakses, muncul error 500 terus menerus", "High"),
            ("Password akun SSO saya lupa dan fitur reset password di web tidak berfungsi", "Medium"),
            ("Mohon penambahan akses printer di lab komputer, yang ada sering rusak", "Low"),
            ("Aplikasi presensi sering gagal mendeteksi lokasi meskipun sudah di area kampus", "Medium"),
        ],
    },
    "Kemahasiswaan": {
        "weight": 0.08,
        "stakeholders": {"Mahasiswa": 0.90, "Orang Tua": 0.05, "Mitra": 0.0, "Masyarakat Umum": 0.05},
        "urgency_dist": {"Low": 0.45, "Medium": 0.35, "High": 0.15, "Critical": 0.05},
        "issues": [
            ("Pengajuan dana kegiatan UKM belum juga disetujui padahal acara minggu depan", "High"),
            ("Mohon kejelasan jadwal pemilihan ketua BEM periode ini", "Low"),
            ("Ruang sekretariat UKM kami tidak kunjung diperbaiki setelah rusak akibat banjir", "Medium"),
            ("Ingin memberi masukan agar kegiatan orientasi mahasiswa baru lebih interaktif tahun depan", "Low"),
            ("Terima kasih atas dukungan panitia acara kompetisi mahasiswa kemarin, sangat lancar", "Low"),
        ],
    },
    "Beasiswa": {
        "weight": 0.06,
        "stakeholders": {"Mahasiswa": 0.70, "Orang Tua": 0.28, "Mitra": 0.0, "Masyarakat Umum": 0.02},
        "urgency_dist": {"Low": 0.25, "Medium": 0.35, "High": 0.30, "Critical": 0.10},
        "issues": [
            ("Pengumuman hasil seleksi beasiswa KIP-K terus ditunda tanpa kejelasan", "High"),
            ("Dana beasiswa semester ini belum cair padahal sudah lewat jadwal yang dijanjikan", "High"),
            ("Mohon info persyaratan pengajuan beasiswa prestasi tahun ini", "Low"),
            ("Berkas beasiswa saya dinyatakan tidak lengkap tapi tidak dijelaskan bagian mana yang kurang", "Medium"),
        ],
    },
    "Perpustakaan": {
        "weight": 0.05,
        "stakeholders": {"Mahasiswa": 0.85, "Orang Tua": 0.0, "Mitra": 0.05, "Masyarakat Umum": 0.10},
        "urgency_dist": {"Low": 0.55, "Medium": 0.30, "High": 0.12, "Critical": 0.03},
        "issues": [
            ("Koleksi buku referensi untuk mata kuliah {matkul} sangat terbatas jumlahnya", "Low"),
            ("Sistem peminjaman buku online sering error saat proses perpanjangan", "Medium"),
            ("Ruang baca perpustakaan terlalu berisik, sulit fokus belajar", "Low"),
            ("Layanan perpustakaan digital sangat membantu, aksesnya cepat dan mudah", "Low"),
        ],
    },
    "Parkir & Keamanan": {
        "weight": 0.06,
        "stakeholders": {"Mahasiswa": 0.55, "Orang Tua": 0.05, "Mitra": 0.10, "Masyarakat Umum": 0.30},
        "urgency_dist": {"Low": 0.25, "Medium": 0.30, "High": 0.30, "Critical": 0.15},
        "issues": [
            ("Motor saya hilang di area parkir {gedung} padahal sudah pakai kunci ganda", "Critical"),
            ("Area parkir sangat sempit dan sering terjadi senggolan antar kendaraan", "Medium"),
            ("Petugas keamanan tidak ada di pos pintu masuk pada malam hari", "High"),
            ("Mohon penambahan lampu penerangan di area parkir belakang kampus", "Low"),
            ("Palang parkir otomatis rusak sejak 2 hari lalu, antrean kendaraan menumpuk", "Medium"),
        ],
    },
    "Kebersihan & Lingkungan": {
        "weight": 0.05,
        "stakeholders": {"Mahasiswa": 0.30, "Orang Tua": 0.0, "Mitra": 0.05, "Masyarakat Umum": 0.65},
        "urgency_dist": {"Low": 0.55, "Medium": 0.30, "High": 0.12, "Critical": 0.03},
        "issues": [
            ("Selokan di sekitar area kampus tersumbat sampah dan menimbulkan bau tidak sedap", "Medium"),
            ("Warga sekitar terganggu asap pembakaran sampah dari area belakang kampus", "High"),
            ("Taman di depan gerbang kampus mulai terlihat kurang terawat", "Low"),
            ("Terima kasih, kebersihan lingkungan kampus tahun ini terasa jauh lebih baik", "Low"),
        ],
    },
    "Kerjasama & Mitra": {
        "weight": 0.06,
        "stakeholders": {"Mahasiswa": 0.05, "Orang Tua": 0.0, "Mitra": 0.90, "Masyarakat Umum": 0.05},
        "urgency_dist": {"Low": 0.35, "Medium": 0.40, "High": 0.20, "Critical": 0.05},
        "issues": [
            ("Proses administrasi kerja sama magang dari {perusahaan} belum mendapat respons sejak 3 minggu lalu", "High"),
            ("Mohon kejelasan jadwal penandatanganan MoU kerja sama riset dengan {perusahaan}", "Medium"),
            ("Mahasiswa magang dari program kami belum menerima surat pengantar resmi dari kampus", "Medium"),
            ("Kerja sama penyelenggaraan pelatihan bersama {perusahaan} berjalan sangat baik, kami ingin melanjutkan tahun depan", "Low"),
        ],
    },
    "Pelayanan Administrasi": {
        "weight": 0.04,
        "stakeholders": {"Mahasiswa": 0.70, "Orang Tua": 0.15, "Mitra": 0.05, "Masyarakat Umum": 0.10},
        "urgency_dist": {"Low": 0.40, "Medium": 0.35, "High": 0.20, "Critical": 0.05},
        "issues": [
            ("Pengurusan surat keterangan aktif kuliah sudah diajukan 2 minggu tapi belum jadi", "Medium"),
            ("Kartu Tanda Mahasiswa (KTM) saya hilang dan proses penggantian tidak jelas alurnya", "Low"),
            ("Petugas loket administrasi kurang ramah saat melayani pertanyaan mahasiswa", "Low"),
            ("Legalisir ijazah untuk keperluan kerja saya butuh percepatan karena wawancara kerja lusa", "High"),
        ],
    },
    "Lainnya": {
        "weight": 0.01,
        "stakeholders": {"Mahasiswa": 0.4, "Orang Tua": 0.2, "Mitra": 0.2, "Masyarakat Umum": 0.2},
        "urgency_dist": {"Low": 0.7, "Medium": 0.2, "High": 0.08, "Critical": 0.02},
        "issues": [
            ("Halo min, ada promo apa hari ini di kampus", "Low"),
            ("Testing kirim pesan aja, abaikan", "Low"),
            ("Assalamualaikum mau tanya lokasi kampus dimana ya", "Low"),
        ],
    },
}

OPENERS_FORMAL = [
    "Dengan hormat, saya ingin menyampaikan bahwa ",
    "Selamat pagi/siang, mohon izin menyampaikan keluhan bahwa ",
    "Melalui pesan ini saya ingin melaporkan bahwa ",
    "",
]
OPENERS_INFORMAL = [
    "Min, ", "Halo min, mau lapor nih. ", "Permisi, ", "Mohon bantuannya, ", "",
]
CLOSERS = [
    " Mohon segera ditindaklanjuti, terima kasih.",
    " Terima kasih atas perhatiannya.",
    " Tolong dibantu ya, terima kasih.",
    "",
    " Mohon informasinya secepatnya.",
]


# =====================================================================
# 3. HELPER FUNCTIONS
# =====================================================================

def fake_name():
    return f"{RNG.choice(FIRST_NAMES)} {RNG.choice(LAST_NAMES)}"


def fake_nim():
    return f"33246{RNG.randint(10000, 99999)}"


def fake_phone():
    return f"08{RNG.randint(10,59)}{RNG.randint(1000000,9999999)}"


def fake_email(name):
    user = name.lower().replace(" ", ".")
    return f"{user}{RNG.randint(1,99)}@{RNG.choice(DOMAINS_EMAIL)}"


def maybe_inject_pii(text, prob=0.12):
    """Sisipkan cuplikan PII (nama, NIM, telepon, email) ke sebagian teks,
    supaya dataset bisa dipakai menguji tahap anonymization/PII redaction."""
    if RNG.random() < prob:
        name = fake_name()
        pieces = [f"Saya {name}"]
        if RNG.random() < 0.6:
            pieces.append(f"NIM {fake_nim()}")
        if RNG.random() < 0.5:
            pieces.append(f"bisa dihubungi di {fake_phone()}")
        if RNG.random() < 0.3:
            pieces.append(f"email {fake_email(name)}")
        prefix = ", ".join(pieces) + ". "
        text = prefix + text
    return text


def apply_typo_noise(text, prob=0.25):
    """Ganti sebagian kata baku jadi bentuk singkatan informal (typo/gaul),
    meniru gaya bahasa asli pengguna di kanal seperti WhatsApp/medsos."""
    if RNG.random() > prob:
        return text
    words = text.split()
    out = []
    for w in words:
        key = w.lower().strip(string.punctuation)
        if key in TYPO_MAP and RNG.random() < 0.5:
            out.append(TYPO_MAP[key])
        else:
            out.append(w)
    return " ".join(out)


def apply_channel_style(text, channel):
    """Sesuaikan gaya teks dengan kanal: WA/Medsos lebih santai + emoji,
    Email/Web Form lebih formal."""
    if channel in ("WhatsApp", "Media Sosial"):
        text = apply_typo_noise(text, prob=0.45)
        if RNG.random() < 0.35:
            text += " " + RNG.choice(EMOJIS)
        if RNG.random() < 0.15:
            text = text.upper()  # emosi tinggi, semua huruf kapital
    elif channel == "Datang Langsung":
        text = apply_typo_noise(text, prob=0.15)
    return text


def fill_placeholders(template):
    return template.format(
        matkul=RNG.choice(["Pemrograman Web", "Struktur Data", "Basis Data",
                            "Jaringan Komputer", "Kecerdasan Buatan",
                            "Sistem Digital", "Kalkulus", "Praktikum Elektronika"]),
        dosen=f"{RNG.choice(FIRST_NAMES)} {RNG.choice(LAST_NAMES)}",
        gedung=RNG.choice(GEDUNG),
        perusahaan=RNG.choice(COMPANIES),
    )


def urgency_score_for(level):
    lo, hi = URGENCY_SCORE_RANGE[level]
    return round(RNG.uniform(lo, hi), 3)


def sentiment_for_issue(base_urgency, is_appreciation):
    """Tentukan sentimen berdasarkan ISI teks, bukan acak lepas dari konten:
    - hanya issue yang memang berisi apresiasi/pujian -> positive
    - urgency tinggi -> hampir pasti negative (nada keluhan mendesak)
    - urgency rendah/medium non-apresiasi -> campuran negative/neutral saja
      (permintaan info, laporan biasa) - TIDAK ada peluang positive acak,
      supaya ground truth tetap konsisten dengan isi teks."""
    if is_appreciation:
        return "positive", round(RNG.uniform(0.75, 0.97), 3)
    if base_urgency in ("High", "Critical"):
        return "negative", round(RNG.uniform(0.70, 0.98), 3)
    roll = RNG.random()
    if roll < 0.65:
        return "negative", round(RNG.uniform(0.55, 0.90), 3)
    else:
        return "neutral", round(RNG.uniform(0.50, 0.85), 3)


def sample_category():
    cats = list(CATEGORY_CONFIG.keys())
    weights = [CATEGORY_CONFIG[c]["weight"] for c in cats]
    return RNG.choices(cats, weights=weights, k=1)[0]


def sample_stakeholder(category):
    dist = CATEGORY_CONFIG[category]["stakeholders"]
    keys = list(dist.keys())
    weights = list(dist.values())
    return RNG.choices(keys, weights=weights, k=1)[0]


def sample_urgency(category):
    dist = CATEGORY_CONFIG[category]["urgency_dist"]
    keys = list(dist.keys())
    weights = list(dist.values())
    return RNG.choices(keys, weights=weights, k=1)[0]


def pick_issue_for_urgency(category, target_urgency):
    """Ambil contoh isu yang urgency bawaannya paling dekat dengan target;
    kalau tidak ada yang persis sama, ambil acak saja supaya tetap variatif."""
    issues = CATEGORY_CONFIG[category]["issues"]
    same_level = [i for i in issues if i[1] == target_urgency]
    pool = same_level if same_level else issues
    return RNG.choice(pool)


def seasonal_weight(date, category):
    """Beberapa kategori punya pola musiman relevan dengan kalender
    akademik (disederhanakan, tidak mengacu tanggal akademik riil)."""
    month = date.month
    if category == "Keuangan" and month in (2, 3, 8, 9):  # awal semester
        return 2.2
    if category == "Akademik" and month in (1, 6, 7, 12):  # ujian
        return 1.8
    if category == "Beasiswa" and month in (2, 8):
        return 1.6
    return 1.0


def random_date(start, end, category):
    """Sampling tanggal dengan bobot musiman sederhana per kategori."""
    span_days = (end - start).days
    for _ in range(5):  # rejection sampling ringan
        d = start + timedelta(days=RNG.randint(0, span_days))
        if RNG.random() < min(seasonal_weight(d, category) / 2.5, 1.0):
            return d
    return start + timedelta(days=RNG.randint(0, span_days))


def wrap_text(issue_text, channel):
    if channel in ("Email", "Web Form", "Kotak Saran"):
        opener = RNG.choice(OPENERS_FORMAL)
    else:
        opener = RNG.choice(OPENERS_INFORMAL)
    closer = RNG.choice(CLOSERS)

    if opener:
        first_word = issue_text.split(" ", 1)[0]
        if first_word.isupper() and len(first_word) > 1:
            body = issue_text  # jaga akronim seperti AC/UKT/KTM agar tidak rusak
        else:
            body = issue_text[0].lower() + issue_text[1:]
        text = opener + body
    else:
        text = issue_text

    if closer:
        if not text.rstrip().endswith((".", "!", "?")):
            text = text.rstrip() + "."
        text += closer

    return apply_channel_style(text, channel)


def determine_status_and_resolution(tanggal_masuk, urgency, today, breach_rate=0.18):
    """Tentukan status tiket dan (jika selesai) tanggal penyelesaian, dengan
    sebagian sengaja melewati SLA untuk menguji fitur SLA analytics."""
    sla_days = SLA_DAYS[urgency]
    target_sla = tanggal_masuk + timedelta(days=sla_days)
    age_days = (today - tanggal_masuk).days

    # semakin lama umur tiket, semakin besar peluang sudah selesai/ditolak
    p_selesai = min(0.15 + age_days / 60, 0.92)
    roll = RNG.random()

    if roll < p_selesai * 0.9:
        status = "Selesai"
        breach = RNG.random() < breach_rate
        if breach:
            delay = RNG.randint(1, sla_days * 3 + 2)
            tanggal_selesai = target_sla + timedelta(days=delay)
        else:
            tanggal_selesai = tanggal_masuk + timedelta(
                days=RNG.randint(0, max(sla_days - 1, 0)) if sla_days > 1 else 0
            )
        if tanggal_selesai > today:
            tanggal_selesai = today
    elif roll < p_selesai * 0.9 + 0.05:
        status = "Ditolak"
        tanggal_selesai = min(tanggal_masuk + timedelta(days=RNG.randint(1, sla_days + 3)), today)
    elif age_days > 2 and RNG.random() < 0.5:
        status = "Diproses"
        tanggal_selesai = pd.NaT
    else:
        status = "Baru"
        tanggal_selesai = pd.NaT

    sla_breach = None
    if status in ("Selesai", "Ditolak") and pd.notna(tanggal_selesai):
        sla_breach = bool(tanggal_selesai > target_sla)
    else:
        sla_breach = bool(today > target_sla)  # masih terbuka & sudah lewat target

    return status, target_sla, tanggal_selesai, sla_breach


# =====================================================================
# 4. GENERATOR UTAMA
# =====================================================================

def generate_row(idx, start_date, end_date, today):
    category = sample_category()
    urgency = sample_urgency(category)
    issue_text, base_urgency = pick_issue_for_urgency(category, urgency)
    is_appreciation = "terima kasih" in issue_text.lower() and RNG.random() < 0.8

    sentiment, sentiment_score = sentiment_for_issue(urgency, is_appreciation)
    urgency_score = urgency_score_for(urgency)

    channel = RNG.choices(CHANNELS, weights=CHANNEL_WEIGHTS, k=1)[0]
    stakeholder = sample_stakeholder(category)
    tanggal_masuk = random_date(start_date, end_date, category)

    filled = fill_placeholders(issue_text)
    text = wrap_text(filled, channel)
    text = maybe_inject_pii(text)

    status, target_sla, tanggal_selesai, sla_breach = determine_status_and_resolution(
        tanggal_masuk, urgency, today
    )

    # channel kadang kosong (data lapangan yang tidak lengkap)
    channel_out = channel if RNG.random() > 0.02 else np.nan

    return {
        "id_aduan": f"SL-{idx:06d}",
        "tanggal_masuk": tanggal_masuk.strftime("%Y-%m-%d"),
        "kanal": channel_out,
        "stakeholder_type": stakeholder,
        "teks_aduan": text,
        # ground truth (hanya ada di dataset simulasi):
        "kategori_true": category,
        "urgency_label_true": urgency,
        "urgency_score_true": urgency_score,
        "sentiment_true": sentiment,
        "sentiment_score_true": sentiment_score,
        "status": status,
        "tanggal_target_sla": target_sla.strftime("%Y-%m-%d"),
        "tanggal_selesai": tanggal_selesai.strftime("%Y-%m-%d") if pd.notna(tanggal_selesai) else "",
        "sla_breach_true": sla_breach,
    }


def inject_duplicates(df, dup_rate=0.03, seed=42):
    """Tambahkan near-duplikat: simulasi banyak orang melapor masalah yang
    sama di hari yang sama (mis. wifi mati massal) -> menguji tahap dedup."""
    rng = np.random.default_rng(seed)
    n_dup = int(len(df) * dup_rate)
    dup_rows = df.sample(n=n_dup, random_state=seed).copy()
    dup_rows["id_aduan"] = [f"SL-{100000+i:06d}" for i in range(len(dup_rows))]
    # variasi kecil pada teks supaya "near"-duplicate, bukan identik 100%
    dup_rows["teks_aduan"] = dup_rows["teks_aduan"].apply(
        lambda t: t + RNG.choice(["", " Mohon dicek juga.", " Sama seperti yang lain."])
    )
    return pd.concat([df, dup_rows], ignore_index=True)


def main():
    parser = argparse.ArgumentParser(description="Generate dummy data SuaraLens")
    parser.add_argument("--n", type=int, default=5000, help="Jumlah baris dasar (sebelum duplikat)")
    parser.add_argument("--months", type=int, default=6, help="Rentang bulan ke belakang dari hari ini")
    parser.add_argument("--seed", type=int, default=42, help="Random seed untuk reproducibility")
    parser.add_argument("--outdir", type=str, default=".", help="Folder output")
    args = parser.parse_args()

    RNG.seed(args.seed)
    np.random.seed(args.seed)

    today = datetime.now()
    start_date = today - timedelta(days=30 * args.months)

    rows = [generate_row(i, start_date, today, today) for i in range(1, args.n + 1)]
    df = pd.DataFrame(rows)
    df = inject_duplicates(df, dup_rate=0.03, seed=args.seed)
    df = df.sample(frac=1, random_state=args.seed).reset_index(drop=True)  # acak urutan

    # ---------- Dataset 1: SIMULASI (dengan ground truth) ----------
    sim_path = f"{args.outdir}/suaralens_dummy_simulasi.csv"
    df.to_csv(sim_path, index=False)

    # ---------- Dataset 2: UJI (raw saja, tanpa label) ----------
    raw_cols = ["id_aduan", "tanggal_masuk", "kanal", "stakeholder_type", "teks_aduan"]
    df_raw = df[raw_cols].copy()
    uji_path = f"{args.outdir}/suaralens_dummy_uji.csv"
    df_raw.to_csv(uji_path, index=False)

    # ---------- Ringkasan singkat untuk sanity check ----------
    print(f"Total baris (setelah duplikat): {len(df)}")
    print(f"Rentang tanggal: {df['tanggal_masuk'].min()} s.d. {df['tanggal_masuk'].max()}")
    print("\nDistribusi kategori:")
    print(df["kategori_true"].value_counts())
    print("\nDistribusi urgency:")
    print(df["urgency_label_true"].value_counts())
    print("\nDistribusi sentiment:")
    print(df["sentiment_true"].value_counts())
    print("\nDistribusi status:")
    print(df["status"].value_counts())
    print(f"\nProporsi SLA breach (true): {df['sla_breach_true'].mean():.2%}")
    print(f"\nDisimpan ke:\n  - {sim_path}\n  - {uji_path}")


if __name__ == "__main__":
    main()
