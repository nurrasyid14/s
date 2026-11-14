import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../../components/layout/Navbar.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { CountUp, useAutoReveal } from '../../components/motion/Motion.jsx'
import {
  getStudentDashboardData,
  COMPLAINT_STAGES,
  STREAMLINED_STAGES,
  SUBMISSION_TYPES
} from '../../services/studentDashboardApi.js'
import { UNITS } from '../../data/units.js'
import useBilingual from '../../hooks/useBilingual.js'
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

// Tahap alur ringkas (Masukan/Saran) dari tahap 7-tahap, sama dengan perhitungan backend
function streamlinedCounts(s) {
  return {
    received: s.received,
    verified: s.verified + s.dispatched,
    answered: s.in_progress + s.action_taken + s.answered,
    resolved: s.resolved,
  }
}

const sumStages = s => Object.values(s).reduce((a, b) => a + b, 0)

function CustomChartTooltip({ active, payload, label }) {
  const { tx } = useBilingual()
  if (!active || !payload || !payload.length) return null
  const match = payload[0]?.payload
  const fullName = match?.fullName || label
  const resolved = match?.resolved || 0
  const pending = match?.pending || 0
  const total = match?.total || 0

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-lg text-xs min-w-[170px] backdrop-blur-md">
      <div className="font-bold text-[var(--color-text)] pb-2 mb-2 border-b border-[var(--color-border)]/70">
        {fullName}
      </div>
      <div className="space-y-1.5 font-mono">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
            <span className="w-2.5 h-2.5 rounded-sm bg-[var(--color-gold)]" />
            {tx('Selesai', 'Resolved')}
          </span>
          <span className="font-bold text-emerald-600 dark:text-emerald-400">{resolved} {tx('tiket', 'tickets')}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
            <span className="w-2.5 h-2.5 rounded-sm bg-[var(--color-primary)]" />
            {tx('Belum selesai', 'Not yet resolved')}
          </span>
          <span className="font-bold text-blue-600 dark:text-blue-400">{pending} {tx('tiket', 'tickets')}</span>
        </div>
        <div className="pt-2 mt-2 border-t border-[var(--color-border)]/60 flex items-center justify-between gap-3 font-sans font-bold text-[var(--color-text)]">
          <span>{tx('Total', 'Total')}</span>
          <span className="font-mono text-sm">{total}</span>
        </div>
      </div>
    </div>
  )
}

export default function UserDashboard() {
  const revealRef = useAutoReveal()
  const { user } = useAuth()
  const { tx } = useBilingual()
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

  // Tahap yang ditampilkan: data nyata sesuai unit & jenis yang dipilih
  const activeStages = useMemo(() => {
    if (!data) return []

    // Sumber angka per tahap: seluruh kampus atau satu unit
    const typeStages = selectedUnit === 'ALL' ? data.globalTypeStages : currentUnitInfo?.typeStages
    const allStages = selectedUnit === 'ALL' ? data.globalStages : currentUnitInfo?.stages
    if (!typeStages || !allStages) return []

    if (isStreamlined) {
      const counts = streamlinedCounts(typeStages[selectedType])
      const total = sumStages(counts)
      return STREAMLINED_STAGES.map(s => {
        const count = counts[s.key] || 0
        return {
          ...s,
          label: tx(s.label, s.labelEn),
          desc: tx(s.desc, s.descEn),
          count,
          pct: total > 0 ? Math.round((count / total) * 100) : 0,
        }
      })
    }

    // 7 tahap: semua jenis, atau aduan saja
    const stages = selectedType === 'all' ? allStages : typeStages.complaint
    const total = sumStages(stages)
    return COMPLAINT_STAGES.map(s => {
      const count = stages[s.key] || 0
      return {
        ...s,
        label: tx(s.label, s.labelEn),
        desc: tx(s.desc, s.descEn),
        count,
        pct: total > 0 ? Math.round((count / total) * 100) : 0,
      }
    })
  }, [data, selectedUnit, selectedType, isStreamlined, currentUnitInfo, tx])

  // Rincian per unit untuk jenis yang dipilih (angka nyata dari backend)
  const unitBreakdown = useMemo(() => {
    if (!data?.units) return []
    const campusTypeTotal = selectedType === 'all' ? data.summary.total : (data.typesBreakdown[selectedType]?.count || 0)
    return data.units.map(u => {
      const total = selectedType === 'all' ? u.total : (u.types?.[selectedType] || 0)
      const resolved = selectedType === 'all' ? u.stages.resolved : (u.typeStages?.[selectedType]?.resolved || 0)
      return {
        name: u.name,
        code: u.code,
        topCategories: u.topCategories || [],
        total,
        resolved,
        pending: total - resolved,
        percentage: campusTypeTotal > 0 ? Math.round((total / campusTypeTotal) * 1000) / 10 : 0,
      }
    })
  }, [data, selectedType])

  // Data grafik distribusi (7 unit teratas)
  const chartData = useMemo(
    () => unitBreakdown.slice(0, 7).map(d => ({
      name: d.code,
      fullName: d.name,
      total: d.total,
      resolved: d.resolved,
      pending: d.pending,
    })),
    [unitBreakdown]
  )

  // Batas SLA kampus dari data unit resmi
  const slaRange = useMemo(() => {
    const days = UNITS.map(u => u.slaDays).filter(Boolean)
    return days.length ? { min: Math.min(...days), max: Math.max(...days) } : null
  }, [])

  const typeLabel = selectedType === 'complaint' ? tx('Aduan', 'Complaints')
    : selectedType === 'feedback' ? tx('Masukan', 'Feedback')
    : selectedType === 'suggestion' ? tx('Saran', 'Suggestions')
    : tx('seluruh pengajuan', 'all submissions')

  return (
    <div className="min-h-screen bg-[var(--color-bg-secondary)] flex flex-col text-[var(--color-text)]">
      {/* Top Navbar */}
      <Navbar variant="user" />

      {/* Main Container */}
      <main id="main-content" ref={revealRef} className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Banner biru transparansi */}
        <section aria-labelledby="dashboard-header" className="banner-blue p-6 sm:p-9">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/85">
                <span className="live-dot h-1.5 w-1.5 rounded-full bg-[var(--color-gold)]" />
                {tx('Transparansi publik sivitas PENS', 'Public transparency for the PENS community')}
              </span>
              <h1 id="dashboard-header" className="mt-4 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
                {tx('Halo', 'Hello')}, {user?.name ? user.name.split(' ')[0] : tx('Sivitas', 'there')}.<br />
                <span className="text-[var(--color-gold)]">{tx('Begini kinerja layanan kampus.', 'Here is how campus services are performing.')}</span>
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/75">
                {tx(
                  'Pantau jumlah laporan, tahapan penanganan di setiap divisi, dan kepatuhan SLA untuk tiga jenis aspirasi: aduan, masukan, dan saran.',
                  'Track the number of reports, handling stages in each division, and SLA compliance for three types of input: complaints, feedback, and suggestions.',
                )}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2.5">
              <Link to="/user/submit" className="btn-gold !h-12 !px-6 !text-base">
                <PlusCircle size={18} /> {tx('Ajukan Baru', 'Submit New')}
              </Link>
              <Link to="/user/complaints" className="btn-ghost-light !h-12 !px-5">
                <FileText size={16} /> {tx('Riwayat Saya', 'My History')}
              </Link>
            </div>
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
            <AlertCircle size={32} className="text-orange-500 mx-auto mb-3" />
            <h3 className="font-bold text-base">{tx('Gagal memuat data transparansi', 'Failed to load transparency data')}</h3>
            <p className="text-xs text-[var(--color-text-muted)] mt-1 mb-4">
              {tx('Terjadi kendala dalam mengambil data analitik kampus.', 'There was a problem loading campus analytics data.')}
            </p>
            <button onClick={loadData} className="btn-solid !py-2 !px-4 text-xs">
              {tx('Coba Lagi', 'Try Again')}
            </button>
          </div>
        ) : (
          <>
            {/* Ringkasan: satu strip KPI, bukan empat kartu terpisah */}
            <section aria-labelledby="section-summary" className="space-y-5">
              <h2 id="section-summary" className="sr-only">{tx('Ringkasan laporan', 'Report summary')}</h2>

              <div className="overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_12px_40px_-24px_rgba(10,36,99,0.35)]">
                <div className="grid grid-cols-2 lg:grid-cols-4 [&>div]:p-5 sm:[&>div]:p-6">
                  <div className="border-b border-r border-[var(--color-border)] lg:border-b-0">
                    <div className="flex items-center gap-2 text-xs font-medium text-[var(--color-text-muted)]">
                      <FileText size={14} className="text-[var(--color-primary)]" /> {tx('Total pengajuan', 'Total submissions')}
                    </div>
                    <div className="mt-2 text-4xl font-bold tracking-tight tabular">
                      <CountUp value={data.summary.total} />
                    </div>
                    <div className="mt-1 text-xs text-[var(--color-text-muted)]">{tx(`dari ${data.units.length} unit layanan`, `from ${data.units.length} service units`)}</div>
                  </div>

                  <div className="border-b border-[var(--color-border)] lg:border-b-0 lg:border-r">
                    <div className="flex items-center gap-2 text-xs font-medium text-[var(--color-text-muted)]">
                      <CheckCircle2 size={14} className="text-[var(--color-status-success)]" /> {tx('Selesai', 'Resolved')}
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-4xl font-bold tracking-tight tabular text-[var(--color-status-success)]">
                        <CountUp value={data.summary.resolved} />
                      </span>
                      <span className="text-sm font-semibold tabular text-[var(--color-text-muted)]">{data.summary.completionRate}%</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-sunken)]">
                      <div className="grow-x h-full rounded-full bg-[var(--color-status-success)]" style={{ width: `${data.summary.completionRate}%` }} />
                    </div>
                  </div>

                  <div className="border-r border-[var(--color-border)]">
                    <div className="flex items-center gap-2 text-xs font-medium text-[var(--color-text-muted)]">
                      <Clock size={14} className="text-[var(--color-status-warning)]" /> {tx('Sedang ditangani', 'Being handled')}
                    </div>
                    <div className="mt-2 text-4xl font-bold tracking-tight tabular text-[var(--color-status-warning)]">
                      <CountUp value={data.summary.active} />
                    </div>
                    <div className="mt-1 text-xs text-[var(--color-text-muted)]">{tx('rata-rata', 'average')} {data.summary.avgResolutionDays} {tx('hari', 'days')}</div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 text-xs font-medium text-[var(--color-text-muted)]">
                      <ShieldCheck size={14} className="text-[var(--color-primary)]" /> {tx('Tepat waktu (SLA)', 'On time (SLA)')}
                    </div>
                    <div className="mt-2 flex items-end justify-between gap-3">
                      <span className="text-4xl font-bold tracking-tight tabular text-[var(--color-primary)]">
                        <CountUp value={data.summary.slaComplianceRate} suffix="%" />
                      </span>
                      <span className="flex items-center gap-1 rounded-full bg-[var(--color-gold-soft)] px-2.5 py-1 text-sm font-bold tabular text-[var(--color-gold-ink)]">
                        <Star size={14} className="fill-[var(--color-gold)] text-[var(--color-gold)]" />
                        <CountUp value={data.summary.avgRating} decimals={1} />
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-[var(--color-text-muted)]">{tx('skor kepuasan dari 5,0', 'satisfaction score out of 5.0')}</div>
                  </div>
                </div>
              </div>

              {/* Jenis aspirasi: bar proporsi + pemilih filter */}
              <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold tracking-tight">{tx('Jenis aspirasi', 'Type of input')}</h3>
                    <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{tx('Pilih satu jenis untuk menyaring seluruh dashboard di bawah.', 'Choose one type to filter the entire dashboard below.')}</p>
                  </div>
                  {selectedType !== 'all' && (
                    <button onClick={() => setSelectedType('all')} className="animate-fade-in rounded-full border border-[var(--color-border)] px-3 py-1 text-xs font-semibold text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary-soft)]">
                      {tx('Tampilkan semua', 'Show all')}
                    </button>
                  )}
                </div>

                <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-[var(--color-surface-sunken)]" role="img" aria-label={tx('Proporsi aduan, masukan, dan saran', 'Proportion of complaints, feedback, and suggestions')}>
                  {[
                    ['complaint', 'var(--color-navy)'],
                    ['feedback', 'var(--color-primary)'],
                    ['suggestion', 'var(--color-gold)'],
                  ].map(([key, color]) => (
                    <div
                      key={key}
                      className="h-full transition-[opacity,flex-basis] duration-500 ease-[var(--ease-out)] first:rounded-l-full last:rounded-r-full dark:first:bg-[var(--color-primary-dark)]"
                      style={{ flexBasis: `${data.typesBreakdown[key].pct}%`, background: color, opacity: selectedType === 'all' || selectedType === key ? 1 : 0.25 }}
                    />
                  ))}
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                  {[
                    { key: 'complaint', label: tx('Aduan', 'Complaints'), icon: AlertTriangle, color: 'var(--color-navy)', note: tx('Masalah yang butuh investigasi, alur 7 tahap SLA.', 'Issues that need investigation, 7-stage SLA flow.') },
                    { key: 'feedback', label: tx('Masukan', 'Feedback'), icon: MessageCircle, color: 'var(--color-primary)', note: tx('Kritik dan ulasan layanan, alur ringkas 4 tahap.', 'Criticism and service reviews, 4-stage streamlined flow.') },
                    { key: 'suggestion', label: tx('Saran', 'Suggestions'), icon: Lightbulb, color: 'var(--color-gold)', note: tx('Ide pengembangan sarana dan layanan, alur ringkas.', 'Ideas to improve facilities and services, streamlined flow.') },
                  ].map(({ key, label, icon: Icon, color, note }) => {
                    const active = selectedType === key
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSelectedType(active ? 'all' : key)}
                        aria-pressed={active}
                        className={`press rounded-2xl border p-4 text-left transition-[border-color,background-color,box-shadow] duration-200 ${
                          active
                            ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-primary)_18%,transparent)]'
                            : 'border-[var(--color-border)] bg-[var(--color-bg-secondary)] hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-card-hover)]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-2 text-sm font-bold">
                            <Icon size={15} style={{ color: key === 'suggestion' ? 'var(--color-gold-ink)' : color }} className={key === 'complaint' ? 'dark:!text-[var(--color-primary)]' : ''} /> {label}
                          </span>
                          <span className="text-xs font-semibold tabular text-[var(--color-text-muted)]">{data.typesBreakdown[key].pct}%</span>
                        </div>
                        <div className="mt-2 text-3xl font-bold tracking-tight tabular">
                          <CountUp value={data.typesBreakdown[key].count} />
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-muted)]">{note}</p>
                      </button>
                    )
                  })}
                </div>
              </div>
            </section>

            {/* ============================================================== */}
            {/* BAGIAN 2: STATUS DI SETIAP TAHAPAN PER DIVISI                  */}
            {/* ============================================================== */}
            <section aria-labelledby="section-stages" className="p-6 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[0_12px_40px_-24px_rgba(10,36,99,0.3)] space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--color-border)]">
                <div>
                  <h2 id="section-stages" className="text-base font-bold text-[var(--color-text)] flex items-center gap-2">
                    <Layers size={18} className="text-[var(--color-primary)]" />
                    {tx('Status Tahapan', 'Stage Status')} {isStreamlined
                      ? (selectedType === 'feedback' ? tx('Masukan (Alur Ringkas)', 'Feedback (Streamlined Flow)') : tx('Saran (Alur Ringkas)', 'Suggestions (Streamlined Flow)'))
                      : tx('Aduan (Alur 7 Tahap SLA)', 'Complaints (7-Stage SLA Flow)')}
                  </h2>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    {isStreamlined
                      ? tx('Alur ringkas: Diterima → Ditinjau Unit → Dijawab Resmi → Selesai & Dicatat', 'Streamlined flow: Received → Reviewed by Unit → Officially Answered → Closed & Recorded')
                      : tx('Alur 7 tahap resmi: Diterima → Verifikasi → Disposisi → Proses → Lapangan → Tanggapan → Tuntas', 'Official 7-stage flow: Received → Verified → Dispatched → In Progress → Field → Response → Resolved')}
                  </p>
                </div>

                {/* Filter Unit Kerja */}
                <div className="flex items-center gap-2">
                  <label htmlFor="stage-unit-filter" className="text-xs font-semibold text-[var(--color-text-muted)] shrink-0">
                    {tx('Pilih Unit:', 'Select Unit:')}
                  </label>
                  <select
                    id="stage-unit-filter"
                    value={selectedUnit}
                    onChange={e => setSelectedUnit(e.target.value)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] cursor-pointer"
                  >
                    <option value="ALL">{tx('Semua Divisi / Unit Kampus', 'All Divisions / Campus Units')}</option>
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
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                          isActive
                            ? 'bg-[var(--color-navy)] dark:bg-[var(--color-primary)] text-white shadow-xs'
                            : 'bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                        }`}
                      >
                        {t.key === 'complaint' && <AlertTriangle size={12} className={isActive ? 'text-white' : 'text-rose-500'} />}
                        {t.key === 'feedback' && <MessageCircle size={12} className={isActive ? 'text-white' : 'text-sky-500'} />}
                        {t.key === 'suggestion' && <Lightbulb size={12} className={isActive ? 'text-white' : 'text-orange-500'} />}
                        {tx(t.label, t.labelEn)}
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
                    className={`px-3 py-1 rounded-lg font-medium transition ${activeTab === 'pipeline' ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-2xs font-bold' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                  >
                    {tx('Alur Visual', 'Visual Flow')} ({activeStages.length} {tx('Tahap', 'Stages')})
                  </button>
                  <button
                    onClick={() => setActiveTab('matrix')}
                    className={`px-3 py-1 rounded-lg font-medium transition ${activeTab === 'matrix' ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-2xs font-bold' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                  >
                    {tx('Tabel Matriks per Divisi', 'Matrix Table by Division')}
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
                        className={`p-3.5 rounded-2xl border transition flex flex-col justify-between ${
                          isResolved
                            ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300/60 dark:border-emerald-800/40'
                            : isInProgress
                            ? 'bg-orange-50/40 dark:bg-orange-950/20 border-orange-300/60 dark:border-orange-800/40'
                            : 'bg-[var(--color-bg-secondary)] border-[var(--color-border)]'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)]">
                              {tx('Tahap', 'Stage')} {stage.step}
                            </span>
                            {isResolved ? (
                              <CheckCircle2 size={13} className="text-[var(--color-status-success)]" />
                            ) : (
                              <Clock size={13} className="text-orange-600" />
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
                        <th scope="col" className="py-3 px-3.5 font-semibold">{tx('Divisi / Unit Kerja', 'Division / Unit')}</th>
                        {/* 3 Tipe mini counter */}
                        <th scope="col" className="py-3 px-2 text-center font-semibold text-rose-600">{tx('Aduan', 'Complaints')}</th>
                        <th scope="col" className="py-3 px-2 text-center font-semibold text-sky-600">{tx('Masukan', 'Feedback')}</th>
                        <th scope="col" className="py-3 px-2 text-center font-semibold text-orange-600">{tx('Saran', 'Suggestions')}</th>
                        <th scope="col" className="py-3 px-2 text-center font-semibold">{tx('Diterima', 'Received')}</th>
                        <th scope="col" className="py-3 px-2 text-center font-semibold">{tx('Diproses', 'In Progress')}</th>
                        <th scope="col" className="py-3 px-2 text-center font-semibold text-emerald-600 font-bold">{tx('Selesai', 'Resolved')}</th>
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
                          <td className="py-3 px-2 text-center font-mono text-orange-600 font-medium">{u.types.suggestion}</td>
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
              <section aria-labelledby="section-distribution" className="lg:col-span-6 p-6 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[0_12px_40px_-24px_rgba(10,36,99,0.3)] flex flex-col justify-between space-y-6">
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[var(--color-border)]">
                    <div>
                      <h2 id="section-distribution" className="text-base font-bold text-[var(--color-text)] flex items-center gap-2">
                        <BarChart3 size={18} className="text-[var(--color-primary)]" />
                        {tx('Distribusi laporan per divisi', 'Report distribution by division')}
                      </h2>
                      <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                        {tx('Proporsi', 'Share of')} {typeLabel} {tx('di unit kerja kampus', 'across campus units')}
                      </p>
                    </div>

                    {/* Chart Legend */}
                    <div className="flex items-center gap-3 text-xs self-start sm:self-auto">
                      <span className="inline-flex items-center gap-1.5 font-medium text-[var(--color-text-muted)]">
                        <span className="w-2.5 h-2.5 rounded-sm bg-[var(--color-gold)]" />
                        {tx('Selesai', 'Resolved')}
                      </span>
                      <span className="inline-flex items-center gap-1.5 font-medium text-[var(--color-text-muted)]">
                        <span className="w-2.5 h-2.5 rounded-sm bg-[var(--color-primary)]" />
                        {tx('Belum selesai', 'Not yet resolved')}
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
                        <Bar dataKey="resolved" name="resolved" stackId="a" fill="var(--color-gold)" radius={[0, 0, 4, 4]} maxBarSize={34} />
                        <Bar dataKey="pending" name="pending" stackId="a" fill="var(--color-primary)" radius={[4, 4, 0, 0]} maxBarSize={34} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Top Units List with Breakdown */}
                  <div className="mt-5 space-y-2.5">
                    <div className="text-xs font-semibold text-[var(--color-text-muted)] mb-2">
                      {tx('Rincian Volume per Unit:', 'Volume breakdown per unit:')}
                    </div>
                    {unitBreakdown.slice(0, 5).map((item, idx) => {
                      const count = item.total
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
                            {/* Segmented Mini Progress Bar: Selesai (Gold) & Belum selesai (Blue) */}
                            <div className="w-full h-2 rounded-full bg-[var(--color-border)]/50 overflow-hidden flex">
                              <div
                                className="bg-[var(--color-gold)] h-full transition-all"
                                style={{ width: `${(item.resolved / Math.max(1, count)) * 100}%` }}
                                title={`${tx('Selesai', 'Resolved')}: ${item.resolved}`}
                              />
                              <div
                                className="bg-[var(--color-primary)] h-full transition-all"
                                style={{ width: `${(item.pending / Math.max(1, count)) * 100}%` }}
                                title={`${tx('Belum selesai', 'Not yet resolved')}: ${item.pending}`}
                              />
                            </div>
                            <div className="mt-1.5 flex items-center justify-between text-[10px] text-[var(--color-text-muted)]">
                              <span className="truncate">
                                <span className="font-mono font-medium">{tx('Top Isu', 'Top Issues')}: </span>
                                {item.topCategories.length ? item.topCategories.slice(0, 3).join(', ') : '—'}
                              </span>
                              <span className="font-mono shrink-0 ml-2">
                                <span className="text-emerald-600 font-semibold">{item.resolved} {tx('tuntas', 'done')}</span> / <span className="text-blue-600 font-semibold">{item.pending} {tx('belum', 'pending')}</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="pt-3 border-t border-[var(--color-border)] text-xs text-[var(--color-text-muted)] flex items-center justify-between">
                  <span>{tx(`${data.units.length} Unit Kampus PENS`, `${data.units.length} PENS Campus Units`)}</span>
                  <span className="font-mono text-blue-600 font-semibold">{tx('Dihitung dari seluruh aduan', 'Calculated from all reports')}</span>
                </div>
              </section>

              {/* Kolom Kanan (6 Cols): KINERJA DIVISI (SLA & KEPUASAN) */}
              <section aria-labelledby="section-performance" className="lg:col-span-6 p-6 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[0_12px_40px_-24px_rgba(10,36,99,0.3)] flex flex-col justify-between space-y-6">
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--color-border)]">
                    <div>
                      <h2 id="section-performance" className="text-base font-bold text-[var(--color-text)] flex items-center gap-2">
                        <Award size={18} className="text-[var(--color-status-success)]" />
                        {tx('Kinerja divisi: SLA dan kualitas', 'Division performance: SLA and quality')}
                      </h2>
                      <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                        {tx('Tingkat ketepatan waktu penanganan terhadap batas standar SLA', 'On-time handling rate against the SLA standard')}
                      </p>
                    </div>

                    {/* Search box for unit */}
                    <div className="relative">
                      <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                      <input
                        type="text"
                        placeholder={tx('Cari divisi...', 'Search division...')}
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
                        {tx(`Tidak ada unit yang cocok dengan pencarian "${searchUnit}".`, `No units match the search "${searchUnit}".`)}
                      </div>
                    ) : (
                      filteredUnits.map(unit => {
                        const isExcellent = unit.slaComplianceRate >= 95
                        const isGood = unit.slaComplianceRate >= 90 && unit.slaComplianceRate < 95

                        return (
                          <div
                            key={unit.id}
                            className="p-3.5 rounded-2xl bg-[var(--color-bg-secondary)]/70 border border-[var(--color-border)]/70 hover:border-[var(--color-border-strong)] transition flex flex-col justify-between gap-2.5"
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
                                  : 'bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border border-orange-300/40'
                              }`}>
                                SLA {unit.slaComplianceRate}%
                              </span>
                            </div>

                            {/* Performance Metrics Row */}
                            <div className="pt-2 border-t border-[var(--color-border)]/50 grid grid-cols-3 gap-2 text-[11px] font-mono">
                              <div>
                                <span className="text-[10px] text-[var(--color-text-muted)] block">{tx('Waktu Tanggap:', 'Response time:')}</span>
                                <span className="font-bold text-[var(--color-text)]">
                                  {unit.avgResolutionDays} {tx('hari', 'days')} <span className="text-[10px] text-[var(--color-text-muted)] font-normal">/ {unit.slaTargetDays}{tx('h', 'd')}</span>
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] text-[var(--color-text-muted)] block">{tx('Tuntas:', 'Resolved:')}</span>
                                <span className="font-bold text-emerald-600">
                                  {unit.resolvedCount} <span className="text-[10px] text-[var(--color-text-muted)] font-normal">{tx('dari', 'of')} {unit.total}</span>
                                </span>
                              </div>
                              <div className="text-right">
                                <span className="text-[10px] text-[var(--color-text-muted)] block">{tx('Kepuasan:', 'Satisfaction:')}</span>
                                <span className="font-bold text-[var(--color-text)] inline-flex items-center gap-0.5 justify-end">
                                  <Star size={11} className="fill-[var(--color-gold)] text-[var(--color-gold)]" />
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
                  <span>{slaRange
                    ? tx(`Target SLA kampus: ${slaRange.min} - ${slaRange.max} hari kerja`, `Campus SLA target: ${slaRange.min} - ${slaRange.max} working days`)
                    : ''}</span>
                  <span className="font-mono text-emerald-600 font-semibold">{tx('Sesuai data aduan', 'Based on report data')}</span>
                </div>
              </section>

            </div>
          </>
        )}

      </main>
    </div>
  )
}
