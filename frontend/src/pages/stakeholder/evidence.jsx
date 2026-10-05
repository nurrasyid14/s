import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import StakeholderLayout from '../../components/layout/StakeholderLayout.jsx'
import { StatusBadge } from '../../components/ui/StatusBadge.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import ErrorState from '../../components/ui/ErrorState.jsx'
import { getComplaints } from '../../services/complaintApi.js'
import { formatDate } from '../../utils/formatter.js'
import { Paperclip, ImageOff } from 'lucide-react'

const FETCH_LIMIT = 50

export default function Evidence() {
    const { t } = useTranslation()
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)
    const [reloadKey, setReloadKey] = useState(0)

    useEffect(() => {
        let active = true
        setLoading(true)
        setError(false)
        getComplaints({ limit: FETCH_LIMIT })
            .then(res => { if (active) setData(res.items.filter(c => c.attachments?.length > 0)) })
            .catch(() => { if (active) setError(true) })
            .finally(() => { if (active) setLoading(false) })
        return () => { active = false }
    }, [reloadKey])

    return (
        <StakeholderLayout title={t('nav.evidence')}>
            <PageHeader
                heading={t('stk.evidence.heading', 'Bukti dan lampiran')}
                description={
                    loading || error
                        ? undefined
                        : t('stk.evidence.count', { n: data.length, defaultValue: '{{n}} aduan memiliki lampiran' })
                }
            />

            {error ? (
                <ErrorState onRetry={() => setReloadKey(k => k + 1)} />
            ) : loading ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
                    {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="skeleton h-56 border border-[var(--color-border)]" />)}
                </div>
            ) : data.length === 0 ? (
                <EmptyState
                    icon={ImageOff}
                    title={t('common.empty_state')}
                    description={t('common.empty_desc')}
                />
            ) : (
                <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {data.map(c => (
                        <li key={c.id}>
                            <Link
                                to={`/stakeholder/complaints/${c.id}`}
                                className="block h-full border border-[var(--color-border)] bg-[var(--color-surface)] transition-colors hover:border-[var(--color-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                            >
                                <div className="aspect-[16/10] overflow-hidden bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)]">
                                    <img
                                        src={c.attachments[0].url}
                                        alt={c.attachments[0].name}
                                        loading="lazy"
                                        className="h-full w-full object-cover"
                                    />
                                </div>
                                <div className="p-4">
                                    <div className="mb-2 flex items-center justify-between gap-2">
                                        <span className="font-mono text-xs px-2 py-0.5 border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)]">{c.ticket_id}</span>
                                        <StatusBadge status={c.status} />
                                    </div>
                                    <p className="line-clamp-2 text-sm font-medium text-[var(--color-text)] leading-relaxed">{c.description}</p>
                                    <div className="mt-3 flex items-center gap-1.5 text-xs font-mono text-[var(--color-text-muted)] pt-3 border-t border-[var(--color-border)]">
                                        <Paperclip size={12} aria-hidden="true" />
                                        <span>{t('stk.evidence.attachments', { n: c.attachments.length, defaultValue: '{{n}} lampiran' })}</span>
                                        <span>·</span>
                                        <span>{formatDate(c.created_at)}</span>
                                    </div>
                                </div>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </StakeholderLayout>
    )
}