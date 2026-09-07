import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Sidebar from '../../components/layout/Sidebar.jsx'
import Navbar from '../../components/layout/Navbar.jsx'
import { StatusBadge, UrgencyBadge } from '../../components/ui/StatusBadge.jsx'
import { getComplaints } from '../../services/complaintApi.js'
import { formatDate, getUrgencyLevel } from '../../utils/formatter.js'
import { AlertTriangle, User } from 'lucide-react'

const FOLLOWUP_STATUSES = [
  { key: '',         label: 'Semua' },
  { key: 'new',      label: 'Belum Ditinjau' },
  { key: 'process',  label: 'Ditinjau' },
  { key: 'escalate', label: 'Dieskalasi' },
]

export default function Followups() {
  const { t } = useTranslation()
  const [data,   setData]   = useState([])
  const [status, setStatus] = useState('')
  const [loading,setLoading]= useState(true)

  useEffect(() => {
    setLoading(true)
    getComplaints({ status, limit: 20 })
      .then(res => setData(res.items.filter(c => c.urgency_score >= 7 || c.status === 'escalate')))
      .finally(() => setLoading(false))
  }, [status])

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-bg)]">
      <Sidebar notifCount={data.length} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar variant="stakeholder" title={t('nav.followups')} />
        <main className="flex-1 overflow-y-auto p-6">
          {/* Filter tabs */}
          <div className="flex gap-2 mb-5">
            {FOLLOWUP_STATUSES.map(({ key, label }) => (
              <button key={key} onClick={() => setStatus(key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-smooth ${status === key ? 'bg-blue-600 text-white' : 'border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
                {label}
              </button>
            ))}
          </div>

          {/* Info notice */}
          <div className="flex items-start gap-2 mb-5 p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-sm text-amber-500">
            <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
            <span>Aduan dengan urgency tinggi (≥7) atau status Dieskalasi <strong>wajib ditinjau manual</strong> oleh stakeholder. Sistem AI tidak mengambil keputusan akhir.</span>
          </div>

          {/* Cards */}
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="skeleton h-24 rounded-xl" />)}
            </div>
          ) : data.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-5xl mb-3">✅</div>
              <div className="font-semibold text-[var(--color-text)]">Tidak ada antrian tindak lanjut</div>
              <div className="text-sm text-[var(--color-text-muted)] mt-1">Semua aduan urgency tinggi sudah ditangani.</div>
            </div>
          ) : (
            <div className="space-y-3">
              {data.map(c => (
                <Link to={`/stakeholder/complaints/${c.id}`} key={c.id}
                  className="block card-elevated p-5 hover:border-blue-500/30 transition-smooth">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs font-mono text-[var(--color-text-muted)]">{c.ticket_id}</span>
                        <UrgencyBadge score={c.urgency_score} />
                        <StatusBadge status={c.status} />
                      </div>
                      <p className="text-sm text-[var(--color-text)] truncate">{c.description}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-[var(--color-text-muted)]">
                        <span className="flex items-center gap-1"><User size={11}/> {c.is_anonymous ? 'Anonim' : c.sender_name} ({c.sender_role})</span>
                        <span>{formatDate(c.created_at)}</span>
                      </div>
                    </div>
                    <span className="text-xs text-blue-400 flex-shrink-0">Tinjau →</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
