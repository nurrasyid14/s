import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Navbar from '../../components/layout/Navbar.jsx'
import { StatusBadge } from '../../components/ui/StatusBadge.jsx'
import { getMyComplaints } from '../../services/complaintApi.js'
import { formatDate, formatRelative } from '../../utils/formatter.js'
import { PlusCircle, Clock, Inbox, ChevronRight } from 'lucide-react'

const TYPE_MAP = { complaint: 'Aduan', feedback: 'Masukan', suggestion: 'Saran' }
const CAT_MAP = { facility: 'Fasilitas', academic: 'Akademik', admin: 'Administrasi', finance: 'Keuangan', other: 'Lainnya' }

export default function MyComplaints() {
  const { t } = useTranslation()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMyComplaints().then(setData).finally(() => setLoading(false))
  }, [])

  return (
    <div className="relative min-h-screen bg-[var(--color-bg)]">
      <Navbar variant="user" />
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-[var(--color-border)]">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-[var(--color-primary)] font-semibold mb-1">
              PORTAL PELAPOR · RIWAYAT
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text)] tracking-tight">{t('nav.history')}</h1>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">Pantau status transparansi penanganan laporan dan aspirasi Anda secara real-time</p>
          </div>
          <Link
            to="/user/submit"
            className="btn-solid inline-flex items-center gap-2 self-start sm:self-auto text-xs py-2.5 px-4 font-medium tracking-tight"
          >
            <PlusCircle size={15} /> Ajukan Baru
          </Link>
        </div>

        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="skeleton h-24 border border-[var(--color-border)]" />)}
          </div>
        )}

        {!loading && data.length === 0 && (
          <div className="text-center py-20 border border-[var(--color-border)] bg-[var(--color-surface)] px-6">
            <div className="w-12 h-12 border border-[var(--color-border)] bg-[var(--color-bg-secondary)] flex items-center justify-center mx-auto mb-4 text-[var(--color-primary)]">
              <Inbox size={22} />
            </div>
            <div className="font-bold text-lg text-[var(--color-text)] tracking-tight">Belum Ada Aduan Terdaftar</div>
            <p className="text-sm text-[var(--color-text-muted)] mt-1 mb-6 max-w-sm mx-auto leading-relaxed">
              Aduan dan aspirasi yang Anda ajukan akan muncul dan dapat dipantau perkembangannya di sini.
            </p>
            <Link
              to="/user/submit"
              className="btn-solid inline-flex items-center gap-2 text-xs py-2.5 px-5 font-medium"
            >
              Ajukan Sekarang <ChevronRight size={14} />
            </Link>
          </div>
        )}

        {!loading && data.length > 0 && (
          <div className="border border-[var(--color-border)] divide-y divide-[var(--color-border)] bg-[var(--color-surface)]">
            {data.map(c => (
              <Link
                to={`/user/complaints/${c.id}`}
                key={c.id}
                className="block p-4 sm:p-5 hover:bg-[var(--color-bg-secondary)] transition-colors group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="text-xs font-mono font-medium text-[var(--color-text-muted)] bg-[var(--color-bg-secondary)] px-2 py-0.5 border border-[var(--color-border)]">
                        {c.ticket_id}
                      </span>
                      <span className="text-xs px-2 py-0.5 border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-primary)] font-medium">
                        {TYPE_MAP[c.type] || c.type}
                      </span>
                      <span className="text-xs px-2 py-0.5 border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)]">
                        {CAT_MAP[c.category] || c.category}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-[var(--color-text)] line-clamp-2 leading-relaxed group-hover:text-[var(--color-primary)] transition-colors">
                      {c.description}
                    </p>
                    <div className="flex items-center gap-2 mt-3 text-xs text-[var(--color-text-muted)] font-mono">
                      <Clock size={12} className="text-[var(--color-text-muted)]" />
                      <span>{formatRelative(c.created_at)}</span>
                      <span>·</span>
                      <span>{formatDate(c.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 self-center">
                    <StatusBadge status={c.status} />
                    <ChevronRight size={15} className="text-[var(--color-text-muted)] group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}