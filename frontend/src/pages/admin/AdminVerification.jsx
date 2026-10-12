import { useState, useEffect } from 'react'
import AdminLayout from '../../components/layout/AdminLayout.jsx'
import { StatusBadge } from '../../components/ui/StatusBadge.jsx'
import { getComplaints, verifyComplaint } from '../../services/complaintApi.js'
import { formatDateTime } from '../../utils/formatter.js'
import { CheckSquare, XCircle, Check, Search, ShieldCheck } from 'lucide-react'

export default function AdminVerification() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [verifyingId, setVerifyingId] = useState(null)
  const [note, setNote] = useState('Data dan keluhan valid untuk ditindaklanjuti.')
  const [successMsg, setSuccessMsg] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  function loadData() {
    setLoading(true)
    getComplaints({ status: 'received', limit: 50 })
      .then(res => setItems(res.items || []))
      .finally(() => setLoading(false))
  }

  async function handleAction(id, isApproved) {
    try {
      await verifyComplaint(id, { verified: isApproved, note })
      setSuccessMsg(`Tiket berhasil ${isApproved ? 'diverifikasi' : 'ditolak'}.`)
      setTimeout(() => setSuccessMsg(''), 3000)
      setVerifyingId(null)
      loadData()
    } catch {
      alert('Gagal memproses aksi verifikasi.')
    }
  }

  const filtered = items.filter(c =>
    c.ticket_id.toLowerCase().includes(search.toLowerCase()) ||
    c.description.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <AdminLayout title="Verifikasi Masukan Masuk">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-[var(--color-border)]">
        <div>
          <h2 className="text-xl font-bold font-mono tracking-tight text-[var(--color-text)]">
            Antrean Verifikasi Validitas Aduan
          </h2>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Periksa kelayakan dan keabsahan aduan yang baru masuk (Status: Diterima) sebelum didisposisikan ke unit kerja.
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
          <CheckSquare size={32} className="mx-auto mb-2 text-[var(--color-status-success)] opacity-70" />
          <h3 className="font-bold text-sm text-[var(--color-text)]">Tidak Ada Tiket yang Perlu Diverifikasi</h3>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">Semua aduan masuk telah diverifikasi dan siap didisposisikan.</p>
        </div>
      ) : (
        <div className="border border-[var(--color-border)] divide-y divide-[var(--color-border)] bg-[var(--color-surface)]">
          {filtered.map(c => (
            <div key={c.id} className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-[var(--color-primary)]">{c.ticket_id}</span>
                  <StatusBadge status={c.status} />
                  <span className="text-xs font-mono px-2 py-0.5 border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)]">
                    Kategori: {c.category}
                  </span>
                </div>
                <div className="text-xs font-mono text-[var(--color-text-muted)]">
                  Masuk: {formatDateTime(c.created_at)}
                </div>
              </div>

              <p className="text-xs text-[var(--color-text)] leading-relaxed mb-3 font-medium">
                {c.description}
              </p>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[var(--color-border)] text-xs">
                <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
                  <span>Saran Unit AI: <strong className="text-[var(--color-text)]">{c.target_unit || c.unit}</strong></span>
                  <span>·</span>
                  <span>Skor Urgensi: <strong className="text-[var(--color-status-danger)] font-mono">{c.urgency_score}/10</strong></span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setVerifyingId(verifyingId === c.id ? null : c.id)}
                    className="btn-outline !py-1.5 !px-3 text-xs"
                  >
                    {verifyingId === c.id ? 'Tutup Form' : 'Verifikasi Tiket'}
                  </button>
                  <button
                    onClick={() => handleAction(c.id, true)}
                    className="btn-solid !py-1.5 !px-3 text-xs flex items-center gap-1.5"
                  >
                    <Check size={13} /> Setujui Langsung
                  </button>
                </div>
              </div>

              {/* Form Catatan Verifikasi Jika Dibuka */}
              {verifyingId === c.id && (
                <div className="mt-4 p-4 border border-[var(--color-border)] bg-[var(--color-bg-secondary)] space-y-3">
                  <div className="text-xs font-bold text-[var(--color-text)]">Catatan Hasil Verifikasi Administrator:</div>
                  <textarea
                    rows={2}
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    className="input-field text-xs resize-none"
                    placeholder="Tuliskan catatan verifikasi..."
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => handleAction(c.id, false)}
                      className="p-2 border border-[var(--color-status-danger)] text-[var(--color-status-danger)] hover:bg-[var(--color-status-danger)]/10 text-xs font-bold flex items-center gap-1"
                    >
                      <XCircle size={14} /> Tolak Aduan (Spam/Tidak Valid)
                    </button>
                    <button
                      onClick={() => handleAction(c.id, true)}
                      className="btn-solid text-xs !py-1.5 !px-4 font-bold flex items-center gap-1"
                    >
                      <Check size={14} /> Setujui & Lanjutkan ke Disposisi
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  )
}
