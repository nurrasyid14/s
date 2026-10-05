import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import StakeholderLayout from '../../components/layout/StakeholderLayout.jsx'
import { StatusBadge, UrgencyBadge } from '../../components/ui/StatusBadge.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import ErrorState from '../../components/ui/ErrorState.jsx'
import DispositionSheetModal from '../../components/pdf/DispositionSheetModal.jsx'
import {
  getComplaint, acceptComplaintByUnit, addUnitFollowUp,
  submitUnitOfficialAnswer, updateComplaintStatus
} from '../../services/complaintApi.js'
import { formatDateTime, formatDate, getUrgencyLevel, WORKFLOW_STEPS } from '../../utils/formatter.js'
import { useComplaintLabels } from '../../utils/complaintLabels.js'
import {
  ArrowLeft, Send, AlertTriangle, Inbox, Check, Printer,
  ShieldCheck, FileText, CheckCircle2, Wrench, MessageSquare, Star
} from 'lucide-react'

const focusRing =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]'
const fieldCls = `w-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)]`

export default function ComplaintDetail() {
  const { id } = useParams()
  const { t } = useTranslation()
  const { typeLabel, categoryLabel, sentimentLabel } = useComplaintLabels()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  // Modals & Action States
  const [showSheetPdf, setShowSheetPdf] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionSuccess, setActionSuccess] = useState('')

  // Form states for Unit actions
  const [followUpNote, setFollowUpNote] = useState('')
  const [followUpPic, setFollowUpPic] = useState('')
  const [followUpType, setFollowUpType] = useState('maintenance')

  const [unitAnswerText, setUnitAnswerText] = useState('')
  const [unitAnswerPic, setUnitAnswerPic] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(false)
    getComplaint(id)
      .then(d => {
        if (!active) return
        setData(d)
      })
      .catch(() => { if (active) setError(true) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id, reloadKey])

  // Aksi 1: Terima Disposisi (dispatched -> in_progress)
  async function handleAcceptDisposition() {
    setActionLoading(true)
    try {
      await acceptComplaintByUnit(id, {
        pic_name: `Koordinator ${data.target_unit || data.unit}`,
        note: 'Disposisi diterima oleh unit. Penanganan dan pengecekan lapangan segera dilaksanakan.',
      })
      setActionSuccess('Disposisi berhasil diterima. Status berubah ke: Diproses.')
      setTimeout(() => setActionSuccess(''), 3000)
      setReloadKey(k => k + 1)
    } catch {
      alert('Gagal menerima disposisi.')
    } finally {
      setActionLoading(false)
    }
  }

  // Aksi 2: Catat Tindak Lanjut Teknis (in_progress -> action_taken)
  async function handleAddFollowUp(e) {
    e.preventDefault()
    if (!followUpNote.trim()) return
    setActionLoading(true)
    try {
      await addUnitFollowUp(id, {
        action_type: followUpType,
        note: followUpNote,
        performed_by: followUpPic || `Teknisi ${data.target_unit || data.unit}`,
      })
      setFollowUpNote('')
      setActionSuccess('Progres tindak lanjut berhasil dicatat. Status: Ditindaklanjuti.')
      setTimeout(() => setActionSuccess(''), 3000)
      setReloadKey(k => k + 1)
    } catch {
      alert('Gagal mencatat tindak lanjut.')
    } finally {
      setActionLoading(false)
    }
  }

  // Aksi 3: Terbitkan Jawaban Resmi Solusi (action_taken -> answered)
  async function handlePublishAnswer(e) {
    e.preventDefault()
    if (!unitAnswerText.trim()) return
    setActionLoading(true)
    try {
      await submitUnitOfficialAnswer(id, {
        answer: unitAnswerText,
        answered_by: unitAnswerPic || `Kepala / PIC ${data.target_unit || data.unit}`,
      })
      setUnitAnswerText('')
      setActionSuccess('Jawaban resmi unit berhasil diterbitkan ke pelapor! Status: Dijawab.')
      setTimeout(() => setActionSuccess(''), 4000)
      setReloadKey(k => k + 1)
    } catch {
      alert('Gagal menerbitkan jawaban resmi.')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <StakeholderLayout title="Memuat Detail Aduan...">
        <div className="space-y-4">
          <div className="skeleton h-12 border border-[var(--color-border)]" />
          <div className="skeleton h-64 border border-[var(--color-border)]" />
        </div>
      </StakeholderLayout>
    )
  }

  if (error || !data) {
    return (
      <StakeholderLayout title="Aduan Tidak Ditemukan">
        <EmptyState
          icon={Inbox}
          title="Aduan tidak ditemukan"
          action={
            <Link to="/stakeholder/complaints" className="btn-outline inline-flex items-center gap-2">
              <ArrowLeft size={14} /> Kembali ke daftar aduan
            </Link>
          }
        />
      </StakeholderLayout>
    )
  }

  const urgency = getUrgencyLevel(data.urgency_score)
  const followups = data.followups ?? []
  const currentStep = WORKFLOW_STEPS.find(s => s.key === data.status)

  return (
    <StakeholderLayout title={`Detail Aduan: ${data.ticket_id}`}>
      {/* Header Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[var(--color-border)] mb-4">
        <div className="flex items-center gap-3">
          <Link
            to="/stakeholder/complaints"
            className={`border border-[var(--color-border)] p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text)] transition-colors ${focusRing}`}
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="text-[10px] font-mono uppercase text-[var(--color-primary)] font-bold">
              PENANGANAN ADUAN UNIT · 7 STATUS
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <h2 className="text-xl font-bold font-mono tracking-tight text-[var(--color-text)]">
                {data.ticket_id}
              </h2>
              <StatusBadge status={data.status} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSheetPdf(true)}
            className="btn-outline inline-flex items-center gap-1.5 text-xs py-2 px-3 font-semibold"
          >
            <Printer size={14} /> Cetak Lembar Disposisi (PDF)
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3 mb-4 border border-[var(--color-status-success)] bg-[var(--color-status-success)]/10 text-[var(--color-status-success)] text-xs font-semibold flex items-center gap-2">
          <Check size={16} /> {actionSuccess}
        </div>
      )}

      {/* Visual Workflow Mini-Stepper */}
      <div className="mb-6 p-4 border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="text-[10px] font-mono uppercase text-[var(--color-text-muted)] mb-2 font-bold">
          Posisi Alur Saat Ini: <span className="text-[var(--color-primary)] font-bold">{currentStep?.label || data.status}</span>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-mono">
          {WORKFLOW_STEPS.map((s, idx) => {
            const isMatch = s.key === data.status
            return (
              <div
                key={s.key}
                className={`p-1.5 border truncate ${
                  isMatch
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)] font-bold'
                    : 'border-[var(--color-border)] opacity-60 text-[var(--color-text-muted)]'
                }`}
              >
                {idx + 1}. {s.label}
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Kolom Kiri: Info Aduan, NLP, Bukti, dan Jawaban */}
        <div className="min-w-0 space-y-5 lg:col-span-2">
          {/* Detail Aduan */}
          <section className="border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <h3 className="mb-4 text-xs font-bold uppercase tracking-wider font-mono text-[var(--color-text)]">
              Substansi Masukan & Informasi Pelapor
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs mb-4">
              <div className="p-2.5 border border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                <span className="text-[var(--color-text-muted)] block text-[10px] uppercase font-mono">Pelapor</span>
                <span className="font-semibold text-[var(--color-text)] flex items-center gap-1 mt-0.5">
                  <ShieldCheck size={14} className="text-[var(--color-primary)]" />
                  Sivitas PENS (Anonim)
                </span>
              </div>
              <div className="p-2.5 border border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                <span className="text-[var(--color-text-muted)] block text-[10px] uppercase font-mono">Peran Pelapor</span>
                <span className="font-semibold text-[var(--color-text)] mt-0.5 block">{data.sender_role || 'Mahasiswa'}</span>
              </div>
              <div className="p-2.5 border border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                <span className="text-[var(--color-text-muted)] block text-[10px] uppercase font-mono">Unit Tujuan</span>
                <span className="font-semibold text-[var(--color-primary)] mt-0.5 block">{data.target_unit || data.unit}</span>
              </div>
              <div className="p-2.5 border border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                <span className="text-[var(--color-text-muted)] block text-[10px] uppercase font-mono">Kategori Masukan</span>
                <span className="font-semibold text-[var(--color-text)] capitalize mt-0.5 block">{categoryLabel(data.category)}</span>
              </div>
              <div className="p-2.5 border border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                <span className="text-[var(--color-text-muted)] block text-[10px] uppercase font-mono">Jenis Aduan</span>
                <span className="font-semibold text-[var(--color-text)] capitalize mt-0.5 block">{typeLabel(data.type)}</span>
              </div>
              <div className="p-2.5 border border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                <span className="text-[var(--color-text-muted)] block text-[10px] uppercase font-mono">Tanggal Diajukan</span>
                <span className="font-mono text-[var(--color-text)] mt-0.5 block">{formatDate(data.created_at)}</span>
              </div>
            </div>

            <div className="border-t border-[var(--color-border)] pt-4">
              <div className="text-[11px] font-mono uppercase text-[var(--color-text-muted)] mb-1">Isi Keluhan Pelapor:</div>
              <p className="text-sm leading-relaxed text-[var(--color-text)] whitespace-pre-line font-medium">
                {data.description}
              </p>
            </div>
          </section>

          {/* Catatan Verifikasi & Disposisi Admin */}
          {(data.verification || data.disposition) && (
            <section className="border border-purple-500/40 bg-[var(--color-surface)] p-5 border-l-4 border-l-purple-500">
              <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-purple-600 mb-3">
                Instruksi Disposisi dari Administrator Sentral
              </h3>
              <div className="space-y-2 text-xs">
                {data.verification && (
                  <div>
                    <span className="text-[var(--color-text-muted)] block text-[10px] font-mono">Verifikasi Admin:</span>
                    <span className="text-[var(--color-text)]">{data.verification.note} ({formatDateTime(data.verification.verified_at)})</span>
                  </div>
                )}
                {data.disposition && (
                  <div className="border-t border-[var(--color-border)] pt-2 mt-2">
                    <span className="text-[var(--color-text-muted)] block text-[10px] font-mono">Instruksi Tugas Disposisi:</span>
                    <p className="text-[var(--color-text)] font-semibold mt-0.5 leading-relaxed">
                      "{data.disposition.disposition_note}"
                    </p>
                    <div className="text-[11px] font-mono text-[var(--color-text-muted)] mt-1">
                      PIC Ditunjuk: {data.disposition.assigned_pic} · Waktu: {formatDateTime(data.disposition.disposition_at)}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Hasil Analisis AI / NLP */}
          <section className="border border-[var(--color-border)] bg-[var(--color-surface)] p-5 border-l-4 border-l-[var(--color-primary)]">
            <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-[var(--color-text)] mb-3">
              Hasil Analisis Kecerdasan Buatan (NLP SuaraLens)
            </h3>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="p-3 border border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                <span className="text-[var(--color-text-muted)] block text-[10px] font-mono uppercase">Skor Urgensi</span>
                <span className="text-xl font-bold font-mono text-[var(--color-status-danger)] block mt-0.5">
                  {data.urgency_score}/10
                </span>
                <span className="text-[10px] font-mono text-[var(--color-text-muted)]">{urgency.level} Priority</span>
              </div>
              <div className="p-3 border border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                <span className="text-[var(--color-text-muted)] block text-[10px] font-mono uppercase">Sentimen Analisis</span>
                <span className="text-sm font-bold text-[var(--color-text)] block mt-1 capitalize">
                  {sentimentLabel(data.sentiment)}
                </span>
              </div>
              <div className="p-3 border border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                <span className="text-[var(--color-text-muted)] block text-[10px] font-mono uppercase">AI Category Match</span>
                <span className="text-sm font-bold text-[var(--color-text)] block mt-1 capitalize">
                  {categoryLabel(data.nlp_category)}
                </span>
                <span className="text-[10px] font-mono text-[var(--color-primary)]">
                  {Math.round((data.nlp_confidence || 0.85) * 100)}% Confidence
                </span>
              </div>
            </div>
          </section>

          {/* Jawaban Resmi Unit (Jika Sudah Terbit) */}
          {data.unit_answer && (
            <section className="border-2 border-indigo-500 bg-[var(--color-surface)] p-5">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 size={18} className="text-indigo-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-indigo-700">
                  Jawaban & Solusi Resmi Unit (Telah Dikirimkan)
                </h3>
              </div>
              <p className="text-xs leading-relaxed text-[var(--color-text)] bg-indigo-50/20 p-3 border border-indigo-200 font-medium whitespace-pre-line">
                {data.unit_answer.answer}
              </p>
              <div className="text-[11px] font-mono text-[var(--color-text-muted)] mt-2 flex justify-between">
                <span>Diterbitkan oleh: {data.unit_answer.answered_by}</span>
                <span>Waktu: {formatDateTime(data.unit_answer.answered_at)}</span>
              </div>
            </section>
          )}

          {/* Umpan Balik Stakeholder (Jika Sudah Selesai) */}
          {data.feedback && (
            <section className="border border-[var(--color-status-success)] bg-[var(--color-surface)] p-5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-[var(--color-status-success)]">
                  Penilaian & Ulasan Kepuasan Pelapor (Status Selesai)
                </h3>
                <div className="flex items-center gap-1 text-amber-500 font-bold font-mono text-sm">
                  <Star size={16} className="fill-amber-400 text-amber-400" />
                  {data.feedback.rating}/5 Bintang
                </div>
              </div>
              <p className="text-xs text-[var(--color-text)] italic p-3 border border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                "{data.feedback.comment}"
              </p>
              <div className="text-[10px] font-mono text-[var(--color-text-muted)] mt-1.5 text-right">
                Diberikan pada: {formatDateTime(data.feedback.submitted_at)}
              </div>
            </section>
          )}
        </div>

        {/* Kolom Kanan: Aksi Penanganan Unit (Sesuai Tahap) */}
        <div className="min-w-0 space-y-5">
          {/* Panel Aksi Penanganan Unit */}
          <section className="border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-[var(--color-text)] mb-3 pb-2 border-b border-[var(--color-border)]">
              Aksi Penanganan Unit ({data.target_unit || data.unit})
            </h3>

            {/* Skenario A: Status Didisposisikan -> Terima Tugas */}
            {data.status === 'dispatched' && (
              <div className="space-y-3">
                <div className="p-3 border border-amber-300 bg-amber-50/30 text-amber-800 text-xs leading-relaxed">
                  Aduan ini telah didisposisikan oleh Admin Sentral ke unit Anda. Klik tombol di bawah untuk mengonfirmasi penerimaan tugas.
                </div>
                <button
                  onClick={handleAcceptDisposition}
                  disabled={actionLoading}
                  className="btn-solid w-full text-xs !py-2.5 font-bold flex items-center justify-center gap-2"
                >
                  <Check size={14} /> Terima Disposisi & Mulai Proses
                </button>
              </div>
            )}

            {/* Skenario B: Status Diproses atau Ditindaklanjuti -> Form Tindak Lanjut & Jawaban */}
            {['in_progress', 'action_taken'].includes(data.status) && (
              <div className="space-y-5">
                {/* 1. Form Catat Progres Teknis */}
                <form onSubmit={handleAddFollowUp} className="space-y-3 p-3 border border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                  <div className="text-xs font-bold text-[var(--color-text)] flex items-center gap-1.5">
                    <Wrench size={14} /> Catat Progres Tindak Lanjut Teknis
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-[var(--color-text-muted)] mb-1">
                      Jenis Tindakan
                    </label>
                    <select
                      value={followUpType}
                      onChange={e => setFollowUpType(e.target.value)}
                      className="input-field text-xs !py-1.5"
                    >
                      <option value="investigation">Investigasi / Pengecekan Lapangan</option>
                      <option value="maintenance">Perbaikan / Penggantian Fisik</option>
                      <option value="coordination">Koordinasi Lintas Bagian</option>
                      <option value="note">Catatan Progres Tambahan</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-[var(--color-text-muted)] mb-1">
                      Catatan Aksi
                    </label>
                    <textarea
                      rows={2}
                      required
                      placeholder="Uraikan aksi nyata yang telah dilakukan oleh teknisi/staf..."
                      value={followUpNote}
                      onChange={e => setFollowUpNote(e.target.value)}
                      className="input-field text-xs resize-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="btn-outline w-full text-xs !py-2 font-bold"
                  >
                    Simpan Progres Tindak Lanjut
                  </button>
                </form>

                {/* 2. Form Penerbitan Jawaban Resmi Unit */}
                <form onSubmit={handlePublishAnswer} className="space-y-3 p-3 border-2 border-indigo-500/50 bg-[var(--color-surface)]">
                  <div className="text-xs font-bold text-indigo-700 flex items-center gap-1.5">
                    <MessageSquare size={14} /> Terbitkan Jawaban Resmi Solusi Unit
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-[var(--color-text-muted)] mb-1">
                      Nama PIC / Pejabat Penjawab
                    </label>
                    <input
                      type="text"
                      placeholder={`Contoh: Kepala Bagian ${data.target_unit || data.unit}`}
                      value={unitAnswerPic}
                      onChange={e => setUnitAnswerPic(e.target.value)}
                      className="input-field text-xs !py-1.5"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-[var(--color-text-muted)] mb-1">
                      Pernyataan Jawaban & Solusi Resmi (Dilihat Pelapor) *
                    </label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Jelaskan solusi tuntas, tindak lanjut, atau klarifikasi resmi..."
                      value={unitAnswerText}
                      onChange={e => setUnitAnswerText(e.target.value)}
                      className="input-field text-xs resize-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="btn-solid w-full text-xs !py-2.5 font-bold flex items-center justify-center gap-1.5"
                  >
                    <Send size={13} /> Terbitkan Jawaban ke Pelapor
                  </button>
                </form>
              </div>
            )}

            {/* Skenario C: Status Dijawab -> Menunggu Feedback Pelapor */}
            {data.status === 'answered' && (
              <div className="p-4 border border-indigo-300 bg-indigo-50/20 text-xs leading-relaxed space-y-2">
                <div className="font-bold text-indigo-800 flex items-center gap-1.5">
                  <Clock size={15} /> Menunggu Feedback Wajib Pelapor
                </div>
                <p className="text-[var(--color-text-muted)]">
                  Unit Anda telah menerbitkan jawaban resmi. Tiket saat ini berada pada tahap verifikasi kepuasan dan akan otomatis berstatus <strong>Selesai</strong> setelah pelapor mengisi form umpan balik.
                </p>
              </div>
            )}

            {/* Skenario D: Status Selesai */}
            {data.status === 'resolved' && (
              <div className="p-4 border border-emerald-300 bg-emerald-50/20 text-xs leading-relaxed space-y-2">
                <div className="font-bold text-emerald-800 flex items-center gap-1.5">
                  <CheckCircle2 size={15} /> Tiket Selesai Secara Paripurna
                </div>
                <p className="text-[var(--color-text-muted)]">
                  Pelapor telah mengonfirmasi penyelesaian aduan dengan memberikan umpan balik kepuasan.
                </p>
              </div>
            )}
          </section>

          {/* Riwayat Catatan Tindak Lanjut */}
          <section className="border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider font-mono text-[var(--color-text)]">
              Riwayat Tindak Lanjut ({followups.length})
            </h3>
            {followups.length === 0 ? (
              <p className="text-center py-4 text-xs font-mono text-[var(--color-text-muted)]">
                Belum ada catatan tindak lanjut dari unit.
              </p>
            ) : (
              <ol className="space-y-3 relative border-l border-[var(--color-border)] ml-2">
                {followups.map(f => (
                  <li key={f.id} className="ml-3 text-xs">
                    <div className="font-semibold text-[var(--color-text)]">{f.by}</div>
                    <div className="text-[10px] font-mono text-[var(--color-text-muted)]">{formatDateTime(f.created_at)}</div>
                    <p className="text-[var(--color-text)] mt-1 leading-snug">{f.note}</p>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>

      {/* Modal Cetak Lembar Disposisi */}
      {showSheetPdf && (
        <DispositionSheetModal
          complaint={data}
          onClose={() => setShowSheetPdf(false)}
        />
      )}
    </StakeholderLayout>
  )
}