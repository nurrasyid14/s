import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import AdminLayout from '../../components/layout/AdminLayout.jsx'
import { StatusBadge } from '../../components/ui/StatusBadge.jsx'
import { getComplaints, verifyComplaint, dispatchComplaint } from '../../services/complaintApi.js'
import { formatDate, formatRelative } from '../../utils/formatter.js'
import { UNITS } from '../../data/units.js'
import {
  CheckSquare, Send, Clock, AlertTriangle, ArrowRight,
  ShieldCheck, Check, Building2, User
} from 'lucide-react'

export default function AdminDashboard() {
  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(true)

  // Disposition Modal state
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [dispositionForm, setDispositionForm] = useState({
    target_unit: 'Sarana Prasarana dan Layanan Umum',
    assigned_pic: '',
    disposition_note: '',
  })
  const [savingAction, setSavingAction] = useState(false)
  const [actionSuccess, setActionSuccess] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  function loadData() {
    setLoading(true)
    getComplaints({ limit: 50 })
      .then(res => setComplaints(res.items || []))
      .finally(() => setLoading(false))
  }

  // Antrean Verifikasi (Status 'received')
  const verificationQueue = complaints.filter(c => c.status === 'received')
  // Antrean Disposisi (Status 'verified')
  const dispositionQueue = complaints.filter(c => c.status === 'verified')
  // Tiket Aktif Berjalan
  const activeDispatched = complaints.filter(c => ['dispatched', 'in_progress', 'action_taken', 'answered'].includes(c.status))
  // Tiket Selesai
  const resolvedList = complaints.filter(c => c.status === 'resolved')

  async function handleQuickVerify(id) {
    setSavingAction(true)
    try {
      await verifyComplaint(id, { verified: true, note: 'Diverifikasi langsung melalui Dashboard Administrator.' })
      setActionSuccess('Tiket berhasil diverifikasi!')
      setTimeout(() => setActionSuccess(''), 3000)
      loadData()
    } catch {
      alert('Gagal memverifikasi tiket.')
    } finally {
      setSavingAction(false)
    }
  }

  async function handleQuickDispatch(e) {
    e.preventDefault()
    if (!selectedTicket) return
    setSavingAction(true)
    try {
      await dispatchComplaint(selectedTicket.id, dispositionForm)
      setActionSuccess(`Tiket ${selectedTicket.ticket_id} berhasil didisposisikan ke ${dispositionForm.target_unit}!`)
      setTimeout(() => setActionSuccess(''), 3000)
      setSelectedTicket(null)
      loadData()
    } catch {
      alert('Gagal mendisposisikan tiket.')
    } finally {
      setSavingAction(false)
    }
  }

  return (
    <AdminLayout title="Dashboard Administrator Sentral">
      {/* Success Notification Banner */}
      {actionSuccess && (
        <div className="p-3 border border-[var(--color-status-success)] bg-[var(--color-status-success)]/10 text-[var(--color-status-success)] text-xs font-semibold flex items-center gap-2">
          <Check size={16} /> {actionSuccess}
        </div>
      )}

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-[var(--color-text-muted)] font-semibold">Perlu Verifikasi</span>
            <span className="w-2 h-2 rounded-full bg-[var(--color-status-info)]" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-[var(--color-text)]">
            {verificationQueue.length}
          </div>
          <div className="text-[11px] text-[var(--color-text-muted)] mt-1">Status: Diterima (Tiket Baru)</div>
        </div>

        <div className="border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-[var(--color-text-muted)] font-semibold">Perlu Disposisi</span>
            <span className="w-2 h-2 rounded-full bg-purple-500" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-[var(--color-text)]">
            {dispositionQueue.length}
          </div>
          <div className="text-[11px] text-[var(--color-text-muted)] mt-1">Siap diarahkan ke 14 Unit</div>
        </div>

        <div className="border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-[var(--color-text-muted)] font-semibold">Disposisi Aktif</span>
            <span className="w-2 h-2 rounded-full bg-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-[var(--color-text)]">
            {activeDispatched.length}
          </div>
          <div className="text-[11px] text-[var(--color-text-muted)] mt-1">Sedang ditangani oleh unit</div>
        </div>

        <div className="border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-[var(--color-text-muted)] font-semibold">Aduan Selesai</span>
            <span className="w-2 h-2 rounded-full bg-[var(--color-status-success)]" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-[var(--color-text)]">
            {resolvedList.length}
          </div>
          <div className="text-[11px] text-[var(--color-text-muted)] mt-1">Telah diisi feedback pelapor</div>
        </div>
      </div>

      {/* Grid: 2 Antrean Utama Administrator */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Antrean 1: Verifikasi Tiket Baru */}
        <section className="border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--color-border)]">
            <div className="flex items-center gap-2">
              <CheckSquare size={16} className="text-[var(--color-primary)]" />
              <h2 className="text-sm font-bold font-mono uppercase text-[var(--color-text)]">
                Antrean Verifikasi Masukan ({verificationQueue.length})
              </h2>
            </div>
            <Link to="/admin/verifikasi" className="text-xs text-[var(--color-primary)] hover:underline flex items-center gap-1">
              Lihat Semua <ArrowRight size={12} />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="skeleton h-16 border border-[var(--color-border)]" />)}
            </div>
          ) : verificationQueue.length === 0 ? (
            <div className="py-12 text-center text-xs font-mono text-[var(--color-text-muted)]">
              Semua masukan baru telah selesai diverifikasi.
            </div>
          ) : (
            <div className="space-y-3">
              {verificationQueue.slice(0, 4).map(c => (
                <div key={c.id} className="p-3 border border-[var(--color-border)] bg-[var(--color-bg-secondary)] hover:border-[var(--color-text)] transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className="text-xs font-mono font-bold text-[var(--color-primary)]">{c.ticket_id}</span>
                    <span className="text-[11px] font-mono text-[var(--color-text-muted)]">{formatRelative(c.created_at)}</span>
                  </div>
                  <p className="text-xs text-[var(--color-text)] line-clamp-2 mb-2 leading-relaxed font-medium">
                    {c.description}
                  </p>
                  <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)] text-xs">
                    <span className="font-mono text-[11px] text-[var(--color-text-muted)]">
                      Saran Unit: {c.target_unit || c.unit}
                    </span>
                    <button
                      onClick={() => handleQuickVerify(c.id)}
                      disabled={savingAction}
                      className="btn-solid !py-1 !px-3 text-xs"
                    >
                      Verifikasi
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Antrean 2: Disposisi ke 14 Unit Kerja */}
        <section className="border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--color-border)]">
            <div className="flex items-center gap-2">
              <Send size={16} className="text-purple-600" />
              <h2 className="text-sm font-bold font-mono uppercase text-[var(--color-text)]">
                Antrean Disposisi ke Unit ({dispositionQueue.length})
              </h2>
            </div>
            <Link to="/admin/disposisi" className="text-xs text-[var(--color-primary)] hover:underline flex items-center gap-1">
              Lihat Semua <ArrowRight size={12} />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="skeleton h-16 border border-[var(--color-border)]" />)}
            </div>
          ) : dispositionQueue.length === 0 ? (
            <div className="py-12 text-center text-xs font-mono text-[var(--color-text-muted)]">
              Tidak ada tiket yang menunggu disposisi unit.
            </div>
          ) : (
            <div className="space-y-3">
              {dispositionQueue.slice(0, 4).map(c => (
                <div key={c.id} className="p-3 border border-[var(--color-border)] bg-[var(--color-bg-secondary)] hover:border-[var(--color-text)] transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className="text-xs font-mono font-bold text-[var(--color-primary)]">{c.ticket_id}</span>
                    <StatusBadge status={c.status} />
                  </div>
                  <p className="text-xs text-[var(--color-text)] line-clamp-2 mb-2 leading-relaxed">
                    {c.description}
                  </p>
                  <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)] text-xs">
                    <span className="text-[11px] font-mono text-[var(--color-text-muted)]">
                      Rekomendasi AI: {c.target_unit || c.unit}
                    </span>
                    <button
                      onClick={() => {
                        setSelectedTicket(c)
                        setDispositionForm({
                          target_unit: c.target_unit || c.unit || UNITS[0].name,
                          assigned_pic: '',
                          disposition_note: `Segera tindak lanjuti aduan terkait ${c.category}.`,
                        })
                      }}
                      className="btn-outline !py-1 !px-3 text-xs font-semibold"
                    >
                      Buka Disposisi
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Modal Disposisi Cepat */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
              <div>
                <div className="text-[10px] font-mono uppercase text-[var(--color-primary)] font-bold">DISPOSISI RESMI ADMIN</div>
                <h3 className="text-base font-bold text-[var(--color-text)] font-mono">{selectedTicket.ticket_id}</h3>
              </div>
              <button onClick={() => setSelectedTicket(null)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-sm">
                ✕ Tutup
              </button>
            </div>

            <p className="text-xs text-[var(--color-text-muted)] bg-[var(--color-bg-secondary)] p-3 border border-[var(--color-border)] leading-relaxed">
              "{selectedTicket.description}"
            </p>

            <form onSubmit={handleQuickDispatch} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[var(--color-text)] mb-1">Pilih Unit Kerja Tujuan (14 Standar Unit) *</label>
                <select
                  value={dispositionForm.target_unit}
                  onChange={e => setDispositionForm(f => ({ ...f, target_unit: e.target.value }))}
                  className="input-field text-xs"
                >
                  {UNITS.map(u => (
                    <option key={u.id} value={u.name}>{u.name} ({u.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-[var(--color-text)] mb-1">Nama PIC Unit (Opsional)</label>
                <input
                  type="text"
                  placeholder="Contoh: Koordinator Sarpras / Ir. Ahmad"
                  value={dispositionForm.assigned_pic}
                  onChange={e => setDispositionForm(f => ({ ...f, assigned_pic: e.target.value }))}
                  className="input-field text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-[var(--color-text)] mb-1">Catatan Arahan Disposisi Admin *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Tuliskan instruksi atau arahan pimpinan kepada unit terkait..."
                  value={dispositionForm.disposition_note}
                  onChange={e => setDispositionForm(f => ({ ...f, disposition_note: e.target.value }))}
                  className="input-field text-xs resize-none"
                />
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={() => setSelectedTicket(null)}
                  className="btn-outline !py-2 !px-4 text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingAction}
                  className="btn-solid !py-2 !px-4 text-xs font-bold"
                >
                  {savingAction ? 'Menyimpan...' : 'Kirimkan Disposisi ke Unit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
