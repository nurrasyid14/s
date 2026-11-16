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
import { formatDateTime, formatDate, getUrgencyLevel, formatUrgencyScore, WORKFLOW_STEPS } from '../../utils/formatter.js'
import useBilingual from '../../hooks/useBilingual.js'
import { useComplaintLabels } from '../../utils/ComplaintLabels.js'
import {
  ArrowLeft, Send, AlertTriangle, Inbox, Check, Printer,
  ShieldCheck, FileText, CheckCircle2, Wrench, MessageSquare, Star, Clock
} from 'lucide-react'

const focusRing =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]'
const fieldCls = `w-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)]`

export default function ComplaintDetail() {
  const { id } = useParams()
  const { t } = useTranslation()
  const { tx, isId } = useBilingual()
  const { typeLabel, categoryLabel, sentimentLabel } = useComplaintLabels()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  // Modals & Action States
  const [showSheetPdf, setShowSheetPdf] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionSuccess, setActionSuccess] = useState('')
  const [actionError, setActionError] = useState('')

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
    setActionError('')
    try {
      await acceptComplaintByUnit(id, {
        pic_name: `${tx('Koordinator', 'Coordinator')} ${data.target_unit || data.unit}`,
        note: tx('Disposisi diterima oleh unit. Penanganan dan pengecekan lapangan segera dilaksanakan.', 'Dispatch accepted by the unit. Handling and field checks will begin immediately.'),
      })
      setActionSuccess(tx('Disposisi berhasil diterima. Status berubah ke: Diproses.', 'Dispatch accepted. Status changed to: In Progress.'))
      setTimeout(() => setActionSuccess(''), 3000)
      setReloadKey(k => k + 1)
    } catch {
      setActionError(tx('Gagal menerima disposisi. Silakan coba lagi.', 'Failed to accept the dispatch. Please try again.'))
      setTimeout(() => setActionError(''), 4000)
    } finally {
      setActionLoading(false)
    }
  }

  // Aksi 2: Catat Tindak Lanjut Teknis (in_progress -> action_taken)
  async function handleAddFollowUp(e) {
    e.preventDefault()
    if (!followUpNote.trim()) return
    setActionLoading(true)
    setActionError('')
    try {
      await addUnitFollowUp(id, {
        action_type: followUpType,
        note: followUpNote,
        performed_by: followUpPic || `${tx('Teknisi', 'Technician')} ${data.target_unit || data.unit}`,
      })
      setFollowUpNote('')
      setActionSuccess(tx('Progres tindak lanjut berhasil dicatat. Status: Ditindaklanjuti.', 'Follow-up progress recorded. Status: Action Taken.'))
      setTimeout(() => setActionSuccess(''), 3000)
      setReloadKey(k => k + 1)
    } catch {
      setActionError(tx('Gagal mencatat tindak lanjut. Silakan periksa koneksi.', 'Failed to record the follow-up. Please check your connection.'))
      setTimeout(() => setActionError(''), 4000)
    } finally {
      setActionLoading(false)
    }
  }

  // Aksi 3: Terbitkan Jawaban Resmi Solusi (action_taken -> answered)
  async function handlePublishAnswer(e) {
    e.preventDefault()
    if (!unitAnswerText.trim()) return
    setActionLoading(true)
    setActionError('')
    try {
      await submitUnitOfficialAnswer(id, {
        answer: unitAnswerText,
        answered_by: unitAnswerPic || `${tx('Kepala / PIC', 'Head / PIC')} ${data.target_unit || data.unit}`,
      })
      setUnitAnswerText('')
      setActionSuccess(tx('Jawaban resmi unit berhasil diterbitkan ke pelapor! Status: Dijawab.', 'The unit official answer was sent to the reporter! Status: Answered.'))
      setTimeout(() => setActionSuccess(''), 4000)
      setReloadKey(k => k + 1)
    } catch {
      setActionError(tx('Gagal menerbitkan jawaban resmi. Silakan coba lagi.', 'Failed to publish the official answer. Please try again.'))
      setTimeout(() => setActionError(''), 4000)
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <StakeholderLayout title={tx('Memuat Detail Aduan...', 'Loading Complaint Details...')}>
        <div className="space-y-4">
          <div className="skeleton h-12 border border-[var(--color-border)]" />
          <div className="skeleton h-64 border border-[var(--color-border)]" />
        </div>
      </StakeholderLayout>
    )
  }

  if (error || !data) {
    return (
      <StakeholderLayout title={tx('Aduan Tidak Ditemukan', 'Complaint Not Found')}>
        <EmptyState
          icon={Inbox}
          title={tx('Aduan tidak ditemukan', 'Complaint not found')}
          action={
            <Link to="/stakeholder/complaints" className="btn-outline inline-flex items-center gap-2">
              <ArrowLeft size={14} /> {tx('Kembali ke daftar aduan', 'Back to complaint list')}
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
    <StakeholderLayout title={`${tx('Detail Aduan', 'Complaint Details')}: ${data.ticket_id}`}>
      {/* Header Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[var(--color-border)] mb-4">
        <div className="flex items-center gap-3">
          <Link
            to="/stakeholder/complaints"
            aria-label={tx('Kembali ke daftar aduan', 'Back to complaint list')}
            className={`border border-[var(--color-border)] p-2.5 min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl text-[var(--color-text-muted)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text)] transition-colors shadow-xs ${focusRing}`}
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="text-[10px] font-mono uppercase text-[var(--color-primary)] font-bold">
              {tx('PENANGANAN ADUAN UNIT · 7 STATUS', 'UNIT COMPLAINT HANDLING · 7 STATUSES')}
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
            className="btn-outline inline-flex items-center gap-1.5 text-xs py-2 px-3.5 font-semibold rounded-xl min-h-[40px]"
          >
            <Printer size={14} /> {tx('Cetak Lembar Disposisi (PDF)', 'Print Dispatch Sheet (PDF)')}
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div role="status" aria-live="polite" className="p-3 mb-4 border border-[var(--color-status-success)] bg-[var(--color-status-success)]/10 text-[var(--color-status-success)] text-xs font-semibold flex items-center gap-2 rounded-xl">
          <Check size={16} /> {actionSuccess}
        </div>
      )}

      {actionError && (
        <div role="alert" aria-live="assertive" className="p-3 mb-4 border border-[var(--color-status-danger)] bg-[var(--color-status-danger)]/10 text-[var(--color-status-danger)] text-xs font-semibold flex items-center gap-2 rounded-xl">
          <AlertTriangle size={16} /> {actionError}
        </div>
      )}

      {/* Visual Workflow Mini-Stepper */}
      <div className="mb-6 p-4 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-2xl shadow-sm">
        <div className="text-[10px] font-mono uppercase text-[var(--color-text-muted)] mb-2 font-bold">
          {tx('Posisi Alur Saat Ini', 'Current Flow Position')}: <span className="text-[var(--color-primary)] font-bold">{(isId ? currentStep?.label : currentStep?.labelEn) || data.status}</span>
        </div>
        <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-mono">
          {WORKFLOW_STEPS.map((s, idx) => {
            const isMatch = s.key === data.status
            return (
              <div
                key={s.key}
                className={`p-2 border truncate rounded-lg transition ${
                  isMatch
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)] font-bold shadow-xs'
                    : 'border-[var(--color-border)] opacity-60 text-[var(--color-text-muted)]'
                }`}
              >
                {idx + 1}. {isId ? s.label : s.labelEn}
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Kolom Kiri: Info Aduan, NLP, Bukti, dan Jawaban */}
        <div className="min-w-0 space-y-5 lg:col-span-2">
          {/* Detail Aduan */}
          <section className="border border-[var(--color-border)] bg-[var(--color-surface)] p-5 md:p-6 rounded-2xl shadow-sm">
            <h3 className="mb-4 text-xs font-bold uppercase tracking-wider font-mono text-[var(--color-text)]">
              {tx('Substansi Masukan & Informasi Pelapor', 'Report Details & Reporter Information')}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs mb-4">
              <div className="p-3 border border-[var(--color-border)] bg-[var(--color-bg-secondary)] rounded-xl">
                <span className="text-[var(--color-text-muted)] block text-[10px] uppercase font-mono">{tx('Pelapor', 'Reporter')}</span>
                <span className="font-semibold text-[var(--color-text)] flex items-center gap-1 mt-0.5">
                  <ShieldCheck size={14} className="text-[var(--color-primary)]" />
                  {tx('Sivitas PENS (Anonim)', 'PENS Community (Anonymous)')}
                </span>
              </div>
              <div className="p-3 border border-[var(--color-border)] bg-[var(--color-bg-secondary)] rounded-xl">
                <span className="text-[var(--color-text-muted)] block text-[10px] uppercase font-mono">{tx('Peran Pelapor', 'Reporter Role')}</span>
                <span className="font-semibold text-[var(--color-text)] mt-0.5 block">{data.sender_role || tx('Mahasiswa', 'Student')}</span>
              </div>
              <div className="p-3 border border-[var(--color-border)] bg-[var(--color-bg-secondary)] rounded-xl">
                <span className="text-[var(--color-text-muted)] block text-[10px] uppercase font-mono">{tx('Unit Tujuan', 'Target Unit')}</span>
                <span className="font-semibold text-[var(--color-primary)] mt-0.5 block">{data.target_unit || data.unit}</span>
              </div>
              <div className="p-3 border border-[var(--color-border)] bg-[var(--color-bg-secondary)] rounded-xl">
                <span className="text-[var(--color-text-muted)] block text-[10px] uppercase font-mono">{tx('Kategori Masukan', 'Report Category')}</span>
                <span className="font-semibold text-[var(--color-text)] capitalize mt-0.5 block">{categoryLabel(data.category)}</span>
              </div>
              <div className="p-3 border border-[var(--color-border)] bg-[var(--color-bg-secondary)] rounded-xl">
                <span className="text-[var(--color-text-muted)] block text-[10px] uppercase font-mono">{tx('Jenis Aduan', 'Report Type')}</span>
                <span className="font-semibold text-[var(--color-text)] capitalize mt-0.5 block">{typeLabel(data.type)}</span>
              </div>
              <div className="p-3 border border-[var(--color-border)] bg-[var(--color-bg-secondary)] rounded-xl">
                <span className="text-[var(--color-text-muted)] block text-[10px] uppercase font-mono">{tx('Tanggal Diajukan', 'Date Submitted')}</span>
                <span className="font-mono text-[var(--color-text)] mt-0.5 block">{formatDate(data.created_at)}</span>
              </div>
            </div>

            <div className="border-t border-[var(--color-border)] pt-4">
              <div className="text-[11px] font-mono uppercase text-[var(--color-text-muted)] mb-1">{tx('Isi Keluhan Pelapor:', 'Reporter Complaint:')}</div>
              <p className="text-sm leading-relaxed text-[var(--color-text)] whitespace-pre-line font-medium">
                {data.description}
              </p>
            </div>
          </section>

          {/* Catatan Verifikasi & Disposisi Admin */}
          {(data.verification || data.disposition) && (
            <section className="border border-purple-500/40 bg-[var(--color-surface)] p-5 md:p-6 border-l-4 border-l-purple-500 rounded-2xl shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-purple-600 mb-3">
                {tx('Instruksi Disposisi dari Administrator Sentral', 'Dispatch Instructions from the Central Administrator')}
              </h3>
              <div className="space-y-2 text-xs">
                {data.verification && (
                  <div>
                    <span className="text-[var(--color-text-muted)] block text-[10px] font-mono">{tx('Verifikasi Admin:', 'Admin Verification:')}</span>
                    <span className="text-[var(--color-text)]">{data.verification.note} ({formatDateTime(data.verification.verified_at)})</span>
                  </div>
                )}
                {data.disposition && (
                  <div className="border-t border-[var(--color-border)] pt-2 mt-2">
                    <span className="text-[var(--color-text-muted)] block text-[10px] font-mono">{tx('Instruksi Tugas Disposisi:', 'Dispatch Task Instructions:')}</span>
                    <p className="text-[var(--color-text)] font-semibold mt-0.5 leading-relaxed">
                      "{data.disposition.disposition_note}"
                    </p>
                    <div className="text-[11px] font-mono text-[var(--color-text-muted)] mt-1">
                      {tx('PIC Ditunjuk', 'Assigned PIC')}: {data.disposition.assigned_pic} · {tx('Waktu', 'Time')}: {formatDateTime(data.disposition.disposition_at)}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Hasil Analisis AI / NLP */}
          <section className="border border-[var(--color-border)] bg-[var(--color-surface)] p-5 md:p-6 border-l-4 border-l-[var(--color-primary)] rounded-2xl shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-[var(--color-text)] mb-3">
              {tx('Hasil Analisis Kecerdasan Buatan (NLP SuaraLens)', 'Artificial Intelligence Analysis Results (SuaraLens NLP)')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 border border-[var(--color-border)] bg-[var(--color-bg-secondary)] rounded-xl">
                <span className="text-[var(--color-text-muted)] block text-[10px] font-mono uppercase">{tx('Skor Urgensi', 'Urgency Score')}</span>
                <span className="text-xl font-bold font-mono text-[var(--color-status-danger)] block mt-0.5">
                  {formatUrgencyScore(data.urgency_score)}/10
                </span>
                <span className="text-[10px] font-mono text-[var(--color-text-muted)]">{isId ? urgency.level : (urgency.levelEn || urgency.level)} {tx('Prioritas', 'Priority')}</span>
              </div>
              <div className="p-3.5 border border-[var(--color-border)] bg-[var(--color-bg-secondary)] rounded-xl">
                <span className="text-[var(--color-text-muted)] block text-[10px] font-mono uppercase">{tx('Analisis Sentimen', 'Sentiment Analysis')}</span>
                <span className="text-sm font-bold text-[var(--color-text)] block mt-1 capitalize">
                  {sentimentLabel(data.sentiment)}
                </span>
                {data.sentiment_scores?.[data.sentiment] != null && (
                  <span className="text-[10px] font-mono text-[var(--color-primary)]">
                    {Math.round(data.sentiment_scores[data.sentiment] * 100)}% {tx('probabilitas', 'probability')}
                  </span>
                )}
              </div>
              <div className="p-3.5 border border-[var(--color-border)] bg-[var(--color-bg-secondary)] rounded-xl">
                <span className="text-[var(--color-text-muted)] block text-[10px] font-mono uppercase">{tx('Kecocokan Kategori AI', 'AI Category Match')}</span>
                <span className="text-sm font-bold text-[var(--color-text)] block mt-1 capitalize">
                  {categoryLabel(data.nlp_category)}
                </span>
                <span className="text-[10px] font-mono text-[var(--color-primary)]">
                  {Math.round((data.nlp_confidence || 0.85) * 100)}% {tx('Keyakinan', 'Confidence')}
                </span>
              </div>
            </div>
          </section>

          {/* Jawaban Resmi Unit (Jika Sudah Terbit) */}
          {data.unit_answer && (
            <section className="border-2 border-indigo-500 bg-[var(--color-surface)] p-5 md:p-6 rounded-2xl shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 size={18} className="text-indigo-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-indigo-700">
                  {tx('Jawaban & Solusi Resmi Unit (Telah Dikirimkan)', 'Official Unit Answer & Solution (Sent)')}
                </h3>
              </div>
              <p className="text-xs leading-relaxed text-[var(--color-text)] bg-indigo-50/20 p-3.5 border border-indigo-200 font-medium whitespace-pre-line rounded-xl">
                {data.unit_answer.answer}
              </p>
              <div className="text-[11px] font-mono text-[var(--color-text-muted)] mt-2 flex justify-between">
                <span>{tx('Diterbitkan oleh', 'Published by')}: {data.unit_answer.answered_by}</span>
                <span>{tx('Waktu', 'Time')}: {formatDateTime(data.unit_answer.answered_at)}</span>
              </div>
            </section>
          )}

          {/* Umpan Balik Stakeholder (Jika Sudah Selesai) */}
          {data.feedback && (
            <section className="border border-[var(--color-status-success)] bg-[var(--color-surface)] p-5 md:p-6 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-[var(--color-status-success)]">
                  {tx('Penilaian & Ulasan Kepuasan Pelapor (Status Selesai)', 'Reporter Satisfaction Rating & Review (Resolved)')}
                </h3>
                <div className="flex items-center gap-1 text-orange-500 font-bold font-mono text-sm">
                  <Star size={16} className="fill-orange-400 text-orange-400" />
                  {data.feedback.rating}/5 {tx('Bintang', 'Stars')}
                </div>
              </div>
              <p className="text-xs text-[var(--color-text)] italic p-3.5 border border-[var(--color-border)] bg-[var(--color-bg-secondary)] rounded-xl">
                "{data.feedback.comment}"
              </p>
              <div className="text-[10px] font-mono text-[var(--color-text-muted)] mt-1.5 text-right">
                {tx('Diberikan pada', 'Submitted on')}: {formatDateTime(data.feedback.submitted_at)}
              </div>
            </section>
          )}
        </div>

        {/* Kolom Kanan: Aksi Penanganan Unit (Sesuai Tahap) */}
        <div className="min-w-0 space-y-5">
          {/* Panel Aksi Penanganan Unit */}
          <section className="border border-[var(--color-border)] bg-[var(--color-surface)] p-5 md:p-6 rounded-2xl shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-[var(--color-text)] mb-3 pb-2 border-b border-[var(--color-border)]">
              {tx('Aksi Penanganan Unit', 'Unit Handling Actions')} ({data.target_unit || data.unit})
            </h3>

            {/* Skenario A: Status Didisposisikan -> Terima Tugas */}
            {data.status === 'dispatched' && (
              <div className="space-y-3">
                <div className="p-3.5 border border-orange-300 bg-orange-50/30 text-orange-800 text-xs leading-relaxed rounded-xl">
                  {tx('Aduan ini telah didisposisikan oleh Admin Sentral ke unit Anda. Klik tombol di bawah untuk mengonfirmasi penerimaan tugas.', 'This complaint has been dispatched by the Central Admin to your unit. Click the button below to confirm receipt of the task.')}
                </div>
                <button
                  onClick={handleAcceptDisposition}
                  disabled={actionLoading}
                  className="btn-solid w-full text-xs !py-2.5 font-bold flex items-center justify-center gap-2 rounded-xl min-h-[44px]"
                >
                  <Check size={14} /> {tx('Terima Disposisi & Mulai Proses', 'Accept Dispatch & Start Processing')}
                </button>
              </div>
            )}

            {/* Skenario B: Status Diproses atau Ditindaklanjuti -> Form Tindak Lanjut & Jawaban */}
            {['in_progress', 'action_taken'].includes(data.status) && (
              <div className="space-y-5">
                {/* 1. Form Catat Progres Teknis */}
                <form onSubmit={handleAddFollowUp} className="space-y-3 p-4 border border-[var(--color-border)] bg-[var(--color-bg-secondary)] rounded-xl">
                  <div className="text-xs font-bold text-[var(--color-text)] flex items-center gap-1.5">
                    <Wrench size={14} /> {tx('Catat Progres Tindak Lanjut Teknis', 'Record Technical Follow-up Progress')}
                  </div>
                  <div>
                    <label htmlFor="followup-type" className="block text-[10px] font-mono uppercase text-[var(--color-text-muted)] font-semibold mb-1">
                      {tx('Jenis Tindakan', 'Action Type')}
                    </label>
                    <select
                      id="followup-type"
                      value={followUpType}
                      onChange={e => setFollowUpType(e.target.value)}
                      className="input-field text-xs !py-1.5 rounded-xl"
                    >
                      <option value="investigation">{tx('Investigasi / Pengecekan Lapangan', 'Investigation / Field Check')}</option>
                      <option value="maintenance">{tx('Perbaikan / Penggantian Fisik', 'Repair / Physical Replacement')}</option>
                      <option value="coordination">{tx('Koordinasi Lintas Bagian', 'Cross-Department Coordination')}</option>
                      <option value="note">{tx('Catatan Progres Tambahan', 'Additional Progress Note')}</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="followup-note" className="block text-[10px] font-mono uppercase text-[var(--color-text-muted)] font-semibold mb-1">
                      {tx('Catatan Aksi', 'Action Notes')}
                    </label>
                    <textarea
                      id="followup-note"
                      rows={2}
                      required
                      placeholder={tx('Uraikan aksi nyata yang telah dilakukan oleh teknisi/staf...', 'Describe the actual actions taken by the technician/staff...')}
                      value={followUpNote}
                      onChange={e => setFollowUpNote(e.target.value)}
                      className="input-field text-xs resize-none rounded-xl"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="btn-outline w-full text-xs !py-2 font-bold rounded-xl min-h-[40px]"
                  >
                    {tx('Simpan Progres Tindak Lanjut', 'Save Follow-up Progress')}
                  </button>
                </form>

                {/* 2. Form Penerbitan Jawaban Resmi Unit */}
                <form onSubmit={handlePublishAnswer} className="space-y-3 p-4 border-2 border-indigo-500/50 bg-[var(--color-surface)] rounded-xl">
                  <div className="text-xs font-bold text-indigo-700 flex items-center gap-1.5">
                    <MessageSquare size={14} /> {tx('Terbitkan Jawaban Resmi Solusi Unit', 'Publish Official Unit Solution Answer')}
                  </div>
                  <div>
                    <label htmlFor="official-pic" className="block text-[10px] font-mono uppercase text-[var(--color-text-muted)] font-semibold mb-1">
                      {tx('Nama PIC / Pejabat Penjawab', 'PIC / Responding Official Name')}
                    </label>
                    <input
                      id="official-pic"
                      type="text"
                      placeholder={`${tx('Contoh: Kepala Bagian', 'Example: Head of')} ${data.target_unit || data.unit}`}
                      value={unitAnswerPic}
                      onChange={e => setUnitAnswerPic(e.target.value)}
                      className="input-field text-xs !py-1.5 rounded-xl"
                    />
                  </div>
                  <div>
                    <label htmlFor="official-answer" className="block text-[10px] font-mono uppercase text-[var(--color-text-muted)] font-semibold mb-1">
                      {tx('Pernyataan Jawaban & Solusi Resmi (Dilihat Pelapor)', 'Official Answer & Solution Statement (Visible to Reporter)')} *
                    </label>
                    <textarea
                      id="official-answer"
                      rows={3}
                      required
                      placeholder={tx('Jelaskan solusi tuntas, tindak lanjut, atau klarifikasi resmi...', 'Explain the complete solution, follow-up, or official clarification...')}
                      value={unitAnswerText}
                      onChange={e => setUnitAnswerText(e.target.value)}
                      className="input-field text-xs resize-none rounded-xl"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="btn-solid w-full text-xs !py-2.5 font-bold flex items-center justify-center gap-1.5 rounded-xl min-h-[44px]"
                  >
                    <Send size={13} /> {tx('Terbitkan Jawaban ke Pelapor', 'Send Answer to Reporter')}
                  </button>
                </form>
              </div>
            )}

            {/* Skenario C: Status Dijawab -> Menunggu Feedback Pelapor */}
            {data.status === 'answered' && (
              <div className="p-4 border border-indigo-300 bg-indigo-50/20 text-xs leading-relaxed space-y-2 rounded-xl">
                <div className="font-bold text-indigo-800 flex items-center gap-1.5">
                  <Clock size={15} /> {tx('Menunggu Feedback Wajib Pelapor', 'Awaiting Mandatory Reporter Feedback')}
                </div>
                <p className="text-[var(--color-text-muted)]">
                  {tx('Unit Anda telah menerbitkan jawaban resmi. Tiket saat ini berada pada tahap verifikasi kepuasan dan akan otomatis berstatus Selesai setelah pelapor mengisi form umpan balik.', 'Your unit has published an official answer. The ticket is now in the satisfaction verification stage and will automatically become Resolved once the reporter fills in the feedback form.')}
                </p>
              </div>
            )}

            {/* Skenario D: Status Selesai */}
            {data.status === 'resolved' && (
              <div className="p-4 border border-emerald-300 bg-emerald-50/20 text-xs leading-relaxed space-y-2 rounded-xl">
                <div className="font-bold text-emerald-800 flex items-center gap-1.5">
                  <CheckCircle2 size={15} /> {tx('Tiket Selesai Secara Paripurna', 'Ticket Fully Resolved')}
                </div>
                <p className="text-[var(--color-text-muted)]">
                  {tx('Pelapor telah mengonfirmasi penyelesaian aduan dengan memberikan umpan balik kepuasan.', 'The reporter has confirmed the complaint was resolved by giving satisfaction feedback.')}
                </p>
              </div>
            )}
          </section>

          {/* Riwayat Catatan Tindak Lanjut */}
          <section className="border border-[var(--color-border)] bg-[var(--color-surface)] p-5 md:p-6 rounded-2xl shadow-sm">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider font-mono text-[var(--color-text)]">
              {tx('Riwayat Tindak Lanjut', 'Follow-up History')} ({followups.length})
            </h3>
            {followups.length === 0 ? (
              <p className="text-center py-4 text-xs font-mono text-[var(--color-text-muted)]">
                {tx('Belum ada catatan tindak lanjut dari unit.', 'No follow-up notes from the unit yet.')}
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