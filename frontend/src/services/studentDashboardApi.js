import { UNITS } from '../data/units.js'

/**
 * Standard 7 Workflow Stages of SuaraLens
 */
export const STAGES = [
  { key: 'received',     step: 1, label: 'Diterima',       desc: 'Aduan masuk, menunggu verifikasi awal', color: 'sky' },
  { key: 'verified',     step: 2, label: 'Diverifikasi',   desc: 'Diverifikasi keabsahannya oleh Admin Sentral', color: 'purple' },
  { key: 'dispatched',   step: 3, label: 'Didisposisikan', desc: 'Diteruskan ke Unit Kerja terkait', color: 'amber' },
  { key: 'in_progress',  step: 4, label: 'Diproses',       desc: 'Unit memulai penelaahan dan penugasan PIC', color: 'orange' },
  { key: 'action_taken', step: 5, label: 'Ditindaklanjuti',desc: 'Aksi teknis perbaikan / investigasi lapangan', color: 'teal' },
  { key: 'answered',     step: 6, label: 'Dijawab',        desc: 'Unit menerbitkan jawaban dan klarifikasi resmi', color: 'indigo' },
  { key: 'resolved',     step: 7, label: 'Selesai',        desc: 'Keluhan tuntas ditangani dan dievaluasi', color: 'emerald' },
]

/**
 * Benchmark data per unit (terkalibrasi dengan 14 unit standar PENS)
 */
const DEFAULT_UNIT_DATA = {
  'Sarana Prasarana dan Layanan Umum': {
    total: 68,
    stages: { received: 2, verified: 3, dispatched: 5, in_progress: 11, action_taken: 8, answered: 7, resolved: 32 },
    avgResolutionDays: 1.6,
    slaTargetDays: 2,
    slaComplianceRate: 95.6,
    rating: 4.8,
    topCategories: ['Fasilitas Fisik', 'AC/Listrik', 'Kebersihan', 'Parkir'],
  },
  'TIK/Sistem Informasi': {
    total: 46,
    stages: { received: 1, verified: 2, dispatched: 3, in_progress: 7, action_taken: 5, answered: 6, resolved: 22 },
    avgResolutionDays: 1.7,
    slaTargetDays: 2,
    slaComplianceRate: 93.5,
    rating: 4.7,
    topCategories: ['Jaringan WiFi', 'SIAKAD', 'Server Lab', 'Akun Kampus'],
  },
  'Akademik': {
    total: 38,
    stages: { received: 1, verified: 1, dispatched: 4, in_progress: 6, action_taken: 3, answered: 5, resolved: 18 },
    avgResolutionDays: 2.3,
    slaTargetDays: 3,
    slaComplianceRate: 92.1,
    rating: 4.6,
    topCategories: ['KRS & Nilai', 'Jadwal Kuliah', 'Transkrip', 'Yudisium'],
  },
  'Kemahasiswaan': {
    total: 29,
    stages: { received: 1, verified: 1, dispatched: 2, in_progress: 4, action_taken: 2, answered: 4, resolved: 15 },
    avgResolutionDays: 2.4,
    slaTargetDays: 3,
    slaComplianceRate: 94.0,
    rating: 4.9,
    topCategories: ['Beasiswa', 'Ormawa/UKM', 'Lomba & Prestasi', 'Asrama'],
  },
  'Keuangan': {
    total: 19,
    stages: { received: 0, verified: 1, dispatched: 2, in_progress: 3, action_taken: 1, answered: 2, resolved: 10 },
    avgResolutionDays: 2.2,
    slaTargetDays: 3,
    slaComplianceRate: 91.5,
    rating: 4.5,
    topCategories: ['Pembayaran UKT', 'Sinkronisasi Bank', 'Restitusi', 'Slip'],
  },
  'Perpustakaan': {
    total: 14,
    stages: { received: 0, verified: 0, dispatched: 1, in_progress: 2, action_taken: 1, answered: 2, resolved: 8 },
    avgResolutionDays: 1.4,
    slaTargetDays: 2,
    slaComplianceRate: 98.2,
    rating: 4.9,
    topCategories: ['Repositori Tugas Akhir', 'Peminjaman Buku', 'E-Journal', 'Bebas Pustaka'],
  },
  'Laboratorium/Jurusan': {
    total: 12,
    stages: { received: 0, verified: 1, dispatched: 1, in_progress: 2, action_taken: 2, answered: 1, resolved: 5 },
    avgResolutionDays: 1.8,
    slaTargetDays: 2,
    slaComplianceRate: 91.7,
    rating: 4.7,
    topCategories: ['Kalibrasi Alat', 'Komponen Praktikum', 'Jadwal Lab'],
  },
  'Ukarni dan Hubungan Alumni': {
    total: 8,
    stages: { received: 0, verified: 0, dispatched: 1, in_progress: 1, action_taken: 1, answered: 1, resolved: 4 },
    avgResolutionDays: 2.5,
    slaTargetDays: 3,
    slaComplianceRate: 92.0,
    rating: 4.8,
    topCategories: ['Info Magang BUMN', 'Tracer Study', 'Legalisir Ijazah'],
  },
  'Keamanan dan Ketertiban': {
    total: 7,
    stages: { received: 0, verified: 0, dispatched: 1, in_progress: 1, action_taken: 1, answered: 1, resolved: 3 },
    avgResolutionDays: 0.8,
    slaTargetDays: 1,
    slaComplianceRate: 96.5,
    rating: 4.8,
    topCategories: ['Penerangan Parkir', 'Ketertiban Helm', 'Akses Pos Masuk'],
  },
  'SDM/Kepegawaian': {
    total: 5,
    stages: { received: 0, verified: 0, dispatched: 1, in_progress: 1, action_taken: 0, answered: 1, resolved: 2 },
    avgResolutionDays: 2.1,
    slaTargetDays: 3,
    slaComplianceRate: 90.0,
    rating: 4.6,
    topCategories: ['Pelayanan Loket', 'Presensi', 'Surat Pengantar Dosen'],
  },
  'Kerjasama dan Hubungan Eksternal': {
    total: 4,
    stages: { received: 0, verified: 0, dispatched: 0, in_progress: 1, action_taken: 1, answered: 1, resolved: 1 },
    avgResolutionDays: 3.1,
    slaTargetDays: 4,
    slaComplianceRate: 92.5,
    rating: 4.7,
    topCategories: ['MoU Magang Mandiri', 'Pertukaran Pelajar'],
  },
  'Informasi Publik/PPID': {
    total: 3,
    stages: { received: 0, verified: 0, dispatched: 0, in_progress: 1, action_taken: 0, answered: 1, resolved: 1 },
    avgResolutionDays: 2.0,
    slaTargetDays: 3,
    slaComplianceRate: 95.0,
    rating: 4.8,
    topCategories: ['Dokumen Publik', 'Permohonan Data Terbuka'],
  },
  'Pimpinan/Manajemen': {
    total: 3,
    stages: { received: 0, verified: 0, dispatched: 0, in_progress: 1, action_taken: 0, answered: 1, resolved: 1 },
    avgResolutionDays: 3.8,
    slaTargetDays: 5,
    slaComplianceRate: 94.0,
    rating: 4.9,
    topCategories: ['Kebijakan Kampus', 'Jam Operasional Fasilitas'],
  },
  'Lainnya/Lintas Unit': {
    total: 3,
    stages: { received: 0, verified: 0, dispatched: 0, in_progress: 1, action_taken: 0, answered: 1, resolved: 1 },
    avgResolutionDays: 2.2,
    slaTargetDays: 3,
    slaComplianceRate: 90.0,
    rating: 4.7,
    topCategories: ['Peminjaman Aula Kolaborasi', 'Koordinasi Lintas Unit'],
  },
}

/**
 * Fetch and assemble student transparency analytics
 */
export async function getStudentDashboardData() {
  // Ambil data aduan aktif dari localStorage bila ada
  let localComplaints = []
  try {
    const raw = localStorage.getItem('suaralens_mock_complaints_v2')
    if (raw) localComplaints = JSON.parse(raw)
  } catch {
    // ignore
  }

  // Clone dataset dasar
  const unitMap = {}
  UNITS.forEach(u => {
    const bench = DEFAULT_UNIT_DATA[u.name] || {
      total: 2,
      stages: { received: 0, verified: 0, dispatched: 0, in_progress: 1, action_taken: 0, answered: 0, resolved: 1 },
      avgResolutionDays: 2.0,
      slaTargetDays: u.slaDays || 3,
      slaComplianceRate: 90,
      rating: 4.7,
      topCategories: ['Layanan Umum'],
    }

    unitMap[u.name] = {
      id: u.id,
      code: u.code,
      name: u.name,
      desc: u.desc,
      slaTargetDays: u.slaDays || bench.slaTargetDays,
      total: bench.total,
      stages: { ...bench.stages },
      avgResolutionDays: bench.avgResolutionDays,
      slaComplianceRate: bench.slaComplianceRate,
      rating: bench.rating,
      topCategories: bench.topCategories,
    }
  })

  // Jika ada aduan lokal baru, update stage counter secara real-time
  if (localComplaints.length > 0) {
    localComplaints.forEach(c => {
      const uName = c.target_unit || c.unit
      if (unitMap[uName] && c.status) {
        // Increment stage
        if (unitMap[uName].stages[c.status] !== undefined) {
          unitMap[uName].stages[c.status] += 1
          unitMap[uName].total += 1
        }
      }
    })
  }

  // Hitung total agregat keseluruhan kampus
  let campusTotal = 0
  let campusResolved = 0
  let campusActive = 0
  let campusReceived = 0
  const globalStages = {
    received: 0,
    verified: 0,
    dispatched: 0,
    in_progress: 0,
    action_taken: 0,
    answered: 0,
    resolved: 0,
  }

  const unitList = Object.values(unitMap).map(u => {
    campusTotal += u.total
    campusResolved += u.stages.resolved
    campusActive += (u.stages.dispatched + u.stages.in_progress + u.stages.action_taken)
    campusReceived += (u.stages.received + u.stages.verified)

    // Agregasi stage
    Object.keys(globalStages).forEach(stg => {
      globalStages[stg] += (u.stages[stg] || 0)
    })

    const activeCount = u.stages.dispatched + u.stages.in_progress + u.stages.action_taken
    const resolvedCount = u.stages.resolved

    let statusHealth = 'optimal'
    if (u.slaComplianceRate < 90) statusHealth = 'attention'
    else if (u.slaComplianceRate >= 95) statusHealth = 'excellent'

    return {
      ...u,
      activeCount,
      resolvedCount,
      statusHealth,
    }
  })

  // Urutkan unit berdasarkan volume aduan (terbanyak ke tersedikit)
  unitList.sort((a, b) => b.total - a.total)

  // Hitung persentase distribusi
  const unitDistribution = unitList.map(u => ({
    name: u.name,
    code: u.code,
    count: u.total,
    percentage: campusTotal > 0 ? Math.round((u.total / campusTotal) * 1000) / 10 : 0,
    resolved: u.stages.resolved,
    inProgress: u.activeCount,
    slaRate: u.slaComplianceRate,
    topCategories: u.topCategories,
  }))

  // Hitung rata-rata kinerja kampus
  const avgSlaCompliance = Math.round(
    unitList.reduce((acc, u) => acc + u.slaComplianceRate, 0) / unitList.length * 10
  ) / 10

  const avgResolutionDays = Math.round(
    unitList.reduce((acc, u) => acc + u.avgResolutionDays, 0) / unitList.length * 10
  ) / 10

  const avgSatisfaction = Math.round(
    unitList.reduce((acc, u) => acc + u.rating, 0) / unitList.length * 10
  ) / 10

  return {
    summary: {
      total: campusTotal,
      resolved: campusResolved,
      active: campusActive,
      received: campusReceived,
      slaComplianceRate: avgSlaCompliance,
      avgResolutionDays: avgResolutionDays,
      avgRating: avgSatisfaction,
      completionRate: Math.round((campusResolved / Math.max(1, campusTotal)) * 100),
    },
    globalStages,
    stagesList: STAGES.map(s => ({
      ...s,
      count: globalStages[s.key] || 0,
      pct: Math.round(((globalStages[s.key] || 0) / Math.max(1, campusTotal)) * 100),
    })),
    units: unitList,
    distribution: unitDistribution,
  }
}
