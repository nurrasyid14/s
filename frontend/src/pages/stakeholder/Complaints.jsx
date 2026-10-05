import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import StakeholderLayout from '../../components/layout/StakeholderLayout.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import { StatusBadge, UrgencyBadge } from '../../components/ui/StatusBadge.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import SegmentedControl from '../../components/ui/SegmentedControl.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import ErrorState from '../../components/ui/ErrorState.jsx'
import { getComplaints } from '../../services/complaintApi.js'
import { formatDate } from '../../utils/formatter.js'
import { COMPLAINT_TYPES, useComplaintLabels } from '../../utils/complaintLabels.js'
import { UNITS } from '../../data/units.js'
import { Eye, Inbox } from 'lucide-react'

const PAGE_SIZE = 10
const SEARCH_DEBOUNCE_MS = 350
const STATUS_KEYS = [
  'received',
  'verified',
  'dispatched',
  'in_progress',
  'action_taken',
  'answered',
  'resolved',
]

export default function ComplaintsPage() {
  const { t } = useTranslation()
  const { typeLabel, categoryLabel } = useComplaintLabels()
  const [data, setData] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [type, setType] = useState('')
  const [unit, setUnit] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search.trim())
      setPage(1)
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(false)
    getComplaints({ page, limit: PAGE_SIZE, search: query, status, type, unit })
      .then(res => {
        if (!active) return
        setData(res.items)
        setTotal(res.total)
      })
      .catch(() => { if (active) setError(true) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [page, query, status, type, unit, reloadKey])

  const statusTabs = [
    { key: '', label: 'Semua Status' },
    ...STATUS_KEYS.map(key => ({ key, label: t(`status.${key}`) })),
  ]

  const COLUMNS = [
    { key: 'ticket_id', label: t('complaints.id'), sortable: true },
    { key: 'created_at', label: t('complaints.date'), sortable: true, render: v => formatDate(v) },
    { key: 'type', label: t('complaints.type'), render: v => typeLabel(v) },
    {
      key: 'target_unit',
      label: 'Unit Tujuan',
      render: (_, row) => (
        <span className="font-semibold text-xs text-[var(--color-text)]">
          {row.target_unit || row.unit}
        </span>
      ),
    },
    {
      key: 'sender_name', label: t('complaints.sender'),
      render: (_, row) => (
        <span className="text-xs italic text-[var(--color-text-muted)]">
          {t('complaints.anonymous')} · {row.sender_role}
        </span>
      ),
    },
    { key: 'urgency_score', label: t('complaints.urgency'), sortable: true, render: v => <UrgencyBadge score={v} /> },
    { key: 'status', label: t('complaints.status'), sortable: true, render: v => <StatusBadge status={v} /> },
    {
      key: 'id', label: t('complaints.actions'),
      render: v => (
        <Link
          to={`/stakeholder/complaints/${v}`}
          className="btn-outline inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono transition-colors"
        >
          <Eye size={12} aria-hidden="true" /> {t('complaints.view_detail')}
        </Link>
      ),
    },
  ]

  const filterSlot = (
    <div className="flex items-center gap-2">
      <select
        aria-label="Pilih Unit"
        value={unit}
        onChange={e => { setUnit(e.target.value); setPage(1) }}
        className="border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-2 text-xs font-mono text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
      >
        <option value="">Semua Unit (14)</option>
        {UNITS.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
      </select>

      <select
        aria-label={t('complaints.type')}
        value={type}
        onChange={e => { setType(e.target.value); setPage(1) }}
        className="border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-2 text-xs font-mono text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
      >
        <option value="">{t('stk.complaints.all_types', 'Semua jenis')}</option>
        {COMPLAINT_TYPES.map(key => <option key={key} value={key}>{typeLabel(key)}</option>)}
      </select>
    </div>
  )

  return (
    <StakeholderLayout title={t('complaints.title')}>
      <PageHeader
        heading={t('stk.complaints.heading', 'Semua aduan')}
        description={
          loading || error
            ? undefined
            : t('stk.complaints.subtitle', { n: total, defaultValue: '{{n}} aduan ditemukan' })
        }
        actions={
          <div className="overflow-x-auto max-w-full">
            <SegmentedControl
              label={t('complaints.filter_status')}
              options={statusTabs}
              value={status}
              onChange={key => { setStatus(key); setPage(1) }}
            />
          </div>
        }
      />

      {error ? (
        <ErrorState onRetry={() => setReloadKey(k => k + 1)} />
      ) : (
        <>
          <div className="min-w-0 overflow-x-auto">
            <DataTable
              columns={COLUMNS}
              data={data}
              loading={loading}
              total={total}
              page={page}
              limit={PAGE_SIZE}
              onPageChange={setPage}
              searchValue={search}
              onSearchChange={setSearch}
              filterSlot={filterSlot}
            />
          </div>
          {!loading && data.length === 0 && (
            <EmptyState
              icon={Inbox}
              title={t('stk.complaints.empty_title', 'Tidak ada aduan')}
              description={t('stk.complaints.empty_desc', 'Coba ubah kata kunci atau filter pencarian.')}
            />
          )}
        </>
      )}
    </StakeholderLayout>
  )
}