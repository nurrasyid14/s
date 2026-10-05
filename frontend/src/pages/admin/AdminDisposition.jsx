import { useState, useEffect } from 'react'
import AdminLayout from '../../components/layout/AdminLayout.jsx'
import { StatusBadge } from '../../components/ui/StatusBadge.jsx'
import { getComplaints, dispatchComplaint } from '../../services/complaintApi.js'
import { formatDateTime, formatDate } from '../../utils/formatter.js'
import { UNITS } from '../../data/units.js'
import { Send, Check, AlertCircle, Building2, Calendar, User, Search } from 'lucide-react'

export default function AdminDisposition() {
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
      assigned_pic: `Koordinator ${suggestedUnit.split(' ')[0]}`,
      disposition_note: `Mohon unit segera melakukan investigasi dan penanganan terkait aduan ini.`,
      target_sla_date: '',
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!selectedTicket) return
    setSubmitting(true)
    try {
      await dispatchComplaint(selectedTicket.id, form)
      setSuccessMsg(`Tiket ${selectedTicket.ticket_id} berhasil didisposisikan ke ${form.target_unit}!`)
      setTimeout(() => setSuccessMsg(''), 3000)
      setSelectedTicket(null)
      loadData()
    } catch {
      alert('Gagal mendisposisikan tiket.')
    } finally {
      setSubmitting(false)
    }
  }

  const filtered = items.filter(c =>
    c.ticket_id.toLowerCase().includes(search.toLowerCase()) ||
    c.description.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <AdminLayout title="Disposisi ke 14 Unit Kerja">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-[var(--color-border)]">
        <div>
          <h2 className="text-xl font-bold font-mono tracking-tight text-[var(--color-text)]">
            Disposisi Penugasan 14 Unit Kerja Resmi
          </h2>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Teruskan tiket yang telah diverifikasi (Status: Diverifikasi) kepada salah satu dari 14 unit kerja PENS beserta instruksi tugas.
          </p>
        </div>
        <div className="w-full sm:w-64">
          <input
            type="text"
            placeholder="Cari ID tiket / deskripsi..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field text-xs !py-2"
          />
        </div>
      </div>

      {successMsg && (
        <div className="p-3 border border-[var(--color-status-success)] bg-[var(--color-status-success)]/10 text-[var(--color-status-success)] text-xs font-semibold flex items-center gap-2">
          <Check size={15} /> {successMsg}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-24 border border-[var(--color-border)]" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center border border-[var(--color-border)] bg-[var(--color-surface)]">
          <Send size={32} className="mx-auto mb-2 text-purple-500 opacity-70" />
          <h3 className="font-bold text-sm text-[var(--color-text)]">Tidak Ada Tiket yang Menunggu Disposisi</h3>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">Semua tiket yang diverifikasi telah berhasil didisposisikan ke unit terkait.</p>
        </div>
      ) : (
        <div className="border border-[var(--color-border)] divide-y divide-[var(--color-border)] bg-[var(--color-surface)]">
          {filtered.map(c => (
            <div key={c.id} className="p-5 flex flex-col sm:flex-row items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="font-mono text-sm font-bold text-[var(--color-primary)]">{c.ticket_id}</span>
                  <StatusBadge status={c.status} />
                  <span className="text-xs px-2 py-0.5 border border-[var(--color-border)] bg-[var(--color-bg-secondary)] font-mono text-[var(--color-text-muted)]">
                    Kategori: {c.category}
                  </span>
                </div>
                <p className="text-xs text-[var(--color-text)] leading-relaxed font-medium mb-2">
                  {c.description}
                </p>
                <div className="flex items-center gap-3 text-[11px] font-mono text-[var(--color-text-muted)]">
                  <span>Diverifikasi pada: {formatDateTime(c.verification?.verified_at || c.created_at)}</span>
                  <span>·</span>
                  <span>Oleh: {c.verification?.verified_by || 'Admin Sentral'}</span>
                </div>
              </div>

              <div className="flex-shrink-0 self-end sm:self-center">
                <button
                  onClick={() => openDispositionModal(c)}
                  className="btn-solid !py-2 !px-4 text-xs font-bold flex items-center gap-1.5"
                >
                  <Send size={13} /> Disposisikan ke Unit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Disposisi Lengkap */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] max-w-xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-purple-600 font-bold">
                  LEMBAR DISPOSISI RESMI
                </span>
                <h3 className="text-base font-bold text-[var(--color-text)] font-mono">{selectedTicket.ticket_id}</h3>
              </div>
              <button onClick={() => setSelectedTicket(null)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
                ✕ Tutup
              </button>
            </div>

            <div className="p-3 border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-xs text-[var(--color-text-muted)] leading-relaxed">
              <strong className="text-[var(--color-text)] block mb-1">Substansi Keluhan:</strong>
              "{selectedTicket.description}"
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-[var(--color-text)] mb-1">
                  Pilih Unit Kerja Penerima Disposisi (14 Standar Unit PENS) *
                </label>
                <select
                  value={form.target_unit}
                  onChange={e => setForm(f => ({ ...f, target_unit: e.target.value }))}
                  className="input-field text-xs"
                >
                  {UNITS.map(u => (
                    <option key={u.id} value={u.name}>{u.name} — [{u.code}] (SLA: {u.slaDays} hari)</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[var(--color-text)] mb-1">Nama / Jabatan PIC Unit</label>
                  <input
                    type="text"
                    placeholder="Contoh: Koordinator Lab / Teknisi"
                    value={form.assigned_pic}
                    onChange={e => setForm(f => ({ ...f, assigned_pic: e.target.value }))}
                    className="input-field text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[var(--color-text)] mb-1">Batas Waktu SLA (Opsional)</label>
                  <input
                    type="date"
                    value={form.target_sla_date}
                    onChange={e => setForm(f => ({ ...f, target_sla_date: e.target.value }))}
                    className="input-field text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[var(--color-text)] mb-1">
                  Catatan Instruksi / Arahan Disposisi dari Administrator *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Instruksi jelas bagi unit: investigasi, perbaikan segera, atau koordinasi..."
                  value={form.disposition_note}
                  onChange={e => setForm(f => ({ ...f, disposition_note: e.target.value }))}
                  className="input-field text-xs resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={() => setSelectedTicket(null)}
                  className="btn-outline !py-2 !px-4 text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-solid !py-2 !px-4 text-xs font-bold flex items-center gap-1.5"
                >
                  {submitting ? 'Mengirimkan...' : (
                    <>
                      <Send size={13} /> Kirim Disposisi Resmi
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
