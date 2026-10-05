/**
 * Master Data: 14 Standar Unit Kerja Resmi SuaraLens (PENS)
 */

export const UNITS = [
  {
    id: 'unit-01',
    code: 'AKD',
    name: 'Akademik',
    desc: 'Administrasi perkuliahan, nilai, KRS, ijazah, yudisium, dan kurikulum',
    slaDays: 3,
  },
  {
    id: 'unit-02',
    code: 'KMH',
    name: 'Kemahasiswaan',
    desc: 'Beasiswa, ormawa, UKM, kompetisi, asrama, bina karakter mahasiswa',
    slaDays: 3,
  },
  {
    id: 'unit-03',
    code: 'KEU',
    name: 'Keuangan',
    desc: 'Pembayaran UKT, biaya kuliah, honorarium, beasiswa, restitusi',
    slaDays: 3,
  },
  {
    id: 'unit-04',
    code: 'SDM',
    name: 'SDM/Kepegawaian',
    desc: 'Layanan dosen & tendik, kenaikan pangkat, presensi, cuti, sertifikasi',
    slaDays: 3,
  },
  {
    id: 'unit-05',
    code: 'SARPRAS',
    name: 'Sarana Prasarana dan Layanan Umum',
    desc: 'Gedung, ruang kelas, AC, toilet, kebersihan, parkir, listrik & utilitas',
    slaDays: 2,
  },
  {
    id: 'unit-06',
    code: 'TIK',
    name: 'TIK/Sistem Informasi',
    desc: 'Jaringan WiFi, akun email PENS, server, SIAKAD, lab komputer & portal',
    slaDays: 2,
  },
  {
    id: 'unit-07',
    code: 'PRP',
    name: 'Perpustakaan',
    desc: 'Peminjaman buku, e-journal, bebas pustaka, ruang baca & repositori',
    slaDays: 2,
  },
  {
    id: 'unit-08',
    code: 'ALM',
    name: 'Ukarni dan Hubungan Alumni',
    desc: 'Pusat karir, magang industri, tracer study, legalisir & jejaring alumni',
    slaDays: 3,
  },
  {
    id: 'unit-09',
    code: 'LAB',
    name: 'Laboratorium/Jurusan',
    desc: 'Alat praktikum, teknisi lab, jadwal lab, pelayanan departemen/prodi',
    slaDays: 2,
  },
  {
    id: 'unit-10',
    code: 'KSE',
    name: 'Kerjasama dan Hubungan Eksternal',
    desc: 'Kemitraan industri, program pertukaran luar, MoU institusi kampus',
    slaDays: 4,
  },
  {
    id: 'unit-11',
    code: 'PID',
    name: 'Informasi Publik/PPID',
    desc: 'Permohonan data publik, keterbukaan informasi & layanan humas kampus',
    slaDays: 3,
  },
  {
    id: 'unit-12',
    code: 'KTI',
    name: 'Keamanan dan Ketertiban',
    desc: 'Keamanan pos satpam, ketertiban lingkungan, helm & kendaraan kampus',
    slaDays: 1,
  },
  {
    id: 'unit-13',
    code: 'MGT',
    name: 'Pimpinan/Manajemen',
    desc: 'Kebijakan direksi, dewan senat, audit mutu akademik & kelembagaan',
    slaDays: 5,
  },
  {
    id: 'unit-14',
    code: 'LNT',
    name: 'Lainnya/Lintas Unit',
    desc: 'Aduan kompleks yang melibatkan koordinasi gabungan lintas unit kerja',
    slaDays: 4,
  },
]

export const UNIT_NAMES = UNITS.map(u => u.name)

export function getUnitByCodeOrName(identifier) {
  if (!identifier) return null
  return UNITS.find(u => u.code === identifier || u.name.toLowerCase() === identifier.toLowerCase()) || null
}
