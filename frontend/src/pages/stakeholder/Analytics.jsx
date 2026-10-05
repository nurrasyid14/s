import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import StakeholderLayout from '../../components/layout/StakeholderLayout.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import SegmentedControl from '../../components/ui/SegmentedControl.jsx'
import ErrorState from '../../components/ui/ErrorState.jsx'
import { AXIS_TICK, TOOLTIP_STYLE } from '../../utils/chartTheme.js'
import {
  getSentiment, getIssueTypes, getSLAStats, getUnitStats,
} from '../../services/analyticsApi.js'
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  RadialBarChart, RadialBar,
} from 'recharts'

const PERIOD_KEYS = ['week', 'month', 'custom']

const SENTIMENT_COLORS = {
  negatif: 'var(--color-status-danger)',
  negative: 'var(--color-status-danger)',
  netral: 'var(--color-status-warning)',
  neutral: 'var(--color-status-warning)',
  positif: 'var(--color-status-success)',
  positive: 'var(--color-status-success)',
}

const sentimentColor = item =>
  SENTIMENT_COLORS[String(item.name).toLowerCase()] || item.color || 'var(--color-text-muted)'

/** Item dengan `count` terbesar, dikembalikan sebagai { label, count }; null jika data kosong. */
function topBy(items, key) {
  if (items.length === 0) return null
  const best = items.reduce((a, b) => (b.count > a.count ? b : a))
  return { label: best[key], count: best.count }
}

function ChartCard({ title, loading, empty, caption, children }) {
  const { t } = useTranslation()

  return (
    <section className="border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <h3 className="mb-4 text-xs font-bold uppercase tracking-wider font-mono text-[var(--color-text)]">{title}</h3>
      {loading ? (
        <div className="skeleton h-[220px] border border-[var(--color-border)]" />
      ) : empty ? (
        <div className="flex h-[220px] items-center justify-center text-xs font-mono text-[var(--color-text-muted)]">
          {t('stk.common.no_data', 'Belum ada data.')}
        </div>
      ) : (
        children
      )}
      {!loading && !empty && caption && (
        <p className="mt-3 pt-3 border-t border-[var(--color-border)] text-xs font-mono text-[var(--color-text-muted)]">{caption}</p>
      )}
    </section>
  )
}

function Insight({ label, top }) {
  if (!top) return null
  return (
    <>
      {label}:{' '}
      <span className="font-semibold text-[var(--color-text)]">{top.label}</span> ({top.count})
    </>
  )
}

export default function Analytics() {
  const { t } = useTranslation()
  const [period, setPeriod] = useState('week')
  const [sentiment, setSentiment] = useState([])
  const [issues, setIssues] = useState([])
  const [sla, setSLA] = useState(null)
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  // TODO: fungsi service analytics saat ini tidak menerima parameter periode.
  // Setelah service mendukungnya, teruskan `period` ke keempat pemanggilan di bawah.
  useEffect(() => {
    let active = true
    setLoading(true)
    setError(false)
    Promise.all([getSentiment(), getIssueTypes(), getSLAStats(), getUnitStats()])
      .then(([s, i, sl, u]) => {
        if (!active) return
        setSentiment(s)
        setIssues(i)
        setSLA(sl)
        setUnits(u)
      })
      .catch(() => { if (active) setError(true) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [period, reloadKey])

  const periodOptions = PERIOD_KEYS.map(key => ({ key, label: t(`analytics.period_${key}`) }))

  const slaData = sla
    ? [
      { name: 'SLA', value: sla.compliant, fill: 'var(--color-status-success)' },
      { name: 'Breach', value: sla.non_compliant, fill: 'var(--color-status-danger)' },
    ]
    : []

  return (
    <StakeholderLayout title={t('analytics.title')}>
      <PageHeader
        heading={t('stk.analytics.heading', 'Pola dan performa')}
        description={t('stk.analytics.description', 'Pahami sentimen, jenis masalah, kepatuhan SLA, dan beban tiap unit.')}
        actions={
          <SegmentedControl
            label={t('stk.analytics.period_label', 'Periode analisis')}
            options={periodOptions}
            value={period}
            onChange={setPeriod}
          />
        }
      />

      {error ? (
        <ErrorState onRetry={() => setReloadKey(k => k + 1)} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          <ChartCard title={t('analytics.sentiment_title')} loading={loading} empty={sentiment.length === 0}>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={sentiment} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} stroke="none">
                  {sentiment.map((s, i) => <Cell key={i} fill={sentimentColor(s)} />)}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--color-text-muted)' }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title={t('analytics.issue_title')}
            loading={loading}
            empty={issues.length === 0}
            caption={<Insight label={t('stk.analytics.top_issue', 'Paling sering')} top={topBy(issues, 'category')} />}
          >
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={issues} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                <XAxis type="number" tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis dataKey="category" type="category" tick={AXIS_TICK} tickLine={false} axisLine={false} width={90} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'var(--color-card-hover)' }} />
                <Bar dataKey="count" fill="var(--color-primary)" radius={0} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title={t('analytics.sla_title')} loading={loading} empty={!sla}>
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-8">
              <ResponsiveContainer width={160} height={160}>
                <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="100%" data={slaData} startAngle={90} endAngle={-270}>
                  <RadialBar dataKey="value" cornerRadius={0} background={{ fill: 'var(--color-bg-secondary)' }} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="space-y-3 font-mono">
                <div>
                  <div className="text-3xl font-bold text-[var(--color-status-success)]">{sla?.compliant}%</div>
                  <div className="text-xs text-[var(--color-text-muted)] uppercase">{t('stk.analytics.sla_ok', 'SLA terpenuhi')}</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-[var(--color-status-danger)]">{sla?.non_compliant}%</div>
                  <div className="text-xs text-[var(--color-text-muted)] uppercase">{t('stk.analytics.sla_breach', 'Pelanggaran SLA')}</div>
                </div>
              </div>
            </div>
          </ChartCard>

          <ChartCard
            title={t('analytics.unit_title')}
            loading={loading}
            empty={units.length === 0}
            caption={<Insight label={t('stk.analytics.top_unit', 'Unit terbanyak')} top={topBy(units, 'unit')} />}
          >
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={units}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="unit" tick={{ ...AXIS_TICK, fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'var(--color-card-hover)' }} />
                <Bar dataKey="count" fill="var(--color-accent)" radius={0} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}
    </StakeholderLayout>
  )
}