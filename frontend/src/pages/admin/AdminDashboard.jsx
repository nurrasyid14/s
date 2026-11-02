import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import AdminLayout from '../../components/layout/AdminLayout.jsx'
import { StatusBadge } from '../../components/ui/StatusBadge.jsx'
import ErrorState from '../../components/ui/ErrorState.jsx'
import { getComplaints, verifyComplaint, dispatchComplaint } from '../../services/complaintApi.js'
import { formatDate, formatRelative } from '../../utils/formatter.js'
import { UNITS } from '../../data/units.js'
import { useDebounce } from '../../hooks/useDebounce.js'
import {
  CheckSquare, Send, Clock, AlertTriangle, ArrowRight,
  ShieldCheck, Check, Building2, User, Search, Filter,
  MoreHorizontal, ChevronDown, CheckCircle2, FileText,
  Calendar, Layers, ArrowUpRight, ArrowDownRight, Sparkles, Wrench, GraduationCap, Server
} from 'lucide-react'

export default function AdminDashboard() {
  const { user } = useAuth()
  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterUnit, setFilterUnit] = useState('all')

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
    getComplaints({ limit: 50 })
      .then(res => setComplaints(res.items || []))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }

  // Antrean Verifikasi (Status 'received')
  // ── Computed queues (memoized — only recompute when complaints changes) ─────
  const verificationQueue = useMemo(
    () => complaints.filter(c => c.status === 'received'),
    [complaints]
  )
  // Antrean Disposisi (Status 'verified')
  const dispositionQueue = useMemo(
    () => complaints.filter(c => c.status === 'verified'),
    [complaints]
  )
  // Tiket Aktif Berjalan
  const activeDispatched = useMemo(
    () => complaints.filter(c => ['dispatched', 'in_progress', 'action_taken', 'answered'].includes(c.status)),
    [complaints]
  )
  // Tiket Selesai
  const resolvedList = useMemo(
    () => complaints.filter(c => c.status === 'resolved'),
    [complaints]
  )

  const debouncedSearch = useDebounce(searchQuery, 250)

  // ── Filtered complaints (memoized — recompute only on debounced search/unit change) ──
  const filteredComplaints = useMemo(() => complaints.filter(c => {
    const q = debouncedSearch.toLowerCase().trim()
    const matchSearch = !q ||
      (c.description || '').toLowerCase().includes(q) ||
      (c.ticket_id || '').toLowerCase().includes(q) ||
      (c.target_unit || c.unit || '').toLowerCase().includes(q)
    const matchUnit = filterUnit === 'all' || (c.target_unit || c.unit) === filterUnit
    return matchSearch && matchUnit
  }), [complaints, debouncedSearch, filterUnit])

  async function handleQuickVerify(id) {
    setSavingAction(true)
    setActionError('')
    try {
      await verifyComplaint(id, { verified: true, note: 'Diverifikasi langsung melalui Dashboard Administrator.' })
      setActionSuccess('Tiket berhasil diverifikasi!')
      setTimeout(() => setActionSuccess(''), 3000)
      loadData()
    } catch {
      setActionError('Gagal memverifikasi tiket. Silakan coba lagi.')
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
      setActionSuccess(`Tiket ${selectedTicket.ticket_id} berhasil didisposisikan ke ${dispositionForm.target_unit}!`)
      setTimeout(() => setActionSuccess(''), 3000)
      setSelectedTicket(null)
      loadData()
    } catch {
      setActionError('Gagal mendisposisikan tiket. Silakan periksa kembali isian form.')
      setTimeout(() => setActionError(''), 4000)
    } finally {
      setSavingAction(false)
    }
  }

  // Bar Chart Data for "Tren Penanganan Laporan"
  const monthlyStats = [
    { month: 'Jan', completed: 32, inProgress: 14 },
    { month: 'Feb', completed: 44, inProgress: 18 },
    { month: 'Mar', completed: 38, inProgress: 16 },
    { month: 'Apr', completed: 52, inProgress: 24 },
    { month: 'Mei', completed: 60, inProgress: 28 },
    { month: 'Jun', completed: 68, inProgress: 32 },
    { month: 'Jul', completed: 55, inProgress: 22 },
    { month: 'Agu', completed: 48, inProgress: 19 },
  ]

  return (
    <AdminLayout title="Dashboard Administrator Sentral">
      {/* 1. Header Greeting (Finexy Style) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--color-text)] tracking-tight">
            Selamat pagi, {user?.name ? user.name.split(' ')[0] : 'Admin'}
          </h1>
          <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-1">
            Pantau aspirasi, tindak lanjut penanganan, dan progres laporan kampus secara real-time.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            to="/admin/disposisi"
            className="px-4 py-2.5 rounded-full text-xs font-bold text-white bg-[#0B1F3A] hover:bg-[#153460] dark:bg-[var(--color-primary)] dark:hover:bg-blue-600 transition-all shadow-sm flex items-center gap-2"
          >
            <Send size={14} /> Disposisi Tiket
          </Link>
          <Link
            to="/admin/verifikasi"
            className="px-4 py-2.5 rounded-full text-xs font-bold text-[var(--color-text)] bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)] transition-all shadow-2xs flex items-center gap-2"
          >
            <CheckSquare size={14} /> Verifikasi ({verificationQueue.length})
          </Link>
        </div>
      </div>

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
          title="Gagal Memuat Data Antrean"
          message="Terjadi kendala saat menghubungi layanan pusat aduan. Silakan periksa koneksi dan coba kembali."
          onRetry={loadData}
        />
      )}

      {/* 2. Top Grid Section: Total Balance Card, 2x2 Metric Cards, and Trend Chart Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Card 1: Main Highlight Card ("Total Balance" style in Finexy) */}
        <div className="lg:col-span-4 rounded-3xl p-6 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] font-medium">
              <span>Total Aspirasi &amp; Aduan</span>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[var(--color-bg-secondary)] border border-[var(--color-border)] flex items-center gap-1 text-[var(--color-text)]">
                Semua Periode <ChevronDown size={12} />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight text-[var(--color-text)]">
                {complaints.length > 0 ? complaints.length.toLocaleString('id-ID') : '1.284'}
              </span>
              <span className="text-xs font-mono text-[var(--color-text-muted)]">tiket</span>
            </div>
            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
              <ArrowUpRight size={13} /> +12% dari bulan lalu
            </div>

            {/* Dual Action Buttons */}
            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <Link
                to="/admin/disposisi"
                className="py-2.5 px-4 rounded-full text-xs font-bold text-center text-white bg-[#0B1F3A] hover:bg-[#153460] dark:bg-[var(--color-primary)] dark:hover:bg-blue-600 transition-all shadow-xs flex items-center justify-center gap-1.5"
              >
                <Send size={13} /> Disposisi
              </Link>
              <Link
                to="/admin/complaints"
                className="py-2.5 px-4 rounded-full text-xs font-bold text-center text-[var(--color-text)] bg-[var(--color-bg-secondary)] hover:bg-[var(--color-border)]/50 border border-[var(--color-border)] transition-all flex items-center justify-center gap-1.5"
              >
                <FileText size={13} /> Laporan
              </Link>
            </div>
          </div>

          {/* Sub-cards: Kategori / Unit Terbanyak */}
          <div className="mt-6 pt-5 border-t border-[var(--color-border)]">
            <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] font-medium mb-3">
              <span>Unit Teratas</span>
              <span>14 Unit Kampus</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2.5 rounded-2xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)]/60 text-center">
                <div className="text-[10px] font-medium text-[var(--color-text-muted)] truncate">Sarpras</div>
                <div className="text-xs font-bold font-mono mt-0.5 text-[var(--color-text)]">482</div>
                <div className="text-[9px] font-bold text-emerald-600 mt-0.5">Aktif</div>
              </div>
              <div className="p-2.5 rounded-2xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)]/60 text-center">
                <div className="text-[10px] font-medium text-[var(--color-text-muted)] truncate">Akademik</div>
                <div className="text-xs font-bold font-mono mt-0.5 text-[var(--color-text)]">326</div>
                <div className="text-[9px] font-bold text-emerald-600 mt-0.5">Aktif</div>
              </div>
              <div className="p-2.5 rounded-2xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)]/60 text-center">
                <div className="text-[10px] font-medium text-[var(--color-text-muted)] truncate">IT Center</div>
                <div className="text-xs font-bold font-mono mt-0.5 text-[var(--color-text)]">195</div>
                <div className="text-[9px] font-bold text-emerald-600 mt-0.5">Aktif</div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: 2x2 Metric Cards Grid (With BOLD BLUE Highlight Card) */}
        <div className="lg:col-span-4 grid grid-cols-2 gap-3.5">
          {/* Highlight Card 1: Dominan Biru Bold (Finexy Coral -> SuaraLens Bold Blue) */}
          <div className="rounded-3xl p-5 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 text-white shadow-md shadow-blue-900/20 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full blur-xs pointer-events-none" />
            <div className="flex items-center justify-between relative z-10">
              <span className="text-xs font-medium text-blue-100">Perlu Verifikasi</span>
              <span className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white">
                <CheckSquare size={14} />
              </span>
            </div>
            <div className="my-3 relative z-10">
              <div className="text-3xl font-extrabold font-mono tracking-tight">
                {verificationQueue.length}
              </div>
              <div className="text-[11px] text-blue-200 mt-1 flex items-center gap-1 font-medium">
                <ArrowUpRight size={12} /> +7% bulan ini
              </div>
            </div>
            <Link
              to="/admin/verifikasi"
              className="text-[11px] font-bold text-white underline underline-offset-2 flex items-center gap-1"
            >
              Tinjau Antrean <ArrowRight size={11} />
            </Link>
          </div>

          {/* Metric Card 2: Perlu Disposisi */}
          <div className="rounded-3xl p-5 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--color-text-muted)]">Perlu Disposisi</span>
              <span className="w-7 h-7 rounded-full bg-blue-50 dark:bg-blue-950 text-[var(--color-primary)] flex items-center justify-center">
                <Send size={14} />
              </span>
            </div>
            <div className="my-3">
              <div className="text-3xl font-extrabold font-mono text-[var(--color-text)]">
                {dispositionQueue.length}
              </div>
              <div className="text-[11px] text-rose-500 mt-1 flex items-center gap-1 font-medium">
                <ArrowDownRight size={12} /> -5% bulan ini
              </div>
            </div>
            <Link
              to="/admin/disposisi"
              className="text-[11px] font-bold text-[var(--color-primary)] flex items-center gap-1"
            >
              Arahkan ke Unit <ArrowRight size={11} />
            </Link>
          </div>

          {/* Metric Card 3: Disposisi Aktif */}
          <div className="rounded-3xl p-5 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--color-text-muted)]">Disposisi Aktif</span>
              <span className="w-7 h-7 rounded-full bg-amber-50 dark:bg-amber-950 text-amber-600 flex items-center justify-center">
                <Clock size={14} />
              </span>
            </div>
            <div className="my-3">
              <div className="text-3xl font-extrabold font-mono text-[var(--color-text)]">
                {activeDispatched.length}
              </div>
              <div className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1 font-medium">
                <ArrowUpRight size={12} /> +8% diproses
              </div>
            </div>
            <div className="text-[11px] text-[var(--color-text-muted)] font-mono">
              Dalam penanganan
            </div>
          </div>

          {/* Metric Card 4: Aduan Selesai */}
          <div className="rounded-3xl p-5 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--color-text-muted)]">Aduan Selesai</span>
              <span className="w-7 h-7 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
                <ShieldCheck size={14} />
              </span>
            </div>
            <div className="my-3">
              <div className="text-3xl font-extrabold font-mono text-[var(--color-text)]">
                {resolvedList.length}
              </div>
              <div className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1 font-medium">
                <ArrowUpRight size={12} /> +4% tuntas
              </div>
            </div>
            <div className="text-[11px] text-[var(--color-text-muted)] font-mono">
              Feedback terpenuhi
            </div>
          </div>
        </div>

        {/* Card 3: Bar Chart Card ("Total Income / Profit & Loss" in Finexy) */}
        <div className="lg:col-span-4 rounded-3xl p-6 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold text-[var(--color-text)]">Tren Penanganan Laporan</h3>
                <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">Rasio penyelesaian bulanan</p>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-medium text-[var(--color-text-muted)]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#1D4ED8]" /> Selesai
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#0B1F3A] dark:bg-slate-700" /> Proses
                </span>
              </div>
            </div>

            {/* Stylized Vertical Bar Chart (Finexy aesthetic) */}
            <div className="mt-8 flex items-end justify-between gap-2 h-44 px-2 border-b border-[var(--color-border)] pb-2">
              {monthlyStats.map((item, idx) => {
                const total = item.completed + item.inProgress
                const heightPercent = Math.min(100, Math.round((total / 100) * 100))
                return (
                  <div key={item.month} className="flex-1 flex flex-col items-center gap-1.5 group">
                    <div className="w-full max-w-[20px] flex flex-col items-center justify-end rounded-t-lg overflow-hidden h-36 bg-[var(--color-bg-secondary)]">
                      {/* Top Bar: Selesai (Bold Blue) */}
                      <div
                        className="w-full bg-[#1D4ED8] transition-all group-hover:brightness-110"
                        style={{ height: `${(item.completed / total) * heightPercent}%` }}
                        title={`${item.month}: ${item.completed} Selesai`}
                      />
                      {/* Bottom Bar: In Progress (Navy / Slate) */}
                      <div
                        className="w-full bg-[#0B1F3A] dark:bg-slate-700 transition-all group-hover:brightness-110"
                        style={{ height: `${(item.inProgress / total) * heightPercent}%` }}
                        title={`${item.month}: ${item.inProgress} Diproses`}
                      />
                    </div>
                    <span className="text-[10px] font-mono font-medium text-[var(--color-text-muted)]">
                      {item.month}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-[var(--color-text-muted)] pt-2">
            <span>Rata-rata penyelesaian: <strong className="text-[var(--color-text)]">84%</strong></span>
            <span className="text-emerald-600 font-semibold font-mono">SLA Optimal</span>
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
              Standar Waktu Tanggap (SLA)
            </div>
            {/* Progress Bar with Bold Blue Striped Fill */}
            <div className="w-full h-3 rounded-full bg-[var(--color-bg-secondary)] overflow-hidden flex border border-[var(--color-border)]/50">
              <div className="h-full bg-gradient-to-r from-blue-600 to-indigo-700 w-2/5 rounded-full" />
              <div className="h-full bg-blue-300 dark:bg-blue-900 w-1/4" />
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono mt-3 text-[var(--color-text-muted)]">
              <span><strong>1.4 hari</strong> terpakai</span>
              <span>Batas SLA: <strong>3.0 hari</strong></span>
            </div>
          </div>

          {/* Operational Units Preview Cards ("My Cards" in Finexy) */}
          <div className="rounded-3xl p-5 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Building2 size={16} className="text-[var(--color-primary)]" />
                <span className="text-xs font-bold text-[var(--color-text)]">Unit Kerja Siaga</span>
              </div>
              <Link to="/stakeholder" className="text-[11px] font-semibold text-[var(--color-primary)] hover:underline">
                + Kelola
              </Link>
            </div>

            {/* 2 Visual Preview Cards */}
            <div className="grid grid-cols-2 gap-3">
              {/* Card 1: Dark Slate Card */}
              <div className="rounded-2xl p-3.5 bg-[#0B1F3A] text-white shadow-sm flex flex-col justify-between min-h-[95px]">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-white/20">Aktif</span>
                  <Wrench size={13} className="text-blue-300" />
                </div>
                <div className="mt-2">
                  <div className="text-xs font-bold">Sarpras &amp; Lab</div>
                  <div className="text-[9px] font-mono opacity-70">PIC: Ir. Ahmad</div>
                </div>
              </div>

              {/* Card 2: Bold Blue Card */}
              <div className="rounded-2xl p-3.5 bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-sm flex flex-col justify-between min-h-[95px]">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-white/20">Aktif</span>
                  <Server size={13} className="text-sky-200" />
                </div>
                <div className="mt-2">
                  <div className="text-xs font-bold">IT &amp; Jaringan</div>
                  <div className="text-[9px] font-mono opacity-80">PIC: Tim Jarkom</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sub-Column (8 Cols): Recent Activities Table ("Recent Activities" in Finexy) */}
        <div className="lg:col-span-8 rounded-3xl p-6 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs flex flex-col justify-between">
          <div>
            {/* Header with Search and Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--color-border)]">
              <div>
                <h3 className="text-sm font-bold text-[var(--color-text)]">Aduan &amp; Aktivitas Terbaru</h3>
                <p className="text-[11px] text-[var(--color-text-muted)]">Daftar aspirasi masuk sivitas kampus</p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                  <input
                    type="text"
                    placeholder="Cari ID, kata kunci..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 rounded-full text-xs bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] w-48 sm:w-56"
                  />
                </div>
                <select
                  value={filterUnit}
                  onChange={e => setFilterUnit(e.target.value)}
                  className="py-1.5 px-3 rounded-full text-xs font-medium bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text)]"
                >
                  <option value="all">Semua Unit</option>
                  {UNITS.map(u => (
                    <option key={u.id} value={u.name}>{u.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Table Content */}
            {loading ? (
              <div className="py-8 space-y-3">
                {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-12 rounded-xl" />)}
              </div>
            ) : filteredComplaints.length === 0 ? (
              <div className="py-12 text-center text-xs font-mono text-[var(--color-text-muted)]">
                Tidak ada laporan yang sesuai dengan pencarian.
              </div>
            ) : (
              <div className="overflow-x-auto mt-2">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-[11px] font-mono text-[var(--color-text-muted)] border-b border-[var(--color-border)]/60">
                      <th className="py-3 px-3 font-semibold">ID Aduan</th>
                      <th className="py-3 px-3 font-semibold">Deskripsi &amp; Masukan</th>
                      <th className="py-3 px-3 font-semibold">Unit Pelaksana</th>
                      <th className="py-3 px-3 font-semibold">Status</th>
                      <th className="py-3 px-3 font-semibold">Tanggal</th>
                      <th className="py-3 px-3 text-right font-semibold">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]/40">
                    {filteredComplaints.slice(0, 6).map(c => {
                      const isResolved = c.status === 'resolved'
                      const isPending = c.status === 'received'
                      return (
                        <tr key={c.id} className="hover:bg-[var(--color-bg-secondary)]/60 transition-colors group">
                          {/* ID Tiket */}
                          <td className="py-3.5 px-3 font-mono font-bold text-[var(--color-primary)]">
                            {c.ticket_id}
                          </td>

                          {/* Deskripsi & Category Icon */}
                          <td className="py-3.5 px-3 max-w-[220px]">
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
                          <td className="py-3.5 px-3 text-[var(--color-text-muted)] font-medium text-[11px] truncate max-w-[140px]">
                            {c.target_unit || c.unit || 'Belum didisposisikan'}
                          </td>

                          {/* Status with dot */}
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-[var(--color-border)] bg-[var(--color-surface)]">
                              <span className={`w-2 h-2 rounded-full ${
                                isResolved ? 'bg-emerald-500' : isPending ? 'bg-amber-500' : 'bg-blue-500'
                              }`} />
                              {isResolved ? 'Selesai' : isPending ? 'Verifikasi' : 'Diproses'}
                            </span>
                          </td>

                          {/* Tanggal */}
                          <td className="py-3.5 px-3 text-[11px] font-mono text-[var(--color-text-muted)] whitespace-nowrap">
                            {formatRelative(c.created_at)}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-3 text-right">
                            {c.status === 'received' ? (
                              <button
                                onClick={() => handleQuickVerify(c.id)}
                                disabled={savingAction}
                                className="px-3 py-1 rounded-full text-[11px] font-bold bg-[var(--color-primary)] text-white hover:bg-blue-700 transition-colors shadow-2xs"
                              >
                                Verifikasi
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setSelectedTicket(c)
                                  setDispositionForm({
                                    target_unit: c.target_unit || c.unit || UNITS[0].name,
                                    assigned_pic: '',
                                    disposition_note: `Tindak lanjuti penanganan tiket ${c.ticket_id}.`,
                                  })
                                }}
                                className="px-3 py-1 rounded-full text-[11px] font-bold border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-bg-secondary)] transition-colors"
                              >
                                Disposisi
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
            <span>Menampilkan {Math.min(6, filteredComplaints.length)} dari {filteredComplaints.length} tiket</span>
            <Link to="/admin/complaints" className="text-[var(--color-primary)] font-bold hover:underline flex items-center gap-1">
              Lihat Seluruh Laporan <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </div>

      {/* Modal Disposisi Cepat */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-quick-disposition-title"
            className="bg-[var(--color-surface)] border border-[var(--color-border)] max-w-lg w-full p-6 rounded-3xl shadow-2xl space-y-4 animate-fade-in"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
              <div>
                <div className="text-[10px] font-mono uppercase text-[var(--color-primary)] font-bold">DISPOSISI RESMI ADMIN</div>
                <h3 id="modal-quick-disposition-title" className="text-base font-bold text-[var(--color-text)] font-mono">{selectedTicket.ticket_id}</h3>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                aria-label="Tutup modal disposisi cepat"
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
                  Pilih Unit Kerja Tujuan (14 Standar Unit) *
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
                  Nama PIC Unit (Opsional)
                </label>
                <input
                  id="quick-pic"
                  type="text"
                  placeholder="Contoh: Koordinator Sarpras / Ir. Ahmad"
                  value={dispositionForm.assigned_pic}
                  onChange={e => setDispositionForm(f => ({ ...f, assigned_pic: e.target.value }))}
                  className="input-field text-xs rounded-xl"
                />
              </div>

              <div>
                <label htmlFor="quick-note" className="block font-bold text-[var(--color-text)] mb-1">
                  Catatan Arahan Disposisi Admin *
                </label>
                <textarea
                  id="quick-note"
                  rows={3}
                  required
                  placeholder="Tuliskan instruksi atau arahan pimpinan kepada unit terkait..."
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
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingAction}
                  className="btn-solid !py-2 !px-5 text-xs font-bold rounded-full min-h-[40px] shadow-sm"
                >
                  {savingAction ? 'Menyimpan...' : 'Kirimkan Disposisi ke Unit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
