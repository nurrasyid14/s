import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import AdminLayout from '../../components/layout/AdminLayout.jsx'
import { CountUp } from '../../components/motion/Motion.jsx'
import ErrorState from '../../components/ui/ErrorState.jsx'
import { getComplaints, getAdminDashboardStats, verifyComplaint, dispatchComplaint } from '../../services/complaintApi.js'
import { formatRelative } from '../../utils/formatter.js'
import { UNITS } from '../../data/units.js'
import { useDebounce } from '../../hooks/useDebounce.js'
import useBilingual from '../../hooks/useBilingual.js'
import {
  CheckSquare, Send, Clock, AlertTriangle, ArrowRight,
  ShieldCheck, Building2, Search,
  ChevronDown, CheckCircle2, FileText,
  Wrench, Server, MessageSquare, Lightbulb
} from 'lucide-react'

export default function AdminDashboard() {
  const { user } = useAuth()
  const { tx, locale, lang } = useBilingual()
  const [complaints, setComplaints] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterUnit, setFilterUnit] = useState('all')
  const [filterType, setFilterType] = useState('all') // 'all' | 'complaint' | 'feedback' | 'suggestion'

  // Disposition Modal state
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [dispositionForm, setDispositionForm] = useState({
    target_unit: 'Sarana Prasarana dan Layanan Umum',
    assigned_pic: '',
    disposition_note: '',
  })
  const [savingAction, setSavingAction] = useState(false)
  const [actionSuccess, setActionSuccess] = useState('')
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setSelectedTicket(null)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  function loadData() {
    setLoading(true)
    setError(false)
    Promise.all([
      getComplaints({ limit: 50 }),
      getAdminDashboardStats(),
    ])
      .then(([list, agg]) => {
        setComplaints(list.items || [])
        setStats(agg)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }

  // Angka dashboard dihitung backend dari SELURUH aduan (bukan hanya 50 yang dimuat)
  const totalCount = stats?.total ?? 0
  const typeCounts = stats?.byType ?? { complaint: 0, feedback: 0, suggestion: 0 }
  const verificationCount = stats?.verificationQueue ?? 0 // status received
  const dispositionCount = stats?.dispositionQueue ?? 0 // status verified
  const activeCount = stats?.activeDispatched ?? 0 // dispatched, in_progress, action_taken, answered
  const resolvedCount = stats?.resolved ?? 0
  const unitRanking = stats?.unitRanking ?? []
  const avgResolutionDays = stats?.avgResolutionDays ?? 0
  const completionRate = totalCount > 0 ? Math.round((resolvedCount / totalCount) * 100) : 0
  const monthlyStats = (stats?.monthly ?? []).map(m => ({
    ...m,
    label: new Date(`${m.month}-01T00:00:00`).toLocaleDateString(locale, { month: 'short' }),
  }))

  const debouncedSearch = useDebounce(searchQuery, 250)

  // Filtered complaints (memoized — recompute on search, unit, or type change)
  const filteredComplaints = useMemo(() => complaints.filter(c => {
    const matchType = filterType === 'all' || (c.type || 'complaint') === filterType
    const q = debouncedSearch.toLowerCase().trim()
    const matchSearch = !q ||
      (c.description || '').toLowerCase().includes(q) ||
      (c.ticket_id || '').toLowerCase().includes(q) ||
      (c.target_unit || c.unit || '').toLowerCase().includes(q)
    const matchUnit = filterUnit === 'all' || (c.target_unit || c.unit) === filterUnit
    return matchType && matchSearch && matchUnit
  }), [complaints, debouncedSearch, filterUnit, filterType])

  async function handleQuickVerify(id) {
    setSavingAction(true)
    setActionError('')
    try {
      await verifyComplaint(id, {
        verified: true,
        note: tx('Diverifikasi langsung melalui Dashboard Administrator.', 'Verified directly from the Administrator Dashboard.'),
      })
      setActionSuccess(tx('Tiket berhasil diverifikasi!', 'Ticket verified successfully!'))
      setTimeout(() => setActionSuccess(''), 3000)
      loadData()
    } catch {
      setActionError(tx('Gagal memverifikasi tiket. Silakan coba lagi.', 'Failed to verify the ticket. Please try again.'))
      setTimeout(() => setActionError(''), 4000)
    } finally {
      setSavingAction(false)
    }
  }

  async function handleQuickDispatch(e) {
    e.preventDefault()
    if (!selectedTicket) return
    setSavingAction(true)
    setActionError('')
    try {
      await dispatchComplaint(selectedTicket.id, dispositionForm)
      setActionSuccess(tx(
        `Tiket ${selectedTicket.ticket_id} berhasil didisposisikan ke ${dispositionForm.target_unit}!`,
        `Ticket ${selectedTicket.ticket_id} was dispatched to ${dispositionForm.target_unit}!`,
      ))
      setTimeout(() => setActionSuccess(''), 3000)
      setSelectedTicket(null)
      loadData()
    } catch {
      setActionError(tx(
        'Gagal mendisposisikan tiket. Silakan periksa kembali isian form.',
        'Failed to dispatch the ticket. Please check the form and try again.',
      ))
      setTimeout(() => setActionError(''), 4000)
    } finally {
      setSavingAction(false)
    }
  }

  return (
    <AdminLayout title={tx('Dashboard Administrator Sentral', 'Central Administrator Dashboard')}>
      {/* 1. Banner sapaan biru */}
      <section className="banner-blue p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-gold)]">
              {new Date().toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              {tx('Selamat datang', 'Welcome')}, {user?.name ? user.name.split(' ')[0] : 'Admin'}
            </h2>
            <p className="mt-2 text-sm text-white/75">
              {tx('Ada', 'There are')} <strong className="text-white">{verificationCount} {tx('laporan menunggu verifikasi', 'reports awaiting verification')}</strong>{' '}
              {tx('dan', 'and')} <strong className="text-white">{dispositionCount}</strong> {tx('siap didisposisikan ke unit.', 'ready to be dispatched to units.')}
            </p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <Link to="/admin/verifikasi" className="btn-gold !h-11 !px-5">
                <CheckSquare size={16} /> {tx('Mulai Verifikasi', 'Start Verification')} ({verificationCount})
              </Link>
              <Link to="/admin/disposisi" className="btn-ghost-light !h-11 !px-5">
                <Send size={16} /> {tx('Disposisi Tiket', 'Dispatch Tickets')}
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:w-[420px]">
            {[
              [tx('Total laporan', 'Total reports'), totalCount],
              [tx('Diproses unit', 'In unit process'), activeCount],
              [tx('Selesai', 'Resolved'), resolvedCount],
            ].map(([label, val]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.07] p-3 sm:p-4 backdrop-blur-sm">
                <div className="text-2xl font-bold tracking-tight sm:text-3xl"><CountUp value={val} /></div>
                <div className="mt-1 text-[11px] text-white/65 sm:text-xs">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Notification Toasts */}
      {actionSuccess && (
        <div role="status" aria-live="polite" className="p-3.5 border border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2.5 rounded-2xl animate-fade-in shadow-xs">
          <CheckCircle2 size={16} /> {actionSuccess}
        </div>
      )}
      {actionError && (
        <div role="alert" aria-live="assertive" className="p-3.5 border border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2.5 rounded-2xl animate-fade-in shadow-xs">
          <AlertTriangle size={16} /> {actionError}
        </div>
      )}
      {error && (
        <ErrorState
          title={tx('Gagal Memuat Data Antrean', 'Failed to Load Queue Data')}
          message={tx(
            'Terjadi kendala saat menghubungi layanan pusat aduan. Silakan periksa koneksi dan coba kembali.',
            'There was a problem reaching the central complaint service. Please check your connection and try again.',
          )}
          onRetry={loadData}
        />
      )}

      {/* 2. Top Grid Section: Total Balance Card, 2x2 Metric Cards, and Trend Chart Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Card 1: Main Highlight Card ("Total Balance" style in Finexy) */}
        <div className="lg:col-span-4 rounded-3xl p-6 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] font-medium">
              <span>{tx('Total Aspirasi & Aduan', 'Total Aspirations & Complaints')}</span>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[var(--color-bg-secondary)] border border-[var(--color-border)] flex items-center gap-1 text-[var(--color-text)]">
                {tx('Semua Periode', 'All Periods')} <ChevronDown size={12} />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight text-[var(--color-text)]">
                <CountUp value={totalCount} />
              </span>
              <span className="text-xs font-mono text-[var(--color-text-muted)]">{tx('laporan', 'reports')}</span>
            </div>

            {/* 3-Type Summary Breakdown */}
            <div className="mt-4 pt-3.5 border-t border-[var(--color-border)]">
              <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] font-medium mb-2.5">
                <span>{tx('Distribusi Tipe Masuk', 'Incoming Type Distribution')}</span>
                <span className="text-[10px] font-mono">{tx('Filter Cepat', 'Quick Filter')}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setFilterType(filterType === 'complaint' ? 'all' : 'complaint')}
                  className={`p-2 rounded-2xl border text-left transition ${
                    filterType === 'complaint'
                      ? 'bg-rose-500/10 border-rose-500/50 shadow-xs ring-1 ring-rose-500/30'
                      : 'bg-[var(--color-bg-secondary)] border-[var(--color-border)]/60 hover:border-rose-300'
                  }`}
                >
                  <div className="flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400">
                    <AlertTriangle size={11} /> {tx('Aduan', 'Complaints')}
                  </div>
                  <div className="text-base font-extrabold font-mono text-[var(--color-text)] mt-0.5">
                    <CountUp value={typeCounts.complaint} />
                  </div>
                  <div className="text-[9px] text-[var(--color-text-muted)] truncate">{tx('7 Tahap SLA', '7-Stage SLA')}</div>
                </button>

                <button
                  type="button"
                  onClick={() => setFilterType(filterType === 'feedback' ? 'all' : 'feedback')}
                  className={`p-2 rounded-2xl border text-left transition ${
                    filterType === 'feedback'
                      ? 'bg-sky-500/10 border-sky-500/50 shadow-xs ring-1 ring-sky-500/30'
                      : 'bg-[var(--color-bg-secondary)] border-[var(--color-border)]/60 hover:border-sky-300'
                  }`}
                >
                  <div className="flex items-center gap-1 text-[10px] font-bold text-sky-600 dark:text-sky-400">
                    <MessageSquare size={11} /> {tx('Masukan', 'Feedback')}
                  </div>
                  <div className="text-base font-extrabold font-mono text-[var(--color-text)] mt-0.5">
                    <CountUp value={typeCounts.feedback} />
                  </div>
                  <div className="text-[9px] text-[var(--color-text-muted)] truncate">{tx('Evaluasi Mutu', 'Quality Review')}</div>
                </button>

                <button
                  type="button"
                  onClick={() => setFilterType(filterType === 'suggestion' ? 'all' : 'suggestion')}
                  className={`p-2 rounded-2xl border text-left transition ${
                    filterType === 'suggestion'
                      ? 'bg-orange-500/10 border-orange-500/50 shadow-xs ring-1 ring-orange-500/30'
                      : 'bg-[var(--color-bg-secondary)] border-[var(--color-border)]/60 hover:border-orange-300'
                  }`}
                >
                  <div className="flex items-center gap-1 text-[10px] font-bold text-orange-600 dark:text-orange-400">
                    <Lightbulb size={11} /> {tx('Saran', 'Suggestion')}
                  </div>
                  <div className="text-base font-extrabold font-mono text-[var(--color-text)] mt-0.5">
                    <CountUp value={typeCounts.suggestion} />
                  </div>
                  <div className="text-[9px] text-[var(--color-text-muted)] truncate">{tx('Ide Inovasi', 'Innovation Ideas')}</div>
                </button>
              </div>
            </div>

            {/* Dual Action Buttons */}
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <Link
                to="/admin/disposisi"
                className="py-2.5 px-4 rounded-full text-xs font-bold text-center text-white bg-[var(--color-navy)] hover:bg-[var(--color-navy-hover)] dark:bg-[var(--color-primary)] dark:hover:bg-blue-600 transition shadow-xs flex items-center justify-center gap-1.5"
              >
                <Send size={13} /> {tx('Disposisi', 'Dispatch')}
              </Link>
              <Link
                to="/admin/complaints"
                className="py-2.5 px-4 rounded-full text-xs font-bold text-center text-[var(--color-text)] bg-[var(--color-bg-secondary)] hover:bg-[var(--color-border)]/50 border border-[var(--color-border)] transition flex items-center justify-center gap-1.5"
              >
                <FileText size={13} /> {tx('Laporan', 'Reports')}
              </Link>
            </div>
          </div>

          {/* Sub-cards: Kategori / Unit Terbanyak */}
          <div className="mt-5 pt-4 border-t border-[var(--color-border)]">
            <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] font-medium mb-2.5">
              <span>{tx('Unit Teratas', 'Top Units')}</span>
              <span>{unitRanking.length} {tx('Unit Terlibat', 'Units Involved')}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[0, 1, 2].map(i => (
                <div key={i} className="p-2 rounded-2xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)]/60 text-center">
                  <div className="text-[10px] font-medium text-[var(--color-text-muted)] truncate">{unitRanking[i]?.name || '—'}</div>
                  <div className="text-xs font-bold font-mono mt-0.5 text-[var(--color-text)]">{unitRanking[i]?.count ?? 0}</div>
                  <div className="text-[9px] font-bold text-emerald-600 mt-0.5">{unitRanking[i] ? tx('Tiket', 'Tickets') : tx('Kosong', 'Empty')}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Card 2: 2x2 Metric Cards Grid (With BOLD BLUE Highlight Card) */}
        <div className="lg:col-span-4 grid grid-cols-2 gap-3.5">
          {/* Highlight Card 1: Dominan Biru Bold (Finexy Coral -> SuaraLens Bold Blue) */}
          <div className="banner-blue !rounded-3xl p-5 shadow-[0_16px_40px_-20px_rgba(10,36,99,0.7)] flex flex-col justify-between">
            <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full border border-[var(--color-gold)]/30" />
            <div className="flex items-center justify-between relative z-10">
              <span className="text-xs font-medium text-white/75">{tx('Perlu Verifikasi', 'Needs Verification')}</span>
              <span className="w-7 h-7 rounded-full bg-[var(--color-gold)] flex items-center justify-center text-[var(--color-on-gold)]">
                <CheckSquare size={14} />
              </span>
            </div>
            <div className="my-3 relative z-10">
              <div className="text-3xl font-extrabold font-mono tracking-tight">
                <CountUp value={verificationCount} />
              </div>
            </div>
            <Link
              to="/admin/verifikasi"
              className="group text-[11px] font-bold text-[var(--color-gold)] flex items-center gap-1"
            >
              {tx('Tinjau Antrean', 'Review Queue')} <ArrowRight size={11} className="transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          </div>

          {/* Metric Card 2: Perlu Disposisi */}
          <div className="rounded-3xl p-5 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--color-text-muted)]">{tx('Perlu Disposisi', 'Needs Dispatch')}</span>
              <span className="w-7 h-7 rounded-full bg-blue-50 dark:bg-blue-950 text-[var(--color-primary)] flex items-center justify-center">
                <Send size={14} />
              </span>
            </div>
            <div className="my-3">
              <div className="text-3xl font-extrabold font-mono text-[var(--color-text)]">
                <CountUp value={dispositionCount} />
              </div>
            </div>
            <Link
              to="/admin/disposisi"
              className="text-[11px] font-bold text-[var(--color-primary)] flex items-center gap-1"
            >
              {tx('Arahkan ke Unit', 'Route to Unit')} <ArrowRight size={11} />
            </Link>
          </div>

          {/* Metric Card 3: Disposisi Aktif */}
          <div className="rounded-3xl p-5 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--color-text-muted)]">{tx('Disposisi Aktif', 'Active Dispatches')}</span>
              <span className="w-7 h-7 rounded-full bg-orange-50 dark:bg-orange-950 text-orange-600 flex items-center justify-center">
                <Clock size={14} />
              </span>
            </div>
            <div className="my-3">
              <div className="text-3xl font-extrabold font-mono text-[var(--color-text)]">
                <CountUp value={activeCount} />
              </div>
            </div>
            <div className="text-[11px] text-[var(--color-text-muted)] font-mono">
              {tx('Dalam penanganan', 'Being handled')}
            </div>
          </div>

          {/* Metric Card 4: Laporan Selesai */}
          <div className="rounded-3xl p-5 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--color-text-muted)]">{tx('Laporan Selesai', 'Resolved Reports')}</span>
              <span className="w-7 h-7 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
                <ShieldCheck size={14} />
              </span>
            </div>
            <div className="my-3">
              <div className="text-3xl font-extrabold font-mono text-[var(--color-text)]">
                <CountUp value={resolvedCount} />
              </div>
            </div>
            <div className="text-[11px] text-[var(--color-text-muted)] font-mono">
              {tx('Tiket berstatus selesai', 'Tickets marked resolved')}
            </div>
          </div>
        </div>

        {/* Card 3: Bar Chart Card ("Total Income / Profit & Loss" in Finexy) */}
        <div className="lg:col-span-4 rounded-3xl p-6 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold text-[var(--color-text)]">{tx('Tren Penanganan Laporan', 'Report Handling Trend')}</h3>
                <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">{tx('Rasio penyelesaian bulanan', 'Monthly resolution ratio')}</p>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-medium text-[var(--color-text-muted)]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[var(--color-primary)]" /> {tx('Selesai', 'Resolved')}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[var(--color-gold)]" /> {tx('Proses', 'In progress')}
                </span>
              </div>
            </div>

            {/* Stylized Vertical Bar Chart (Finexy aesthetic) */}
            <div className="mt-8 flex items-end justify-between gap-2 h-44 px-2 border-b border-[var(--color-border)] pb-2">
              {monthlyStats.map((item, idx) => {
                const total = item.completed + item.inProgress
                const maxTotal = Math.max(1, ...monthlyStats.map(m => m.completed + m.inProgress))
                const heightPercent = Math.round((total / maxTotal) * 100)
                return (
                  <div key={item.month} className="flex-1 flex flex-col items-center gap-1.5 group">
                    <div className="grow-y w-full max-w-[20px] flex flex-col items-center justify-end rounded-t-lg overflow-hidden h-36 bg-[var(--color-bg-secondary)]" style={{ '--i': idx }}>
                      {/* Top Bar: Selesai (Bold Blue) */}
                      <div
                        className="w-full bg-[var(--color-primary)] transition-[filter] group-hover:brightness-110"
                        style={{ height: `${total ? (item.completed / total) * heightPercent : 0}%` }}
                        title={`${item.label}: ${item.completed} ${tx('Selesai', 'Resolved')}`}
                      />
                      {/* Bottom Bar: In Progress (Navy / Slate) */}
                      <div
                        className="w-full bg-[var(--color-gold)] transition-[filter] group-hover:brightness-110"
                        style={{ height: `${total ? (item.inProgress / total) * heightPercent : 0}%` }}
                        title={`${item.label}: ${item.inProgress} ${tx('Diproses', 'In progress')}`}
                      />
                    </div>
                    <span className="text-[10px] font-mono font-medium text-[var(--color-text-muted)]">
                      {item.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-[var(--color-text-muted)] pt-2">
            <span>{tx('Tingkat penyelesaian', 'Resolution rate')}: <strong className="text-[var(--color-text)]">{completionRate}%</strong></span>
            <span className="text-emerald-600 font-semibold font-mono">{resolvedCount} / {totalCount}</span>
          </div>
        </div>
      </div>

      {/* 3. Bottom Grid Section: SLA Limit Card + Operational Units + Recent Activities Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Sub-Column (4 Cols): SLA Limit Card + Quick Operational Units */}
        <div className="lg:col-span-4 space-y-5">
          {/* SLA Limit Card ("Monthly Spending Limit" in Finexy) */}
          <div className="rounded-3xl p-5 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs">
            <div className="text-xs font-bold text-[var(--color-text)] mb-3">
              {tx('Standar Waktu Tanggap (SLA)', 'Response Time Standard (SLA)')}
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono mt-3 text-[var(--color-text-muted)]">
              <span><strong>{avgResolutionDays} {tx('hari', 'days')}</strong> {tx('rata-rata penyelesaian', 'average resolution')}</span>
              <span>{resolvedCount} {tx('tiket selesai', 'tickets resolved')}</span>
            </div>
          </div>

          {/* Operational Units Preview Cards ("My Cards" in Finexy) */}
          <div className="rounded-3xl p-5 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Building2 size={16} className="text-[var(--color-primary)]" />
                <span className="text-xs font-bold text-[var(--color-text)]">{tx('Unit Kerja Siaga', 'Units on Standby')}</span>
              </div>
              <Link to="/stakeholder" className="text-[11px] font-semibold text-[var(--color-primary)] hover:underline">
                + {tx('Kelola', 'Manage')}
              </Link>
            </div>

            {/* 2 Visual Preview Cards */}
            <div className="grid grid-cols-2 gap-3">
              {/* Card 1: Dark Slate Card (unit tiket terbanyak #1) */}
              <div className="rounded-2xl p-3.5 bg-[var(--color-navy)] text-white shadow-sm flex flex-col justify-between min-h-[95px]">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-white/20">{unitRanking[0] ? `${unitRanking[0].count} ${tx('tiket', 'tickets')}` : tx('Kosong', 'Empty')}</span>
                  <Wrench size={13} className="text-blue-300" />
                </div>
                <div className="mt-2">
                  <div className="text-xs font-bold">{unitRanking[0]?.name || tx('Belum ada unit', 'No units yet')}</div>
                  <div className="text-[9px] font-mono opacity-70">{tx('Unit tiket terbanyak', 'Unit with most tickets')}</div>
                </div>
              </div>

              {/* Card 2: Bold Blue Card (unit tiket terbanyak #2) */}
              <div className="rounded-2xl p-3.5 banner-blue !rounded-2xl text-white shadow-sm flex flex-col justify-between min-h-[95px]">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-white/20">{unitRanking[1] ? `${unitRanking[1].count} ${tx('tiket', 'tickets')}` : tx('Kosong', 'Empty')}</span>
                  <Server size={13} className="text-sky-200" />
                </div>
                <div className="mt-2">
                  <div className="text-xs font-bold">{unitRanking[1]?.name || tx('Belum ada unit', 'No units yet')}</div>
                  <div className="text-[9px] font-mono opacity-80">{tx('Unit tiket terbanyak', 'Unit with most tickets')}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sub-Column (8 Cols): Recent Activities Table ("Recent Activities" in Finexy) */}
        <div className="lg:col-span-8 rounded-3xl p-6 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs flex flex-col justify-between">
          <div>
            {/* Header with Search, Unit Filter, and Type Filter */}
            <div className="flex flex-col gap-3 pb-4 border-b border-[var(--color-border)]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-[var(--color-text)]">{tx('Aktivitas & Laporan Sivitas', 'Campus Activity & Reports')}</h3>
                  <p className="text-[11px] text-[var(--color-text-muted)]">{tx('Rekap seluruh aduan, masukan, dan saran kampus', 'Summary of all campus complaints, feedback, and suggestions')}</p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                    <input
                      type="text"
                      placeholder={tx('Cari ID, kata kunci...', 'Search ID, keywords...')}
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="pl-8 pr-3 py-1.5 rounded-full text-xs bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] w-44 sm:w-52"
                    />
                  </div>
                  <select
                    value={filterUnit}
                    onChange={e => setFilterUnit(e.target.value)}
                    className="py-1.5 px-3 rounded-full text-xs font-medium bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text)]"
                  >
                    <option value="all">{tx('Semua Unit', 'All Units')}</option>
                    {UNITS.map(u => (
                      <option key={u.id} value={u.name}>{u.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 3-Type Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pt-1">
                <button
                  type="button"
                  onClick={() => setFilterType('all')}
                  className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                    filterType === 'all'
                      ? 'bg-[var(--color-navy)] text-white dark:bg-[var(--color-primary)]'
                      : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                  }`}
                >
                  {tx('Semua', 'All')} ({totalCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('complaint')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                    filterType === 'complaint'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-[var(--color-bg-secondary)] text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                  }`}
                >
                  <AlertTriangle size={12} /> {tx('Aduan', 'Complaints')} ({typeCounts.complaint})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('feedback')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                    filterType === 'feedback'
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'bg-[var(--color-bg-secondary)] text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/30'
                  }`}
                >
                  <MessageSquare size={12} /> {tx('Masukan', 'Feedback')} ({typeCounts.feedback})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('suggestion')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                    filterType === 'suggestion'
                      ? 'bg-orange-600 text-white shadow-xs'
                      : 'bg-[var(--color-bg-secondary)] text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/30'
                  }`}
                >
                  <Lightbulb size={12} /> {tx('Saran', 'Suggestions')} ({typeCounts.suggestion})
                </button>
              </div>
            </div>

            {/* Table Content */}
            {loading ? (
              <div className="py-8 space-y-3">
                {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-12 rounded-xl" />)}
              </div>
            ) : filteredComplaints.length === 0 ? (
              <div className="py-12 text-center text-xs font-mono text-[var(--color-text-muted)]">
                {tx('Tidak ada laporan yang sesuai dengan kriteria filter.', 'No reports match the current filters.')}
              </div>
            ) : (
              <div className="overflow-x-auto mt-2">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-[11px] font-mono text-[var(--color-text-muted)] border-b border-[var(--color-border)]/60">
                      <th className="py-3 px-3 font-semibold">{tx('ID Tiket', 'Ticket ID')}</th>
                      <th className="py-3 px-3 font-semibold">{tx('Jenis', 'Type')}</th>
                      <th className="py-3 px-3 font-semibold">{tx('Deskripsi Laporan', 'Report Description')}</th>
                      <th className="py-3 px-3 font-semibold">{tx('Unit Pelaksana', 'Executing Unit')}</th>
                      <th className="py-3 px-3 font-semibold">Status</th>
                      <th className="py-3 px-3 font-semibold">{tx('Tanggal', 'Date')}</th>
                      <th className="py-3 px-3 text-right font-semibold">{tx('Tindakan', 'Action')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]/40">
                    {filteredComplaints.slice(0, 6).map(c => {
                      const isResolved = c.status === 'resolved'
                      const isPending = c.status === 'received'
                      const typeKey = c.type || 'complaint'
                      return (
                        <tr key={c.id} className="hover:bg-[var(--color-bg-secondary)]/60 transition-colors group">
                          {/* ID Tiket */}
                          <td className="py-3.5 px-3 font-mono font-bold text-[var(--color-primary)]">
                            {c.ticket_id}
                          </td>

                          {/* Distinct Type Badge */}
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            {typeKey === 'feedback' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900/60">
                                <MessageSquare size={10} /> {tx('Masukan', 'Feedback')}
                              </span>
                            ) : typeKey === 'suggestion' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900/60">
                                <Lightbulb size={10} /> {tx('Saran', 'Suggestion')}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60">
                                <AlertTriangle size={10} /> {tx('Aduan', 'Complaint')}
                              </span>
                            )}
                          </td>

                          {/* Deskripsi & Category Icon */}
                          <td className="py-3.5 px-3 max-w-[210px]">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 flex items-center justify-center flex-shrink-0 text-[10px] font-bold">
                                {c.category ? c.category.charAt(0).toUpperCase() : 'A'}
                              </span>
                              <span className="truncate font-medium text-[var(--color-text)]">
                                {c.description}
                              </span>
                            </div>
                          </td>

                          {/* Unit */}
                          <td className="py-3.5 px-3 text-[var(--color-text-muted)] font-medium text-[11px] truncate max-w-[130px]">
                            {c.target_unit || c.unit || tx('Belum didisposisikan', 'Not yet dispatched')}
                          </td>

                          {/* Status with dot */}
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-[var(--color-border)] bg-[var(--color-surface)]">
                              <span className={`w-2 h-2 rounded-full ${
                                isResolved ? 'bg-emerald-500' : isPending ? 'bg-orange-500' : 'bg-blue-500'
                              }`} />
                              {isResolved ? tx('Selesai', 'Resolved') : isPending ? tx('Verifikasi', 'Verification') : tx('Diproses', 'In progress')}
                            </span>
                          </td>

                          {/* Tanggal */}
                          <td className="py-3.5 px-3 text-[11px] font-mono text-[var(--color-text-muted)] whitespace-nowrap">
                            {formatRelative(c.created_at, lang)}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-3 text-right">
                            {c.status === 'received' ? (
                              <button
                                onClick={() => handleQuickVerify(c.id)}
                                disabled={savingAction}
                                className="px-3 py-1 rounded-full text-[11px] font-bold bg-[var(--color-primary)] text-white hover:bg-blue-700 transition-colors shadow-2xs"
                              >
                                {tx('Verifikasi', 'Verify')}
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setSelectedTicket(c)
                                  setDispositionForm({
                                    target_unit: c.target_unit || c.unit || UNITS[0].name,
                                    assigned_pic: '',
                                    disposition_note: tx(
                                      `Tindak lanjuti penanganan tiket ${c.ticket_id}.`,
                                      `Follow up on the handling of ticket ${c.ticket_id}.`,
                                    ),
                                  })
                                }}
                                className="px-3 py-1 rounded-full text-[11px] font-bold border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-bg-secondary)] transition-colors"
                              >
                                {tx('Disposisi', 'Dispatch')}
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer of Table */}
          <div className="pt-4 mt-2 border-t border-[var(--color-border)] flex items-center justify-between text-xs text-[var(--color-text-muted)]">
            <span>{tx(
              `Menampilkan ${Math.min(6, filteredComplaints.length)} dari ${filteredComplaints.length} laporan`,
              `Showing ${Math.min(6, filteredComplaints.length)} of ${filteredComplaints.length} reports`,
            )}</span>
            <Link to="/admin/complaints" className="text-[var(--color-primary)] font-bold hover:underline flex items-center gap-1">
              {tx('Lihat Seluruh Laporan', 'View All Reports')} <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </div>

      {/* Modal Disposisi Cepat */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 backdrop-in bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-quick-disposition-title"
            className="bg-[var(--color-surface)] border border-[var(--color-border)] max-w-lg w-full p-6 rounded-3xl shadow-2xl space-y-4 modal-in"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase text-[var(--color-primary)] font-bold">
                    {tx('DISPOSISI RESMI ADMIN', 'OFFICIAL ADMIN DISPATCH')}
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    selectedTicket.type === 'feedback'
                      ? 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300'
                      : selectedTicket.type === 'suggestion'
                      ? 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300'
                      : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                  }`}>
                    {selectedTicket.type === 'feedback' ? <MessageSquare size={10} /> : selectedTicket.type === 'suggestion' ? <Lightbulb size={10} /> : <AlertTriangle size={10} />}
                    {selectedTicket.type === 'feedback' ? tx('Masukan', 'Feedback') : selectedTicket.type === 'suggestion' ? tx('Saran', 'Suggestion') : tx('Aduan', 'Complaint')}
                  </span>
                </div>
                <h3 id="modal-quick-disposition-title" className="text-base font-bold text-[var(--color-text)] font-mono mt-0.5">
                  {selectedTicket.ticket_id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                aria-label={tx('Tutup modal disposisi cepat', 'Close quick dispatch modal')}
                className="p-2 rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-secondary)] transition-colors text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[var(--color-text-muted)] bg-[var(--color-bg-secondary)] p-3.5 border border-[var(--color-border)] rounded-2xl leading-relaxed">
              "{selectedTicket.description}"
            </p>

            <form onSubmit={handleQuickDispatch} className="space-y-3.5 text-xs">
              <div>
                <label htmlFor="quick-target-unit" className="block font-bold text-[var(--color-text)] mb-1">
                  {tx('Pilih Unit Kerja Tujuan (14 Standar Unit)', 'Select Target Unit (14 Standard Units)')} *
                </label>
                <select
                  id="quick-target-unit"
                  value={dispositionForm.target_unit}
                  onChange={e => setDispositionForm(f => ({ ...f, target_unit: e.target.value }))}
                  className="input-field text-xs rounded-xl"
                >
                  {UNITS.map(u => (
                    <option key={u.id} value={u.name}>{u.name} ({u.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="quick-pic" className="block font-bold text-[var(--color-text)] mb-1">
                  {tx('Nama PIC Unit (Opsional)', 'Unit PIC Name (Optional)')}
                </label>
                <input
                  id="quick-pic"
                  type="text"
                  placeholder={tx('Contoh: Koordinator Sarpras', 'Example: Facilities Coordinator')}
                  value={dispositionForm.assigned_pic}
                  onChange={e => setDispositionForm(f => ({ ...f, assigned_pic: e.target.value }))}
                  className="input-field text-xs rounded-xl"
                />
              </div>

              <div>
                <label htmlFor="quick-note" className="block font-bold text-[var(--color-text)] mb-1">
                  {tx('Catatan Arahan Disposisi Admin', 'Admin Dispatch Instructions')} *
                </label>
                <textarea
                  id="quick-note"
                  rows={3}
                  required
                  placeholder={
                    selectedTicket.type === 'feedback'
                      ? tx('Tuliskan arahan tindak lanjut masukan untuk evaluasi mutu layanan unit...', 'Write follow-up instructions for this feedback to the unit quality review...')
                      : selectedTicket.type === 'suggestion'
                      ? tx('Tuliskan telaah rekomendasi usulan saran inovasi sivitas...', 'Write a review and recommendation for this campus innovation suggestion...')
                      : tx('Tuliskan instruksi atau arahan pimpinan penanganan aduan kepada unit terkait...', 'Write instructions for handling this complaint to the relevant unit...')
                  }
                  value={dispositionForm.disposition_note}
                  onChange={e => setDispositionForm(f => ({ ...f, disposition_note: e.target.value }))}
                  className="input-field text-xs resize-none rounded-xl"
                />
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={() => setSelectedTicket(null)}
                  className="btn-outline !py-2 !px-4 text-xs rounded-full min-h-[40px]"
                >
                  {tx('Batal', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={savingAction}
                  className="btn-solid !py-2 !px-5 text-xs font-bold rounded-full min-h-[40px] shadow-sm"
                >
                  {savingAction ? tx('Menyimpan...', 'Saving...') : tx('Kirimkan Disposisi ke Unit', 'Send Dispatch to Unit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
