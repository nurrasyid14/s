import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import StakeholderLayout from '../../components/layout/StakeholderLayout.jsx'
import { StatusBadge, UrgencyBadge } from '../../components/ui/StatusBadge.jsx'
import ErrorState from '../../components/ui/ErrorState.jsx'
import UnitReportModal from '../../components/pdf/UnitReportModal.jsx'
import { formatDate, formatRelative, formatUrgencyScore, normalizeUrgencyScore } from '../../utils/formatter.js'
import { UNITS } from '../../data/units.js'
import { getUnitDashboardStats } from '../../services/complaintApi.js'
import { useDebounce } from '../../hooks/useDebounce.js'
import {
  MessageSquare, Clock, AlertTriangle, CheckCircle2,
  ArrowRight, Printer, Star, Building2, Layers,
  Search, ChevronDown, ArrowUpRight, ArrowDownRight,
  ShieldCheck, Wrench, Send, Server, UserCheck, Lightbulb, Filter
} from 'lucide-react'

export default function StakeholderDashboard() {
  const { t } = useTranslation()
  const { user } = useAuth()
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

  const items = unitStats?.items || []

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

  // Monthly stats for chart
  const monthlyUnitStats = [
    { month: 'Jan', completed: 18, inProgress: 6 },
    { month: 'Feb', completed: 24, inProgress: 8 },
    { month: 'Mar', completed: 21, inProgress: 5 },
    { month: 'Apr', completed: 29, inProgress: 11 },
    { month: 'Mei', completed: 34, inProgress: 9 },
    { month: 'Jun', completed: 38, inProgress: 12 },
    { month: 'Jul', completed: 31, inProgress: 8 },
    { month: 'Agu', completed: 27, inProgress: 7 },
  ]

  return (
    <StakeholderLayout title={`Dashboard Unit: ${selectedUnit}`}>
      {/* 1. Greeting & Unit Selector Bar (Finexy Style) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--color-text)] tracking-tight">
            Selamat pagi, {user?.name ? user.name.split(' ')[0] : 'Pengelola'}
          </h1>
          <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-1">
            Pantau penanganan aduan, masukan sivitas, dan usulan saran untuk unit {selectedUnit}.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Unit Selector: Stakeholder terkunci ke unitnya, Admin bisa memilih unit */}
          {user?.role === 'admin' ? (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xs">
              <Building2 size={15} className="text-[var(--color-primary)]" />
              <select
                id="unit-select"
                value={selectedUnit}
                onChange={e => setSelectedUnit(e.target.value)}
                className="text-xs font-bold text-[var(--color-text)] bg-transparent border-none focus:outline-none cursor-pointer dark:bg-transparent"
              >
                {UNITS.map(u => (
                  <option key={u.id} value={u.name}>{u.name} ({u.code})</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-full border border-[var(--color-primary)]/30 bg-[var(--color-primary-soft)] text-[var(--color-primary)] shadow-2xs">
              <Building2 size={15} />
              <span className="text-xs font-bold tracking-tight">Divisi: {user?.unit || selectedUnit}</span>
            </div>
          )}

          <button
            onClick={() => setShowPdfModal(true)}
            className="px-4 py-2.5 rounded-full text-xs font-bold text-white bg-[#0B1F3A] hover:bg-[#153460] dark:bg-[var(--color-primary)] dark:hover:bg-blue-600 transition-all shadow-sm flex items-center gap-2"
          >
            <Printer size={14} /> Ekspor PDF
          </button>
        </div>
      </div>

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
                  <span>Total Disposisi Unit</span>
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text)] truncate max-w-[170px]">
                    {selectedUnit}
                  </span>
                </div>

                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight text-[var(--color-text)]">
                    {loading ? '...' : (unitStats?.total || 0).toLocaleString('id-ID')}
                  </span>
                  <span className="text-xs font-mono text-[var(--color-text-muted)]">laporan</span>
                </div>

                <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
                  <ArrowUpRight size={13} /> {unitStats?.slaComplianceRate || 95}% Kepatuhan SLA
                </div>

                {/* 3-Type Breakdown Pills (Aduan, Masukan, Saran) */}
                <div className="mt-4 pt-3.5 border-t border-[var(--color-border)]">
                  <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] font-medium mb-2.5">
                    <span>Komposisi 3 Jenis Masuk</span>
                    <span className="font-mono text-[10px]">Filter Langsung</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {/* Aduan */}
                    <button
                      type="button"
                      onClick={() => setSelectedType(selectedType === 'complaint' ? 'all' : 'complaint')}
                      className={`p-2 rounded-2xl border text-left transition-all ${
                        selectedType === 'complaint'
                          ? 'bg-rose-500/10 border-rose-500/50 shadow-xs ring-1 ring-rose-500/30'
                          : 'bg-[var(--color-bg-secondary)] border-[var(--color-border)]/60 hover:border-rose-300'
                      }`}
                    >
                      <div className="flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400">
                        <AlertTriangle size={11} /> Aduan
                      </div>
                      <div className="text-base font-extrabold font-mono text-[var(--color-text)] mt-0.5">
                        {typeCounts.complaint}
                      </div>
                      <div className="text-[9px] text-[var(--color-text-muted)] truncate">7 Tahap SLA</div>
                    </button>

                    {/* Masukan */}
                    <button
                      type="button"
                      onClick={() => setSelectedType(selectedType === 'feedback' ? 'all' : 'feedback')}
                      className={`p-2 rounded-2xl border text-left transition-all ${
                        selectedType === 'feedback'
                          ? 'bg-sky-500/10 border-sky-500/50 shadow-xs ring-1 ring-sky-500/30'
                          : 'bg-[var(--color-bg-secondary)] border-[var(--color-border)]/60 hover:border-sky-300'
                      }`}
                    >
                      <div className="flex items-center gap-1 text-[10px] font-bold text-sky-600 dark:text-sky-400">
                        <MessageSquare size={11} /> Masukan
                      </div>
                      <div className="text-base font-extrabold font-mono text-[var(--color-text)] mt-0.5">
                        {typeCounts.feedback}
                      </div>
                      <div className="text-[9px] text-[var(--color-text-muted)] truncate">Evaluasi Mutu</div>
                    </button>

                    {/* Saran */}
                    <button
                      type="button"
                      onClick={() => setSelectedType(selectedType === 'suggestion' ? 'all' : 'suggestion')}
                      className={`p-2 rounded-2xl border text-left transition-all ${
                        selectedType === 'suggestion'
                          ? 'bg-amber-500/10 border-amber-500/50 shadow-xs ring-1 ring-amber-500/30'
                          : 'bg-[var(--color-bg-secondary)] border-[var(--color-border)]/60 hover:border-amber-300'
                      }`}
                    >
                      <div className="flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                        <Lightbulb size={11} /> Saran
                      </div>
                      <div className="text-base font-extrabold font-mono text-[var(--color-text)] mt-0.5">
                        {typeCounts.suggestion}
                      </div>
                      <div className="text-[9px] text-[var(--color-text-muted)] truncate">Ide Inovasi</div>
                    </button>
                  </div>
                </div>

                {/* Dual Pill Actions */}
                <div className="mt-4 grid grid-cols-2 gap-2.5">
                  <Link
                    to="/stakeholder/followups"
                    className="py-2.5 px-4 rounded-full text-xs font-bold text-center text-white bg-[#0B1F3A] hover:bg-[#153460] dark:bg-[var(--color-primary)] dark:hover:bg-blue-600 transition-all shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <Send size={13} /> Tindak Lanjut
                  </Link>
                  <Link
                    to="/stakeholder/complaints"
                    className="py-2.5 px-4 rounded-full text-xs font-bold text-center text-[var(--color-text)] bg-[var(--color-bg-secondary)] hover:bg-[var(--color-border)]/50 border border-[var(--color-border)] transition-all flex items-center justify-center gap-1.5"
                  >
                    <MessageSquare size={13} /> Semua Laporan
                  </Link>
                </div>
              </div>

              {/* Sub-cards: Status Mini Breakdown */}
              <div className="mt-5 pt-4 border-t border-[var(--color-border)]">
                <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] font-medium mb-2.5">
                  <span>Status Terbanyak</span>
                  <span>7 Tahap SLA</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2 rounded-2xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)]/60 text-center">
                    <div className="text-[10px] font-medium text-[var(--color-text-muted)] truncate">Diproses</div>
                    <div className="text-xs font-bold font-mono mt-0.5 text-blue-600">
                      {unitStats?.inProgress || 0}
                    </div>
                    <div className="text-[9px] font-bold text-blue-600 mt-0.5">Berjalan</div>
                  </div>
                  <div className="p-2 rounded-2xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)]/60 text-center">
                    <div className="text-[10px] font-medium text-[var(--color-text-muted)] truncate">Tindakan</div>
                    <div className="text-xs font-bold font-mono mt-0.5 text-amber-600">
                      {unitStats?.actionTaken || 0}
                    </div>
                    <div className="text-[9px] font-bold text-amber-600 mt-0.5">Lapangan</div>
                  </div>
                  <div className="p-2 rounded-2xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)]/60 text-center">
                    <div className="text-[10px] font-medium text-[var(--color-text-muted)] truncate">Selesai</div>
                    <div className="text-xs font-bold font-mono mt-0.5 text-emerald-600">
                      {unitStats?.resolved || 0}
                    </div>
                    <div className="text-[9px] font-bold text-emerald-600 mt-0.5">Tuntas</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: 2x2 Metric Cards (With BOLD BLUE Highlight Card) */}
            <div className="lg:col-span-4 grid grid-cols-2 gap-3.5">
              {/* Highlight Card 1: Dominan Biru Bold (Finexy Coral -> SuaraLens Bold Blue) */}
              <div className="rounded-3xl p-5 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 text-white shadow-md shadow-blue-900/20 flex flex-col justify-between relative overflow-hidden">
                <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full blur-xs pointer-events-none" />
                <div className="flex items-center justify-between relative z-10">
                  <span className="text-xs font-medium text-blue-100">Perlu Tindakan Unit</span>
                  <span className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white">
                    <AlertTriangle size={14} />
                  </span>
                </div>
                <div className="my-3 relative z-10">
                  <div className="text-3xl font-extrabold font-mono tracking-tight">
                    {urgentComplaints.length}
                  </div>
                  <div className="text-[11px] text-blue-200 mt-1 flex items-center gap-1 font-medium">
                    <ArrowUpRight size={12} /> Urgensi tinggi / baru
                  </div>
                </div>
                <Link
                  to="/stakeholder/followups"
                  className="text-[11px] font-bold text-white underline underline-offset-2 flex items-center gap-1"
                >
                  Eksekusi Lapangan <ArrowRight size={11} />
                </Link>
              </div>

              {/* Metric Card 2: Sedang Ditangani */}
              <div className="rounded-3xl p-5 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[var(--color-text-muted)]">Sedang Ditangani</span>
                  <span className="w-7 h-7 rounded-full bg-amber-50 dark:bg-amber-950 text-amber-600 flex items-center justify-center">
                    <Clock size={14} />
                  </span>
                </div>
                <div className="my-3">
                  <div className="text-3xl font-extrabold font-mono text-[var(--color-text)]">
                    {(unitStats?.dispatched || 0) + (unitStats?.inProgress || 0) + (unitStats?.actionTaken || 0)}
                  </div>
                  <div className="text-[11px] text-amber-600 mt-1 flex items-center gap-1 font-medium">
                    <Clock size={12} /> {unitStats?.inProgress || 0} proses aktif
                  </div>
                </div>
                <div className="text-[11px] text-[var(--color-text-muted)] font-mono">
                  Dalam proses pengerjaan
                </div>
              </div>

              {/* Metric Card 3: Kepatuhan SLA */}
              <div className="rounded-3xl p-5 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[var(--color-text-muted)]">Kepatuhan SLA</span>
                  <span className="w-7 h-7 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 size={14} />
                  </span>
                </div>
                <div className="my-3">
                  <div className="text-3xl font-extrabold font-mono text-emerald-600">
                    {unitStats?.slaComplianceRate || 95}%
                  </div>
                  <div className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1 font-medium">
                    <ArrowUpRight size={12} /> Rata-rata 2 hari
                  </div>
                </div>
                <div className="text-[11px] text-[var(--color-text-muted)] font-mono">
                  Sesuai target standar
                </div>
              </div>

              {/* Metric Card 4: CSAT Pelapor */}
              <div className="rounded-3xl p-5 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[var(--color-text-muted)]">Skor Kepuasan</span>
                  <span className="w-7 h-7 rounded-full bg-amber-50 dark:bg-amber-950 text-amber-500 flex items-center justify-center">
                    <Star size={14} className="fill-amber-500" />
                  </span>
                </div>
                <div className="my-3">
                  <div className="text-3xl font-extrabold font-mono text-[var(--color-text)] flex items-baseline gap-1">
                    {unitStats?.avgRating || 4.8} <span className="text-xs font-normal text-[var(--color-text-muted)]">/ 5.0</span>
                  </div>
                  <div className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1 font-medium">
                    <ArrowUpRight size={12} /> Sangat Memuaskan
                  </div>
                </div>
                <div className="text-[11px] text-[var(--color-text-muted)] font-mono">
                  Feedback civitas
                </div>
              </div>
            </div>

            {/* Card 3: Tren Penanganan Unit Bar Chart (Finexy Style) */}
            <div className="lg:col-span-4 rounded-3xl p-6 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-[var(--color-text)]">Tren Penanganan {selectedUnit}</h3>
                    <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">Rasio penyelesaian laporan unit</p>
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

                {/* Stylized Vertical Bar Chart */}
                <div className="mt-8 flex items-end justify-between gap-2 h-44 px-2 border-b border-[var(--color-border)] pb-2">
                  {monthlyUnitStats.map((item) => {
                    const total = item.completed + item.inProgress
                    const heightPercent = Math.min(100, Math.round((total / 50) * 100))
                    return (
                      <div key={item.month} className="flex-1 flex flex-col items-center gap-1.5 group">
                        <div className="w-full max-w-[20px] flex flex-col items-center justify-end rounded-t-lg overflow-hidden h-36 bg-[var(--color-bg-secondary)]">
                          {/* Top: Selesai (Bold Blue) */}
                          <div
                            className="w-full bg-[#1D4ED8] transition-all group-hover:brightness-110"
                            style={{ height: `${(item.completed / total) * heightPercent}%` }}
                            title={`${item.month}: ${item.completed} Selesai`}
                          />
                          {/* Bottom: In Progress (Navy / Dark) */}
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
                <span>Total selesai tahun ini: <strong className="text-[var(--color-text)]">222 tiket</strong></span>
                <span className="text-emerald-600 font-semibold font-mono">Efisiensi Tinggi</span>
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
                  Waktu Tanggap Unit ({selectedUnit})
                </div>
                <div className="w-full h-3 rounded-full bg-[var(--color-bg-secondary)] overflow-hidden flex border border-[var(--color-border)]/50">
                  <div className="h-full bg-gradient-to-r from-blue-600 to-indigo-700 w-3/5 rounded-full" />
                  <div className="h-full bg-blue-300 dark:bg-blue-900 w-1/5" />
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono mt-3 text-[var(--color-text-muted)]">
                  <span><strong>1.6 hari rata-rata</strong></span>
                  <span>Batas SLA: <strong>3.0 hari</strong></span>
                </div>
              </div>

              {/* PIC Petugas Lapangan Cards ("My Cards" in Finexy) */}
              <div className="rounded-3xl p-5 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <UserCheck size={16} className="text-[var(--color-primary)]" />
                    <span className="text-xs font-bold text-[var(--color-text)]">Petugas Lapangan Siaga</span>
                  </div>
                  <span className="text-[11px] font-mono text-[var(--color-text-muted)]">2 Shift Aktif</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Card 1: Dark Slate Card */}
                  <div className="rounded-2xl p-3.5 bg-[#0B1F3A] text-white shadow-sm flex flex-col justify-between min-h-[95px]">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-white/20">Koordinator</span>
                      <Wrench size={13} className="text-blue-300" />
                    </div>
                    <div className="mt-2">
                      <div className="text-xs font-bold">Koordinator Unit</div>
                      <div className="text-[9px] font-mono opacity-70">Respons: Cepat</div>
                    </div>
                  </div>

                  {/* Card 2: Bold Blue Card */}
                  <div className="rounded-2xl p-3.5 bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-sm flex flex-col justify-between min-h-[95px]">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-white/20">Teknisi</span>
                      <Server size={13} className="text-sky-200" />
                    </div>
                    <div className="mt-2">
                      <div className="text-xs font-bold">Tim Pelaksana</div>
                      <div className="text-[9px] font-mono opacity-80">Siaga 24/7</div>
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
                        Daftar Laporan &amp; Aspirasi Unit {selectedUnit}
                      </h3>
                      <p className="text-[11px] text-[var(--color-text-muted)]">
                        Disposisi yang memerlukan penanganan solusi, telaah masukan, atau saran inovasi
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                        <input
                          type="text"
                          placeholder="Cari ID tiket, kata kunci..."
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
                          ? 'bg-[#0B1F3A] text-white dark:bg-[var(--color-primary)]'
                          : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                      }`}
                    >
                      Semua ({items.length})
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
                      <AlertTriangle size={12} /> Aduan ({typeCounts.complaint})
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
                      <MessageSquare size={12} /> Masukan ({typeCounts.feedback})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedType('suggestion')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                        selectedType === 'suggestion'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-[var(--color-bg-secondary)] text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                      }`}
                    >
                      <Lightbulb size={12} /> Saran ({typeCounts.suggestion})
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
                    Tidak ada laporan yang sesuai dengan kriteria untuk unit {selectedUnit}.
                  </div>
                ) : (
                  <div className="overflow-x-auto mt-2">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-[11px] font-mono text-[var(--color-text-muted)] border-b border-[var(--color-border)]/60">
                          <th className="py-3 px-3 font-semibold">ID Tiket</th>
                          <th className="py-3 px-3 font-semibold">Jenis</th>
                          <th className="py-3 px-3 font-semibold">Deskripsi &amp; Rincian</th>
                          <th className="py-3 px-3 font-semibold">Urgensi</th>
                          <th className="py-3 px-3 font-semibold">Status</th>
                          <th className="py-3 px-3 font-semibold">Tanggal Masuk</th>
                          <th className="py-3 px-3 text-right font-semibold">Aksi</th>
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
                                    <MessageSquare size={10} /> Masukan
                                  </span>
                                ) : typeKey === 'suggestion' ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60">
                                    <Lightbulb size={10} /> Saran
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60">
                                    <AlertTriangle size={10} /> Aduan
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
                                  {isResolved ? 'Selesai' : c.status === 'dispatched' ? 'Didisposisi' : 'Diproses'}
                                </span>
                              </td>

                              <td className="py-3.5 px-3 text-[11px] font-mono text-[var(--color-text-muted)] whitespace-nowrap">
                                {formatDate(c.created_at)}
                              </td>

                              <td className="py-3.5 px-3 text-right">
                                <Link
                                  to={`/stakeholder/complaints/${c.id}`}
                                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-[var(--color-primary)] text-white hover:bg-blue-700 transition-colors shadow-2xs"
                                >
                                  Proses <ArrowRight size={11} />
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
                <span>Menampilkan {Math.min(6, filteredItems.length)} dari {filteredItems.length} laporan unit</span>
                <Link to="/stakeholder/complaints" className="text-[var(--color-primary)] font-bold hover:underline flex items-center gap-1">
                  Buka Seluruh Laporan Unit <ArrowRight size={13} />
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
