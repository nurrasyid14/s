import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Sidebar from '../../components/layout/Sidebar.jsx'
import Navbar from '../../components/layout/Navbar.jsx'
import { StatusBadge, UrgencyBadge } from '../../components/ui/StatusBadge.jsx'
import { getComplaint, updateComplaintStatus, replyToComplaint } from '../../services/complaintApi.js'
import { formatDateTime, getUrgencyLevel } from '../../utils/formatter.js'
import { ArrowLeft, Send, AlertTriangle } from 'lucide-react'

const TYPE_MAP = { complaint: 'Aduan', feedback: 'Masukan', suggestion: 'Saran' }
const CAT_MAP  = { facility: 'Fasilitas', academic: 'Akademik', admin: 'Administrasi', finance: 'Keuangan', other: 'Lainnya' }

export default function ComplaintDetail() {
  const { id } = useParams()
  const { t, i18n } = useTranslation()
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [reply,   setReply]   = useState('')
  const [sending, setSending] = useState(false)
  const [newStatus, setNewStatus] = useState('')

  useEffect(() => {
    getComplaint(id).then(d => { setData(d); setNewStatus(d?.status || '') }).finally(() => setLoading(false))
  }, [id])

  async function handleReply(e) {
    e.preventDefault()
    if (!reply.trim()) return
    setSending(true)
    await replyToComplaint(id, reply)
    setReply('')
    setSending(false)
  }

  async function handleStatusChange(e) {
    const s = e.target.value
    setNewStatus(s)
    await updateComplaintStatus(id, s)
    setData(d => ({ ...d, status: s }))
  }

  if (loading) return (
    <div className="flex h-screen bg-[var(--color-bg)]">
      <Sidebar />
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    </div>
  )

  if (!data) return (
    <div className="flex h-screen bg-[var(--color-bg)]">
      <Sidebar />
      <div className="flex-1 flex items-center justify-center text-[var(--color-text-muted)]">Aduan tidak ditemukan.</div>
    </div>
  )

  const urgency = getUrgencyLevel(data.urgency_score)

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-bg)]">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar variant="stakeholder" title={t('detail.title')} />
        <main className="flex-1 overflow-y-auto p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <Link to="/stakeholder/complaints" className="p-2 rounded-lg hover:bg-[var(--color-card-hover)] text-[var(--color-text-muted)] transition-colors">
              <ArrowLeft size={18} />
            </Link>
            <h2 className="text-xl font-bold text-[var(--color-text)]">{data.ticket_id}</h2>
            <StatusBadge status={data.status} />
            <span className="text-sm text-[var(--color-text-muted)] ml-auto">{formatDateTime(data.created_at)}</span>
          </div>

          <div className="grid lg:grid-cols-3 gap-5">
            {/* Left column */}
            <div className="lg:col-span-2 space-y-5">
              {/* Info card */}
              <div className="card-elevated p-5">
                <h3 className="font-semibold text-[var(--color-text)] mb-4">{t('detail.info_title')}</h3>
                <div className="grid grid-cols-3 gap-3 text-sm mb-4">
                  {[
                    { label: 'Jenis',    value: TYPE_MAP[data.type] || data.type },
                    { label: 'Kategori', value: CAT_MAP[data.category] || data.category },
                    { label: 'Pengirim', value: data.is_anonymous ? `${t('complaints.anonymous')} (${data.sender_role})` : data.sender_name },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <div className="text-xs text-[var(--color-text-muted)]">{label}</div>
                      <div className="font-semibold text-[var(--color-text)] mt-0.5">{value}</div>
                    </div>
                  ))}
                </div>
                <div>
                  <div className="text-xs text-[var(--color-text-muted)] mb-1">Deskripsi</div>
                  <p className="text-sm text-[var(--color-text)] leading-relaxed">{data.description}</p>
                </div>
                {data.unit && (
                  <div className="mt-3">
                    <div className="text-xs text-[var(--color-text-muted)] mb-0.5">Unit Terkait</div>
                    <div className="text-sm font-medium text-[var(--color-text)]">{data.unit}</div>
                  </div>
                )}
              </div>

              {/* NLP Analysis */}
              <div className="card-elevated p-5 border-l-4 border-blue-500">
                <h3 className="font-semibold text-[var(--color-text)] mb-4">{t('detail.nlp_title')}</h3>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="p-3 rounded-xl bg-[var(--color-bg-secondary)]">
                    <div className="text-xs text-[var(--color-text-muted)] mb-1">{t('detail.auto_category')}</div>
                    <div className="font-bold text-[var(--color-text)] capitalize">{CAT_MAP[data.nlp_category] || data.nlp_category}</div>
                    <div className="text-xs text-teal-500 mt-0.5">{Math.round(data.nlp_confidence * 100)}% {t('detail.confidence')}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-[var(--color-bg-secondary)]">
                    <div className="text-xs text-[var(--color-text-muted)] mb-1">{t('detail.urgency_score')}</div>
                    <div className={`font-bold text-lg ${urgency.color === 'red' ? 'text-red-400' : urgency.color === 'amber' ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {data.urgency_score}/10
                    </div>
                    <UrgencyBadge score={data.urgency_score} />
                  </div>
                  <div className="p-3 rounded-xl bg-[var(--color-bg-secondary)]">
                    <div className="text-xs text-[var(--color-text-muted)] mb-1">{t('detail.sentiment')}</div>
                    <div className={`font-bold capitalize ${data.sentiment === 'negative' ? 'text-red-400' : data.sentiment === 'positive' ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {data.sentiment === 'negative' ? 'Negatif' : data.sentiment === 'positive' ? 'Positif' : 'Netral'}
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex items-start gap-1.5 text-xs text-amber-500/80">
                  <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
                  {t('detail.nlp_disclaimer')}
                </div>
              </div>

              {/* Evidence */}
              {data.attachments?.length > 0 && (
                <div className="card-elevated p-5">
                  <h3 className="font-semibold text-[var(--color-text)] mb-3">{t('detail.evidence_title')}</h3>
                  <div className="flex gap-3">
                    {data.attachments.map((a, i) => (
                      <img key={i} src={a.url} alt={a.name} className="w-28 h-20 object-cover rounded-lg border border-[var(--color-border)]" />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right column */}
            <div className="space-y-5">
              {/* Change status */}
              <div className="card-elevated p-5">
                <h3 className="font-semibold text-[var(--color-text)] mb-3">{t('detail.change_status')}</h3>
                <select value={newStatus} onChange={handleStatusChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                  <option value="new">{t('status.new')}</option>
                  <option value="process">{t('status.process')}</option>
                  <option value="done">{t('status.done')}</option>
                  <option value="escalate">{t('status.escalate')}</option>
                </select>
              </div>

              {/* Follow-up history */}
              <div className="card-elevated p-5">
                <h3 className="font-semibold text-[var(--color-text)] mb-4">{t('detail.followup_title')}</h3>
                {data.followups?.length === 0 ? (
                  <p className="text-xs text-[var(--color-text-muted)] text-center py-4">Belum ada tindak lanjut.</p>
                ) : (
                  <div className="space-y-3 relative">
                    <div className="absolute left-3.5 top-0 bottom-0 w-0.5 bg-[var(--color-border)]" />
                    {data.followups.map((f, i) => (
                      <div key={f.id} className="flex gap-3 relative">
                        <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold z-10 flex-shrink-0">
                          {f.by.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-[var(--color-text)]">{f.by}</div>
                          <div className="text-xs text-[var(--color-text-muted)]">{formatDateTime(f.created_at)}</div>
                          <div className="text-xs text-[var(--color-text)] mt-1">{f.note}</div>
                          <StatusBadge status={f.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Reply form */}
              <div className="card-elevated p-5">
                <h3 className="font-semibold text-[var(--color-text)] mb-3">{t('detail.reply_title')}</h3>
                <form onSubmit={handleReply}>
                  <textarea
                    value={reply}
                    onChange={e => setReply(e.target.value)}
                    placeholder={t('detail.reply_placeholder')}
                    rows={4}
                    className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-sm text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                  />
                  <button type="submit" disabled={sending || !reply.trim()}
                    className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-smooth">
                    {sending ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Send size={14} /> {t('detail.send')}</>}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
