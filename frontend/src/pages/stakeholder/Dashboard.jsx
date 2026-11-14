import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import StakeholderLayout from '../../components/layout/StakeholderLayout.jsx'
import { CountUp } from '../../components/motion/Motion.jsx'
import ErrorState from '../../components/ui/ErrorState.jsx'
import UnitReportModal from '../../components/pdf/UnitReportModal.jsx'
import { formatDate, formatUrgencyScore, normalizeUrgencyScore } from '../../utils/formatter.js'
import { UNITS } from '../../data/units.js'
import { getUnitDashboardStats } from '../../services/complaintApi.js'
import { useDebounce } from '../../hooks/useDebounce.js'
import useBilingual from '../../hooks/useBilingual.js'
import {
  MessageSquare, Clock, AlertTriangle, CheckCircle2,
  ArrowRight, Printer, Star, Building2,
  Search, ArrowUpRight,
  Wrench, Send, Server, UserCheck, Lightbulb
} from 'lucide-react'

export default function StakeholderDashboard() {
  const { user } = useAuth()
  const { tx, locale } = useBilingual()
  const [selectedUnit, setSelectedUnit] = useState(user?.unit || UNITS[4].name)
  const [unitStats, setUnitStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState('all') // 'all' | 'complaint' | 'feedback' | 'suggestion'

  useEffect(() => {
    if (user?.unit && user?.role !== 'admin') {
      setSelectedUnit(user.unit)
    }
  }, [user])

  useEffect(() => {
    loadUnitStats(selectedUnit)
  }, [selectedUnit])

  function loadUnitStats(unitName) {
    setLoading(true)
    setError(false)
    getUnitDashboardStats(unitName)
      .then(stats => setUnitStats(stats))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }

  const items = useMemo(() => unitStats?.items || [], [unitStats])
  const slaTargetDays = UNITS.find(u => u.name === selectedUnit)?.slaDays ?? 0
  const completionRate = unitStats?.total > 0 ? Math.round((unitStats.resolved / unitStats.total) * 100) : 0

  // Count by 3 types for this unit
  const typeCounts = useMemo(() => {
    const counts = { complaint: 0, feedback: 0, suggestion: 0 }
    items.forEach(c => {
      const typeKey = c.type || 'complaint'
      if (counts[typeKey] !== undefined) counts[typeKey]++
      else counts.complaint++
    })
    return counts
  }, [items])

  const urgentComplaints = useMemo(
    () => items.filter(c => (c.type === 'complaint' || !c.type) && (normalizeUrgencyScore(c.urgency_score) >= 7 || ['dispatched', 'in_progress'].includes(c.status))),
    [items]
  )

  const debouncedSearch = useDebounce(searchQuery, 250)

  const filteredItems = useMemo(
    () => items.filter(c => {
      const matchType = selectedType === 'all' || (c.type || 'complaint') === selectedType
      const q = debouncedSearch.toLowerCase().trim()
      const matchSearch = !q ||
        (c.description || '').toLowerCase().includes(q) ||
        (c.ticket_id || '').toLowerCase().includes(q) ||
        (c.category || '').toLowerCase().includes(q)
      return matchType && matchSearch
    }),
    [items, debouncedSearch, selectedType]
  )

  // Tren 8 bulan terakhir untuk unit ini, dihitung dari tanggal masuk tiket (bukan angka tetap)
  const monthlyUnitStats = useMemo(() => {
    const now = new Date()
    return Array.from({ length: 8 }, (_, i) => {
      const start = new Date(now.getFullYear(), now.getMonth() - (7 - i), 1)
      const inMonth = items.filter(c => {
        const d = new Date(c.created_at)
        return d.getFullYear() === start.getFullYear() && d.getMonth() === start.getMonth()
      })
      return {
        label: start.toLocaleDateString(locale, { month: 'short' }),
        completed: inMonth.filter(c => c.status === 'resolved').length,
        inProgress: inMonth.filter(c => !['resolved', 'received', 'verified'].includes(c.status)).length,
      }
    })
  }, [items, locale])

  return (
    <StakeholderLayout title={`${tx('Dashboard Unit', 'Unit Dashboard')}: ${selectedUnit}`}>
      {/* 1. Banner sapaan biru + pemilih unit */}
      <section className="banner-blue p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            {user?.role === 'admin' ? (
              <label className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 py-1.5 pl-3 pr-2 backdrop-blur-sm">
                <Building2 size={14} className="text-[var(--color-gold)]" />
                <span className="sr-only">{tx('Pilih unit', 'Select unit')}</span>
                <select
                  id="unit-select"
                  value={selectedUnit}
                  onChange={e => setSelectedUnit(e.target.value)}
                  className="cursor-pointer border-none bg-transparent text-xs font-bold text-white focus:outline-none dark:bg-transparent [&>option]:text-[var(--color-text)]"
                >
                  {UNITS.map(u => (
                    <option key={u.id} value={u.name}>{u.name} ({u.code})</option>
                  ))}
                </select>
              </label>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full bg-[var(--color-gold)] px-3 py-1.5 text-xs font-bold text-[var(--color-on-gold)]">
                <Building2 size={14} /> {user?.unit || selectedUnit}
              </span>
            )}
            <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
              {tx('Selamat datang', 'Welcome')}, {user?.name ? user.name.split(' ')[0] : tx('Pengelola', 'Manager')}
            </h2>
            <p className="mt-2 text-sm text-white/75">
              {urgentComplaints.length > 0
                ? <>{tx('Ada', 'There are')} <strong className="text-white">{urgentComplaints.length} {tx('laporan berurgensi tinggi yang perlu ditangani unit Anda.', 'high-urgency reports that need your unit\'s attention.')}</strong></>
                : <>{tx(`Tidak ada laporan mendesak saat ini. Pantau aduan, masukan, dan saran untuk unit ${selectedUnit}.`, `No urgent reports right now. Keep an eye on complaints, feedback, and suggestions for ${selectedUnit}.`)}</>}
            </p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <Link to="/stakeholder/followups" className="btn-gold !h-11 !px-5">
                <Send size={16} /> {tx('Kerjakan Tindak Lanjut', 'Work on Follow-ups')}
              </Link>
              <button onClick={() => setShowPdfModal(true)} className="btn-ghost-light !h-11 !px-5">
                <Printer size={16} /> {tx('Ekspor PDF', 'Export PDF')}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:w-[420px]">
            {[
              [tx('Total laporan', 'Total reports'), unitStats?.total || 0, ''],
              [tx('Urgensi tinggi', 'High urgency'), urgentComplaints.length, ''],
              [tx('Kepatuhan SLA', 'SLA compliance'), unitStats?.slaComplianceRate ?? 0, '%'],
            ].map(([label, val, suf]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.07] p-3 backdrop-blur-sm sm:p-4">
                <div className="text-2xl font-bold tracking-tight sm:text-3xl">{loading ? '…' : <CountUp value={val} suffix={suf} />}</div>
                <div className="mt-1 text-[11px] text-white/65 sm:text-xs">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {error ? (
        <ErrorState onRetry={() => loadUnitStats(selectedUnit)} />
      ) : (
        <>
          {/* 2. Top Grid Section (Total Balance Card, 2x2 Metric Cards, Trend Chart Card) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Card 1: Unit Summary Card ("Total Balance" style in Finexy) */}
            <div className="lg:col-span-4 rounded-3xl p-6 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] font-medium">
                  <span>{tx('Total Disposisi Unit', 'Total Unit Dispatches')}</span>
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text)] truncate max-w-[170px]">
                    {selectedUnit}
                  </span>
                </div>

                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight text-[var(--color-text)]">
                    {loading ? '...' : <CountUp value={unitStats?.total || 0} />}
                  </span>
                  <span className="text-xs font-mono text-[var(--color-text-muted)]">{tx('laporan', 'reports')}</span>
                </div>

                <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
                  <ArrowUpRight size={13} /> {unitStats?.slaComplianceRate ?? 0}% {tx('Kepatuhan SLA', 'SLA compliance')}
                </div>

                {/* 3-Type Breakdown Pills (Aduan, Masukan, Saran) */}
                <div className="mt-4 pt-3.5 border-t border-[var(--color-border)]">
                  <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] font-medium mb-2.5">
                    <span>{tx('Komposisi 3 Jenis Masuk', 'Composition of 3 Incoming Types')}</span>
                    <span className="font-mono text-[10px]">{tx('Filter Langsung', 'Direct Filter')}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {/* Aduan */}
                    <button
                      type="button"
                      onClick={() => setSelectedType(selectedType === 'complaint' ? 'all' : 'complaint')}
                      className={`p-2 rounded-2xl border text-left transition ${
                        selectedType === 'complaint'
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

                    {/* Masukan */}
                    <button
                      type="button"
                      onClick={() => setSelectedType(selectedType === 'feedback' ? 'all' : 'feedback')}
                      className={`p-2 rounded-2xl border text-left transition ${
                        selectedType === 'feedback'
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

                    {/* Saran */}
                    <button
                      type="button"
                      onClick={() => setSelectedType(selectedType === 'suggestion' ? 'all' : 'suggestion')}
                      className={`p-2 rounded-2xl border text-left transition ${
                        selectedType === 'suggestion'
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

                {/* Dual Pill Actions */}
                <div className="mt-4 grid grid-cols-2 gap-2.5">
                  <Link
                    to="/stakeholder/followups"
                    className="py-2.5 px-4 rounded-full text-xs font-bold text-center text-white bg-[var(--color-navy)] hover:bg-[var(--color-navy-hover)] dark:bg-[var(--color-primary)] dark:hover:bg-blue-600 transition shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <Send size={13} /> {tx('Tindak Lanjut', 'Follow-ups')}
                  </Link>
                  <Link
                    to="/stakeholder/complaints"
                    className="py-2.5 px-4 rounded-full text-xs font-bold text-center text-[var(--color-text)] bg-[var(--color-bg-secondary)] hover:bg-[var(--color-border)]/50 border border-[var(--color-border)] transition flex items-center justify-center gap-1.5"
                  >
                    <MessageSquare size={13} /> {tx('Semua Laporan', 'All Reports')}
                  </Link>
                </div>
              </div>

              {/* Sub-cards: Status Mini Breakdown */}
              <div className="mt-5 pt-4 border-t border-[var(--color-border)]">
                <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] font-medium mb-2.5">
                  <span>{tx('Status Penanganan', 'Handling Status')}</span>
                  <span>{tx('7 Tahap SLA', '7-Stage SLA')}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2 rounded-2xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)]/60 text-center">
                    <div className="text-[10px] font-medium text-[var(--color-text-muted)] truncate">{tx('Diproses', 'In progress')}</div>
                    <div className="text-xs font-bold font-mono mt-0.5 text-blue-600">
                      {unitStats?.inProgress || 0}
                    </div>
                    <div className="text-[9px] font-bold text-blue-600 mt-0.5">{tx('Berjalan', 'Running')}</div>
                  </div>
                  <div className="p-2 rounded-2xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)]/60 text-center">
                    <div className="text-[10px] font-medium text-[var(--color-text-muted)] truncate">{tx('Tindakan', 'Action')}</div>
                    <div className="text-xs font-bold font-mono mt-0.5 text-orange-600">
                      {unitStats?.actionTaken || 0}
                    </div>
                    <div className="text-[9px] font-bold text-orange-600 mt-0.5">{tx('Lapangan', 'Field')}</div>
                  </div>
                  <div className="p-2 rounded-2xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)]/60 text-center">
                    <div className="text-[10px] font-medium text-[var(--color-text-muted)] truncate">{tx('Selesai', 'Resolved')}</div>
                    <div className="text-xs font-bold font-mono mt-0.5 text-emerald-600">
                      {unitStats?.resolved || 0}
                    </div>
                    <div className="text-[9px] font-bold text-emerald-600 mt-0.5">{tx('Tuntas', 'Done')}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: 2x2 Metric Cards (With BOLD BLUE Highlight Card) */}
            <div className="lg:col-span-4 grid grid-cols-2 gap-3.5">
              {/* Highlight Card 1: Dominan Biru Bold (Finexy Coral -> SuaraLens Bold Blue) */}
              <div className="p-5 banner-blue !rounded-3xl shadow-[0_16px_40px_-20px_rgba(10,36,99,0.7)] flex flex-col justify-between">
                <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full border border-[var(--color-gold)]/30" />
                <div className="flex items-center justify-between relative z-10">
                  <span className="text-xs font-medium text-white/75">{tx('Perlu Tindakan Unit', 'Needs Unit Action')}</span>
                  <span className="w-7 h-7 rounded-full bg-[var(--color-gold)] flex items-center justify-center text-[var(--color-on-gold)]">
                    <AlertTriangle size={14} />
                  </span>
                </div>
                <div className="my-3 relative z-10">
                  <div className="text-3xl font-extrabold font-mono tracking-tight">
                    <CountUp value={urgentComplaints.length} />
                  </div>
                  <div className="text-[11px] text-white/65 mt-1 flex items-center gap-1 font-medium">
                    <ArrowUpRight size={12} /> {tx('Urgensi tinggi / baru', 'High urgency / new')}
                  </div>
                </div>
                <Link
                  to="/stakeholder/followups"
                  className="text-[11px] font-bold text-white underline underline-offset-2 flex items-center gap-1"
                >
                  {tx('Eksekusi Lapangan', 'Field Execution')} <ArrowRight size={11} />
                </Link>
              </div>

              {/* Metric Card 2: Sedang Ditangani */}
              <div className="rounded-3xl p-5 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[var(--color-text-muted)]">{tx('Sedang Ditangani', 'Being Handled')}</span>
                  <span className="w-7 h-7 rounded-full bg-orange-50 dark:bg-orange-950 text-orange-600 flex items-center justify-center">
                    <Clock size={14} />
                  </span>
                </div>
                <div className="my-3">
                  <div className="text-3xl font-extrabold font-mono text-[var(--color-text)]">
                    <CountUp value={(unitStats?.dispatched || 0) + (unitStats?.inProgress || 0) + (unitStats?.actionTaken || 0)} />
                  </div>
                  <div className="text-[11px] text-orange-600 mt-1 flex items-center gap-1 font-medium">
                    <Clock size={12} /> {unitStats?.inProgress || 0} {tx('proses aktif', 'active in progress')}
                  </div>
                </div>
                <div className="text-[11px] text-[var(--color-text-muted)] font-mono">
                  {tx('Dalam proses pengerjaan', 'Currently being worked on')}
                </div>
              </div>

              {/* Metric Card 3: Kepatuhan SLA */}
              <div className="rounded-3xl p-5 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[var(--color-text-muted)]">{tx('Kepatuhan SLA', 'SLA compliance')}</span>
                  <span className="w-7 h-7 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 size={14} />
                  </span>
                </div>
                <div className="my-3">
                  <div className="text-3xl font-extrabold font-mono text-emerald-600">
                    <CountUp value={unitStats?.slaComplianceRate ?? 0} suffix="%" />
                  </div>
                  <div className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1 font-medium">
                    <ArrowUpRight size={12} /> {tx('Rata-rata', 'Average')} {unitStats?.avgResolutionDays ?? 0} {tx('hari', 'days')}
                  </div>
                </div>
                <div className="text-[11px] text-[var(--color-text-muted)] font-mono">
                  {tx('Dihitung dari aduan selesai', 'Calculated from resolved reports')}
                </div>
              </div>

              {/* Metric Card 4: CSAT Pelapor */}
              <div className="rounded-3xl p-5 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[var(--color-text-muted)]">{tx('Skor Kepuasan', 'Satisfaction Score')}</span>
                  <span className="w-7 h-7 rounded-full bg-orange-50 dark:bg-orange-950 text-orange-500 flex items-center justify-center">
                    <Star size={14} className="fill-orange-500" />
                  </span>
                </div>
                <div className="my-3">
                  <div className="text-3xl font-extrabold font-mono text-[var(--color-text)] flex items-baseline gap-1">
                    {unitStats?.avgRating ?? 0} <span className="text-xs font-normal text-[var(--color-text-muted)]">/ 5.0</span>
                  </div>
                  <div className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1 font-medium">
                    <ArrowUpRight size={12} /> {unitStats?.avgRating ? tx('Rating dari umpan balik', 'Rating from feedback') : tx('Belum ada penilaian', 'No ratings yet')}
                  </div>
                </div>
                <div className="text-[11px] text-[var(--color-text-muted)] font-mono">
                  {tx('Feedback civitas', 'Campus feedback')}
                </div>
              </div>
            </div>

            {/* Card 3: Tren Penanganan Unit Bar Chart (Finexy Style) */}
            <div className="lg:col-span-4 rounded-3xl p-6 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-[var(--color-text)]">{tx('Tren Penanganan', 'Handling Trend')} {selectedUnit}</h3>
                    <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">{tx('Rasio penyelesaian laporan unit', 'Unit report resolution ratio')}</p>
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

                {/* Stylized Vertical Bar Chart */}
                <div className="mt-8 flex items-end justify-between gap-2 h-44 px-2 border-b border-[var(--color-border)] pb-2">
                  {monthlyUnitStats.map((item, idx) => {
                    const total = item.completed + item.inProgress
                    const maxTotal = Math.max(1, ...monthlyUnitStats.map(m => m.completed + m.inProgress))
                    const heightPercent = Math.round((total / maxTotal) * 100)
                    return (
                      <div key={`${item.label}-${idx}`} className="flex-1 flex flex-col items-center gap-1.5 group">
                        <div className="grow-y w-full max-w-[20px] flex flex-col items-center justify-end rounded-t-lg overflow-hidden h-36 bg-[var(--color-bg-secondary)]" style={{ '--i': idx }}>
                          {/* Top: Selesai (Bold Blue) */}
                          <div
                            className="w-full bg-[var(--color-primary)] transition-[filter] group-hover:brightness-110"
                            style={{ height: `${total ? (item.completed / total) * heightPercent : 0}%` }}
                            title={`${item.label}: ${item.completed} ${tx('Selesai', 'Resolved')}`}
                          />
                          {/* Bottom: In Progress (Navy / Dark) */}
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
                <span>{tx('Total selesai', 'Total resolved')}: <strong className="text-[var(--color-text)]">{unitStats?.resolved ?? 0} {tx('tiket', 'tickets')}</strong></span>
                <span className="text-emerald-600 font-semibold font-mono">{completionRate}% {tx('penyelesaian', 'resolved')}</span>
              </div>
            </div>
          </div>

          {/* 3. Bottom Grid Section: SLA Limit Card + Operational PIC + Recent Unit Complaints Table */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left Sub-Column (4 Cols): SLA Limit Card + PIC Petugas */}
            <div className="lg:col-span-4 space-y-5">
              {/* SLA Limit Card */}
              <div className="rounded-3xl p-5 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs">
                <div className="text-xs font-bold text-[var(--color-text)] mb-3">
                  {tx('Waktu Tanggap Unit', 'Unit Response Time')} ({selectedUnit})
                </div>
                <div className="w-full h-3 rounded-full bg-[var(--color-bg-secondary)] overflow-hidden flex border border-[var(--color-border)]/50">
                  <div
                    className="h-full grow-x bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-gold)] rounded-full"
                    style={{ width: `${slaTargetDays > 0 ? Math.min(100, ((unitStats?.avgResolutionDays ?? 0) / slaTargetDays) * 100) : 0}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono mt-3 text-[var(--color-text-muted)]">
                  <span><strong>{unitStats?.avgResolutionDays ?? 0} {tx('hari rata-rata', 'days average')}</strong></span>
                  <span>{tx('Batas SLA', 'SLA limit')}: <strong>{slaTargetDays} {tx('hari', 'days')}</strong></span>
                </div>
              </div>

              {/* Status Penanganan Cards */}
              <div className="rounded-3xl p-5 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <UserCheck size={16} className="text-[var(--color-primary)]" />
                    <span className="text-xs font-bold text-[var(--color-text)]">{tx('Status Penanganan', 'Handling Status')}</span>
                  </div>
                  <span className="text-[11px] font-mono text-[var(--color-text-muted)]">{unitStats?.total ?? 0} total</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Card 1: Dark Slate Card */}
                  <div className="rounded-2xl p-3.5 bg-[var(--color-navy)] text-white shadow-sm flex flex-col justify-between min-h-[95px]">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-white/20">{tx('Diproses', 'In progress')}</span>
                      <Wrench size={13} className="text-blue-300" />
                    </div>
                    <div className="mt-2">
                      <div className="text-xs font-bold">{unitStats?.inProgress ?? 0} {tx('tiket', 'tickets')}</div>
                      <div className="text-[9px] font-mono opacity-70">{tx('Sedang ditangani unit', 'Currently handled by the unit')}</div>
                    </div>
                  </div>

                  {/* Card 2: Bold Blue Card */}
                  <div className="rounded-2xl p-3.5 banner-blue !rounded-2xl text-white shadow-sm flex flex-col justify-between min-h-[95px]">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-white/20">{tx('Selesai', 'Resolved')}</span>
                      <Server size={13} className="text-sky-200" />
                    </div>
                    <div className="mt-2">
                      <div className="text-xs font-bold">{unitStats?.resolved ?? 0} {tx('tiket', 'tickets')}</div>
                      <div className="text-[9px] font-mono opacity-80">{tx('Status selesai', 'Marked resolved')}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Sub-Column (8 Cols): Recent Activities Table ("Recent Activities" in Finexy) */}
            <div className="lg:col-span-8 rounded-3xl p-6 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs flex flex-col justify-between">
              <div>
                {/* Header with Search and Type Filter Tabs */}
                <div className="flex flex-col gap-3 pb-4 border-b border-[var(--color-border)]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-[var(--color-text)]">
                        {tx('Daftar Laporan & Aspirasi Unit', 'Reports & Aspirations for Unit')} {selectedUnit}
                      </h3>
                      <p className="text-[11px] text-[var(--color-text-muted)]">
                        {tx('Disposisi yang memerlukan penanganan solusi, telaah masukan, atau saran inovasi', 'Dispatches that require a solution, feedback review, or innovation suggestion')}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                        <input
                          type="text"
                          placeholder={tx('Cari ID tiket, kata kunci...', 'Search ticket ID, keywords...')}
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          className="pl-8 pr-3 py-1.5 rounded-full text-xs bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] w-48 sm:w-60"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 3-Type Filter Tabs for Table */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pt-1">
                    <button
                      type="button"
                      onClick={() => setSelectedType('all')}
                      className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                        selectedType === 'all'
                          ? 'bg-[var(--color-navy)] text-white dark:bg-[var(--color-primary)]'
                          : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                      }`}
                    >
                      {tx('Semua', 'All')} ({items.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedType('complaint')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                        selectedType === 'complaint'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'bg-[var(--color-bg-secondary)] text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                      }`}
                    >
                      <AlertTriangle size={12} /> {tx('Aduan', 'Complaints')} ({typeCounts.complaint})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedType('feedback')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                        selectedType === 'feedback'
                          ? 'bg-sky-600 text-white shadow-xs'
                          : 'bg-[var(--color-bg-secondary)] text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/30'
                      }`}
                    >
                      <MessageSquare size={12} /> {tx('Masukan', 'Feedback')} ({typeCounts.feedback})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedType('suggestion')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                        selectedType === 'suggestion'
                          ? 'bg-orange-600 text-white shadow-xs'
                          : 'bg-[var(--color-bg-secondary)] text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/30'
                      }`}
                    >
                      <Lightbulb size={12} /> {tx('Saran', 'Suggestions')} ({typeCounts.suggestion})
                    </button>
                  </div>
                </div>

                {/* Table */}
                {loading ? (
                  <div className="py-8 space-y-3">
                    {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-12 rounded-xl" />)}
                  </div>
                ) : filteredItems.length === 0 ? (
                  <div className="py-12 text-center text-xs font-mono text-[var(--color-text-muted)]">
                    {tx(`Tidak ada laporan yang sesuai dengan kriteria untuk unit ${selectedUnit}.`, `No reports match the criteria for ${selectedUnit}.`)}
                  </div>
                ) : (
                  <div className="overflow-x-auto mt-2">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-[11px] font-mono text-[var(--color-text-muted)] border-b border-[var(--color-border)]/60">
                          <th className="py-3 px-3 font-semibold">{tx('ID Tiket', 'Ticket ID')}</th>
                          <th className="py-3 px-3 font-semibold">{tx('Jenis', 'Type')}</th>
                          <th className="py-3 px-3 font-semibold">{tx('Deskripsi & Rincian', 'Description & Details')}</th>
                          <th className="py-3 px-3 font-semibold">{tx('Urgensi', 'Urgency')}</th>
                          <th className="py-3 px-3 font-semibold">Status</th>
                          <th className="py-3 px-3 font-semibold">{tx('Tanggal Masuk', 'Received On')}</th>
                          <th className="py-3 px-3 text-right font-semibold">{tx('Aksi', 'Action')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--color-border)]/40">
                        {filteredItems.slice(0, 6).map(c => {
                          const isResolved = c.status === 'resolved'
                          const isUrgent = normalizeUrgencyScore(c.urgency_score) >= 7
                          const typeKey = c.type || 'complaint'
                          return (
                            <tr key={c.id} className="hover:bg-[var(--color-bg-secondary)]/60 transition-colors group">
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

                              <td className="py-3.5 px-3 max-w-[220px]">
                                <div className="flex items-center gap-2">
                                  <span className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 flex items-center justify-center flex-shrink-0 text-[10px] font-bold">
                                    {c.category ? c.category.charAt(0).toUpperCase() : 'U'}
                                  </span>
                                  <span className="truncate font-medium text-[var(--color-text)]">
                                    {c.description}
                                  </span>
                                </div>
                              </td>

                              <td className="py-3.5 px-3">
                                {typeKey === 'complaint' ? (
                                  <span className={`font-mono text-xs font-bold ${isUrgent ? 'text-rose-600' : 'text-blue-600'}`}>
                                    {formatUrgencyScore(c.urgency_score || 5)}/10
                                  </span>
                                ) : (
                                  <span className="font-mono text-[11px] text-[var(--color-text-muted)] italic">
                                    N/A
                                  </span>
                                )}
                              </td>

                              <td className="py-3.5 px-3 whitespace-nowrap">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-[var(--color-border)] bg-[var(--color-surface)]">
                                  <span className={`w-2 h-2 rounded-full ${
                                    isResolved ? 'bg-emerald-500' : isUrgent ? 'bg-rose-500' : 'bg-blue-500'
                                  }`} />
                                  {isResolved ? tx('Selesai', 'Resolved') : c.status === 'dispatched' ? tx('Didisposisi', 'Dispatched') : tx('Diproses', 'In progress')}
                                </span>
                              </td>

                              <td className="py-3.5 px-3 text-[11px] font-mono text-[var(--color-text-muted)] whitespace-nowrap">
                                {formatDate(c.created_at, locale === 'en-US' ? 'en' : 'id')}
                              </td>

                              <td className="py-3.5 px-3 text-right">
                                <Link
                                  to={`/stakeholder/complaints/${c.id}`}
                                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-[var(--color-primary)] text-white hover:bg-blue-700 transition-colors shadow-2xs"
                                >
                                  {tx('Proses', 'Process')} <ArrowRight size={11} />
                                </Link>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Table Footer */}
              <div className="pt-4 mt-2 border-t border-[var(--color-border)] flex items-center justify-between text-xs text-[var(--color-text-muted)]">
                <span>{tx(
                  `Menampilkan ${Math.min(6, filteredItems.length)} dari ${filteredItems.length} laporan unit`,
                  `Showing ${Math.min(6, filteredItems.length)} of ${filteredItems.length} unit reports`,
                )}</span>
                <Link to="/stakeholder/complaints" className="text-[var(--color-primary)] font-bold hover:underline flex items-center gap-1">
                  {tx('Buka Seluruh Laporan Unit', 'Open All Unit Reports')} <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Printable PDF Modal */}
      {showPdfModal && (
        <UnitReportModal
          unitData={unitStats || { unitName: selectedUnit, total: 0 }}
          complaints={unitStats?.items || []}
          onClose={() => setShowPdfModal(false)}
        />
      )}
    </StakeholderLayout>
  )
}
