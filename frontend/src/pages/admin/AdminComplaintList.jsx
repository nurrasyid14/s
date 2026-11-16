import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import AdminLayout from '../../components/layout/AdminLayout.jsx'
import { StatusBadge } from '../../components/ui/StatusBadge.jsx'
import { getComplaints } from '../../services/complaintApi.js'
import { formatDateTime, formatDate, formatUrgencyScore } from '../../utils/formatter.js'
import { UNITS } from '../../data/units.js'
import useBilingual from '../../hooks/useBilingual.js'
import { Search, Filter, Printer, ExternalLink, AlertTriangle, MessageSquare, Lightbulb } from 'lucide-react'

export default function AdminComplaintList() {
  const { tx } = useBilingual()
  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [unitFilter, setUnitFilter] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadData()
  }, [statusFilter, typeFilter, unitFilter])

  function loadData() {
    setLoading(true)
    getComplaints({ status: statusFilter, type: typeFilter, unit: unitFilter, limit: 50 })
      .then(res => setComplaints(res.items || []))
      .finally(() => setLoading(false))
  }

  const filtered = complaints.filter(c =>
    c.ticket_id.toLowerCase().includes(search.toLowerCase()) ||
    c.description.toLowerCase().includes(search.toLowerCase()) ||
    (c.target_unit && c.target_unit.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <AdminLayout title={tx('Semua Masukan & Aduan Sentral', 'All Central Feedback & Complaints')}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-[var(--color-border)]">
        <div>
          <h2 className="text-xl font-bold font-mono tracking-tight text-[var(--color-text)]">
            {tx('Daftar Seluruh Laporan & Aspirasi Sivitas', 'All Reports & Campus Community Aspirations')}
          </h2>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            {tx('Data terpusat seluruh aduan, masukan, dan saran dalam alur penanganan institusional kampus.', 'Centralized data of all complaints, feedback, and suggestions in the campus institutional handling flow.')}
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="btn-outline !py-2 !px-3.5 text-xs inline-flex items-center gap-1.5 rounded-xl min-h-[40px]"
        >
          <Printer size={14} /> {tx('Cetak Rekap (PDF)', 'Print Summary (PDF)')}
        </button>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 p-4 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-2xl shadow-xs">
        <div>
          <label htmlFor="filter-search" className="block text-[11px] font-mono uppercase text-[var(--color-text-muted)] font-semibold mb-1">
            {tx('Cari Tiket / Kata Kunci', 'Search Ticket / Keyword')}
          </label>
          <input
            id="filter-search"
            type="text"
            placeholder={tx('Ketik kata kunci pencarian...', 'Type a search keyword...')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field text-xs !py-2 rounded-xl"
          />
        </div>
        <div>
          <label htmlFor="filter-type" className="block text-[11px] font-mono uppercase text-[var(--color-text-muted)] font-semibold mb-1">
            {tx('Jenis Laporan', 'Report Type')}
          </label>
          <select
            id="filter-type"
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="input-field text-xs !py-2 rounded-xl"
          >
            <option value="">{tx('-- Semua Jenis (3) --', '-- All Types (3) --')}</option>
            <option value="complaint">{tx('Aduan (Masalah/Keluhan)', 'Complaint (Problem/Grievance)')}</option>
            <option value="feedback">{tx('Masukan (Perbaikan Layanan)', 'Feedback (Service Improvement)')}</option>
            <option value="suggestion">{tx('Saran (Ide Inovasi)', 'Suggestion (Innovation Idea)')}</option>
          </select>
        </div>
        <div>
          <label htmlFor="filter-status" className="block text-[11px] font-mono uppercase text-[var(--color-text-muted)] font-semibold mb-1">
            {tx('Filter Status', 'Status Filter')}
          </label>
          <select
            id="filter-status"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="input-field text-xs !py-2 rounded-xl"
          >
            <option value="">{tx('-- Semua Status --', '-- All Statuses --')}</option>
            <option value="received">1. {tx('Diterima', 'Received')}</option>
            <option value="verified">2. {tx('Diverifikasi', 'Verified')}</option>
            <option value="dispatched">3. {tx('Didisposisikan', 'Dispatched')}</option>
            <option value="in_progress">4. {tx('Diproses', 'In Progress')}</option>
            <option value="action_taken">5. {tx('Ditindaklanjuti', 'Action Taken')}</option>
            <option value="answered">6. {tx('Dijawab', 'Answered')}</option>
            <option value="resolved">7. {tx('Selesai', 'Resolved')}</option>
          </select>
        </div>
        <div>
          <label htmlFor="filter-unit" className="block text-[11px] font-mono uppercase text-[var(--color-text-muted)] font-semibold mb-1">
            {tx('Filter Unit (14 Unit Baku)', 'Unit Filter (14 Standard Units)')}
          </label>
          <select
            id="filter-unit"
            value={unitFilter}
            onChange={e => setUnitFilter(e.target.value)}
            className="input-field text-xs !py-2 rounded-xl"
          >
            <option value="">{tx('-- Semua Unit Kerja --', '-- All Work Units --')}</option>
            {UNITS.map(u => (
              <option key={u.id} value={u.name}>{u.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-16 border border-[var(--color-border)] rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text-muted)] font-mono rounded-2xl shadow-xs">
          {tx('Tidak ada laporan yang sesuai dengan filter pencarian.', 'No reports match the search filters.')}
        </div>
      ) : (
        <div className="border border-[var(--color-border)] overflow-x-auto bg-[var(--color-surface)] rounded-2xl shadow-sm">
          <table className="w-full text-left text-xs">
            <caption className="sr-only">{tx('Daftar rekap masukan, aduan, dan saran sivitas PENS', 'Summary list of PENS community feedback, complaints, and suggestions')}</caption>
            <thead className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] font-mono uppercase">
              <tr>
                <th scope="col" className="p-3.5">{tx('No Tiket', 'Ticket No.')}</th>
                <th scope="col" className="p-3.5">{tx('Jenis', 'Type')}</th>
                <th scope="col" className="p-3.5">{tx('Tanggal', 'Date')}</th>
                <th scope="col" className="p-3.5">{tx('Substansi Laporan', 'Report Details')}</th>
                <th scope="col" className="p-3.5">{tx('Unit Tujuan', 'Target Unit')}</th>
                <th scope="col" className="p-3.5">Status</th>
                <th scope="col" className="p-3.5">{tx('Urgensi', 'Urgency')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {filtered.map(c => {
                const typeKey = c.type || 'complaint'
                return (
                  <tr key={c.id} className="hover:bg-[var(--color-bg-secondary)] transition-colors">
                    <td className="p-3.5 font-mono font-bold text-[var(--color-primary)] whitespace-nowrap">
                      {c.ticket_id}
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      {typeKey === 'feedback' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--color-text)]">
                          <MessageSquare size={10} /> {tx('Masukan', 'Feedback')}
                        </span>
                      ) : typeKey === 'suggestion' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--color-text)]">
                          <Lightbulb size={10} /> {tx('Saran', 'Suggestion')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--color-text)]">
                          <AlertTriangle size={10} /> {tx('Aduan', 'Complaint')}
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 font-mono text-[var(--color-text-muted)] whitespace-nowrap">
                      {formatDate(c.created_at)}
                    </td>
                    <td className="p-3.5 max-w-md">
                      <p className="line-clamp-2 text-[var(--color-text)] leading-relaxed font-medium">
                        {c.description}
                      </p>
                    </td>
                    <td className="p-3.5 font-medium text-[var(--color-text-muted)] whitespace-nowrap">
                      {c.target_unit || c.unit || tx('Belum ditugaskan', 'Not assigned')}
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="p-3.5 font-mono whitespace-nowrap">
                      {typeKey === 'complaint' ? (
                        <span className="font-bold text-[var(--color-text)]">
                          {formatUrgencyScore(c.urgency_score || 5)}/10
                        </span>
                      ) : (
                        <span className="text-[var(--color-text-muted)] italic text-[11px]">
                          N/A
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  )
}
