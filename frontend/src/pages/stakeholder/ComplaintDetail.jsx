import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import StakeholderLayout from '../../components/layout/StakeholderLayout.jsx'
import { StatusBadge, UrgencyBadge } from '../../components/ui/StatusBadge.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import ErrorState from '../../components/ui/ErrorState.jsx'
import { getComplaint, updateComplaintStatus, replyToComplaint } from '../../services/complaintApi.js'
import { formatDateTime, getUrgencyLevel } from '../../utils/formatter.js'
import { useComplaintLabels } from '../../utils/complaintLabels.js'
import { ArrowLeft, Send, AlertTriangle, Inbox, Check } from 'lucide-react'

const STATUS_OPTIONS = ['new', 'process', 'done', 'escalate']
const SUCCESS_MESSAGE_MS = 3000

const focusRing =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]'
const fieldCls = `w-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-xs text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)]`

const URGENCY_TEXT = {
  red: 'text-[var(--color-status-danger)]',
  amber: 'text-[var(--color-status-warning)]',
}
const SENTIMENT_TEXT = {
  negative: 'text-[var(--color-status-danger)]',
  positive: 'text-[var(--color-status-success)]',
}

function InfoItem({ label, value }) {
  return (
    <div className="min-w-0">
      <div className="text-xs font-mono uppercase text-[var(--color-text-muted)]">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-[var(--color-text)]">{value}</div>
    </div>
  )
}

function NlpMetric({ label, children }) {
  return (
    <div className="border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3">
      <div className="mb-1 text-xs font-mono uppercase text-[var(--color-text-muted)]">{label}</div>
      {children}
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true">
      <div className="skeleton h-9 w-72 border border-[var(--color-border)]" />
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <div className="skeleton h-56 border border-[var(--color-border)]" />
          <div className="skeleton h-40 border border-[var(--color-border)]" />
        </div>
        <div className="space-y-5">
          <div className="skeleton h-24 border border-[var(--color-border)]" />
          <div className="skeleton h-48 border border-[var(--color-border)]" />
          <div className="skeleton h-44 border border-[var(--color-border)]" />
        </div>
      </div>
    </div>
  )
}

export default function ComplaintDetail() {
  const { id } = useParams()
  const { t } = useTranslation()
  const { typeLabel, categoryLabel, sentimentLabel } = useComplaintLabels()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [status, setStatus] = useState('')
  const [statusSaving, setStatusSaving] = useState(false)
  const [statusError, setStatusError] = useState(false)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [replyState, setReplyState] = useState('idle') // 'idle' | 'sent' | 'error'

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(false)
    getComplaint(id)
      .then(d => {
        if (!active) return
        setData(d)
        setStatus(d?.status || '')
      })
      .catch(() => { if (active) setError(true) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id, reloadKey])

  useEffect(() => {
    if (replyState !== 'sent') return undefined
    const timer = setTimeout(() => setReplyState('idle'), SUCCESS_MESSAGE_MS)
    return () => clearTimeout(timer)
  }, [replyState])

  async function handleReply(e) {
    e.preventDefault()
    const note = reply.trim()
    if (!note || sending) return
    setSending(true)
    setReplyState('idle')
    try {
      await replyToComplaint(id, note)
      setReply('')
      setReplyState('sent')
      // Muat ulang agar riwayat tindak lanjut ikut diperbarui. Jika gagal, tampilan lama dipertahankan.
      getComplaint(id).then(setData).catch(() => { })
    } catch {
      setReplyState('error')
    } finally {
      setSending(false)
    }
  }

  async function handleStatusChange(e) {
    const next = e.target.value
    const previous = status
    setStatus(next)
    setStatusSaving(true)
    setStatusError(false)
    try {
      await updateComplaintStatus(id, next)
      setData(d => ({ ...d, status: next }))
    } catch {
      setStatus(previous)
      setStatusError(true)
    } finally {
      setStatusSaving(false)
    }
  }

  const layoutTitle = t('detail.title')

  if (loading) {
    return <StakeholderLayout title={layoutTitle}><DetailSkeleton /></StakeholderLayout>
  }

  if (error) {
    return (
      <StakeholderLayout title={layoutTitle}>
        <ErrorState onRetry={() => setReloadKey(k => k + 1)} />
      </StakeholderLayout>
    )
  }

  if (!data) {
    return (
      <StakeholderLayout title={layoutTitle}>
        <EmptyState
          icon={Inbox}
          title={t('stk.detail.not_found', 'Aduan tidak ditemukan.')}
          action={
            <Link
              to="/stakeholder/complaints"
              className={`inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-text)] transition-smooth hover:bg-[var(--color-card-hover)] ${focusRing}`}
            >
              <ArrowLeft size={14} aria-hidden="true" /> {t('stk.detail.back_to_list', 'Kembali ke daftar aduan')}
            </Link>
          }
        />
      </StakeholderLayout>
    )
  }

  const urgency = getUrgencyLevel(data.urgency_score)
  const followups = data.followups ?? []
  const attachments = data.attachments ?? []
  const hasConfidence = typeof data.nlp_confidence === 'number'

  return (
    <StakeholderLayout title={layoutTitle}>
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 pb-4 border-b border-[var(--color-border)] mb-2">
        <Link
          to="/stakeholder/complaints"
          aria-label={t('stk.detail.back_to_list', 'Kembali ke daftar aduan')}
          className={`border border-[var(--color-border)] p-2 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text)] ${focusRing}`}
        >
          <ArrowLeft size={16} aria-hidden="true" />
        </Link>
        <h2 className="text-xl font-bold font-mono tracking-tight text-[var(--color-text)]">{data.ticket_id}</h2>
        <StatusBadge status={data.status} />
        <span className="ml-auto text-xs font-mono text-[var(--color-text-muted)]">{formatDateTime(data.created_at)}</span>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Kolom kiri */}
        <div className="min-w-0 space-y-5 lg:col-span-2">
          <section className="border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <h3 className="mb-4 text-xs font-bold uppercase tracking-wider font-mono text-[var(--color-text)]">{t('detail.info_title')}</h3>
            <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
              <InfoItem label={t('stk.detail.type', 'Jenis')} value={typeLabel(data.type)} />
              <InfoItem label={t('stk.detail.category', 'Kategori')} value={categoryLabel(data.category)} />
              <InfoItem label={t('stk.detail.sender', 'Pengirim')} value={t('complaints.anonymous')} />
              <InfoItem label={t('stk.detail.sender_role', 'Role pengirim')} value={data.sender_role || '—'} />
              <InfoItem label={t('stk.detail.unit', 'Unit terkait')} value={data.unit || '—'} />
              <InfoItem label={t('stk.detail.date', 'Tanggal')} value={formatDateTime(data.created_at)} />
            </div>
            <div className="border-t border-[var(--color-border)] pt-4">
              <div className="mb-1 text-xs font-mono uppercase text-[var(--color-text-muted)]">{t('stk.detail.description', 'Deskripsi')}</div>
              <p className="whitespace-pre-line text-sm leading-relaxed text-[var(--color-text)]">{data.description}</p>
            </div>
          </section>

          <section className="border border-[var(--color-border)] border-l-4 border-l-[var(--color-primary)] bg-[var(--color-surface)] p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-[var(--color-text)]">{t('detail.nlp_title')}</h3>
              <span
                className="border border-[var(--color-border)] px-2.5 py-0.5 text-xs font-mono font-medium text-[var(--color-primary)] bg-[var(--color-bg-secondary)]"
              >
                {t('stk.detail.ai_badge', 'Rekomendasi AI')}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
              <NlpMetric label={t('detail.auto_category')}>
                <div className="font-bold text-[var(--color-text)]">{categoryLabel(data.nlp_category)}</div>
                {hasConfidence && (
                  <div className="mt-0.5 text-xs font-mono text-[var(--color-primary)]">
                    {Math.round(data.nlp_confidence * 100)}% {t('detail.confidence')}
                  </div>
                )}
              </NlpMetric>
              <NlpMetric label={t('detail.urgency_score')}>
                <div className={`text-lg font-bold font-mono ${URGENCY_TEXT[urgency.color] ?? 'text-[var(--color-status-success)]'}`}>
                  {data.urgency_score}/10
                </div>
                <div className="mt-1"><UrgencyBadge score={data.urgency_score} /></div>
              </NlpMetric>
              <NlpMetric label={t('detail.sentiment')}>
                <div className={`font-bold ${SENTIMENT_TEXT[data.sentiment] ?? 'text-[var(--color-status-warning)]'}`}>
                  {sentimentLabel(data.sentiment)}
                </div>
              </NlpMetric>
            </div>
            <div className="mt-3 flex items-start gap-1.5 text-xs text-[var(--color-status-warning)] pt-3 border-t border-[var(--color-border)]">
              <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
              {t('detail.nlp_disclaimer')}
            </div>
          </section>

          {attachments.length > 0 && (
            <section className="border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider font-mono text-[var(--color-text)]">
                {t('detail.evidence_title')} ({attachments.length})
              </h3>
              <div className="flex flex-wrap gap-3">
                {attachments.map((a, i) => (
                  <a
                    key={i}
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={a.name}
                    className={`overflow-hidden border border-[var(--color-border)] transition-colors hover:border-[var(--color-primary)] ${focusRing}`}
                  >
                    <img src={a.url} alt={a.name} loading="lazy" className="h-20 w-28 object-cover" />
                  </a>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Kolom kanan */}
        <div className="min-w-0 space-y-5">
          <section className="border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <label htmlFor="complaint-status" className="mb-3 block text-xs font-bold uppercase tracking-wider font-mono text-[var(--color-text)]">
              {t('detail.change_status')}
            </label>
            <select
              id="complaint-status"
              value={status}
              onChange={handleStatusChange}
              disabled={statusSaving}
              className={`${fieldCls} disabled:opacity-60`}
            >
              {STATUS_OPTIONS.map(key => <option key={key} value={key}>{t(`status.${key}`)}</option>)}
            </select>
            {statusError && (
              <p role="alert" className="mt-2 text-xs font-mono text-[var(--color-status-danger)]">
                {t('stk.detail.status_error', 'Status gagal diperbarui. Silakan coba lagi.')}
              </p>
            )}
          </section>

          <section className="border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <h3 className="mb-4 text-xs font-bold uppercase tracking-wider font-mono text-[var(--color-text)]">{t('detail.followup_title')}</h3>
            {followups.length === 0 ? (
              <p className="py-4 text-center text-xs font-mono text-[var(--color-text-muted)]">
                {t('stk.detail.no_followups', 'Belum ada tindak lanjut.')}
              </p>
            ) : (
              <ol className="relative space-y-4">
                <div className="absolute bottom-0 left-3 top-0 w-[1px] bg-[var(--color-border)]" aria-hidden="true" />
                {followups.map(f => (
                  <li key={f.id} className="relative flex gap-3">
                    <div
                      className="z-10 flex h-6 w-6 flex-shrink-0 items-center justify-center border border-[var(--color-border)] bg-[var(--color-primary)] text-xs font-bold font-mono text-white"
                      aria-hidden="true"
                    >
                      {f.by?.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-[var(--color-text)]">{f.by}</div>
                      <div className="text-xs font-mono text-[var(--color-text-muted)]">{formatDateTime(f.created_at)}</div>
                      <div className="mt-1 text-xs text-[var(--color-text)] leading-relaxed">{f.note}</div>
                      <div className="mt-2"><StatusBadge status={f.status} /></div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <h3 id="reply-title" className="mb-3 text-xs font-bold uppercase tracking-wider font-mono text-[var(--color-text)]">
              {t('detail.reply_title')}
            </h3>
            <form onSubmit={handleReply}>
              <textarea
                aria-labelledby="reply-title"
                value={reply}
                onChange={e => setReply(e.target.value)}
                placeholder={t('detail.reply_placeholder')}
                rows={4}
                className={`${fieldCls} resize-none`}
              />
              <button
                type="submit"
                disabled={sending || !reply.trim()}
                className={`btn-solid mt-3 flex w-full items-center justify-center gap-2 text-xs py-2.5 font-medium disabled:opacity-60 ${focusRing}`}
              >
                {sending ? (
                  <span className="h-4 w-4 animate-spin border-2 border-white/30 border-t-white" role="status" aria-label={t('stk.detail.sending', 'Mengirim...')} />
                ) : (
                  <><Send size={13} aria-hidden="true" /> {t('detail.send')}</>
                )}
              </button>
              {replyState === 'sent' && (
                <p role="status" className="mt-2 flex items-center gap-1.5 text-xs font-mono text-[var(--color-status-success)]">
                  <Check size={13} aria-hidden="true" /> {t('stk.detail.reply_sent', 'Tanggapan terkirim.')}
                </p>
              )}
              {replyState === 'error' && (
                <p role="alert" className="mt-2 text-xs font-mono text-[var(--color-status-danger)]">
                  {t('stk.detail.reply_error', 'Tanggapan gagal dikirim. Silakan coba lagi.')}
                </p>
              )}
            </form>
          </section>
        </div>
      </div>
    </StakeholderLayout>
  )
}