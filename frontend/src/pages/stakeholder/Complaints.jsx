import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import Sidebar from '../../components/layout/Sidebar.jsx'
import Navbar from '../../components/layout/Navbar.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import { StatusBadge, UrgencyBadge } from '../../components/ui/StatusBadge.jsx'
import { getComplaints, updateComplaintStatus } from '../../services/complaintApi.js'
import { formatDate } from '../../utils/formatter.js'
import { Eye } from 'lucide-react'

const TYPE_MAP = { complaint: 'Aduan', feedback: 'Masukan', suggestion: 'Saran' }
const CAT_MAP  = { facility: 'Fasilitas', academic: 'Akademik', admin: 'Administrasi', finance: 'Keuangan', other: 'Lainnya' }

export default function ComplaintsPage() {
  const { t } = useTranslation()
  const [data,    setData]    = useState([])
  const [total,   setTotal]   = useState(0)
  const [page,    setPage]    = useState(1)
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [filters, setFilters] = useState({ status: '', type: '' })

  async function load(p = 1) {
    setLoading(true)
    try {
      const res = await getComplaints({ page: p, limit: 10, search, ...filters })
      setData(res.items)
      setTotal(res.total)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(1) }, [search, filters])

  const COLUMNS = [
    { key: 'ticket_id',    label: t('complaints.id'),       sortable: true  },
    { key: 'created_at',   label: t('complaints.date'),     sortable: true,  render: v => formatDate(v) },
    { key: 'type',         label: t('complaints.type'),                      render: v => TYPE_MAP[v] || v },
    { key: 'category',     label: t('complaints.category'),                  render: v => CAT_MAP[v] || v  },
    { key: 'sender_name',  label: t('complaints.sender'),                    render: (v, row) => row.is_anonymous ? <span className="text-[var(--color-text-muted)] text-xs italic">{t('complaints.anonymous')}</span> : v },
    { key: 'urgency_score',label: t('complaints.urgency'),  sortable: true,  render: v => <UrgencyBadge score={v} /> },
    { key: 'status',       label: t('complaints.status'),   sortable: true,  render: v => <StatusBadge status={v} /> },
    {
      key: 'id', label: t('complaints.actions'),
      render: (v) => (
        <Link to={`/stakeholder/complaints/${v}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded-lg transition-colors">
          <Eye size={13} /> {t('complaints.view_detail')}
        </Link>
      ),
    },
  ]

  const filterSlot = (
    <>
      <select value={filters.type} onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}
        className="px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-sm text-[var(--color-text)] focus:outline-none">
        <option value="">{t('complaints.filter_type')}: {t('common.filter')}</option>
        <option value="complaint">Aduan</option>
        <option value="feedback">Masukan</option>
        <option value="suggestion">Saran</option>
      </select>
      <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
        className="px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-sm text-[var(--color-text)] focus:outline-none">
        <option value="">{t('complaints.filter_status')}: {t('common.filter')}</option>
        <option value="new">{t('status.new')}</option>
        <option value="process">{t('status.process')}</option>
        <option value="done">{t('status.done')}</option>
        <option value="escalate">{t('status.escalate')}</option>
      </select>
    </>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-bg)]">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar variant="stakeholder" title={t('complaints.title')} />
        <main className="flex-1 overflow-y-auto p-6">
          <DataTable
            columns={COLUMNS}
            data={data}
            loading={loading}
            total={total}
            page={page}
            limit={10}
            onPageChange={p => { setPage(p); load(p) }}
            searchValue={search}
            onSearchChange={v => { setSearch(v); setPage(1) }}
            filterSlot={filterSlot}
          />
        </main>
      </div>
    </div>
  )
}
