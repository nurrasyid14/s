import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation, Trans } from 'react-i18next'
import StakeholderLayout from '../../components/layout/StakeholderLayout.jsx'
import { StatusBadge, UrgencyBadge } from '../../components/ui/StatusBadge.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import SegmentedControl from '../../components/ui/SegmentedControl.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import ErrorState from '../../components/ui/ErrorState.jsx'
import { getComplaints } from '../../services/complaintApi.js'
import { formatDate } from '../../utils/formatter.js'
import { AlertTriangle, User, CheckCircle2 } from 'lucide-react'

const FILTER_LABELS = {
  '': ['stk.followups.filter_all', 'Semua'],
  new: ['stk.followups.filter_new', 'Belum ditinjau'],
  process: ['stk.followups.filter_process', 'Ditinjau'],
  escalate: ['stk.followups.filter_escalate', 'Dieskalasi'],
}

// Aturan tinjauan manual: urgency tinggi atau sudah dieskalasi.
const needsManualReview = c => c.urgency_score >= 7 || c.status === 'escalate'

export default function Followups() {
  const { t } = useTranslation()
  const [data, setData] = useState([])
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(false)
    getComplaints({ status, limit: 20 })
      .then(res => { if (active) setData(res.items.filter(needsManualReview)) })
      .catch(() => { if (active) setError(true) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [status, reloadKey])

  const filterOptions = Object.entries(FILTER_LABELS).map(([key, [i18nKey, fallback]]) => ({
    key,
    label: t(i18nKey, fallback),
  }))

  return (
    <StakeholderLayout title={t('nav.followups')} notifCount={data.length}>
      <PageHeader
        heading={t('stk.followups.heading', 'Antrian tinjauan')}
        description={
          loading || error
            ? undefined
            : t('stk.followups.count', { n: data.length, defaultValue: '{{n}} aduan memerlukan tinjauan' })
        }
        actions={
          <SegmentedControl
            label={t('complaints.filter_status')}
            options={filterOptions}
            value={status}
            onChange={setStatus}
          />
        }
      />

      <div
        className="flex items-start gap-2.5 border p-3.5 text-xs text-[var(--color-text)]"
        style={{
          background: 'color-mix(in srgb, var(--color-status-warning) 8%, var(--color-surface))',
          borderColor: 'color-mix(in srgb, var(--color-status-warning) 30%, var(--color-border))',
        }}
      >
        <AlertTriangle size={15} className="mt-0.5 flex-shrink-0 text-[var(--color-status-warning)]" aria-hidden="true" />
        <span className="leading-relaxed">
          <Trans
            i18nKey="stk.followups.notice"
            defaults="Aduan dengan urgency tinggi (≥7) atau berstatus Dieskalasi <b>wajib ditinjau manual</b> oleh stakeholder. Sistem AI tidak mengambil keputusan akhir."
            components={{ b: <strong /> }}
          />
        </span>
      </div>

      {error ? (
        <ErrorState onRetry={() => setReloadKey(k => k + 1)} />
      ) : loading ? (
        <div className="space-y-3" aria-busy="true">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-24 border border-[var(--color-border)]" />)}
        </div>
      ) : data.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          tone="success"
          title={t('stk.followups.empty_title', 'Tidak ada antrian tindak lanjut')}
          description={t('stk.followups.empty_desc', 'Semua aduan urgency tinggi sudah ditangani.')}
        />
      ) : (
        <ul className="space-y-3">
          {data.map(c => (
            <li key={c.id}>
              <Link
                to={`/stakeholder/complaints/${c.id}`}
                className="block border border-[var(--color-border)] border-l-4 bg-[var(--color-surface)] p-4 sm:p-5 transition-colors hover:bg-[var(--color-bg-secondary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                style={{
                  borderLeftColor: c.urgency_score >= 7 ? 'var(--color-status-danger)' : 'var(--color-status-warning)',
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs px-2 py-0.5 border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)]">{c.ticket_id}</span>
                      <UrgencyBadge score={c.urgency_score} />
                      <StatusBadge status={c.status} />
                    </div>
                    <p className="line-clamp-2 text-sm font-medium text-[var(--color-text)] leading-relaxed">{c.description}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono text-[var(--color-text-muted)]">
                      <span className="flex items-center gap-1">
                        <User size={11} aria-hidden="true" /> {t('complaints.anonymous')} ({c.sender_role})
                      </span>
                      <span>·</span>
                      <span>{formatDate(c.created_at)}</span>
                    </div>
                  </div>
                  <span className="flex-shrink-0 text-xs font-semibold text-[var(--color-primary)] self-center">
                    {t('dashboard.review')} →
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </StakeholderLayout>
  )
}