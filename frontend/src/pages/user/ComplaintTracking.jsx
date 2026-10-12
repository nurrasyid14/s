import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Navbar from '../../components/layout/Navbar.jsx'
import { StatusBadge } from '../../components/ui/StatusBadge.jsx'
import { getComplaint, submitStakeholderFeedback } from '../../services/complaintApi.js'
import { formatDate, formatDateTime, WORKFLOW_STEPS } from '../../utils/formatter.js'
import {
  ArrowLeft, ShieldCheck, CheckCircle2, Clock, AlertTriangle,
  Building2, UserCheck, MessageSquare, Star, Send, Printer, FileText, ChevronRight
} from 'lucide-react'

export default function ComplaintTracking() {
  const { id } = useParams()
  const { t } = useTranslation()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  // Feedback form state
  const [rating, setRating] = useState(5)
  const [hoverRating, setHoverRating] = useState(0)
  const [aspectSpeed, setAspectSpeed] = useState(5)
  const [aspectClarity, setAspectClarity] = useState(5)
  const [aspectSolution, setAspectSolution] = useState(5)
  const [comment, setComment] = useState('')
  const [submittingFeedback, setSubmittingFeedback] = useState(false)
  const [feedbackSuccess, setFeedbackSuccess] = useState(false)
  const [feedbackError, setFeedbackError] = useState('')

  useEffect(() => {
    loadData()
  }, [id])

  function loadData() {
    setLoading(true)
    setError(false)
    getComplaint(id)
      .then(res => {
        setData(res)
        if (res?.feedback) {
          setRating(res.feedback.rating || 5)
          setComment(res.feedback.comment || '')
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }

  async function handleFeedbackSubmit(e) {
    e.preventDefault()
    if (!comment.trim()) {
      setFeedbackError('Harap tuliskan ulasan/tanggapan Anda sebelum menyelesaikan tiket.')
      return
    }
    setSubmittingFeedback(true)
    setFeedbackError('')
    try {
      await submitStakeholderFeedback(id, {
        rating,
        aspect_speed: aspectSpeed,
        aspect_clarity: aspectClarity,
        aspect_solution: aspectSolution,
        comment,
      })
      setFeedbackSuccess(true)
      loadData()
    } catch (err) {
      setFeedbackError(err.message || 'Gagal mengirimkan umpan balik.')
    } finally {
      setSubmittingFeedback(false)
    }
  }

  function handlePrint() {
    window.print()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)]">
        <Navbar variant="user" />
        <div className="max-w-4xl mx-auto px-4 py-10 space-y-4">
          <div className="skeleton h-12 border border-[var(--color-border)]" />
          <div className="skeleton h-48 border border-[var(--color-border)]" />
          <div className="skeleton h-64 border border-[var(--color-border)]" />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)]">
        <Navbar variant="user" />
        <div className="max-w-md mx-auto px-4 py-20 text-center">
          <AlertTriangle size={36} className="text-[var(--color-status-danger)] mx-auto mb-3" />
          <h2 className="text-xl font-bold text-[var(--color-text)]">Aduan Tidak Ditemukan</h2>
          <p className="text-sm text-[var(--color-text-muted)] mt-1 mb-6">Nomor tiket atau identitas aduan tidak terdaftar di sistem.</p>
          <Link to="/user/complaints" className="btn-solid inline-flex items-center gap-2">
            <ArrowLeft size={15} /> Kembali ke Riwayat Saya
          </Link>
        </div>
      </div>
    )
  }

  // Calculate current step index (0-indexed)
  const currentStepIndex = WORKFLOW_STEPS.findIndex(s => s.key === data.status)
  const isAnswered = data.status === 'answered'
  const isResolved = data.status === 'resolved'

  return (
    <div className="min-h-screen bg-[var(--color-bg)] pb-16">
      <Navbar variant="user" />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6">
        {/* Navigation & Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-6 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-3">
            <Link
              to="/user/complaints"
              className="p-2 border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
            >
              <ArrowLeft size={16} />
            </Link>
            <div>
              <div className="text-[11px] font-mono uppercase tracking-wider text-[var(--color-primary)] font-semibold">
                PELACAK ADUAN SIVITAS PENS
              </div>
              <div className="flex items-center gap-2.5 mt-0.5">
                <h1 className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-[var(--color-text)]">
                  {data.ticket_id}
                </h1>
                <StatusBadge status={data.status} />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="btn-outline inline-flex items-center gap-1.5 text-xs py-2 px-3"
            >
              <Printer size={14} /> Cetak Bukti (PDF)
            </button>
          </div>
        </div>

        {/* Banner Jaminan Anonimitas Mutlak */}
        <div className="mb-6 flex items-start gap-3 p-4 border border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-xs leading-relaxed text-[var(--color-text)]">
          <ShieldCheck size={20} className="text-[var(--color-primary)] flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold uppercase tracking-wider font-mono mr-2">Anonimitas Mutlak Terlindungi:</span>
            <span>Identitas pribadi Anda tidak pernah ditampilkan kepada unit teknis maupun pengelola sistem. Tiket Anda murni diproses secara objektif berdasarkan nomor registrasi tiket.</span>
          </div>
        </div>

        {/* Visual Stepper: 7 Status Berurutan */}
        <div className="mb-8 border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <h2 className="text-xs font-mono uppercase tracking-wider font-bold text-[var(--color-text-muted)] mb-4">
            Alur Penanganan 7 Tahap (Live Tracking)
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {WORKFLOW_STEPS.map((stepItem, index) => {
              const isPast = currentStepIndex > index
              const isCurrent = currentStepIndex === index
              return (
                <div
                  key={stepItem.key}
                  className={`p-3 border text-center transition-all ${
                    isCurrent
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] shadow-sm'
                      : isPast
                      ? 'border-[var(--color-status-success)]/40 bg-[var(--color-bg-secondary)]'
                      : 'border-[var(--color-border)] opacity-60 bg-[var(--color-bg)]'
                  }`}
                >
                  <div className="text-[10px] font-mono text-[var(--color-text-muted)] mb-1">
                    Tahap {index + 1}
                  </div>
                  <div className="flex items-center justify-center mb-1">
                    {isPast ? (
                      <CheckCircle2 size={16} className="text-[var(--color-status-success)]" />
                    ) : isCurrent ? (
                      <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-primary)] animate-ping" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-[var(--color-border)]" />
                    )}
                  </div>
                  <div className={`text-xs font-semibold ${isCurrent ? 'text-[var(--color-primary)] font-bold' : 'text-[var(--color-text)]'}`}>
                    {stepItem.label}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Kolom Kiri: Detail Aduan & Riwayat */}
          <div className="space-y-6 lg:col-span-2">
            {/* Detail Isi Aduan */}
            <section className="border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
              <h3 className="text-xs font-mono uppercase tracking-wider font-bold text-[var(--color-text-muted)] mb-3">
                Informasi Masukan Anda
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs mb-4">
                <div className="p-2.5 border border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                  <span className="text-[var(--color-text-muted)] block">Jenis</span>
                  <span className="font-semibold text-[var(--color-text)] capitalize">{data.type}</span>
                </div>
                <div className="p-2.5 border border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                  <span className="text-[var(--color-text-muted)] block">Kategori</span>
                  <span className="font-semibold text-[var(--color-text)] capitalize">{data.category}</span>
                </div>
                <div className="p-2.5 border border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                  <span className="text-[var(--color-text-muted)] block">Unit Terkait</span>
                  <span className="font-semibold text-[var(--color-text)]">{data.target_unit || data.unit}</span>
                </div>
              </div>

              <div className="border-t border-[var(--color-border)] pt-3">
                <div className="text-xs font-mono text-[var(--color-text-muted)] mb-1">Deskripsi Masukan:</div>
                <p className="text-sm text-[var(--color-text)] leading-relaxed whitespace-pre-line">
                  {data.description}
                </p>
              </div>

              {data.attachments && data.attachments.length > 0 && (
                <div className="mt-4 pt-3 border-t border-[var(--color-border)]">
                  <div className="text-xs font-mono text-[var(--color-text-muted)] mb-2">Lampiran Bukti Pengirim:</div>
                  <div className="flex gap-2">
                    {data.attachments.map((a, i) => (
                      <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" className="border border-[var(--color-border)] p-1 hover:border-[var(--color-primary)]">
                        <img src={a.url} alt="bukti" className="h-16 w-24 object-cover" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Jawaban Resmi Unit (Jika Sudah Dijawab / Selesai) */}
            {(isAnswered || isResolved) && data.unit_answer && (
              <section className="border-2 border-[var(--color-primary)] bg-[var(--color-surface)] p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-5 bg-[var(--color-primary)] inline-block" />
                  <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-[var(--color-primary)]">
                    Jawaban & Solusi Resmi dari Unit Kerja
                  </h3>
                </div>
                <div className="p-4 border border-[var(--color-primary)]/30 bg-[var(--color-primary-soft)] rounded-none mb-3">
                  <p className="text-sm leading-relaxed text-[var(--color-text)] font-medium">
                    {data.unit_answer.answer}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-[var(--color-text-muted)] pt-2 border-t border-[var(--color-border)]">
                  <div>
                    Dijawab oleh: <span className="font-semibold text-[var(--color-text)]">{data.unit_answer.answered_by}</span>
                  </div>
                  <div>
                    Waktu: {formatDateTime(data.unit_answer.answered_at)}
                  </div>
                </div>
              </section>
            )}

            {/* Riwayat Penanganan Interaktif */}
            <section className="border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
              <h3 className="text-xs font-mono uppercase tracking-wider font-bold text-[var(--color-text-muted)] mb-4">
                Catatan Jejak Audit & Progres Teknis
              </h3>
              <ol className="relative border-l border-[var(--color-border)] ml-3 space-y-5">
                {/* 1. Diterima */}
                <li className="ml-4">
                  <div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border border-white bg-[var(--color-primary)]" />
                  <div className="text-xs font-semibold text-[var(--color-text)]">Aduan Diterima Sistem</div>
                  <div className="text-[11px] font-mono text-[var(--color-text-muted)]">{formatDateTime(data.created_at)}</div>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Tiket berhasil dicatat dan masuk antrean verifikasi.</p>
                </li>

                {/* 2. Diverifikasi */}
                {data.verification && (
                  <li className="ml-4">
                    <div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border border-white bg-[var(--color-primary)]" />
                    <div className="text-xs font-semibold text-[var(--color-text)]">Aduan Diverifikasi oleh Admin</div>
                    <div className="text-[11px] font-mono text-[var(--color-text-muted)]">{formatDateTime(data.verification.verified_at)}</div>
                    <p className="text-xs text-[var(--color-text)] mt-0.5">{data.verification.note}</p>
                  </li>
                )}

                {/* 3. Didisposisikan */}
                {data.disposition && (
                  <li className="ml-4">
                    <div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border border-white bg-[var(--color-primary)]" />
                    <div className="text-xs font-semibold text-[var(--color-text)]">
                      Didisposisikan ke Unit {data.disposition.target_unit}
                    </div>
                    <div className="text-[11px] font-mono text-[var(--color-text-muted)]">{formatDateTime(data.disposition.disposition_at)}</div>
                    <p className="text-xs text-[var(--color-text)] mt-0.5">Instruksi: {data.disposition.disposition_note}</p>
                    <div className="text-[11px] text-[var(--color-text-muted)] font-mono mt-0.5">
                      PIC Ditugaskan: {data.disposition.assigned_pic}
                    </div>
                  </li>
                )}

                {/* 4 & 5. Tindak Lanjut Unit */}
                {data.followups && data.followups.map(f => (
                  <li key={f.id} className="ml-4">
                    <div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border border-white bg-[var(--color-status-success)]" />
                    <div className="text-xs font-semibold text-[var(--color-text)]">
                      Tindak Lanjut Unit ({f.by})
                    </div>
                    <div className="text-[11px] font-mono text-[var(--color-text-muted)]">{formatDateTime(f.created_at)}</div>
                    <p className="text-xs text-[var(--color-text)] mt-0.5">{f.note}</p>
                    {f.evidence_url && (
                      <a href={f.evidence_url} target="_blank" rel="noopener noreferrer" className="inline-block mt-1">
                        <img src={f.evidence_url} alt="bukti perbaikan" className="h-14 w-20 object-cover border border-[var(--color-border)]" />
                      </a>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          </div>

          {/* Kolom Kanan: Status & Form Umpan Balik Wajib */}
          <div className="space-y-6">
            {/* Status Panel Ringkas */}
            <div className="border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
              <div className="text-xs font-mono uppercase tracking-wider text-[var(--color-text-muted)] mb-1">Status Penanganan Saat Ini</div>
              <div className="text-lg font-bold text-[var(--color-text)] mb-3">
                <StatusBadge status={data.status} />
              </div>
              <div className="space-y-2.5 text-xs border-t border-[var(--color-border)] pt-3 text-[var(--color-text-muted)]">
                <div className="flex justify-between">
                  <span>Unit Penanggung Jawab:</span>
                  <span className="font-semibold text-[var(--color-text)]">{data.target_unit || data.unit}</span>
                </div>
                <div className="flex justify-between">
                  <span>Estimasi Batas SLA:</span>
                  <span className="font-mono text-[var(--color-text)]">{formatDate(data.sla_deadline)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tanggal Masuk:</span>
                  <span className="font-mono text-[var(--color-text)]">{formatDate(data.created_at)}</span>
                </div>
              </div>
            </div>

            {/* WAJIB: Form Umpan Balik (Jika status == 'answered') */}
            {isAnswered && (
              <div className="border-2 border-[var(--color-status-warning)] bg-[var(--color-surface)] p-5 shadow-sm">
                <div className="flex items-center gap-2 text-[var(--color-status-warning)] font-bold text-xs font-mono uppercase mb-2">
                  <AlertTriangle size={16} /> Wajib Diisi Pelapor
                </div>
                <h3 className="font-bold text-base text-[var(--color-text)] mb-1">
                  Umpan Balik Penyelesaian Aduan
                </h3>
                <p className="text-xs text-[var(--color-text-muted)] mb-4 leading-relaxed">
                  Unit telah memberikan jawaban resmi. Mohon berikan penilaian kepuasan Anda untuk <strong>menyelesaikan dan menutup tiket ini secara resmi</strong>.
                </p>

                {feedbackError && (
                  <div className="p-2.5 mb-3 border border-[var(--color-status-danger)] text-[var(--color-status-danger)] text-xs">
                    {feedbackError}
                  </div>
                )}

                <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                  {/* Rating Bintang */}
                  <div>
                    <label className="block text-xs font-semibold text-[var(--color-text)] mb-1.5">
                      Rating Kepuasan Keseluruhan (1-5 Bintang) *
                    </label>
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          type="button"
                          key={star}
                          onClick={() => setRating(star)}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          className="p-1 text-[var(--color-border)] hover:text-amber-400 focus:outline-none transition-colors"
                        >
                          <Star
                            size={24}
                            className={(hoverRating || rating) >= star ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}
                          />
                        </button>
                      ))}
                      <span className="ml-2 font-mono text-xs font-bold text-[var(--color-text)]">
                        {rating} / 5 Bintang
                      </span>
                    </div>
                  </div>

                  {/* Aspek-aspek Penilaian */}
                  <div className="space-y-2 border-t border-[var(--color-border)] pt-3 text-xs">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-[var(--color-text-muted)]">Kecepatan Respons:</span>
                        <span className="font-mono font-bold text-[var(--color-text)]">{aspectSpeed}/5</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="5"
                        value={aspectSpeed}
                        onChange={e => setAspectSpeed(e.target.value)}
                        className="w-full accent-[var(--color-primary)]"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-[var(--color-text-muted)]">Kejelasan Jawaban:</span>
                        <span className="font-mono font-bold text-[var(--color-text)]">{aspectClarity}/5</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="5"
                        value={aspectClarity}
                        onChange={e => setAspectClarity(e.target.value)}
                        className="w-full accent-[var(--color-primary)]"
                      />
                    </div>
                  </div>

                  {/* Ulasan Tertulis Wajib */}
                  <div>
                    <label className="block text-xs font-semibold text-[var(--color-text)] mb-1">
                      Komentar / Ulasan Layanan (Wajib) *
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={comment}
                      onChange={e => setComment(e.target.value)}
                      placeholder="Bagikan pengalaman atau respon Anda atas solusi yang diberikan oleh unit..."
                      className="input-field text-xs resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingFeedback}
                    className="btn-solid w-full text-xs py-2.5 font-bold flex items-center justify-center gap-1.5"
                  >
                    {submittingFeedback ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    ) : (
                      <>
                        <Send size={14} /> Kirim Feedback & Selesaikan Tiket
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* Sudah Selesai (Feedback Terpenuhi) */}
            {isResolved && data.feedback && (
              <div className="border border-[var(--color-status-success)] bg-[var(--color-surface)] p-5">
                <div className="flex items-center gap-2 text-[var(--color-status-success)] font-bold text-xs font-mono uppercase mb-2">
                  <CheckCircle2 size={16} /> Tiket Resmi Selesai
                </div>
                <div className="flex items-center gap-1 mb-2">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star
                      key={i}
                      size={18}
                      className={i < data.feedback.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}
                    />
                  ))}
                  <span className="text-xs font-bold font-mono ml-1 text-[var(--color-text)]">
                    {data.feedback.rating}/5
                  </span>
                </div>
                <p className="text-xs text-[var(--color-text)] italic leading-relaxed bg-[var(--color-bg-secondary)] p-3 border border-[var(--color-border)] mb-2">
                  "{data.feedback.comment}"
                </p>
                <div className="text-[11px] font-mono text-[var(--color-text-muted)] text-right">
                  Diberikan pada: {formatDateTime(data.feedback.submitted_at)}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
