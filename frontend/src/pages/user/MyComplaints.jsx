import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Navbar from '../../components/layout/Navbar.jsx'
import { StatusBadge } from '../../components/ui/StatusBadge.jsx'
import { getMyComplaints } from '../../services/complaintApi.js'
import { formatDate, formatRelative } from '../../utils/formatter.js'
import { PlusCircle, Clock, Inbox, ChevronRight, AlertTriangle, MessageSquare, Lightbulb, Filter } from 'lucide-react'

const TYPE_CONFIG = {
  complaint: {
    label: 'Aduan',
    icon: AlertTriangle,
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60',
    iconClass: 'text-rose-600 dark:text-rose-400',
    desc: 'Kendala & masalah teknis',
  },
  feedback: {
    label: 'Masukan',
    icon: MessageSquare,
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900/60',
    iconClass: 'text-sky-600 dark:text-sky-400',
    desc: 'Evaluasi & perbaikan layanan',
  },
  suggestion: {
    label: 'Saran',
    icon: Lightbulb,
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60',
    iconClass: 'text-amber-600 dark:text-amber-400',
    desc: 'Ide & usulan inovasi',
  },
}

const CAT_MAP = {
  facility: 'Fasilitas',
  academic: 'Akademik',
  admin: 'Administrasi',
  finance: 'Keuangan',
  other: 'Lainnya',
}

export default function MyComplaints() {
  const { t } = useTranslation()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedType, setSelectedType] = useState('all') // 'all' | 'complaint' | 'feedback' | 'suggestion'

  useEffect(() => {
    getMyComplaints().then(setData).finally(() => setLoading(false))
  }, [])

  const typeCounts = useMemo(() => {
    const counts = { all: data.length, complaint: 0, feedback: 0, suggestion: 0 }
    data.forEach(c => {
      const typeKey = c.type || 'complaint'
      if (counts[typeKey] !== undefined) counts[typeKey]++
      else counts.complaint++
    })
    return counts
  }, [data])

  const filteredData = useMemo(() => {
    if (selectedType === 'all') return data
    return data.filter(c => (c.type || 'complaint') === selectedType)
  }, [data, selectedType])

  return (
    <div className="relative min-h-screen bg-[var(--color-bg)]">
      <Navbar variant="user" />
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-[var(--color-border)]">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-[var(--color-primary)] font-semibold mb-1">
              PORTAL PELAPOR · RIWAYAT &amp; ASPIRASI
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text)] tracking-tight">
              {t('nav.history')}
            </h1>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              Pantau status transparansi penanganan aduan, masukan, dan saran Anda secara real-time.
            </p>
          </div>
          <Link
            to="/user/submit"
            className="btn-solid inline-flex items-center gap-2 self-start sm:self-auto text-xs py-2.5 px-4 font-medium tracking-tight rounded-xl min-h-[44px]"
          >
            <PlusCircle size={15} /> Ajukan Baru
          </Link>
        </div>

        {/* 3 Metric Cards for Types */}
        {!loading && data.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            {/* Card Aduan */}
            <button
              type="button"
              onClick={() => setSelectedType(selectedType === 'complaint' ? 'all' : 'complaint')}
              className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden ${
                selectedType === 'complaint'
                  ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-500/50 shadow-xs'
                  : 'bg-[var(--color-surface)] border-[var(--color-border)] hover:border-rose-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400">
                  <AlertTriangle size={14} /> Aduan
                </span>
                <span className="text-[10px] font-mono uppercase text-rose-500 font-semibold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950">
                  7 Tahap SLA
                </span>
              </div>
              <div className="mt-2 text-2xl font-extrabold font-mono text-[var(--color-text)]">
                {typeCounts.complaint}
              </div>
              <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                Keluhan masalah yang butuh solusi
              </p>
            </button>

            {/* Card Masukan */}
            <button
              type="button"
              onClick={() => setSelectedType(selectedType === 'feedback' ? 'all' : 'feedback')}
              className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden ${
                selectedType === 'feedback'
                  ? 'bg-sky-50/70 dark:bg-sky-950/30 border-sky-500/50 shadow-xs'
                  : 'bg-[var(--color-surface)] border-[var(--color-border)] hover:border-sky-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-600 dark:text-sky-400">
                  <MessageSquare size={14} /> Masukan
                </span>
                <span className="text-[10px] font-mono uppercase text-sky-500 font-semibold px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950">
                  Evaluatif
                </span>
              </div>
              <div className="mt-2 text-2xl font-extrabold font-mono text-[var(--color-text)]">
                {typeCounts.feedback}
              </div>
              <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                Evaluasi &amp; perbaikan layanan
              </p>
            </button>

            {/* Card Saran */}
            <button
              type="button"
              onClick={() => setSelectedType(selectedType === 'suggestion' ? 'all' : 'suggestion')}
              className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden ${
                selectedType === 'suggestion'
                  ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-500/50 shadow-xs'
                  : 'bg-[var(--color-surface)] border-[var(--color-border)] hover:border-amber-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                  <Lightbulb size={14} /> Saran
                </span>
                <span className="text-[10px] font-mono uppercase text-amber-500 font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950">
                  Ide Inovasi
                </span>
              </div>
              <div className="mt-2 text-2xl font-extrabold font-mono text-[var(--color-text)]">
                {typeCounts.suggestion}
              </div>
              <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                Gagasan pengembangan kampus
              </p>
            </button>
          </div>
        )}

        {/* Filter Pills Bar */}
        {!loading && data.length > 0 && (
          <div className="flex items-center justify-between gap-3 mb-4 pb-2">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setSelectedType('all')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedType === 'all'
                    ? 'bg-[#0B1F3A] text-white dark:bg-[var(--color-primary)]'
                    : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                Semua ({data.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedType('complaint')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedType === 'complaint'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                }`}
              >
                <AlertTriangle size={13} /> Aduan ({typeCounts.complaint})
              </button>
              <button
                type="button"
                onClick={() => setSelectedType('feedback')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedType === 'feedback'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/30'
                }`}
              >
                <MessageSquare size={13} /> Masukan ({typeCounts.feedback})
              </button>
              <button
                type="button"
                onClick={() => setSelectedType('suggestion')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedType === 'suggestion'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                }`}
              >
                <Lightbulb size={13} /> Saran ({typeCounts.suggestion})
              </button>
            </div>

            {selectedType !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedType('all')}
                className="text-[11px] font-mono text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:underline whitespace-nowrap"
              >
                Reset Filter
              </button>
            )}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="skeleton h-24 border border-[var(--color-border)] rounded-2xl" />
            ))}
          </div>
        )}

        {/* Completely empty state */}
        {!loading && data.length === 0 && (
          <div className="text-center py-20 border border-[var(--color-border)] bg-[var(--color-surface)] px-6 rounded-2xl shadow-sm">
            <div className="w-12 h-12 border border-[var(--color-border)] bg-[var(--color-bg-secondary)] flex items-center justify-center mx-auto mb-4 text-[var(--color-primary)] rounded-2xl">
              <Inbox size={22} />
            </div>
            <div className="font-bold text-lg text-[var(--color-text)] tracking-tight">
              Belum Ada Laporan Terdaftar
            </div>
            <p className="text-sm text-[var(--color-text-muted)] mt-1 mb-6 max-w-sm mx-auto leading-relaxed">
              Aduan, masukan, dan saran yang Anda ajukan akan muncul dan dapat dipantau perkembangannya di sini.
            </p>
            <Link
              to="/user/submit"
              className="btn-solid inline-flex items-center gap-2 text-xs py-2.5 px-5 font-medium rounded-xl min-h-[44px]"
            >
              Ajukan Sekarang <ChevronRight size={14} />
            </Link>
          </div>
        )}

        {/* Filter empty state */}
        {!loading && data.length > 0 && filteredData.length === 0 && (
          <div className="text-center py-16 border border-[var(--color-border)] bg-[var(--color-surface)] px-6 rounded-2xl shadow-xs">
            <div className="w-10 h-10 border border-[var(--color-border)] bg-[var(--color-bg-secondary)] flex items-center justify-center mx-auto mb-3 text-[var(--color-text-muted)] rounded-2xl">
              <Filter size={18} />
            </div>
            <div className="font-bold text-sm text-[var(--color-text)]">
              Belum Ada {TYPE_CONFIG[selectedType]?.label || 'Data'} yang Diajukan
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-1 mb-4 max-w-xs mx-auto">
              Anda belum pernah menyampaikan {TYPE_CONFIG[selectedType]?.label?.toLowerCase() || 'laporan'} ke kampus.
            </p>
            <button
              type="button"
              onClick={() => setSelectedType('all')}
              className="text-xs font-semibold text-[var(--color-primary)] hover:underline"
            >
              Tampilkan Semua Laporan
            </button>
          </div>
        )}

        {/* List of complaints / submissions */}
        {!loading && filteredData.length > 0 && (
          <div className="border border-[var(--color-border)] divide-y divide-[var(--color-border)] bg-[var(--color-surface)] rounded-2xl shadow-sm overflow-hidden">
            {filteredData.map(c => {
              const typeKey = c.type || 'complaint'
              const typeInfo = TYPE_CONFIG[typeKey] || TYPE_CONFIG.complaint
              const TypeIcon = typeInfo.icon

              return (
                <Link
                  to={`/user/complaints/${c.id}`}
                  key={c.id}
                  className="block p-4 sm:p-5 hover:bg-[var(--color-bg-secondary)] transition-colors group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        {/* Ticket ID */}
                        <span className="text-xs font-mono font-medium text-[var(--color-text-muted)] bg-[var(--color-bg-secondary)] px-2 py-0.5 border border-[var(--color-border)] rounded-lg">
                          {c.ticket_id}
                        </span>

                        {/* Distinct Type Badge */}
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 border rounded-lg font-bold ${typeInfo.badgeClass}`}
                        >
                          <TypeIcon size={12} className={typeInfo.iconClass} />
                          {typeInfo.label}
                        </span>

                        {/* Category */}
                        <span className="text-xs px-2 py-0.5 border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] rounded-lg">
                          {CAT_MAP[c.category] || c.category}
                        </span>
                      </div>

                      {/* Description */}
                      <p className="text-sm font-medium text-[var(--color-text)] line-clamp-2 leading-relaxed group-hover:text-[var(--color-primary)] transition-colors">
                        {c.description}
                      </p>

                      {/* Date & Time */}
                      <div className="flex items-center gap-2 mt-3 text-xs text-[var(--color-text-muted)] font-mono">
                        <Clock size={12} className="text-[var(--color-text-muted)]" />
                        <span>{formatRelative(c.created_at)}</span>
                        <span>·</span>
                        <span>{formatDate(c.created_at)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0 self-center">
                      <StatusBadge status={c.status} />
                      <ChevronRight
                        size={15}
                        className="text-[var(--color-text-muted)] group-hover:translate-x-0.5 transition-transform"
                      />
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
