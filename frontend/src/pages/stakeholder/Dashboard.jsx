import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import StakeholderLayout from '../../components/layout/StakeholderLayout.jsx'
import StatCard from '../../components/ui/StatCard.jsx'
import { StatusBadge, UrgencyBadge } from '../../components/ui/StatusBadge.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import SegmentedControl from '../../components/ui/SegmentedControl.jsx'
import ErrorState from '../../components/ui/ErrorState.jsx'
import { formatDate } from '../../utils/formatter.js'
import { AXIS_TICK, SERIES_COLORS, TOOLTIP_STYLE } from '../../utils/chartTheme.js'
import { MessageSquare, Clock, Frown, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react'
import {
  getSummary, getTrend, getDistribution, getUrgentComplaints,
} from '../../services/analyticsApi.js'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell,
} from 'recharts'

const URGENT_PREVIEW_LIMIT = 5

const focusRing =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]'

/** Kartu sorotan (setara kartu "overdue" pada referensi): jumlah aduan urgency tinggi + jalan pintas ke Tindak Lanjut. */
function UrgencyHighlight({ count }) {
  const { t } = useTranslation()

  return (
    <Link
      to="/stakeholder/followups"
      className={`flex flex-col justify-between rounded-xl border p-5 transition-smooth hover:shadow-md ${focusRing}`}
      style={{
        background: 'color-mix(in srgb, var(--color-status-danger) 8%, var(--color-surface))',
        borderColor: 'color-mix(in srgb, var(--color-status-danger) 30%, var(--color-border))',
      }}
    >
      <div className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-muted)]">
        <AlertTriangle size={16} className="text-[var(--color-status-danger)]" aria-hidden="true" />
        {t('dashboard.high_urgency')}
      </div>
      <div className="mt-2 text-3xl font-bold text-[var(--color-status-danger)]">{count}</div>
      <div className="mt-3 flex items-center justify-between gap-2 text-xs">
        <span className="text-[var(--color-text-muted)]">
          {t('stk.dashboard.needs_attention', 'Perlu perhatian')}
        </span>
        <span className="inline-flex items-center gap-1 font-semibold text-[var(--color-primary)]">
          {t('stk.dashboard.view_followups', 'Lihat tindak lanjut')}
          <ArrowRight size={12} aria-hidden="true" />
        </span>
      </div>
    </Link>
  )
}

function UrgentItem({ complaint }) {
  const { t } = useTranslation()
  const meta = [
    complaint.sender_role && `${t('complaints.anonymous')} · ${complaint.sender_role}`,
    complaint.created_at && formatDate(complaint.created_at),
  ].filter(Boolean).join(' · ')

  return (
    <Link
      to={`/stakeholder/complaints/${complaint.id}`}
      className={`flex flex-col gap-2 rounded-lg border border-[var(--color-border)] p-3.5 transition-smooth hover:bg-[var(--color-card-hover)] sm:flex-row sm:items-center sm:gap-4 ${focusRing}`}
    >
      <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
        {complaint.ticket_id && (
          <span className="font-mono text-xs text-[var(--color-text-muted)]">{complaint.ticket_id}</span>
        )}
        <UrgencyBadge score={complaint.urgency_score} />
        {complaint.status && <StatusBadge status={complaint.status} />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-[var(--color-text)]">{complaint.description}</p>
        {meta && <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{meta}</p>}
      </div>
      <span className="flex-shrink-0 text-xs font-semibold text-[var(--color-primary)]">
        {t('dashboard.review')} →
      </span>
    </Link>
  )
}

function NoData({ children }) {
  return (
    <div className="flex h-[220px] items-center justify-center text-sm text-[var(--color-text-muted)]">
      {children}
    </div>
  )
}

export default function StakeholderDashboard() {
  const { t } = useTranslation()
  const [summary, setSummary] = useState(null)
  const [trend, setTrend] = useState([])
  const [dist, setDist] = useState([])
  const [urgent, setUrgent] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [period, setPeriod] = useState('30')

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(false)
    Promise.all([getSummary(), getTrend(), getDistribution(), getUrgentComplaints()])
      .then(([s, tr, d, u]) => {
        if (!active) return
        setSummary(s)
        setTrend(tr)
        setDist(d)
        setUrgent(u)
      })
      .catch(() => { if (active) setError(true) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [reloadKey])

  const periodOptions = [
    { key: '7', label: t('stk.dashboard.period_7', '7 hari') },
    { key: '30', label: t('stk.dashboard.period_30', '30 hari') },
    { key: 'all', label: t('stk.dashboard.period_all', 'Semua') },
  ]

  // getTrend() tidak menerima parameter periode, jadi rentang dipotong di sisi klien
  // (asumsi: satu titik data per hari, urut dari terlama ke terbaru).
  const visibleTrend = period === 'all' ? trend : trend.slice(-Number(period))
  const distTotal = dist.reduce((sum, d) => sum + d.count, 0)

  return (
    <StakeholderLayout title={t('dashboard.title')} notifCount={urgent.length}>
      <PageHeader
        heading={t('stk.dashboard.heading', 'Ringkasan aduan')}
        description={t('stk.dashboard.description', 'Pantau kondisi, SLA, dan aduan prioritas dalam satu tampilan.')}
        actions={
          <Link
            to="/stakeholder/complaints"
            className={`inline-flex items-center gap-2 rounded-lg border border-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-primary)] transition-smooth hover:bg-[var(--color-primary-soft)] ${focusRing}`}
          >
            {t('stk.dashboard.view_all', 'Lihat semua aduan')}
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        }
      />

      {error ? (
        <ErrorState onRetry={() => setReloadKey(k => k + 1)} />
      ) : (
        <>
          {/* KPI */}
          <section
            aria-label={t('stk.dashboard.kpi_label', 'Indikator utama')}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
          >
            {loading ? (
              [1, 2, 3, 4].map(i => <div key={i} className="skeleton h-28 rounded-xl" />)
            ) : (
              <>
                <StatCard
                  title={t('dashboard.total_complaints')}
                  value={summary?.total_complaints?.toLocaleString() ?? '—'}
                  trend={summary?.total_complaints_trend}
                  icon={MessageSquare} color="blue"
                />
                <StatCard
                  title={t('dashboard.avg_sla')}
                  value={`${summary?.avg_sla_days ?? '—'} ${t('dashboard.days')}`}
                  trend={summary?.avg_sla_trend}
                  icon={Clock} color="blue"
                />
                <StatCard
                  title={t('dashboard.negative_sentiment')}
                  value={`${Math.round((summary?.negative_sentiment_pct || 0) * 100)}%`}
                  trend={summary?.negative_sentiment_trend}
                  icon={Frown} color="amber"
                />
                <UrgencyHighlight count={summary?.high_urgency_pending ?? 0} />
              </>
            )}
          </section>

          {/* Charts */}
          <section className="grid gap-4 lg:grid-cols-3">
            <div className="card-elevated rounded-xl p-5 lg:col-span-2">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-base font-semibold text-[var(--color-text)]">{t('dashboard.trend_title')}</h3>
                <SegmentedControl
                  label={t('stk.dashboard.period_label', 'Rentang tren')}
                  options={periodOptions}
                  value={period}
                  onChange={setPeriod}
                />
              </div>
              {loading ? (
                <div className="skeleton h-[240px] rounded-lg" />
              ) : visibleTrend.length === 0 ? (
                <NoData>{t('stk.common.no_data', 'Belum ada data.')}</NoData>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={visibleTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="date" tick={AXIS_TICK} tickLine={false} axisLine={false} minTickGap={24} />
                    <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} width={32} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: 'var(--color-text-muted)' }} />
                    <Line
                      type="monotone"
                      dataKey="count"
                      name={t('stk.dashboard.count', 'Aduan')}
                      stroke="var(--color-primary)"
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 4, fill: 'var(--color-accent)' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="card-elevated rounded-xl p-5">
              <h3 className="mb-4 text-base font-semibold text-[var(--color-text)]">
                {t('dashboard.distribution_title')}
              </h3>
              {loading ? (
                <div className="skeleton h-[240px] rounded-lg" />
              ) : dist.length === 0 ? (
                <NoData>{t('stk.common.no_data', 'Belum ada data.')}</NoData>
              ) : (
                <>
                  <div className="relative">
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie
                          data={dist}
                          dataKey="count"
                          nameKey="role"
                          cx="50%" cy="50%"
                          innerRadius={52} outerRadius={78}
                          paddingAngle={3}
                          stroke="none"
                        >
                          {dist.map((_, i) => <Cell key={i} fill={SERIES_COLORS[i % SERIES_COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={TOOLTIP_STYLE} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-bold text-[var(--color-text)]">{distTotal.toLocaleString()}</span>
                      <span className="text-xs text-[var(--color-text-muted)]">{t('stk.dashboard.total', 'Total')}</span>
                    </div>
                  </div>
                  <ul className="mt-3 space-y-1.5">
                    {dist.map((d, i) => (
                      <li key={i} className="flex items-center justify-between gap-2 text-sm">
                        <span className="flex min-w-0 items-center gap-2 text-[var(--color-text)]">
                          <span
                            className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                            style={{ background: SERIES_COLORS[i % SERIES_COLORS.length] }}
                            aria-hidden="true"
                          />
                          <span className="truncate">{d.role}</span>
                        </span>
                        <span className="flex-shrink-0 text-xs text-[var(--color-text-muted)]">
                          {d.count} · {distTotal ? Math.round((d.count / distTotal) * 100) : 0}%
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </section>

          {/* Aduan yang memerlukan perhatian */}
          <section className="card-elevated rounded-xl p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 text-base font-semibold text-[var(--color-text)]">
                <AlertTriangle size={16} className="text-[var(--color-status-danger)]" aria-hidden="true" />
                {t('dashboard.attention_title')}
              </h3>
              <Link
                to="/stakeholder/followups"
                className={`rounded text-xs font-medium text-[var(--color-primary)] hover:underline ${focusRing}`}
              >
                {t('common.see_all')}
              </Link>
            </div>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <div key={i} className="skeleton h-14 rounded-lg" />)}
              </div>
            ) : urgent.length === 0 ? (
              <div className="py-8 text-center text-[var(--color-text-muted)]">
                <CheckCircle2 size={28} className="mx-auto mb-2 text-[var(--color-status-success)]" aria-hidden="true" />
                <p className="text-sm">
                  {t('stk.dashboard.urgent_empty', 'Tidak ada aduan yang memerlukan perhatian segera.')}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {urgent.slice(0, URGENT_PREVIEW_LIMIT).map(c => <UrgentItem key={c.id} complaint={c} />)}
              </div>
            )}
          </section>
        </>
      )}
    </StakeholderLayout>
  )
}