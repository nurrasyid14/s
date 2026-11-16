import { createPortal } from 'react-dom'
import { formatDate, formatDateTime, formatUrgencyScore } from '../../utils/formatter.js'
import useBilingual from '../../hooks/useBilingual.js'
import { StatusBadge } from '../ui/StatusBadge.jsx'
import { Printer, X, FileText, CheckCircle2 } from 'lucide-react'

export default function DispositionSheetModal({ complaint, onClose }) {
  const { tx } = useBilingual()
  if (!complaint) return null

  function handlePrint() {
    window.print()
  }

  const currentDate = new Date()

  return createPortal(
    <div className="fixed inset-0 z-[100] backdrop-in bg-[var(--color-surface)]">
      <div className="modal-in bg-[var(--color-surface)] w-full h-full flex flex-col">
        {/* Modal Controls */}
        <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between print:hidden bg-[var(--color-bg-secondary)]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-5 bg-[var(--color-primary)] inline-block" />
            <h3 className="text-sm font-bold font-mono uppercase text-[var(--color-text)]">
              {tx('Lembar Disposisi & Berita Acara (PDF)', 'Dispatch Sheet & Official Minutes (PDF)')}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="btn-solid !py-2 !px-4 text-xs font-bold flex items-center gap-1.5"
            >
              <Printer size={14} /> {tx('Cetak / Unduh Lembar PDF', 'Print / Download PDF Sheet')}
            </button>
            <button
              onClick={onClose}
              className="p-2 border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-xs"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div className="p-6 sm:p-10 overflow-y-auto flex-1 bg-gray-100 text-gray-900 print:p-0 print:m-0 print:bg-white" id="printable-sheet">
          <div className="max-w-4xl mx-auto bg-white p-6 sm:p-10 shadow-sm print:shadow-none print:p-0 print:max-w-none">
          {/* Header Kop */}
          <div className="border-b-2 border-gray-900 pb-3 mb-5 text-center">
            <div className="text-[11px] font-bold tracking-widest uppercase font-serif text-gray-600">
              POLITEKNIK ELEKTRONIKA NEGERI SURABAYA
            </div>
            <div className="text-base font-black tracking-wide uppercase font-serif text-gray-900">
              {tx('LEMBAR DISPOSISI & BERITA ACARA PENANGANAN KELUHAN', 'DISPATCH SHEET & COMPLAINT HANDLING OFFICIAL MINUTES')}
            </div>
            <div className="text-[10px] font-mono text-gray-500 mt-0.5">
              {tx('SISTEM INFORMASI SUARALENS · DOKUMEN RESMI TERCATAT', 'SUARALENS INFORMATION SYSTEM · OFFICIAL RECORDED DOCUMENT')}
            </div>
          </div>

          {/* Ticket Metadata Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 border border-gray-400 p-2 text-xs font-mono bg-gray-50">
            <div>
              <span className="text-gray-500 block text-[10px]">{tx('NOMOR TIKET', 'TICKET NUMBER')}</span>
              <strong className="text-gray-900 text-sm">{complaint.ticket_id}</strong>
            </div>
            <div>
              <span className="text-gray-500 block text-[10px]">{tx('TANGGAL MASUK', 'DATE RECEIVED')}</span>
              <span className="text-gray-900">{formatDate(complaint.created_at)}</span>
            </div>
            <div>
              <span className="text-gray-500 block text-[10px]">{tx('STATUS TIKET', 'TICKET STATUS')}</span>
              <strong className="uppercase text-blue-700"><StatusBadge status={complaint.status} /></strong>
            </div>
            <div>
              <span className="text-gray-500 block text-[10px]">{tx('UNIT TUJUAN', 'TARGET UNIT')}</span>
              <strong className="text-gray-900">{complaint.target_unit || complaint.unit}</strong>
            </div>
          </div>

          {/* Bagian 1: Deskripsi Masukan */}
          <div className="mb-4 border border-gray-300 p-3 text-xs">
            <h4 className="font-mono font-bold uppercase text-[11px] text-gray-700 mb-1 border-b border-gray-200 pb-1">
              {tx('1. SUBSTANSI MASUKAN SIVITAS (ANONIM MUTLAK)', '1. COMMUNITY REPORT DETAILS (ABSOLUTELY ANONYMOUS)')}
            </h4>
            <p className="text-gray-800 leading-relaxed italic mt-1">
              "{complaint.description}"
            </p>
            <div className="mt-2 text-[10px] font-mono text-gray-500 flex gap-4">
              <span>{tx('Jenis', 'Type')}: {complaint.type}</span>
              <span>{tx('Kategori', 'Category')}: {complaint.category}</span>
              <span>{tx('Skor Urgensi', 'Urgency Score')}: {formatUrgencyScore(complaint.urgency_score)}/10</span>
            </div>
          </div>

          {/* Bagian 2: Verifikasi & Disposisi Admin */}
          <div className="mb-4 border border-gray-300 p-3 text-xs bg-gray-50/50">
            <h4 className="font-mono font-bold uppercase text-[11px] text-gray-700 mb-1 border-b border-gray-200 pb-1">
              {tx('2. INSTRUKSI DISPOSISI ADMINISTRATOR', '2. ADMINISTRATOR DISPATCH INSTRUCTIONS')}
            </h4>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <div>
                <span className="text-[10px] text-gray-500 block">{tx('Unit Penerima Disposisi:', 'Dispatch Receiving Unit:')}</span>
                <strong className="text-gray-900">{complaint.disposition?.target_unit || complaint.target_unit}</strong>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 block">{tx('PIC Ditugaskan:', 'Assigned PIC:')}</span>
                <span className="text-gray-900">{complaint.disposition?.assigned_pic || tx('Koordinator Unit', 'Unit Coordinator')}</span>
              </div>
            </div>
            <div className="mt-2">
              <span className="text-[10px] text-gray-500 block">{tx('Instruksi Tugas:', 'Task Instructions:')}</span>
              <p className="text-gray-800 leading-snug">
                {complaint.disposition?.disposition_note || tx('Mohon segera ditindaklanjuti sesuai prosedur teknis.', 'Please follow up promptly according to technical procedures.')}
              </p>
            </div>
          </div>

          {/* Bagian 3: Riwayat Progres Tindak Lanjut */}
          <div className="mb-4 border border-gray-300 p-3 text-xs">
            <h4 className="font-mono font-bold uppercase text-[11px] text-gray-700 mb-1 border-b border-gray-200 pb-1">
              {tx('3. CATATAN TINDAK LANJUT TEKNIS UNIT', '3. UNIT TECHNICAL FOLLOW-UP NOTES')}
            </h4>
            {complaint.followups && complaint.followups.length > 0 ? (
              <ul className="divide-y divide-gray-200 text-xs">
                {complaint.followups.map(f => (
                  <li key={f.id} className="py-1.5">
                    <div className="flex justify-between font-mono text-[10px] text-gray-500">
                      <span>{tx('Oleh', 'By')}: {f.by}</span>
                      <span>{formatDateTime(f.created_at)}</span>
                    </div>
                    <p className="text-gray-800 mt-0.5">{f.note}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 italic text-[11px]">{tx('Belum ada catatan investigasi/tindak lanjut lapangan.', 'No field investigation/follow-up notes yet.')}</p>
            )}
          </div>

          {/* Bagian 4: Jawaban Resmi Unit */}
          <div className="mb-4 border border-gray-300 p-3 text-xs">
            <h4 className="font-mono font-bold uppercase text-[11px] text-gray-700 mb-1 border-b border-gray-200 pb-1">
              {tx('4. JAWABAN & SOLUSI RESMI UNIT KERJA', '4. OFFICIAL ANSWER & SOLUTION FROM THE WORK UNIT')}
            </h4>
            {complaint.unit_answer ? (
              <div>
                <p className="text-gray-800 leading-relaxed font-medium">
                  {complaint.unit_answer.answer}
                </p>
                <div className="mt-2 text-[10px] font-mono text-gray-500">
                  {tx('Diterbitkan oleh', 'Published by')}: {complaint.unit_answer.answered_by} · {formatDateTime(complaint.unit_answer.answered_at)}
                </div>
              </div>
            ) : (
              <p className="text-gray-500 italic text-[11px]">{tx('Unit kerja belum menerbitkan jawaban resmi.', 'The work unit has not published an official answer yet.')}</p>
            )}
          </div>

          {/* Bagian 5: Umpan Balik Stakeholder */}
          <div className="mb-6 border border-gray-300 p-3 text-xs bg-gray-50">
            <h4 className="font-mono font-bold uppercase text-[11px] text-gray-700 mb-1 border-b border-gray-200 pb-1">
              {tx('5. UMPAN BALIK KEPUASAN STAKEHOLDER (WAJIB PENYELESAIAN)', '5. STAKEHOLDER SATISFACTION FEEDBACK (REQUIRED FOR RESOLUTION)')}
            </h4>
            {complaint.feedback ? (
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-orange-600 font-mono text-sm">
                    {complaint.feedback.rating} / 5 {tx('Bintang Kepuasan', 'Satisfaction Stars')}
                  </div>
                  <p className="text-gray-700 italic mt-0.5">"{complaint.feedback.comment}"</p>
                </div>
                <div className="text-[10px] font-mono text-gray-500 text-right">
                  {tx('Diberikan pada', 'Submitted on')}:<br />{formatDateTime(complaint.feedback.submitted_at)}
                </div>
              </div>
            ) : (
              <p className="text-gray-500 italic text-[11px]">{tx('Menunggu pengisian umpan balik wajib dari pelapor.', 'Waiting for the mandatory feedback from the reporter.')}</p>
            )}
          </div>

          {/* Signatures */}
          <div className="pt-4 border-t border-gray-300 text-xs text-gray-800 flex justify-between items-start">
            <div className="text-center w-52">
              <div className="font-mono text-[10px] text-gray-500 mb-12">
                {tx('Petugas Verifikator Disposisi,', 'Dispatch Verification Officer,')}
              </div>
              <div className="font-bold border-b border-gray-900 pb-0.5">( {tx('Admin Sentral PENS', 'PENS Central Admin')} )</div>
            </div>

            <div className="text-center w-52">
              <div className="font-mono text-[10px] text-gray-500 mb-12">
                {tx('Petugas Penindaklanjut Unit,', 'Unit Follow-up Officer,')}
              </div>
              <div className="font-bold border-b border-gray-900 pb-0.5">( {tx('Koordinator / PIC Unit', 'Unit Coordinator / PIC')} )</div>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
