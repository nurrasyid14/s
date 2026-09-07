import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Navbar from '../../components/layout/Navbar.jsx'
import { StatusBadge } from '../../components/ui/StatusBadge.jsx'
import { getMyComplaints } from '../../services/complaintApi.js'
import { formatDate, formatRelative } from '../../utils/formatter.js'
import { PlusCircle, Clock } from 'lucide-react'

const TYPE_MAP = { complaint: 'Aduan', feedback: 'Masukan', suggestion: 'Saran' }
const CAT_MAP  = { facility: 'Fasilitas', academic: 'Akademik', admin: 'Administrasi', finance: 'Keuangan', other: 'Lainnya' }

export default function MyComplaints() {
  const { t } = useTranslation()
  const [data,    setData]    = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMyComplaints().then(setData).finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <Navbar variant="user" />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-[var(--color-text)]">{t('nav.history')}</h1>
          <Link to="/user/submit" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-smooth">
            <PlusCircle size={16} /> Ajukan Baru
          </Link>
        </div>

        {loading && (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="skeleton h-28 rounded-xl" />)}
          </div>
        )}

        {!loading && data.length === 0 && (
          <div className="text-center py-20 card-elevated rounded-2xl">
            <div className="text-5xl mb-3">📭</div>
            <div className="font-semibold text-[var(--color-text)]">Belum ada aduan</div>
            <p className="text-sm text-[var(--color-text-muted)] mt-1 mb-5">Aduan yang kamu ajukan akan muncul di sini.</p>
            <Link to="/user/submit" className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold">Ajukan Sekarang</Link>
          </div>
        )}

        {!loading && data.length > 0 && (
          <div className="space-y-3">
            {data.map(c => (
              <Link to={`/user/complaints/${c.id}`} key={c.id}
                className="block card-elevated p-5 hover:border-blue-500/30 transition-smooth animate-fade-in-up">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-mono text-[var(--color-text-muted)]">{c.ticket_id}</span>
                      <span className="text-xs px-2 py-0.5 bg-[var(--color-bg-secondary)] rounded-full text-[var(--color-text-muted)]">{TYPE_MAP[c.type]}</span>
                      <span className="text-xs px-2 py-0.5 bg-[var(--color-bg-secondary)] rounded-full text-[var(--color-text-muted)]">{CAT_MAP[c.category]}</span>
                    </div>
                    <p className="text-sm text-[var(--color-text)] line-clamp-2">{c.description}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-[var(--color-text-muted)]">
                      <Clock size={11} />
                      {formatRelative(c.created_at)} · {formatDate(c.created_at)}
                    </div>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
