import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import StakeholderLayout from '../../components/layout/StakeholderLayout.jsx'
import StatCard from '../../components/ui/StatCard.jsx'
import { StatusBadge, UrgencyBadge } from '../../components/ui/StatusBadge.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import SegmentedControl from '../../components/ui/SegmentedControl.jsx'
import ErrorState from '../../components/ui/ErrorState.jsx'
import UnitReportModal from '../../components/pdf/UnitReportModal.jsx'
import { formatDate } from '../../utils/formatter.js'
import { UNITS } from '../../data/units.js'
import { getUnitDashboardStats } from '../../services/complaintApi.js'
import {
  MessageSquare, Clock, Frown, AlertTriangle, CheckCircle2,
  ArrowRight, Printer, Star, Building2, CheckSquare, Layers
} from 'lucide-react'

const focusRing =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]'

export default function StakeholderDashboard() {
  const { t } = useTranslation()
  const [selectedUnit, setSelectedUnit] = useState(UNITS[4].name) // Default: Sarpras
  const [unitStats, setUnitStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [showPdfModal, setShowPdfModal] = useState(false)

  useEffect(() => {
    loadUnitStats(selectedUnit)
  }, [selectedUnit])

  function loadUnitStats(unitName) {
    setLoading(true)
    setError(false)
    getUnitDashboardStats(unitName)
      .then(stats => setUnitStats(stats))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }

  const urgentComplaints = (unitStats?.items || []).filter(c => c.urgency_score >= 7 || ['dispatched', 'in_progress'].includes(c.status))

  return (
    <StakeholderLayout title={`Dashboard Unit: ${selectedUnit}`}>
      {/* Unit Selector & Top Actions Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 border border-[var(--color-border)] bg-[var(--color-primary)] text-white">
            <Building2 size={20} />
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase text-[var(--color-primary)] font-bold">
              PORTAL UNIT KERJA PELAKSANA
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <label htmlFor="unit-select" className="text-xs font-semibold text-[var(--color-text)]">
                Pilih Unit:
              </label>
              <select
                id="unit-select"
                value={selectedUnit}
                onChange={e => setSelectedUnit(e.target.value)}
                className="input-field text-xs font-bold font-mono !py-1 !px-2.5 max-w-xs"
              >
                {UNITS.map(u => (
                  <option key={u.id} value={u.name}>{u.name} ({u.code})</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={() => setShowPdfModal(true)}
            className="btn-solid inline-flex items-center gap-2 text-xs py-2 px-3.5 font-bold tracking-tight shadow-sm"
          >
            <Printer size={14} /> Ekspor Laporan PDF Unit
          </button>
          <Link
            to="/stakeholder/complaints"
            className="btn-outline inline-flex items-center gap-1.5 text-xs py-2 px-3"
          >
            Semua Aduan <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      {error ? (
        <ErrorState onRetry={() => loadUnitStats(selectedUnit)} />
      ) : (
        <>
          {/* Unit KPI Indicators */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {loading ? (
              [1, 2, 3, 4].map(i => <div key={i} className="skeleton h-28 border border-[var(--color-border)]" />)
            ) : (
              <>
                <div className="border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                  <div className="flex items-center justify-between text-xs font-mono uppercase text-[var(--color-text-muted)] font-semibold">
                    <span>Total Disposisi Unit</span>
                    <Layers size={16} className="text-[var(--color-primary)]" />
                  </div>
                  <div className="mt-3 text-3xl font-bold font-mono text-[var(--color-text)]">
                    {unitStats?.total || 0}
                  </div>
                  <div className="mt-2 text-[11px] font-mono text-[var(--color-text-muted)] border-t border-[var(--color-border)] pt-2">
                    Aduan ditujukan ke {selectedUnit}
                  </div>
                </div>

                <div className="border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                  <div className="flex items-center justify-between text-xs font-mono uppercase text-[var(--color-text-muted)] font-semibold">
                    <span>Sedang Ditangani</span>
                    <Clock size={16} className="text-amber-500" />
                  </div>
                  <div className="mt-3 text-3xl font-bold font-mono text-amber-600">
                    {(unitStats?.dispatched || 0) + (unitStats?.inProgress || 0) + (unitStats?.actionTaken || 0)}
                  </div>
                  <div className="mt-2 text-[11px] font-mono text-[var(--color-text-muted)] border-t border-[var(--color-border)] pt-2">
                    {unitStats?.dispatched || 0} Menunggu · {unitStats?.actionTaken || 0} Ditindaklanjuti
                  </div>
                </div>

                <div className="border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                  <div className="flex items-center justify-between text-xs font-mono uppercase text-[var(--color-text-muted)] font-semibold">
                    <span>Kepatuhan SLA</span>
                    <CheckCircle2 size={16} className="text-[var(--color-status-success)]" />
                  </div>
                  <div className="mt-3 text-3xl font-bold font-mono text-[var(--color-status-success)]">
                    {unitStats?.slaComplianceRate || 95}%
                  </div>
                  <div className="mt-2 text-[11px] font-mono text-[var(--color-text-muted)] border-t border-[var(--color-border)] pt-2">
                    Standar SLA: {unitStats?.avgResolutionDays || 2} Hari Kerja
                  </div>
                </div>

                <div className="border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                  <div className="flex items-center justify-between text-xs font-mono uppercase text-[var(--color-text-muted)] font-semibold">
                    <span>Skor CSAT Pelapor</span>
                    <Star size={16} className="text-amber-500 fill-amber-500" />
                  </div>
                  <div className="mt-3 text-3xl font-bold font-mono text-[var(--color-text)] flex items-center gap-1.5">
                    {unitStats?.avgRating || 4.8} <span className="text-sm font-normal text-[var(--color-text-muted)]">/ 5.0</span>
                  </div>
                  <div className="mt-2 text-[11px] font-mono text-[var(--color-text-muted)] border-t border-[var(--color-border)] pt-2">
                    Berdasarkan umpan balik wajib pelapor
                  </div>
                </div>
              </>
            )}
          </section>

          {/* Section: Status Breakdown 7 Tahap Unit */}
          <section className="border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <h3 className="text-xs font-mono uppercase tracking-wider font-bold text-[var(--color-text)] mb-3">
              Distribusi 7 Status Penanganan di Unit {selectedUnit}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-center text-xs">
              {[
                { label: '1. Diterima', count: unitStats?.items?.filter(c => c.status === 'received').length || 0, color: 'sky' },
                { label: '2. Diverifikasi', count: unitStats?.items?.filter(c => c.status === 'verified').length || 0, color: 'purple' },
                { label: '3. Didisposisikan', count: unitStats?.dispatched || 0, color: 'amber' },
                { label: '4. Diproses', count: unitStats?.inProgress || 0, color: 'orange' },
                { label: '5. Ditindaklanjuti', count: unitStats?.actionTaken || 0, color: 'teal' },
                { label: '6. Dijawab', count: unitStats?.answered || 0, color: 'indigo' },
                { label: '7. Selesai', count: unitStats?.resolved || 0, color: 'emerald' },
              ].map(s => (
                <div key={s.label} className="p-3 border border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                  <div className="text-[10px] font-mono text-[var(--color-text-muted)]">{s.label}</div>
                  <div className="text-xl font-bold font-mono mt-1 text-[var(--color-text)]">{s.count}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Antrean Prioritas / Tiket Khusus Unit Ini */}
          <section className="border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider font-mono text-[var(--color-text)]">
                <AlertTriangle size={15} className="text-[var(--color-status-danger)]" aria-hidden="true" />
                Daftar Aduan Memerlukan Tindak Lanjut Unit ({urgentComplaints.length})
              </h3>
              <span className="text-xs font-mono text-[var(--color-text-muted)]">
                Unit: {selectedUnit}
              </span>
            </div>

            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <div key={i} className="skeleton h-14 border border-[var(--color-border)]" />)}
              </div>
            ) : urgentComplaints.length === 0 ? (
              <div className="py-10 text-center text-[var(--color-text-muted)] border border-dashed border-[var(--color-border)]">
                <CheckCircle2 size={26} className="mx-auto mb-2 text-[var(--color-status-success)]" />
                <p className="text-sm font-semibold text-[var(--color-text)]">
                  Tidak ada antrean mendesak untuk unit {selectedUnit}.
                </p>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  Semua aduan disposisi telah ditindaklanjuti dan dijawab dengan baik.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {urgentComplaints.map(c => (
                  <Link
                    key={c.id}
                    to={`/stakeholder/complaints/${c.id}`}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 border border-[var(--color-border)] bg-[var(--color-bg-secondary)] hover:border-[var(--color-primary)] transition-colors group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="font-mono text-xs font-bold text-[var(--color-primary)]">{c.ticket_id}</span>
                        <StatusBadge status={c.status} />
                        <span className="text-[11px] font-mono text-[var(--color-text-muted)]">
                          Urgensi: <strong className="text-[var(--color-status-danger)]">{c.urgency_score}/10</strong>
                        </span>
                      </div>
                      <p className="text-xs text-[var(--color-text)] font-medium line-clamp-1 group-hover:text-[var(--color-primary)] transition-colors">
                        {c.description}
                      </p>
                      <div className="text-[10px] font-mono text-[var(--color-text-muted)] mt-1">
                        Masuk: {formatDate(c.created_at)} · PIC: {c.disposition?.assigned_pic || 'Belum ditugaskan'}
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-[var(--color-primary)] flex-shrink-0 flex items-center gap-1">
                      Proses Aduan <ArrowRight size={12} />
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {/* Printable PDF Modal */}
      {showPdfModal && (
        <UnitReportModal
          unitData={unitStats || { unitName: selectedUnit, total: 0 }}
          complaints={unitStats?.items || []}
          onClose={() => setShowPdfModal(false)}
        />
      )}
    </StakeholderLayout>
  )
}