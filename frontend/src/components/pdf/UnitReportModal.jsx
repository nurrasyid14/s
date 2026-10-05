import { useState } from 'react'
import { StatusBadge } from '../ui/StatusBadge.jsx'
import { formatDate, formatDateTime } from '../../utils/formatter.js'
import { Printer, Download, X, Building2, CheckCircle2, Star } from 'lucide-react'

export default function UnitReportModal({ unitData, complaints = [], onClose }) {
  if (!unitData) return null

  function handlePrint() {
    window.print()
  }

  const currentDate = new Date()

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl">
        {/* Modal Controls (Not printed) */}
        <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between print:hidden bg-[var(--color-bg-secondary)]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-5 bg-[var(--color-primary)] inline-block" />
            <h3 className="text-sm font-bold font-mono uppercase text-[var(--color-text)]">
              Pratinjau Berkas Laporan Resmi Unit (PDF)
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="btn-solid !py-2 !px-4 text-xs font-bold flex items-center gap-1.5"
            >
              <Printer size={14} /> Cetak / Unduh PDF
            </button>
            <button
              onClick={onClose}
              className="p-2 border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-xs"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Printable Document Area */}
        <div className="p-8 sm:p-10 overflow-y-auto flex-1 bg-white text-gray-900 print:p-0 print:m-0" id="printable-report">
          {/* Official Letterhead (Kop Surat) */}
          <div className="border-b-2 border-gray-900 pb-4 mb-6 text-center">
            <div className="text-[12px] font-bold tracking-widest uppercase font-serif text-gray-700">
              KEMENTERIAN PENDIDIKAN TINGGI, SAINS, DAN TEKNOLOGI
            </div>
            <div className="text-base sm:text-lg font-black tracking-wide uppercase font-serif text-gray-900">
              POLITEKNIK ELEKTRONIKA NEGERI SURABAYA
            </div>
            <div className="text-xs font-mono tracking-normal text-gray-600 mt-0.5">
              SISTEM INFORMASI ANALITIK ADUAN & ASPIRASI SIVITAS AKADEMIKA (SUARALENS)
            </div>
            <div className="text-[10px] text-gray-500 mt-1">
              Jl. Raya ITS, Sukolilo, Surabaya 60111 | https://pens.ac.id
            </div>
          </div>

          {/* Title & Metadata */}
          <div className="mb-6 text-center">
            <h1 className="text-base font-bold uppercase font-mono tracking-tight text-gray-900">
              LAPORAN REKAPITULASI DISPOSISI & PENANGANAN KELUHAN
            </h1>
            <div className="text-xs font-mono text-gray-600 mt-1">
              UNIT KERJA: <strong>{unitData.unitName}</strong> | STANDAR SLA: <strong>{unitData.avgResolutionDays || 2} HARI</strong>
            </div>
            <div className="text-[11px] font-mono text-gray-500 mt-0.5">
              Dicetak pada: {formatDateTime(currentDate.toISOString())}
            </div>
          </div>

          {/* Metric Summary Grid */}
          <div className="grid grid-cols-4 gap-3 mb-6 text-xs text-center border border-gray-300 p-3 bg-gray-50">
            <div className="p-2 border-r border-gray-300">
              <div className="text-[10px] font-mono uppercase text-gray-500">Total Aduan Masuk</div>
              <div className="text-xl font-bold font-mono text-gray-900 mt-0.5">{unitData.total || 0}</div>
            </div>
            <div className="p-2 border-r border-gray-300">
              <div className="text-[10px] font-mono uppercase text-gray-500">Telah Selesai / Dijawab</div>
              <div className="text-xl font-bold font-mono text-emerald-700 mt-0.5">
                {(unitData.resolved || 0) + (unitData.answered || 0)}
              </div>
            </div>
            <div className="p-2 border-r border-gray-300">
              <div className="text-[10px] font-mono uppercase text-gray-500">Kepatuhan SLA</div>
              <div className="text-xl font-bold font-mono text-blue-700 mt-0.5">
                {unitData.slaComplianceRate || 95}%
              </div>
            </div>
            <div className="p-2">
              <div className="text-[10px] font-mono uppercase text-gray-500">Skor CSAT Pelapor</div>
              <div className="text-xl font-bold font-mono text-amber-600 mt-0.5 flex items-center justify-center gap-1">
                <Star size={16} className="fill-amber-500 text-amber-500" />
                {unitData.avgRating || 4.8}/5
              </div>
            </div>
          </div>

          {/* Complaints Table */}
          <div className="mb-8">
            <h2 className="text-xs font-bold font-mono uppercase text-gray-800 mb-2 border-b border-gray-300 pb-1">
              Rincian Tiket Masukan & Progres Tindak Lanjut
            </h2>
            <table className="w-full text-left text-[11px] border border-gray-300 border-collapse">
              <thead>
                <tr className="bg-gray-100 text-gray-700 border-b border-gray-300 font-mono">
                  <th className="p-2 border-r border-gray-300">No. Tiket</th>
                  <th className="p-2 border-r border-gray-300">Tgl Masuk</th>
                  <th className="p-2 border-r border-gray-300">Ringkasan Masalah</th>
                  <th className="p-2 border-r border-gray-300">Status</th>
                  <th className="p-2 border-r border-gray-300">PIC Penangan</th>
                  <th className="p-2 text-center">Feedback</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {complaints.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-4 text-center text-gray-500 font-mono">
                      Tidak ada catatan aduan untuk unit ini pada periode pelaporan.
                    </td>
                  </tr>
                ) : (
                  complaints.map((c, idx) => (
                    <tr key={c.id} className="text-gray-800">
                      <td className="p-2 font-mono font-bold border-r border-gray-200 whitespace-nowrap">
                        {c.ticket_id}
                      </td>
                      <td className="p-2 font-mono border-r border-gray-200 whitespace-nowrap text-gray-600">
                        {formatDate(c.created_at)}
                      </td>
                      <td className="p-2 border-r border-gray-200 leading-snug">
                        {c.description}
                      </td>
                      <td className="p-2 border-r border-gray-200 whitespace-nowrap font-semibold">
                        <span className="uppercase text-[10px] px-1.5 py-0.5 border border-gray-400 bg-gray-50">
                          {c.status}
                        </span>
                      </td>
                      <td className="p-2 border-r border-gray-200 text-gray-600 whitespace-nowrap">
                        {c.disposition?.assigned_pic || 'Staf Unit'}
                      </td>
                      <td className="p-2 text-center whitespace-nowrap font-mono font-bold text-amber-600">
                        {c.feedback?.rating ? `${c.feedback.rating} ★` : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Legal Signatures */}
          <div className="pt-6 border-t border-gray-300 text-xs text-gray-800 flex justify-between items-start">
            <div className="text-center w-56">
              <div className="font-mono text-[11px] text-gray-500 mb-14">
                Mengetahui,<br />
                <strong>Admin Sentral SuaraLens</strong>
              </div>
              <div className="font-bold border-b border-gray-900 pb-0.5">( Admin Sentral PENS )</div>
              <div className="text-[10px] text-gray-500 font-mono mt-0.5">NIP. 198005122005011002</div>
            </div>

            <div className="text-center w-56">
              <div className="font-mono text-[11px] text-gray-500 mb-14">
                Surabaya, {formatDate(currentDate.toISOString())}<br />
                <strong>Koordinator {unitData.unitName}</strong>
              </div>
              <div className="font-bold border-b border-gray-900 pb-0.5">( Kepala / PIC Unit )</div>
              <div className="text-[10px] text-gray-500 font-mono mt-0.5">Penanggung Jawab Layanan</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
