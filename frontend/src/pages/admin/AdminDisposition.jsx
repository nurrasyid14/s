import { useState, useEffect } from 'react'
import AdminLayout from '../../components/layout/AdminLayout.jsx'
import { StatusBadge } from '../../components/ui/StatusBadge.jsx'
import { getComplaints, dispatchComplaint } from '../../services/complaintApi.js'
import { formatDateTime, formatDate } from '../../utils/formatter.js'
import { UNITS } from '../../data/units.js'
import useBilingual from '../../hooks/useBilingual.js'
import { X, Send, Check, AlertCircle, Building2, Calendar, User, Search } from 'lucide-react'

export default function AdminDisposition() {
  const { tx } = useBilingual()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedTicket, setSelectedTicket] = useState(null)

  const [form, setForm] = useState({
    target_unit: UNITS[0].name,
    assigned_pic: '',
    disposition_note: '',
    target_sla_date: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  function loadData() {
    setLoading(true)
    getComplaints({ status: 'verified', limit: 50 })
      .then(res => setItems(res.items || []))
      .finally(() => setLoading(false))
  }

  function openDispositionModal(ticket) {
    setSelectedTicket(ticket)
    const suggestedUnit = ticket.target_unit || ticket.unit || UNITS[0].name
    setForm({
      target_unit: suggestedUnit,
      assigned_pic: `${tx('Koordinator', 'Coordinator')} ${suggestedUnit.split(' ')[0]}`,
      disposition_note: tx('Mohon unit segera melakukan investigasi dan penanganan terkait aduan ini.', 'Please investigate and handle this complaint promptly.'),
      target_sla_date: '',
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!selectedTicket) return
    setSubmitting(true)
    setErrorMsg('')
    try {
      await dispatchComplaint(selectedTicket.id, form)
      setSuccessMsg(tx(`Tiket ${selectedTicket.ticket_id} berhasil didisposisikan ke ${form.target_unit}!`, `Ticket ${selectedTicket.ticket_id} was dispatched to ${form.target_unit}!`))
      setTimeout(() => setSuccessMsg(''), 3000)
      setSelectedTicket(null)
      loadData()
    } catch {
      setErrorMsg(tx('Gagal mendisposisikan tiket. Silakan periksa kembali isian form.', 'Failed to dispatch the ticket. Please check the form and try again.'))
      setTimeout(() => setErrorMsg(''), 4000)
    } finally {
      setSubmitting(false)
    }
  }

  const filtered = items.filter(c =>
    c.ticket_id.toLowerCase().includes(search.toLowerCase()) ||
    c.description.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <AdminLayout title={tx('Disposisi ke 14 Unit Kerja', 'Dispatch to 14 Work Units')}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-[var(--color-border)]">
        <div>
          <h2 className="text-xl font-bold font-mono tracking-tight text-[var(--color-text)]">
            {tx('Disposisi Penugasan 14 Unit Kerja Resmi', 'Official Assignment to 14 Work Units')}
          </h2>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            {tx('Teruskan tiket yang telah diverifikasi (Status: Diverifikasi) kepada salah satu dari 14 unit kerja PENS beserta instruksi tugas.', 'Forward verified tickets (Status: Verified) to one of the 14 PENS work units along with task instructions.')}
          </p>
        </div>
        <div className="w-full sm:w-64">
          <input
            type="text"
            placeholder={tx('Cari ID tiket / deskripsi...', 'Search ticket ID / description...')}
            aria-label={tx('Cari ID tiket atau deskripsi', 'Search ticket ID or description')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field text-xs !py-2 rounded-xl"
          />
        </div>
      </div>

      {successMsg && (
        <div role="status" aria-live="polite" className="p-3 border border-[var(--color-status-success)] bg-[var(--color-status-success)]/10 text-[var(--color-status-success)] text-xs font-semibold flex items-center gap-2 rounded-xl">
          <Check size={15} /> {successMsg}
        </div>
      )}

      {errorMsg && (
        <div role="alert" aria-live="assertive" className="p-3 border border-[var(--color-status-danger)] bg-[var(--color-status-danger)]/10 text-[var(--color-status-danger)] text-xs font-semibold flex items-center gap-2 rounded-xl">
          <AlertCircle size={15} /> {errorMsg}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-24 border border-[var(--color-border)] rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center border border-[var(--color-border)] bg-[var(--color-surface)] rounded-2xl shadow-sm">
          <Send size={32} className="mx-auto mb-2 text-purple-500 opacity-70" />
          <h3 className="font-bold text-sm text-[var(--color-text)]">{tx('Tidak Ada Tiket yang Menunggu Disposisi', 'No Tickets Awaiting Dispatch')}</h3>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">{tx('Semua tiket yang diverifikasi telah berhasil didisposisikan ke unit terkait.', 'All verified tickets have been dispatched to the relevant units.')}</p>
        </div>
      ) : (
        <div className="border border-[var(--color-border)] divide-y divide-[var(--color-border)] bg-[var(--color-surface)] rounded-2xl shadow-sm overflow-hidden">
          {filtered.map(c => (
            <div key={c.id} className="p-5 flex flex-col sm:flex-row items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="font-mono text-sm font-bold text-[var(--color-primary)]">{c.ticket_id}</span>
                  <StatusBadge status={c.status} />
                  <span className="text-xs font-semibold text-[var(--color-text)]">
                    {tx('Kategori', 'Category')}: {c.category}
                  </span>
                </div>
                <p className="text-xs text-[var(--color-text)] leading-relaxed font-medium mb-2">
                  {c.description}
                </p>
                <div className="flex items-center gap-3 text-[11px] font-mono text-[var(--color-text-muted)]">
                  <span>{tx('Diverifikasi pada', 'Verified on')}: {formatDateTime(c.verification?.verified_at || c.created_at)}</span>
                  <span>·</span>
                  <span>{tx('Oleh', 'By')}: {c.verification?.verified_by || tx('Admin Sentral', 'Central Admin')}</span>
                </div>
              </div>

              <div className="flex-shrink-0 self-end sm:self-center">
                <button
                  onClick={() => openDispositionModal(c)}
                  className="btn-solid !py-2 !px-4 text-xs font-bold flex items-center gap-1.5 rounded-xl min-h-[40px]"
                >
                  <Send size={13} /> {tx('Disposisikan ke Unit', 'Dispatch to Unit')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Disposisi Lengkap */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 backdrop-in bg-black/60 backdrop-blur-xs overflow-y-auto overscroll-contain">
        <div className="flex min-h-full items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-disposition-title"
            className="bg-[var(--color-surface)] border border-[var(--color-border)] max-w-xl w-full p-6 space-y-4 rounded-2xl shadow-xl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-purple-600 font-bold">
                  {tx('LEMBAR DISPOSISI RESMI', 'OFFICIAL DISPATCH SHEET')}
                </span>
                <h3 id="modal-disposition-title" className="text-base font-bold text-[var(--color-text)] font-mono">
                  {selectedTicket.ticket_id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                aria-label={tx('Tutup lembar disposisi', 'Close dispatch sheet')}
                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-secondary)] transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-3.5 border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-xs text-[var(--color-text-muted)] leading-relaxed rounded-xl">
              <strong className="text-[var(--color-text)] block mb-1">{tx('Substansi Keluhan:', 'Complaint Details:')}</strong>
              "{selectedTicket.description}"
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label htmlFor="disposition-target-unit" className="block font-bold text-[var(--color-text)] mb-1">
                  {tx('Pilih Unit Kerja Penerima Disposisi (14 Standar Unit PENS)', 'Select Receiving Work Unit (14 Standard PENS Units)')} *
                </label>
                <select
                  id="disposition-target-unit"
                  value={form.target_unit}
                  onChange={e => setForm(f => ({ ...f, target_unit: e.target.value }))}
                  className="input-field text-xs rounded-xl"
                >
                  {UNITS.map(u => (
                    <option key={u.id} value={u.name}>{u.name} ({u.code}, SLA: {u.slaDays} {tx('hari', 'days')})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="disposition-pic" className="block font-bold text-[var(--color-text)] mb-1">{tx('Nama / Jabatan PIC Unit', 'Unit PIC Name / Position')}</label>
                  <input
                    id="disposition-pic"
                    type="text"
                    placeholder={tx('Contoh: Koordinator Lab / Teknisi', 'Example: Lab Coordinator / Technician')}
                    value={form.assigned_pic}
                    onChange={e => setForm(f => ({ ...f, assigned_pic: e.target.value }))}
                    className="input-field text-xs rounded-xl"
                  />
                </div>
                <div>
                  <label htmlFor="disposition-sla" className="block font-bold text-[var(--color-text)] mb-1">{tx('Batas Waktu SLA (Opsional)', 'SLA Deadline (Optional)')}</label>
                  <input
                    id="disposition-sla"
                    type="date"
                    value={form.target_sla_date}
                    onChange={e => setForm(f => ({ ...f, target_sla_date: e.target.value }))}
                    className="input-field text-xs rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="disposition-notes" className="block font-bold text-[var(--color-text)] mb-1">
                  {tx('Catatan Instruksi / Arahan Disposisi dari Administrator', 'Administrator Dispatch Instructions')} *
                </label>
                <textarea
                  id="disposition-notes"
                  rows={3}
                  required
                  placeholder={tx('Instruksi jelas bagi unit: investigasi, perbaikan segera, atau koordinasi...', 'Clear instructions for the unit: investigation, immediate repair, or coordination...')}
                  value={form.disposition_note}
                  onChange={e => setForm(f => ({ ...f, disposition_note: e.target.value }))}
                  className="input-field text-xs resize-none rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={() => setSelectedTicket(null)}
                  className="btn-outline !py-2 !px-4 text-xs rounded-xl min-h-[40px]"
                >
                  {tx('Batal', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-solid !py-2 !px-4 text-xs font-bold flex items-center gap-1.5 rounded-xl min-h-[40px]"
                >
                  {submitting ? tx('Mengirimkan...', 'Sending...') : (
                    <>
                      <Send size={13} /> {tx('Kirim Disposisi Resmi', 'Send Official Dispatch')}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
        </div>
      )}
    </AdminLayout>
  )
}
