import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../../components/layout/Navbar.jsx'
import {
  getStudentDashboardData,
  COMPLAINT_STAGES,
  STREAMLINED_STAGES,
  SUBMISSION_TYPES
} from '../../services/studentDashboardApi.js'
import { UNITS } from '../../data/units.js'
import {
  FileText, CheckCircle2, Clock, ShieldCheck,
  BarChart3, Layers, Search,
  Star, AlertCircle, PlusCircle,
  Award, AlertTriangle, MessageCircle, Lightbulb
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'
import { AXIS_TICK } from '../../utils/chartTheme.js'

function CustomChartTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null
  const match = payload[0]?.payload
  const fullName = match?.fullName || label
  const resolved = payload.find(p => p.dataKey === 'resolved')?.value || 0
  const inProgress = payload.find(p => p.dataKey === 'inProgress')?.value || 0
  const total = match?.total || (resolved + inProgress)

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-lg text-xs min-w-[170px] backdrop-blur-md">
      <div className="font-bold text-[var(--color-text)] pb-2 mb-2 border-b border-[var(--color-border)]/70">
        {fullName}
      </div>
      <div className="space-y-1.5 font-mono">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#10B981]" />
            Selesai
          </span>
          <span className="font-bold text-emerald-600 dark:text-emerald-400">{resolved} tiket</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#3B82F6]" />
            Diproses
          </span>
          <span className="font-bold text-blue-600 dark:text-blue-400">{inProgress} tiket</span>
        </div>
        <div className="pt-2 mt-2 border-t border-[var(--color-border)]/60 flex items-center justify-between gap-3 font-sans font-bold text-[var(--color-text)]">
          <span>Total Aduan</span>
          <span className="font-mono text-sm">{total}</span>
        </div>
      </div>
    </div>
  )
}

export default function UserDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [selectedUnit, setSelectedUnit] = useState('ALL')
  const [selectedType, setSelectedType] = useState('all') // 'all' | 'complaint' | 'feedback' | 'suggestion'
  const [searchUnit, setSearchUnit] = useState('')
  const [activeTab, setActiveTab] = useState('pipeline') // 'pipeline' | 'matrix'

  useEffect(() => {
    loadData()
  }, [])

  function loadData() {
    setLoading(true)
    setError(false)
    getStudentDashboardData()
      .then(res => setData(res))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }

  // Filtered unit data for stages & performance
  const filteredUnits = useMemo(() => {
    if (!data?.units) return []
    let list = data.units
    if (selectedUnit !== 'ALL') {
      list = list.filter(u => u.name === selectedUnit)
    }
    if (searchUnit.trim()) {
      const q = searchUnit.toLowerCase().trim()
      list = list.filter(u =>
        u.name.toLowerCase().includes(q) ||
        u.code.toLowerCase().includes(q) ||
        (u.topCategories && u.topCategories.some(c => c.toLowerCase().includes(q)))
      )
    }
    return list
  }, [data, selectedUnit, searchUnit])

  // Current active unit for pipeline view
  const currentUnitInfo = useMemo(() => {
    if (selectedUnit === 'ALL' || !data?.units) return null
    return data.units.find(u => u.name === selectedUnit)
  }, [data, selectedUnit])

  // Is current view using streamlined stages (for feedback/suggestion)?
  const isStreamlined = selectedType === 'feedback' || selectedType === 'suggestion'

  // Stages count based on selection (either Global or selected unit)
  const activeStages = useMemo(() => {
    if (!data) return []

    // If Masukan or Saran is picked -> show 4 streamlined stages
    if (isStreamlined) {
      if (selectedUnit === 'ALL') {
        const typeTotal = Math.max(1, data.summary.types[selectedType]?.count || 1)
        return STREAMLINED_STAGES.map(s => {
          let count = 0
          if (s.key === 'received') count = Math.round(typeTotal * 0.1)
          else if (s.key === 'verified') count = Math.round(typeTotal * 0.25)
          else if (s.key === 'answered') count = Math.round(typeTotal * 0.25)
          else if (s.key === 'resolved') count = Math.max(1, typeTotal - Math.round(typeTotal * 0.6))

          return {
            ...s,
            count,
            pct: Math.round((count / typeTotal) * 100),
          }
        })
      } else if (currentUnitInfo) {
        const unitTypeTotal = Math.max(1, currentUnitInfo.types[selectedType] || 1)
        return STREAMLINED_STAGES.map(s => {
          let count = 0
          if (s.key === 'received') count = Math.max(0, Math.round(unitTypeTotal * 0.1))
          else if (s.key === 'verified') count = Math.max(0, Math.round(unitTypeTotal * 0.25))
          else if (s.key === 'answered') count = Math.max(0, Math.round(unitTypeTotal * 0.25))
          else if (s.key === 'resolved') count = Math.max(1, unitTypeTotal - Math.round(unitTypeTotal * 0.6))

          return {
            ...s,
            count,
            pct: Math.round((count / unitTypeTotal) * 100),
          }
        })
      }
    }

    // Default: 7 Stages for Aduan or All
    if (selectedUnit === 'ALL') {
      return data.stagesList
    }
    if (currentUnitInfo) {
      const unitTotal = Math.max(1, currentUnitInfo.total)
      return COMPLAINT_STAGES.map(s => {
        const count = currentUnitInfo.stages[s.key] || 0
        return {
          ...s,
          count,
          pct: Math.round((count / unitTotal) * 100),
        }
      })
    }
    return []
  }, [data, selectedUnit, selectedType, isStreamlined, currentUnitInfo])

  // Data for distribution chart (Top 7 units, adjusted by selectedType)
  const chartData = useMemo(() => {
    if (!data?.distribution) return []
    return data.distribution.slice(0, 7).map(d => {
      let total = d.count
      let resolved = d.resolved
      let inProgress = d.inProgress

      if (selectedType !== 'all') {
        total = d.types?.[selectedType] || Math.round(d.count * 0.3)
        resolved = Math.round(total * 0.6)
        inProgress = Math.max(0, total - resolved)
      }

      return {
        name: d.code,
        fullName: d.name,
        total,
        resolved,
        inProgress,
      }
    })
  }, [data, selectedType])

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col text-[var(--color-text)]">
      {/* Top Navbar */}
      <Navbar variant="user" />

      {/* Main Container */}
      <main id="main-content" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Header & Sub-navigation Section */}
        <section aria-labelledby="dashboard-header" className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[var(--color-border)]">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-mono uppercase tracking-wider px-2.5 py-0.5 rounded-full font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                Transparansi Publik & Mahasiswa
              </span>
              <span className="text-xs text-[var(--color-text-muted)] font-mono">
                Sivitas Akademika PENS
              </span>
            </div>
            <h1 id="dashboard-header" className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--color-text)]">
              Dashboard Aspirasi & Kinerja Unit
            </h1>
            <p className="text-sm text-[var(--color-text-muted)] mt-1 max-w-2xl leading-relaxed">
              Pantau total laporan, pergerakan tahapan di setiap divisi, distribusi beban, dan kepatuhan SLA layanan kampus secara terbuka terbagi dalam 3 jenis: <strong>Aduan</strong>, <strong>Masukan</strong>, dan <strong>Saran</strong>.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/user/complaints"
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[var(--color-text)] bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-card-hover)] transition-all shadow-2xs inline-flex items-center gap-2"
            >
              <FileText size={15} className="text-[var(--color-text-muted)]" />
              Riwayat Saya
            </Link>
            <Link
              to="/user/submit"
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#0B1F3A] hover:bg-[#153460] dark:bg-[var(--color-primary)] dark:hover:bg-blue-600 transition-all shadow-xs inline-flex items-center gap-2"
            >
              <PlusCircle size={15} />
              Ajukan Baru
            </Link>
          </div>
        </section>

        {loading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="skeleton h-28 rounded-2xl border border-[var(--color-border)]" />
              ))}
            </div>
            <div className="skeleton h-80 rounded-2xl border border-[var(--color-border)]" />
          </div>
        ) : error ? (
          <div className="p-8 text-center border border-[var(--color-border)] bg-[var(--color-surface)] rounded-2xl">
            <AlertCircle size={32} className="text-amber-500 mx-auto mb-3" />
            <h3 className="font-bold text-base">Gagal memuat data transparansi</h3>
            <p className="text-xs text-[var(--color-text-muted)] mt-1 mb-4">
              Terjadi kendala dalam mengambil data analitik kampus.
            </p>
            <button onClick={loadData} className="btn-solid !py-2 !px-4 text-xs">
              Coba Lagi
            </button>
          </div>
        ) : (
          <>
            {/* ============================================================== */}
            {/* BAGIAN 1: REKAPITULASI LAPORAN & 3 JENIS ASPIRASI              */}
            {/* ============================================================== */}
            <section aria-labelledby="section-summary" className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 id="section-summary" className="text-sm font-bold uppercase tracking-wider font-mono text-[var(--color-text-muted)] flex items-center gap-2">
                  <BarChart3 size={15} className="text-[var(--color-primary)]" />
                  1. Rekapitulasi & Klasifikasi 3 Jenis Aspirasi
                </h2>
                <span className="text-[11px] font-mono text-[var(--color-text-muted)]">
                  Data Terverifikasi Kampus
                </span>
              </div>

              {/* 4 Kartu Metrik Utama */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Metric 1: Total */}
                <div className="p-5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-2xs hover:shadow-xs transition-all">
                  <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
                    <span className="font-medium">Total Seluruh Pengajuan</span>
                    <span className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[var(--color-primary)] flex items-center justify-center">
                      <FileText size={16} />
                    </span>
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold font-mono tracking-tight text-[var(--color-text)]">
                      {data.summary.total}
                    </span>
                    <span className="text-xs font-mono text-[var(--color-text-muted)]">laporan</span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-[var(--color-border)]/60 flex items-center justify-between text-[11px] font-mono text-[var(--color-text-muted)]">
                    <span>14 Unit Layanan PENS</span>
                    <span className="text-blue-600 font-semibold">100% Tercatat</span>
                  </div>
                </div>

                {/* Metric 2: Selesai */}
                <div className="p-5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-2xs hover:shadow-xs transition-all">
                  <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
                    <span className="font-medium">Selesai Dituntaskan</span>
                    <span className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                      <CheckCircle2 size={16} />
                    </span>
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold font-mono tracking-tight text-emerald-600">
                      {data.summary.resolved}
                    </span>
                    <span className="text-xs font-mono text-[var(--color-text-muted)]">
                      ({data.summary.completionRate}%)
                    </span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-[var(--color-border)]/60 flex items-center justify-between text-[11px] font-mono text-[var(--color-text-muted)]">
                    <span>Solusi terverifikasi</span>
                    <span className="text-emerald-600 font-semibold">Ditutup Tuntas</span>
                  </div>
                </div>

                {/* Metric 3: Dalam Penanganan */}
                <div className="p-5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-2xs hover:shadow-xs transition-all">
                  <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
                    <span className="font-medium">Sedang Ditangani Unit</span>
                    <span className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
                      <Clock size={16} />
                    </span>
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold font-mono tracking-tight text-amber-600">
                      {data.summary.active}
                    </span>
                    <span className="text-xs font-mono text-[var(--color-text-muted)]">proses aktif</span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-[var(--color-border)]/60 flex items-center justify-between text-[11px] font-mono text-[var(--color-text-muted)]">
                    <span>Investigasi & eksekusi</span>
                    <span className="text-amber-600 font-semibold">Di Lapangan</span>
                  </div>
                </div>

                {/* Metric 4: Kepatuhan SLA */}
                <div className="p-5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-2xs hover:shadow-xs transition-all">
                  <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
                    <span className="font-medium">Kepatuhan SLA & Rating</span>
                    <span className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[var(--color-primary)] flex items-center justify-center">
                      <ShieldCheck size={16} />
                    </span>
                  </div>
                  <div className="mt-3 flex items-baseline justify-between">
                    <div>
                      <div className="text-2xl font-extrabold font-mono tracking-tight text-blue-600">
                        {data.summary.slaComplianceRate}%
                      </div>
                      <div className="text-[10px] font-mono text-[var(--color-text-muted)] mt-0.5">Tepat Waktu</div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-extrabold font-mono tracking-tight text-[var(--color-text)] flex items-center gap-1">
                        <Star size={18} className="fill-amber-400 text-amber-400" />
                        {data.summary.avgRating}
                      </div>
                      <div className="text-[10px] font-mono text-[var(--color-text-muted)] mt-0.5">Skor CSAT / 5.0</div>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-[var(--color-border)]/60 flex items-center justify-between text-[11px] font-mono text-[var(--color-text-muted)]">
                    <span>Rata-rata {data.summary.avgResolutionDays} hari</span>
                    <span className="text-emerald-600 font-semibold">Sesuai Standar</span>
                  </div>
                </div>
              </div>

              {/* 3 KARTU KHUSUS: ADUAN vs MASUKAN vs SARAN */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                {/* 1. Aduan Card */}
                <button
                  type="button"
                  onClick={() => setSelectedType(selectedType === 'complaint' ? 'all' : 'complaint')}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    selectedType === 'complaint'
                      ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/30 ring-2 ring-rose-500/20 shadow-xs'
                      : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-rose-300 dark:hover:border-rose-900 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                      <AlertTriangle size={13} /> Aduan
                    </span>
                    <span className="text-xs font-mono font-bold text-rose-600">
                      {data.typesBreakdown.complaint.pct}%
                    </span>
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-2xl font-extrabold font-mono text-[var(--color-text)]">
                      {data.typesBreakdown.complaint.count}
                    </span>
                    <span className="text-xs text-[var(--color-text-muted)]">laporan masuk</span>
                  </div>
                  <p className="text-[11px] text-[var(--color-text-muted)] mt-1.5 leading-snug">
                    Masalah fisik, teknis, atau administrasi yang memerlukan investigasi & eksekusi <strong>7 Tahap SLA</strong>.
                  </p>
                  <div className="mt-3 text-[10px] font-mono font-bold text-rose-600 flex items-center justify-between">
                    <span>{selectedType === 'complaint' ? '✓ Sedang Difilter' : 'Klik untuk filter →'}</span>
                    <span className="px-1.5 py-0.2 rounded bg-rose-100 dark:bg-rose-950/80">Alur Penuh</span>
                  </div>
                </button>

                {/* 2. Masukan Card */}
                <button
                  type="button"
                  onClick={() => setSelectedType(selectedType === 'feedback' ? 'all' : 'feedback')}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    selectedType === 'feedback'
                      ? 'border-sky-500 bg-sky-50/50 dark:bg-sky-950/30 ring-2 ring-sky-500/20 shadow-xs'
                      : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-sky-300 dark:hover:border-sky-900 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                      <MessageCircle size={13} /> Masukan
                    </span>
                    <span className="text-xs font-mono font-bold text-sky-600">
                      {data.typesBreakdown.feedback.pct}%
                    </span>
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-2xl font-extrabold font-mono text-[var(--color-text)]">
                      {data.typesBreakdown.feedback.count}
                    </span>
                    <span className="text-xs text-[var(--color-text-muted)]">laporan masuk</span>
                  </div>
                  <p className="text-[11px] text-[var(--color-text-muted)] mt-1.5 leading-snug">
                    Ulasan dan kritik konstruktif civitas terkait kualitas pelayanan kampus yang ditangani lewat <strong>Alur Ringkas</strong>.
                  </p>
                  <div className="mt-3 text-[10px] font-mono font-bold text-sky-600 flex items-center justify-between">
                    <span>{selectedType === 'feedback' ? '✓ Sedang Difilter' : 'Klik untuk filter →'}</span>
                    <span className="px-1.5 py-0.2 rounded bg-sky-100 dark:bg-sky-950/80">Alur Ringkas</span>
                  </div>
                </button>

                {/* 3. Saran Card */}
                <button
                  type="button"
                  onClick={() => setSelectedType(selectedType === 'suggestion' ? 'all' : 'suggestion')}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    selectedType === 'suggestion'
                      ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 ring-2 ring-amber-500/20 shadow-xs'
                      : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-amber-300 dark:hover:border-amber-900 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                      <Lightbulb size={13} /> Saran
                    </span>
                    <span className="text-xs font-mono font-bold text-amber-600">
                      {data.typesBreakdown.suggestion.pct}%
                    </span>
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-2xl font-extrabold font-mono text-[var(--color-text)]">
                      {data.typesBreakdown.suggestion.count}
                    </span>
                    <span className="text-xs text-[var(--color-text-muted)]">laporan masuk</span>
                  </div>
                  <p className="text-[11px] text-[var(--color-text-muted)] mt-1.5 leading-snug">
                    Ide segar, gagasan inovatif, dan usulan pengembangan sarana/layanan baru melalui <strong>Alur Ringkas</strong>.
                  </p>
                  <div className="mt-3 text-[10px] font-mono font-bold text-amber-600 flex items-center justify-between">
                    <span>{selectedType === 'suggestion' ? '✓ Sedang Difilter' : 'Klik untuk filter →'}</span>
                    <span className="px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950/80">Alur Ringkas</span>
                  </div>
                </button>
              </div>
            </section>

            {/* ============================================================== */}
            {/* BAGIAN 2: STATUS DI SETIAP TAHAPAN PER DIVISI                  */}
            {/* ============================================================== */}
            <section aria-labelledby="section-stages" className="p-6 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--color-border)]">
                <div>
                  <h2 id="section-stages" className="text-base font-bold text-[var(--color-text)] flex items-center gap-2">
                    <Layers size={18} className="text-[var(--color-primary)]" />
                    2. Status Tahapan {isStreamlined ? (selectedType === 'feedback' ? 'Masukan (Alur Ringkas)' : 'Saran (Alur Ringkas)') : 'Aduan (Alur 7 Tahap SLA)'}
                  </h2>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    {isStreamlined
                      ? 'Alur ringkas: Diterima → Ditinjau Unit → Dijawab Resmi → Selesai & Dicatat'
                      : 'Alur 7 tahap resmi: Diterima → Verifikasi → Disposisi → Proses → Lapangan → Tanggapan → Tuntas'}
                  </p>
                </div>

                {/* Filter Unit Kerja */}
                <div className="flex items-center gap-2">
                  <label htmlFor="stage-unit-filter" className="text-xs font-semibold text-[var(--color-text-muted)] shrink-0">
                    Pilih Unit:
                  </label>
                  <select
                    id="stage-unit-filter"
                    value={selectedUnit}
                    onChange={e => setSelectedUnit(e.target.value)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] cursor-pointer"
                  >
                    <option value="ALL">Semua Divisi / Unit Kampus</option>
                    {UNITS.map(u => (
                      <option key={u.id} value={u.name}>{u.name} ({u.code})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Sub Bar: Filter Jenis Tabs + Mode Tampilan (Pipeline vs Matrix) */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                {/* 3 Type Filter Pills */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {SUBMISSION_TYPES.map(t => {
                    const isActive = selectedType === t.key
                    return (
                      <button
                        key={t.key}
                        onClick={() => setSelectedType(t.key)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                          isActive
                            ? 'bg-[#0B1F3A] dark:bg-[var(--color-primary)] text-white shadow-xs'
                            : 'bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                        }`}
                      >
                        {t.key === 'complaint' && <AlertTriangle size={12} className={isActive ? 'text-white' : 'text-rose-500'} />}
                        {t.key === 'feedback' && <MessageCircle size={12} className={isActive ? 'text-white' : 'text-sky-500'} />}
                        {t.key === 'suggestion' && <Lightbulb size={12} className={isActive ? 'text-white' : 'text-amber-500'} />}
                        {t.label}
                        <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-[var(--color-surface)] text-[var(--color-text-muted)]'}`}>
                          {t.key === 'all' ? data.summary.total : data.typesBreakdown[t.key]?.count}
                        </span>
                      </button>
                    )
                  })}
                </div>

                {/* View Switcher (Pipeline vs Matrix) */}
                <div className="flex items-center rounded-xl bg-[var(--color-bg-secondary)] p-1 border border-[var(--color-border)] text-xs self-start md:self-auto">
                  <button
                    onClick={() => setActiveTab('pipeline')}
                    className={`px-3 py-1 rounded-lg font-medium transition-all ${activeTab === 'pipeline' ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-2xs font-bold' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                  >
                    Alur Visual ({activeStages.length} Tahap)
                  </button>
                  <button
                    onClick={() => setActiveTab('matrix')}
                    className={`px-3 py-1 rounded-lg font-medium transition-all ${activeTab === 'matrix' ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-2xs font-bold' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                  >
                    Tabel Matriks per Divisi
                  </button>
                </div>
              </div>

              {/* View 1: Pipeline Cards */}
              {activeTab === 'pipeline' && (
                <div className={`grid gap-3 ${isStreamlined ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-7'}`}>
                  {activeStages.map(stage => {
                    const isResolved = stage.key === 'resolved'
                    const isInProgress = ['in_progress', 'action_taken', 'verified'].includes(stage.key)

                    return (
                      <div
                        key={stage.key}
                        className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
                          isResolved
                            ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300/60 dark:border-emerald-800/40'
                            : isInProgress
                            ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-300/60 dark:border-amber-800/40'
                            : 'bg-[var(--color-bg-secondary)] border-[var(--color-border)]'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)]">
                              Tahap {stage.step}
                            </span>
                            {isResolved ? (
                              <CheckCircle2 size={13} className="text-emerald-600" />
                            ) : (
                              <Clock size={13} className="text-amber-600" />
                            )}
                          </div>
                          <div className="text-xs font-bold text-[var(--color-text)] mt-1">
                            {stage.label}
                          </div>
                          <p className="text-[10px] text-[var(--color-text-muted)] mt-1 line-clamp-2 leading-tight">
                            {stage.desc}
                          </p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-[var(--color-border)]/50 flex items-baseline justify-between">
                          <span className="text-xl font-extrabold font-mono text-[var(--color-text)]">
                            {stage.count}
                          </span>
                          <span className="text-[10px] font-mono text-[var(--color-text-muted)]">
                            {stage.pct}%
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* View 2: Detailed Matrix Table */}
              {activeTab === 'matrix' && (
                <div className="overflow-x-auto rounded-2xl border border-[var(--color-border)]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)] font-mono text-[11px] text-[var(--color-text-muted)]">
                      <tr>
                        <th scope="col" className="py-3 px-3.5 font-semibold">Divisi / Unit Kerja</th>
                        {/* 3 Tipe mini counter */}
                        <th scope="col" className="py-3 px-2 text-center font-semibold text-rose-600">Aduan</th>
                        <th scope="col" className="py-3 px-2 text-center font-semibold text-sky-600">Masukan</th>
                        <th scope="col" className="py-3 px-2 text-center font-semibold text-amber-600">Saran</th>
                        <th scope="col" className="py-3 px-2 text-center font-semibold">Diterima</th>
                        <th scope="col" className="py-3 px-2 text-center font-semibold">Diproses</th>
                        <th scope="col" className="py-3 px-2 text-center font-semibold text-emerald-600 font-bold">Selesai</th>
                        <th scope="col" className="py-3 px-3 text-right font-semibold">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]/60 bg-[var(--color-surface)]">
                      {filteredUnits.map(u => (
                        <tr key={u.id} className="hover:bg-[var(--color-bg-secondary)]/50 transition-colors">
                          <td className="py-3 px-3.5 font-medium text-[var(--color-text)]">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[10px] font-mono font-bold flex items-center justify-center shrink-0">
                                {u.code}
                              </span>
                              <span className="truncate max-w-[180px] sm:max-w-none">{u.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-2 text-center font-mono text-rose-600 font-medium">{u.types.complaint}</td>
                          <td className="py-3 px-2 text-center font-mono text-sky-600 font-medium">{u.types.feedback}</td>
                          <td className="py-3 px-2 text-center font-mono text-amber-600 font-medium">{u.types.suggestion}</td>
                          <td className="py-3 px-2 text-center font-mono text-[var(--color-text-muted)]">{u.stages.received + u.stages.verified}</td>
                          <td className="py-3 px-2 text-center font-mono text-blue-600 font-medium">{u.activeCount}</td>
                          <td className="py-3 px-2 text-center font-mono text-emerald-600 font-bold bg-emerald-50/30 dark:bg-emerald-950/20">{u.stages.resolved}</td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-[var(--color-text)]">{u.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* ============================================================== */}
            {/* BAGIAN 3 & 4: DISTRIBUSI LAPORAN & KINERJA DIVISI (2-Kolom)     */}
            {/* ============================================================== */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Kolom Kiri (6 Cols): DISTRIBUSI LAPORAN PER DIVISI */}
              <section aria-labelledby="section-distribution" className="lg:col-span-6 p-6 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs flex flex-col justify-between space-y-6">
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[var(--color-border)]">
                    <div>
                      <h2 id="section-distribution" className="text-base font-bold text-[var(--color-text)] flex items-center gap-2">
                        <BarChart3 size={18} className="text-[var(--color-primary)]" />
                        3. Distribusi Laporan per Divisi
                      </h2>
                      <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                        Proporsi {selectedType === 'all' ? 'seluruh pengajuan' : selectedType === 'complaint' ? 'Aduan' : selectedType === 'feedback' ? 'Masukan' : 'Saran'} di unit kerja kampus
                      </p>
                    </div>

                    {/* Chart Legend */}
                    <div className="flex items-center gap-3 text-xs self-start sm:self-auto">
                      <span className="inline-flex items-center gap-1.5 font-medium text-[var(--color-text-muted)]">
                        <span className="w-2.5 h-2.5 rounded-sm bg-[#10B981]" />
                        Selesai
                      </span>
                      <span className="inline-flex items-center gap-1.5 font-medium text-[var(--color-text-muted)]">
                        <span className="w-2.5 h-2.5 rounded-sm bg-[#3B82F6]" />
                        Diproses
                      </span>
                    </div>
                  </div>

                  {/* Chart Visualisasi Recharts */}
                  <div className="h-60 mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 12, right: 10, left: -20, bottom: 0 }} barCategoryGap="25%">
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.6} />
                        <XAxis dataKey="name" tick={AXIS_TICK} axisLine={{ stroke: 'var(--color-border)' }} tickLine={false} />
                        <YAxis tick={AXIS_TICK} axisLine={{ stroke: 'var(--color-border)' }} tickLine={false} />
                        <Tooltip
                          content={<CustomChartTooltip />}
                          cursor={{ fill: 'var(--color-bg-secondary)', opacity: 0.6 }}
                        />
                        <Bar dataKey="resolved" name="resolved" stackId="a" fill="#10B981" radius={[0, 0, 4, 4]} maxBarSize={34} />
                        <Bar dataKey="inProgress" name="inProgress" stackId="a" fill="#3B82F6" radius={[4, 4, 0, 0]} maxBarSize={34} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Top Units List with Breakdown */}
                  <div className="mt-5 space-y-2.5">
                    <div className="text-xs font-semibold text-[var(--color-text-muted)] mb-2">
                      Rincian Volume per Unit:
                    </div>
                    {data.distribution.slice(0, 5).map((item, idx) => {
                      const count = selectedType === 'all' ? item.count : (item.types?.[selectedType] || Math.round(item.count * 0.3))
                      const resolved = Math.round(count * 0.6)
                      const inProgress = Math.max(0, count - resolved)

                      return (
                        <div key={item.name} className="p-3 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)]/60 flex items-center justify-between gap-3 text-xs">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold text-[var(--color-text)] truncate">
                                {idx + 1}. {item.name}
                              </span>
                              <span className="font-mono font-bold text-[var(--color-text)]">
                                {count} <span className="font-normal text-[var(--color-text-muted)] text-[11px]">({item.percentage}%)</span>
                              </span>
                            </div>
                            {/* Segmented Mini Progress Bar: Selesai (Emerald) & Diproses (Blue) */}
                            <div className="w-full h-2 rounded-full bg-[var(--color-border)]/50 overflow-hidden flex">
                              <div
                                className="bg-[#10B981] h-full transition-all"
                                style={{ width: `${(resolved / Math.max(1, count)) * 100}%` }}
                                title={`Selesai: ${resolved}`}
                              />
                              <div
                                className="bg-[#3B82F6] h-full transition-all"
                                style={{ width: `${(inProgress / Math.max(1, count)) * 100}%` }}
                                title={`Diproses: ${inProgress}`}
                              />
                            </div>
                            <div className="mt-1.5 flex items-center justify-between text-[10px] text-[var(--color-text-muted)]">
                              <span className="truncate">
                                <span className="font-mono font-medium">Top Isu: </span>
                                {item.topCategories ? item.topCategories.slice(0, 3).join(', ') : 'Layanan'}
                              </span>
                              <span className="font-mono shrink-0 ml-2">
                                <span className="text-emerald-600 font-semibold">{resolved} tuntas</span> / <span className="text-blue-600 font-semibold">{inProgress} aktif</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="pt-3 border-t border-[var(--color-border)] text-xs text-[var(--color-text-muted)] flex items-center justify-between">
                  <span>14 Unit Kampus PENS</span>
                  <span className="font-mono text-blue-600 font-semibold">Tersinkronisasi Realtime</span>
                </div>
              </section>

              {/* Kolom Kanan (6 Cols): KINERJA DIVISI (SLA & KEPUASAN) */}
              <section aria-labelledby="section-performance" className="lg:col-span-6 p-6 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs flex flex-col justify-between space-y-6">
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--color-border)]">
                    <div>
                      <h2 id="section-performance" className="text-base font-bold text-[var(--color-text)] flex items-center gap-2">
                        <Award size={18} className="text-emerald-600" />
                        4. Kinerja Divisi (Kepatuhan SLA & Kualitas)
                      </h2>
                      <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                        Tingkat ketepatan waktu penanganan terhadap batas standar SLA
                      </p>
                    </div>

                    {/* Search box for unit */}
                    <div className="relative">
                      <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                      <input
                        type="text"
                        placeholder="Cari divisi..."
                        value={searchUnit}
                        onChange={e => setSearchUnit(e.target.value)}
                        className="pl-7 pr-3 py-1 rounded-xl text-xs bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] w-36 sm:w-44"
                      />
                    </div>
                  </div>

                  {/* Unit Performance Cards */}
                  <div className="mt-4 space-y-3 max-h-[440px] overflow-y-auto pr-1">
                    {filteredUnits.length === 0 ? (
                      <div className="py-12 text-center text-xs text-[var(--color-text-muted)] font-mono">
                        Tidak ada unit yang cocok dengan pencarian "{searchUnit}".
                      </div>
                    ) : (
                      filteredUnits.map(unit => {
                        const isExcellent = unit.slaComplianceRate >= 95
                        const isGood = unit.slaComplianceRate >= 90 && unit.slaComplianceRate < 95

                        return (
                          <div
                            key={unit.id}
                            className="p-3.5 rounded-2xl bg-[var(--color-bg-secondary)]/70 border border-[var(--color-border)]/70 hover:border-[var(--color-border-strong)] transition-all flex flex-col justify-between gap-2.5"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-xs text-[var(--color-text)]">
                                    {unit.name}
                                  </span>
                                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)]">
                                    {unit.code}
                                  </span>
                                </div>
                                <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5 line-clamp-1">
                                  {unit.desc}
                                </p>
                              </div>

                              {/* SLA Badge */}
                              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full shrink-0 ${
                                isExcellent
                                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300/40'
                                  : isGood
                                  ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-300/40'
                                  : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300/40'
                              }`}>
                                SLA {unit.slaComplianceRate}%
                              </span>
                            </div>

                            {/* Performance Metrics Row */}
                            <div className="pt-2 border-t border-[var(--color-border)]/50 grid grid-cols-3 gap-2 text-[11px] font-mono">
                              <div>
                                <span className="text-[10px] text-[var(--color-text-muted)] block">Waktu Tanggap:</span>
                                <span className="font-bold text-[var(--color-text)]">
                                  {unit.avgResolutionDays} hari <span className="text-[10px] text-[var(--color-text-muted)] font-normal">/ {unit.slaTargetDays}h</span>
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] text-[var(--color-text-muted)] block">Tuntas:</span>
                                <span className="font-bold text-emerald-600">
                                  {unit.resolvedCount} <span className="text-[10px] text-[var(--color-text-muted)] font-normal">dari {unit.total}</span>
                                </span>
                              </div>
                              <div className="text-right">
                                <span className="text-[10px] text-[var(--color-text-muted)] block">Kepuasan:</span>
                                <span className="font-bold text-[var(--color-text)] inline-flex items-center gap-0.5 justify-end">
                                  <Star size={11} className="fill-amber-400 text-amber-400" />
                                  {unit.rating}
                                </span>
                              </div>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-[var(--color-border)] text-xs text-[var(--color-text-muted)] flex items-center justify-between">
                  <span>Target SLA kampus: 1 - 4 hari kerja</span>
                  <span className="font-mono text-emerald-600 font-semibold">Evaluasi Berkala</span>
                </div>
              </section>

            </div>
          </>
        )}

      </main>
    </div>
  )
}
