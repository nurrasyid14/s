import { useState, useEffect } from 'react'
import AdminLayout from '../../components/layout/AdminLayout.jsx'
import { StatusBadge } from '../../components/ui/StatusBadge.jsx'
import { getComplaints, verifyComplaint } from '../../services/complaintApi.js'
import { formatDateTime, formatUrgencyScore } from '../../utils/formatter.js'
import useBilingual from '../../hooks/useBilingual.js'
import { CheckSquare, XCircle, Check, Search, ShieldCheck } from 'lucide-react'

export default function AdminVerification() {
  const { tx } = useBilingual()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [verifyingId, setVerifyingId] = useState(null)
  const [note, setNote] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

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
      setErrorMsg('')
      await verifyComplaint(id, {
        verified: isApproved,
        note: note.trim() || tx('Data dan keluhan valid untuk ditindaklanjuti.', 'The data and complaint are valid and ready for follow-up.'),
      })
      setSuccessMsg(isApproved ? tx('Tiket berhasil diverifikasi.', 'Ticket verified successfully.') : tx('Tiket berhasil ditolak.', 'Ticket rejected successfully.'))
      setTimeout(() => setSuccessMsg(''), 3000)
      setVerifyingId(null)
      loadData()
    } catch {
      setErrorMsg(tx('Gagal memproses aksi verifikasi. Silakan coba lagi.', 'Failed to process the verification. Please try again.'))
      setTimeout(() => setErrorMsg(''), 4000)
    }
  }

  const filtered = items.filter(c =>
    c.ticket_id.toLowerCase().includes(search.toLowerCase()) ||
    c.description.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <AdminLayout title={tx('Verifikasi Masukan Masuk', 'Incoming Report Verification')}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-[var(--color-border)]">
        <div>
          <h2 className="text-xl font-bold font-mono tracking-tight text-[var(--color-text)]">
            {tx('Antrean Verifikasi Validitas Aduan', 'Complaint Validity Verification Queue')}
          </h2>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            {tx('Periksa kelayakan dan keabsahan aduan yang baru masuk (Status: Diterima) sebelum didisposisikan ke unit kerja.', 'Review the eligibility and validity of newly received reports (Status: Received) before dispatching them to a work unit.')}
          </p>
        </div>
        <div className="w-full sm:w-64">
          <input
            type="text"
            placeholder={tx('Cari ID tiket / deskripsi...', 'Search ticket ID / description...')}
            aria-label={tx('Cari ID tiket atau deskripsi aduan', 'Search ticket ID or complaint description')}
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
          <XCircle size={15} /> {errorMsg}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-24 border border-[var(--color-border)] rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center border border-[var(--color-border)] bg-[var(--color-surface)] rounded-2xl shadow-sm">
          <CheckSquare size={32} className="mx-auto mb-2 text-[var(--color-status-success)] opacity-70" />
          <h3 className="font-bold text-sm text-[var(--color-text)]">{tx('Tidak Ada Tiket yang Perlu Diverifikasi', 'No Tickets Need Verification')}</h3>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">{tx('Semua aduan masuk telah diverifikasi dan siap didisposisikan.', 'All incoming reports have been verified and are ready to be dispatched.')}</p>
        </div>
      ) : (
        <div className="border border-[var(--color-border)] divide-y divide-[var(--color-border)] bg-[var(--color-surface)] rounded-2xl shadow-sm overflow-hidden">
          {filtered.map(c => (
            <div key={c.id} className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-[var(--color-primary)]">{c.ticket_id}</span>
                  <StatusBadge status={c.status} />
                  <span className="text-xs font-mono px-2.5 py-0.5 border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] rounded-lg">
                    {tx('Kategori', 'Category')}: {c.category}
                  </span>
                </div>
                <div className="text-xs font-mono text-[var(--color-text-muted)]">
                  {tx('Masuk', 'Received')}: {formatDateTime(c.created_at)}
                </div>
              </div>

              <p className="text-xs text-[var(--color-text)] leading-relaxed mb-3 font-medium">
                {c.description}
              </p>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[var(--color-border)] text-xs">
                <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
                  <span>{tx('Saran Unit AI', 'AI Suggested Unit')}: <strong className="text-[var(--color-text)]">{c.target_unit || c.unit}</strong></span>
                  <span>·</span>
                  <span>{tx('Skor Urgensi', 'Urgency Score')}: <strong className="text-[var(--color-status-danger)] font-mono">{formatUrgencyScore(c.urgency_score)}/10</strong></span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setVerifyingId(verifyingId === c.id ? null : c.id)}
                    className="btn-outline !py-1.5 !px-3 text-xs rounded-xl"
                  >
                    {verifyingId === c.id ? tx('Tutup Form', 'Close Form') : tx('Verifikasi Tiket', 'Verify Ticket')}
                  </button>
                  <button
                    onClick={() => handleAction(c.id, true)}
                    className="btn-solid !py-1.5 !px-3 text-xs flex items-center gap-1.5 rounded-xl"
                  >
                    <Check size={13} /> {tx('Setujui Langsung', 'Approve Directly')}
                  </button>
                </div>
              </div>

              {/* Form Catatan Verifikasi Jika Dibuka */}
              {verifyingId === c.id && (
                <div className="mt-4 p-4 border border-[var(--color-border)] bg-[var(--color-bg-secondary)] space-y-3 rounded-xl">
                  <label htmlFor={`verify-note-${c.id}`} className="block text-xs font-bold text-[var(--color-text)]">
                    {tx('Catatan Hasil Verifikasi Administrator:', 'Administrator Verification Notes:')}
                  </label>
                  <textarea
                    id={`verify-note-${c.id}`}
                    rows={2}
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    className="input-field text-xs resize-none rounded-lg"
                    placeholder={tx('Tuliskan catatan verifikasi...', 'Write verification notes...')}
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => handleAction(c.id, false)}
                      className="p-2 border border-[var(--color-status-danger)] text-[var(--color-status-danger)] hover:bg-[var(--color-status-danger)]/10 text-xs font-bold flex items-center gap-1 rounded-xl transition-colors"
                    >
                      <XCircle size={14} /> {tx('Tolak Aduan (Spam/Tidak Valid)', 'Reject Complaint (Spam/Invalid)')}
                    </button>
                    <button
                      onClick={() => handleAction(c.id, true)}
                      className="btn-solid text-xs !py-1.5 !px-4 font-bold flex items-center gap-1 rounded-xl"
                    >
                      <Check size={14} /> {tx('Setujui & Lanjutkan ke Disposisi', 'Approve & Continue to Dispatch')}
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
