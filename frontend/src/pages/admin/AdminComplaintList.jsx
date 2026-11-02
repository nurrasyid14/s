import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import AdminLayout from '../../components/layout/AdminLayout.jsx'
import { StatusBadge } from '../../components/ui/StatusBadge.jsx'
import { getComplaints } from '../../services/complaintApi.js'
import { formatDateTime, formatDate, formatUrgencyScore } from '../../utils/formatter.js'
import { UNITS } from '../../data/units.js'
import { Search, Filter, Printer, ExternalLink, AlertTriangle, MessageSquare, Lightbulb } from 'lucide-react'

export default function AdminComplaintList() {
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
    <AdminLayout title="Semua Masukan & Aduan Sentral">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-[var(--color-border)]">
        <div>
          <h2 className="text-xl font-bold font-mono tracking-tight text-[var(--color-text)]">
            Daftar Seluruh Laporan &amp; Aspirasi Sivitas
          </h2>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Data terpusat seluruh aduan, masukan, dan saran dalam alur penanganan institusional kampus.
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="btn-outline !py-2 !px-3.5 text-xs inline-flex items-center gap-1.5 rounded-xl min-h-[40px]"
        >
          <Printer size={14} /> Cetak Rekap (PDF)
        </button>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 p-4 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-2xl shadow-xs">
        <div>
          <label htmlFor="filter-search" className="block text-[11px] font-mono uppercase text-[var(--color-text-muted)] font-semibold mb-1">
            Cari Tiket / Kata Kunci
          </label>
          <input
            id="filter-search"
            type="text"
            placeholder="Ketik kata kunci pencarian..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field text-xs !py-2 rounded-xl"
          />
        </div>
        <div>
          <label htmlFor="filter-type" className="block text-[11px] font-mono uppercase text-[var(--color-text-muted)] font-semibold mb-1">
            Jenis Laporan
          </label>
          <select
            id="filter-type"
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="input-field text-xs !py-2 rounded-xl"
          >
            <option value="">-- Semua Jenis (3) --</option>
            <option value="complaint">⚠️ Aduan (Masalah/Keluhan)</option>
            <option value="feedback">💬 Masukan (Perbaikan Layanan)</option>
            <option value="suggestion">💡 Saran (Ide Inovasi)</option>
          </select>
        </div>
        <div>
          <label htmlFor="filter-status" className="block text-[11px] font-mono uppercase text-[var(--color-text-muted)] font-semibold mb-1">
            Filter Status
          </label>
          <select
            id="filter-status"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="input-field text-xs !py-2 rounded-xl"
          >
            <option value="">-- Semua Status --</option>
            <option value="received">1. Diterima</option>
            <option value="verified">2. Diverifikasi</option>
            <option value="dispatched">3. Didisposisikan</option>
            <option value="in_progress">4. Diproses</option>
            <option value="action_taken">5. Ditindaklanjuti</option>
            <option value="answered">6. Dijawab</option>
            <option value="resolved">7. Selesai</option>
          </select>
        </div>
        <div>
          <label htmlFor="filter-unit" className="block text-[11px] font-mono uppercase text-[var(--color-text-muted)] font-semibold mb-1">
            Filter Unit (14 Unit Baku)
          </label>
          <select
            id="filter-unit"
            value={unitFilter}
            onChange={e => setUnitFilter(e.target.value)}
            className="input-field text-xs !py-2 rounded-xl"
          >
            <option value="">-- Semua Unit Kerja --</option>
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
          Tidak ada laporan yang sesuai dengan filter pencarian.
        </div>
      ) : (
        <div className="border border-[var(--color-border)] overflow-x-auto bg-[var(--color-surface)] rounded-2xl shadow-sm">
          <table className="w-full text-left text-xs">
            <caption className="sr-only">Daftar rekap masukan, aduan, dan saran sivitas PENS</caption>
            <thead className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] font-mono uppercase">
              <tr>
                <th scope="col" className="p-3.5">No Tiket</th>
                <th scope="col" className="p-3.5">Jenis</th>
                <th scope="col" className="p-3.5">Tanggal</th>
                <th scope="col" className="p-3.5">Substansi Laporan</th>
                <th scope="col" className="p-3.5">Unit Tujuan</th>
                <th scope="col" className="p-3.5">Status</th>
                <th scope="col" className="p-3.5">Urgensi</th>
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
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900/60">
                          <MessageSquare size={10} /> Masukan
                        </span>
                      ) : typeKey === 'suggestion' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60">
                          <Lightbulb size={10} /> Saran
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60">
                          <AlertTriangle size={10} /> Aduan
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
                      {c.target_unit || c.unit || 'Belum ditugaskan'}
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
