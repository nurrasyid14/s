import api from './api.js'
import { UNITS } from '../data/units.js'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

/**
 * Standard 7 Workflow Stages for Aduan (Complaints)
 */
export const COMPLAINT_STAGES = [
  { key: 'received',     step: 1, label: 'Diterima',       desc: 'Aduan masuk, antrean validasi awal', color: 'sky' },
  { key: 'verified',     step: 2, label: 'Diverifikasi',   desc: 'Diverifikasi Admin Sentral PENS', color: 'purple' },
  { key: 'dispatched',   step: 3, label: 'Didisposisikan', desc: 'Diteruskan ke Unit Pelaksana terkait', color: 'amber' },
  { key: 'in_progress',  step: 4, label: 'Diproses',       desc: 'Unit memulai telaah & penugasan PIC', color: 'orange' },
  { key: 'action_taken', step: 5, label: 'Ditindaklanjuti',desc: 'Aksi teknis perbaikan / lapangan', color: 'teal' },
  { key: 'answered',     step: 6, label: 'Dijawab',        desc: 'Tanggapan & klarifikasi resmi unit', color: 'indigo' },
  { key: 'resolved',     step: 7, label: 'Selesai',        desc: 'Tuntas diselesaikan & evaluasi kepuasan', color: 'emerald' },
]

/**
 * Streamlined 4 Workflow Stages for Masukan (Feedback) & Saran (Suggestions)
 * Alur ringkas/evaluatif: Diterima -> Ditinjau Unit -> Dijawab Resmi -> Selesai
 */
export const STREAMLINED_STAGES = [
  { key: 'received', step: 1, label: 'Diterima', desc: 'Masukan/saran masuk ke sistem', color: 'sky' },
  { key: 'verified', step: 2, label: 'Ditinjau Unit', desc: 'Ditinjau & dievaluasi oleh tim unit', color: 'purple' },
  { key: 'answered', step: 3, label: 'Dijawab Resmi', desc: 'Tanggapan & apresiasi resmi unit diterbitkan', color: 'indigo' },
  { key: 'resolved', step: 4, label: 'Selesai & Dicatat', desc: 'Dicatat dalam bank aspirasi perbaikan mutu', color: 'emerald' },
]

// Backward compatibility
export const STAGES = COMPLAINT_STAGES

/**
 * 3 Tipe Pengajuan SuaraLens
 */
export const SUBMISSION_TYPES = [
  { key: 'all',        label: 'Semua Jenis',  badgeColor: 'blue',   icon: 'Layers' },
  { key: 'complaint',  label: 'Aduan',        badgeColor: 'rose',   icon: 'AlertTriangle', desc: 'Masalah/keluhan yang butuh penanganan (7 Tahap SLA)' },
  { key: 'feedback',   label: 'Masukan',      badgeColor: 'sky',    icon: 'MessageCircle', desc: 'Ulasan & evaluasi layanan kampus (Alur Ringkas)' },
  { key: 'suggestion', label: 'Saran',        badgeColor: 'amber',  icon: 'Lightbulb',     desc: 'Ide baru & usulan inovasi (Alur Ringkas)' },
]

/**
 * Benchmark data per unit terkalibrasi dengan 14 unit standar PENS
 */
const DEFAULT_UNIT_DATA = {
  'Sarana Prasarana dan Layanan Umum': {
    total: 68,
    types: { complaint: 48, feedback: 14, suggestion: 6 },
    stages: { received: 2, verified: 3, dispatched: 5, in_progress: 11, action_taken: 8, answered: 7, resolved: 32 },
    avgResolutionDays: 1.6,
    slaTargetDays: 2,
    slaComplianceRate: 95.6,
    rating: 4.8,
    topCategories: ['Fasilitas Fisik', 'AC/Listrik', 'Kebersihan', 'Parkir'],
  },
  'TIK/Sistem Informasi': {
    total: 46,
    types: { complaint: 32, feedback: 9, suggestion: 5 },
    stages: { received: 1, verified: 2, dispatched: 3, in_progress: 7, action_taken: 5, answered: 6, resolved: 22 },
    avgResolutionDays: 1.7,
    slaTargetDays: 2,
    slaComplianceRate: 93.5,
    rating: 4.7,
    topCategories: ['Jaringan WiFi', 'SIAKAD', 'Server Lab', 'Akun Kampus'],
  },
  'Akademik': {
    total: 38,
    types: { complaint: 24, feedback: 10, suggestion: 4 },
    stages: { received: 1, verified: 1, dispatched: 4, in_progress: 6, action_taken: 3, answered: 5, resolved: 18 },
    avgResolutionDays: 2.3,
    slaTargetDays: 3,
    slaComplianceRate: 92.1,
    rating: 4.6,
    topCategories: ['KRS & Nilai', 'Jadwal Kuliah', 'Transkrip', 'Yudisium'],
  },
  'Kemahasiswaan': {
    total: 29,
    types: { complaint: 16, feedback: 8, suggestion: 5 },
    stages: { received: 1, verified: 1, dispatched: 2, in_progress: 4, action_taken: 2, answered: 4, resolved: 15 },
    avgResolutionDays: 2.4,
    slaTargetDays: 3,
    slaComplianceRate: 94.0,
    rating: 4.9,
    topCategories: ['Beasiswa', 'Ormawa/UKM', 'Lomba & Prestasi', 'Asrama'],
  },
  'Keuangan': {
    total: 19,
    types: { complaint: 14, feedback: 3, suggestion: 2 },
    stages: { received: 0, verified: 1, dispatched: 2, in_progress: 3, action_taken: 1, answered: 2, resolved: 10 },
    avgResolutionDays: 2.2,
    slaTargetDays: 3,
    slaComplianceRate: 91.5,
    rating: 4.5,
    topCategories: ['Pembayaran UKT', 'Sinkronisasi Bank', 'Restitusi', 'Slip'],
  },
  'Perpustakaan': {
    total: 14,
    types: { complaint: 7, feedback: 4, suggestion: 3 },
    stages: { received: 0, verified: 0, dispatched: 1, in_progress: 2, action_taken: 1, answered: 2, resolved: 8 },
    avgResolutionDays: 1.4,
    slaTargetDays: 2,
    slaComplianceRate: 98.2,
    rating: 4.9,
    topCategories: ['Repositori Tugas Akhir', 'Peminjaman Buku', 'E-Journal', 'Bebas Pustaka'],
  },
  'Laboratorium/Jurusan': {
    total: 12,
    types: { complaint: 9, feedback: 2, suggestion: 1 },
    stages: { received: 0, verified: 1, dispatched: 1, in_progress: 2, action_taken: 2, answered: 1, resolved: 5 },
    avgResolutionDays: 1.8,
    slaTargetDays: 2,
    slaComplianceRate: 91.7,
    rating: 4.7,
    topCategories: ['Kalibrasi Alat', 'Komponen Praktikum', 'Jadwal Lab'],
  },
  'Ukarni dan Hubungan Alumni': {
    total: 8,
    types: { complaint: 4, feedback: 2, suggestion: 2 },
    stages: { received: 0, verified: 0, dispatched: 1, in_progress: 1, action_taken: 1, answered: 1, resolved: 4 },
    avgResolutionDays: 2.5,
    slaTargetDays: 3,
    slaComplianceRate: 92.0,
    rating: 4.8,
    topCategories: ['Info Magang BUMN', 'Tracer Study', 'Legalisir Ijazah'],
  },
  'Keamanan dan Ketertiban': {
    total: 7,
    types: { complaint: 5, feedback: 1, suggestion: 1 },
    stages: { received: 0, verified: 0, dispatched: 1, in_progress: 1, action_taken: 1, answered: 1, resolved: 3 },
    avgResolutionDays: 0.8,
    slaTargetDays: 1,
    slaComplianceRate: 96.5,
    rating: 4.8,
    topCategories: ['Penerangan Parkir', 'Ketertiban Helm', 'Akses Pos Masuk'],
  },
  'SDM/Kepegawaian': {
    total: 5,
    types: { complaint: 3, feedback: 1, suggestion: 1 },
    stages: { received: 0, verified: 0, dispatched: 1, in_progress: 1, action_taken: 0, answered: 1, resolved: 2 },
    avgResolutionDays: 2.1,
    slaTargetDays: 3,
    slaComplianceRate: 90.0,
    rating: 4.6,
    topCategories: ['Pelayanan Loket', 'Presensi', 'Surat Pengantar Dosen'],
  },
  'Kerjasama dan Hubungan Eksternal': {
    total: 4,
    types: { complaint: 2, feedback: 1, suggestion: 1 },
    stages: { received: 0, verified: 0, dispatched: 0, in_progress: 1, action_taken: 1, answered: 1, resolved: 1 },
    avgResolutionDays: 3.1,
    slaTargetDays: 4,
    slaComplianceRate: 92.5,
    rating: 4.7,
    topCategories: ['MoU Magang Mandiri', 'Pertukaran Pelajar'],
  },
  'Informasi Publik/PPID': {
    total: 3,
    types: { complaint: 1, feedback: 1, suggestion: 1 },
    stages: { received: 0, verified: 0, dispatched: 0, in_progress: 1, action_taken: 0, answered: 1, resolved: 1 },
    avgResolutionDays: 2.0,
    slaTargetDays: 3,
    slaComplianceRate: 95.0,
    rating: 4.8,
    topCategories: ['Dokumen Publik', 'Permohonan Data Terbuka'],
  },
  'Pimpinan/Manajemen': {
    total: 3,
    types: { complaint: 1, feedback: 0, suggestion: 2 },
    stages: { received: 0, verified: 0, dispatched: 0, in_progress: 1, action_taken: 0, answered: 1, resolved: 1 },
    avgResolutionDays: 3.8,
    slaTargetDays: 5,
    slaComplianceRate: 94.0,
    rating: 4.9,
    topCategories: ['Kebijakan Kampus', 'Jam Operasional Fasilitas'],
  },
  'Lainnya/Lintas Unit': {
    total: 3,
    types: { complaint: 1, feedback: 1, suggestion: 1 },
    stages: { received: 0, verified: 0, dispatched: 0, in_progress: 1, action_taken: 0, answered: 1, resolved: 1 },
    avgResolutionDays: 2.2,
    slaTargetDays: 3,
    slaComplianceRate: 90.0,
    rating: 4.7,
    topCategories: ['Peminjaman Aula Kolaborasi', 'Koordinasi Lintas Unit'],
  },
}

/**
 * Fetch and assemble student transparency analytics with 3-type breakdown
 */
export async function getStudentDashboardData() {
  if (!USE_MOCK) {
    try {
      const res = await api.get('/student/dashboard')
      if (res.data?.status && res.data?.summary) {
        return res.data
      }
    } catch (e) {
      console.warn('Gagal memuat dashboard mahasiswa dari backend API, menggunakan benchmark lokal:', e)
    }
  }

  let localComplaints = []
  try {
    const raw = localStorage.getItem('suaralens_mock_complaints_v2')
    if (raw) localComplaints = JSON.parse(raw)
  } catch {
    // ignore
  }

  const unitMap = {}
  UNITS.forEach(u => {
    const bench = DEFAULT_UNIT_DATA[u.name] || {
      total: 2,
      types: { complaint: 1, feedback: 1, suggestion: 0 },
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
      types: { ...bench.types },
      stages: { ...bench.stages },
      avgResolutionDays: bench.avgResolutionDays,
      slaComplianceRate: bench.slaComplianceRate,
      rating: bench.rating,
      topCategories: bench.topCategories,
    }
  })

  // Sinkronisasi aduan lokal baru jika ada
  if (localComplaints.length > 0) {
    localComplaints.forEach(c => {
      const uName = c.target_unit || c.unit
      if (unitMap[uName]) {
        const typeKey = ['complaint', 'feedback', 'suggestion'].includes(c.type) ? c.type : 'complaint'
        unitMap[uName].types[typeKey] = (unitMap[uName].types[typeKey] || 0) + 1
        unitMap[uName].total += 1
        if (c.status && unitMap[uName].stages[c.status] !== undefined) {
          unitMap[uName].stages[c.status] += 1
        }
      }
    })
  }

  // Agregasi Total Kampus
  let campusTotal = 0
  let campusResolved = 0
  let campusActive = 0
  let campusReceived = 0

  const typeTotals = {
    complaint: 0,
    feedback: 0,
    suggestion: 0,
  }

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

    typeTotals.complaint += (u.types.complaint || 0)
    typeTotals.feedback += (u.types.feedback || 0)
    typeTotals.suggestion += (u.types.suggestion || 0)

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

  unitList.sort((a, b) => b.total - a.total)

  // Distribusi per unit
  const unitDistribution = unitList.map(u => ({
    name: u.name,
    code: u.code,
    count: u.total,
    types: u.types,
    percentage: campusTotal > 0 ? Math.round((u.total / campusTotal) * 1000) / 10 : 0,
    resolved: u.stages.resolved,
    inProgress: u.activeCount,
    slaRate: u.slaComplianceRate,
    topCategories: u.topCategories,
  }))

  const avgSlaCompliance = Math.round(
    unitList.reduce((acc, u) => acc + u.slaComplianceRate, 0) / unitList.length * 10
  ) / 10

  const avgResolutionDays = Math.round(
    unitList.reduce((acc, u) => acc + u.avgResolutionDays, 0) / unitList.length * 10
  ) / 10

  const avgSatisfaction = Math.round(
    unitList.reduce((acc, u) => acc + u.rating, 0) / unitList.length * 10
  ) / 10

  // 3 Types Summary Cards Data
  const typesBreakdown = {
    complaint: {
      count: typeTotals.complaint,
      pct: Math.round((typeTotals.complaint / Math.max(1, campusTotal)) * 100),
      label: 'Aduan',
      sublabel: 'Isu teknis & fasilitas (7 Tahap SLA)',
      badgeColor: 'rose',
    },
    feedback: {
      count: typeTotals.feedback,
      pct: Math.round((typeTotals.feedback / Math.max(1, campusTotal)) * 100),
      label: 'Masukan',
      sublabel: 'Evaluasi mutu layanan (Alur Ringkas)',
      badgeColor: 'sky',
    },
    suggestion: {
      count: typeTotals.suggestion,
      pct: Math.round((typeTotals.suggestion / Math.max(1, campusTotal)) * 100),
      label: 'Saran',
      sublabel: 'Ide & usulan inovasi (Alur Ringkas)',
      badgeColor: 'amber',
    },
  }

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
      types: typesBreakdown,
    },
    typesBreakdown,
    globalStages,
    stagesList: COMPLAINT_STAGES.map(s => ({
      ...s,
      count: globalStages[s.key] || 0,
      pct: Math.round(((globalStages[s.key] || 0) / Math.max(1, campusTotal)) * 100),
    })),
    streamlinedStagesList: STREAMLINED_STAGES.map(s => {
      // Map stages for streamlined view:
      // received -> received
      // verified -> verified + dispatched + in_progress
      // answered -> action_taken + answered
      // resolved -> resolved
      let count = 0
      if (s.key === 'received') count = globalStages.received
      else if (s.key === 'verified') count = globalStages.verified + globalStages.dispatched
      else if (s.key === 'answered') count = globalStages.in_progress + globalStages.action_taken + globalStages.answered
      else if (s.key === 'resolved') count = globalStages.resolved

      return {
        ...s,
        count,
        pct: Math.round((count / Math.max(1, campusTotal)) * 100),
      }
    }),
    units: unitList,
    distribution: unitDistribution,
  }
}
