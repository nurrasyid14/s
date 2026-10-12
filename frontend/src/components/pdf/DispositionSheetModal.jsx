import { formatDate, formatDateTime } from '../../utils/formatter.js'
import { Printer, X, FileText, CheckCircle2 } from 'lucide-react'

export default function DispositionSheetModal({ complaint, onClose }) {
  if (!complaint) return null

  function handlePrint() {
    window.print()
  }

  const currentDate = new Date()

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl">
        {/* Modal Controls */}
        <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between print:hidden bg-[var(--color-bg-secondary)]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-5 bg-[var(--color-primary)] inline-block" />
            <h3 className="text-sm font-bold font-mono uppercase text-[var(--color-text)]">
              Lembar Disposisi & Berita Acara (PDF)
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="btn-solid !py-2 !px-4 text-xs font-bold flex items-center gap-1.5"
            >
              <Printer size={14} /> Cetak / Unduh Lembar PDF
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
        <div className="p-8 sm:p-10 overflow-y-auto flex-1 bg-white text-gray-900 print:p-0 print:m-0" id="printable-sheet">
          {/* Header Kop */}
          <div className="border-b-2 border-gray-900 pb-3 mb-5 text-center">
            <div className="text-[11px] font-bold tracking-widest uppercase font-serif text-gray-600">
              POLITEKNIK ELEKTRONIKA NEGERI SURABAYA
            </div>
            <div className="text-base font-black tracking-wide uppercase font-serif text-gray-900">
              LEMBAR DISPOSISI & BERITA ACARA PENANGANAN KELUHAN
            </div>
            <div className="text-[10px] font-mono text-gray-500 mt-0.5">
              SISTEM INFORMASI SUARALENS · DOKUMEN RESMI TERCATAT
            </div>
          </div>

          {/* Ticket Metadata Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 border border-gray-400 p-2 text-xs font-mono bg-gray-50">
            <div>
              <span className="text-gray-500 block text-[10px]">NOMOR TIKET</span>
              <strong className="text-gray-900 text-sm">{complaint.ticket_id}</strong>
            </div>
            <div>
              <span className="text-gray-500 block text-[10px]">TANGGAL MASUK</span>
              <span className="text-gray-900">{formatDate(complaint.created_at)}</span>
            </div>
            <div>
              <span className="text-gray-500 block text-[10px]">STATUS TIKET</span>
              <strong className="uppercase text-blue-700">{complaint.status}</strong>
            </div>
            <div>
              <span className="text-gray-500 block text-[10px]">UNIT TUJUAN</span>
              <strong className="text-gray-900">{complaint.target_unit || complaint.unit}</strong>
            </div>
          </div>

          {/* Bagian 1: Deskripsi Masukan */}
          <div className="mb-4 border border-gray-300 p-3 text-xs">
            <h4 className="font-mono font-bold uppercase text-[11px] text-gray-700 mb-1 border-b border-gray-200 pb-1">
              1. SUBSTANSI MASUKAN SIVITAS (ANONIM MUTLAK)
            </h4>
            <p className="text-gray-800 leading-relaxed italic mt-1">
              "{complaint.description}"
            </p>
            <div className="mt-2 text-[10px] font-mono text-gray-500 flex gap-4">
              <span>Jenis: {complaint.type}</span>
              <span>Kategori: {complaint.category}</span>
              <span>Skor Urgensi: {complaint.urgency_score}/10</span>
            </div>
          </div>

          {/* Bagian 2: Verifikasi & Disposisi Admin */}
          <div className="mb-4 border border-gray-300 p-3 text-xs bg-gray-50/50">
            <h4 className="font-mono font-bold uppercase text-[11px] text-gray-700 mb-1 border-b border-gray-200 pb-1">
              2. INSTRUKSI DISPOSISI ADMINISTRATOR
            </h4>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <div>
                <span className="text-[10px] text-gray-500 block">Unit Penerima Disposisi:</span>
                <strong className="text-gray-900">{complaint.disposition?.target_unit || complaint.target_unit}</strong>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 block">PIC Ditugaskan:</span>
                <span className="text-gray-900">{complaint.disposition?.assigned_pic || 'Koordinator Unit'}</span>
              </div>
            </div>
            <div className="mt-2">
              <span className="text-[10px] text-gray-500 block">Instruksi Tugas:</span>
              <p className="text-gray-800 leading-snug">
                {complaint.disposition?.disposition_note || 'Mohon segera ditindaklanjuti sesuai prosedur teknis.'}
              </p>
            </div>
          </div>

          {/* Bagian 3: Riwayat Progres Tindak Lanjut */}
          <div className="mb-4 border border-gray-300 p-3 text-xs">
            <h4 className="font-mono font-bold uppercase text-[11px] text-gray-700 mb-1 border-b border-gray-200 pb-1">
              3. CATATAN TINDAK LANJUT TEKNIS UNIT
            </h4>
            {complaint.followups && complaint.followups.length > 0 ? (
              <ul className="divide-y divide-gray-200 text-xs">
                {complaint.followups.map(f => (
                  <li key={f.id} className="py-1.5">
                    <div className="flex justify-between font-mono text-[10px] text-gray-500">
                      <span>Oleh: {f.by}</span>
                      <span>{formatDateTime(f.created_at)}</span>
                    </div>
                    <p className="text-gray-800 mt-0.5">{f.note}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 italic text-[11px]">Belum ada catatan investigasi/tindak lanjut lapangan.</p>
            )}
          </div>

          {/* Bagian 4: Jawaban Resmi Unit */}
          <div className="mb-4 border border-gray-300 p-3 text-xs">
            <h4 className="font-mono font-bold uppercase text-[11px] text-gray-700 mb-1 border-b border-gray-200 pb-1">
              4. JAWABAN & SOLUSI RESMI UNIT KERJA
            </h4>
            {complaint.unit_answer ? (
              <div>
                <p className="text-gray-800 leading-relaxed font-medium">
                  {complaint.unit_answer.answer}
                </p>
                <div className="mt-2 text-[10px] font-mono text-gray-500">
                  Diterbitkan oleh: {complaint.unit_answer.answered_by} · {formatDateTime(complaint.unit_answer.answered_at)}
                </div>
              </div>
            ) : (
              <p className="text-gray-500 italic text-[11px]">Unit kerja belum menerbitkan jawaban resmi.</p>
            )}
          </div>

          {/* Bagian 5: Umpan Balik Stakeholder */}
          <div className="mb-6 border border-gray-300 p-3 text-xs bg-gray-50">
            <h4 className="font-mono font-bold uppercase text-[11px] text-gray-700 mb-1 border-b border-gray-200 pb-1">
              5. UMPAN BALIK KEPUASAN STAKEHOLDER (WAJIB PENYELESAIAN)
            </h4>
            {complaint.feedback ? (
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-amber-600 font-mono text-sm">
                    {complaint.feedback.rating} / 5 Bintang Kepuasan
                  </div>
                  <p className="text-gray-700 italic mt-0.5">"{complaint.feedback.comment}"</p>
                </div>
                <div className="text-[10px] font-mono text-gray-500 text-right">
                  Diberikan pada:<br />{formatDateTime(complaint.feedback.submitted_at)}
                </div>
              </div>
            ) : (
              <p className="text-gray-500 italic text-[11px]">Menunggu pengisian umpan balik wajib dari pelapor.</p>
            )}
          </div>

          {/* Signatures */}
          <div className="pt-4 border-t border-gray-300 text-xs text-gray-800 flex justify-between items-start">
            <div className="text-center w-52">
              <div className="font-mono text-[10px] text-gray-500 mb-12">
                Petugas Verifikator Disposisi,
              </div>
              <div className="font-bold border-b border-gray-900 pb-0.5">( Admin Sentral PENS )</div>
            </div>

            <div className="text-center w-52">
              <div className="font-mono text-[10px] text-gray-500 mb-12">
                Petugas Penindaklanjut Unit,
              </div>
              <div className="font-bold border-b border-gray-900 pb-0.5">( Koordinator / PIC Unit )</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
