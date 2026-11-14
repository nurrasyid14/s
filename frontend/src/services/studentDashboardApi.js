import api from './api.js'
import { UNITS } from '../data/units.js'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

/**
 * Standard 7 Workflow Stages for Aduan (Complaints)
 * label/desc = Bahasa Indonesia, labelEn/descEn = English
 */
export const COMPLAINT_STAGES = [
  { key: 'received',     step: 1, label: 'Diterima',       labelEn: 'Received',      desc: 'Aduan masuk, antrean validasi awal', descEn: 'Report received, waiting for initial validation', color: 'sky' },
  { key: 'verified',     step: 2, label: 'Diverifikasi',   labelEn: 'Verified',      desc: 'Diverifikasi Admin Sentral PENS', descEn: 'Verified by the PENS Central Administrator', color: 'purple' },
  { key: 'dispatched',   step: 3, label: 'Didisposisikan', labelEn: 'Dispatched',    desc: 'Diteruskan ke Unit Pelaksana terkait', descEn: 'Forwarded to the responsible unit', color: 'amber' },
  { key: 'in_progress',  step: 4, label: 'Diproses',       labelEn: 'In Progress',   desc: 'Unit memulai telaah & penugasan PIC', descEn: 'Unit has started review and assigned a PIC', color: 'orange' },
  { key: 'action_taken', step: 5, label: 'Ditindaklanjuti',labelEn: 'Action Taken',  desc: 'Aksi teknis perbaikan / lapangan', descEn: 'Technical fix or field action carried out', color: 'teal' },
  { key: 'answered',     step: 6, label: 'Dijawab',        labelEn: 'Answered',      desc: 'Tanggapan & klarifikasi resmi unit', descEn: 'Official response and clarification from the unit', color: 'indigo' },
  { key: 'resolved',     step: 7, label: 'Selesai',        labelEn: 'Resolved',      desc: 'Tuntas diselesaikan & evaluasi kepuasan', descEn: 'Fully resolved and satisfaction review', color: 'emerald' },
]

/**
 * Streamlined 4 Workflow Stages for Masukan (Feedback) & Saran (Suggestions)
 * Alur ringkas/evaluatif: Diterima -> Ditinjau Unit -> Dijawab Resmi -> Selesai
 */
export const STREAMLINED_STAGES = [
  { key: 'received', step: 1, label: 'Diterima', labelEn: 'Received', desc: 'Masukan/saran masuk ke sistem', descEn: 'Feedback/suggestion received', color: 'sky' },
  { key: 'verified', step: 2, label: 'Ditinjau Unit', labelEn: 'Reviewed by Unit', desc: 'Ditinjau & dievaluasi oleh tim unit', descEn: 'Reviewed and evaluated by the unit team', color: 'purple' },
  { key: 'answered', step: 3, label: 'Dijawab Resmi', labelEn: 'Officially Answered', desc: 'Tanggapan & apresiasi resmi unit diterbitkan', descEn: 'Official response and appreciation issued by the unit', color: 'indigo' },
  { key: 'resolved', step: 4, label: 'Selesai & Dicatat', labelEn: 'Closed & Recorded', desc: 'Dicatat dalam bank aspirasi perbaikan mutu', descEn: 'Recorded in the quality improvement idea bank', color: 'emerald' },
]

// Backward compatibility
export const STAGES = COMPLAINT_STAGES

/**
 * 3 Tipe Pengajuan SuaraLens
 */
export const SUBMISSION_TYPES = [
  { key: 'all',        label: 'Semua Jenis', labelEn: 'All Types',   badgeColor: 'blue',   icon: 'Layers' },
  { key: 'complaint',  label: 'Aduan',       labelEn: 'Complaints',  badgeColor: 'rose',   icon: 'AlertTriangle', desc: 'Masalah/keluhan yang butuh penanganan (7 Tahap SLA)', descEn: 'Issues that need handling (7-stage SLA)' },
  { key: 'feedback',   label: 'Masukan',     labelEn: 'Feedback',    badgeColor: 'sky',    icon: 'MessageCircle', desc: 'Ulasan & evaluasi layanan kampus (Alur Ringkas)', descEn: 'Reviews and evaluation of campus services (streamlined flow)' },
  { key: 'suggestion', label: 'Saran',       labelEn: 'Suggestions', badgeColor: 'amber',  icon: 'Lightbulb',     desc: 'Ide baru & usulan inovasi (Alur Ringkas)', descEn: 'New ideas and innovation proposals (streamlined flow)' },
]

/**
 * Ambil data dashboard mahasiswa dari backend (GET /student/dashboard).
 * Tidak ada data benchmark/dummy: jika backend gagal, error dilempar
 * agar halaman menampilkan status error, bukan angka karangan.
 */
export async function getStudentDashboardData() {
  if (USE_MOCK) return buildEmptyDashboard()

  const res = await api.get('/student/dashboard')
  if (!res.data?.status || !res.data?.summary) {
    throw new Error('Respons dashboard mahasiswa tidak valid')
  }
  return res.data
}

/**
 * Struktur dashboard dengan seluruh nilai 0, dipakai hanya pada mode mock.
 */
function buildEmptyDashboard() {
  const zeroStages = () => ({
    received: 0, verified: 0, dispatched: 0, in_progress: 0,
    action_taken: 0, answered: 0, resolved: 0,
  })
  const zeroTypeStages = () => ({
    complaint: zeroStages(), feedback: zeroStages(), suggestion: zeroStages(),
  })

  const typesBreakdown = {
    complaint: { count: 0, pct: 0, label: 'Aduan', sublabel: 'Isu teknis & fasilitas (7 Tahap SLA)', badgeColor: 'rose' },
    feedback:  { count: 0, pct: 0, label: 'Masukan', sublabel: 'Evaluasi mutu layanan (Alur Ringkas)', badgeColor: 'sky' },
    suggestion:{ count: 0, pct: 0, label: 'Saran', sublabel: 'Ide & usulan inovasi (Alur Ringkas)', badgeColor: 'amber' },
  }

  const units = UNITS.map(u => ({
    id: u.id,
    code: u.code,
    name: u.name,
    desc: u.desc,
    slaTargetDays: u.slaDays || 0,
    total: 0,
    types: { complaint: 0, feedback: 0, suggestion: 0 },
    stages: zeroStages(),
    typeStages: zeroTypeStages(),
    avgResolutionDays: 0,
    slaComplianceRate: 0,
    rating: 0,
    topCategories: [],
    activeCount: 0,
    resolvedCount: 0,
    statusHealth: 'no_data',
  }))

  return {
    status: true,
    summary: {
      total: 0,
      resolved: 0,
      active: 0,
      received: 0,
      slaComplianceRate: 0,
      avgResolutionDays: 0,
      avgRating: 0,
      completionRate: 0,
      types: typesBreakdown,
    },
    typesBreakdown,
    globalStages: zeroStages(),
    globalTypeStages: zeroTypeStages(),
    stagesList: COMPLAINT_STAGES.map(s => ({ ...s, count: 0, pct: 0 })),
    streamlinedStagesList: STREAMLINED_STAGES.map(s => ({ ...s, count: 0, pct: 0 })),
    units,
    distribution: units.map(u => ({
      name: u.name,
      code: u.code,
      count: 0,
      types: { ...u.types },
      percentage: 0,
      resolved: 0,
      inProgress: 0,
      slaRate: 0,
      topCategories: [],
    })),
  }
}
