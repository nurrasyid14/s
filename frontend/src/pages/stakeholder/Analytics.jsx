import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import StakeholderLayout from '../../components/layout/StakeholderLayout.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import SegmentedControl from '../../components/ui/SegmentedControl.jsx'
import ErrorState from '../../components/ui/ErrorState.jsx'
import { AXIS_TICK, TOOLTIP_STYLE } from '../../utils/chartTheme.js'
import {
  getSentiment, getIssueTypes, getSLAStats, getUnitStats, getExecutiveAISummary,
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

function ChartCard({ title, loading, empty, caption, srSummary, children }) {
  const { t } = useTranslation()

  return (
    <section className="border border-[var(--color-border)] bg-[var(--color-surface)] p-5 md:p-6 rounded-2xl shadow-sm">
      <h3 className="mb-4 text-xs font-bold uppercase tracking-wider font-mono text-[var(--color-text)]">{title}</h3>
      {loading ? (
        <div className="skeleton h-[220px] border border-[var(--color-border)] rounded-xl" />
      ) : empty ? (
        <div className="flex h-[220px] items-center justify-center text-xs font-mono text-[var(--color-text-muted)]">
          {t('stk.common.no_data', 'Belum ada data.')}
        </div>
      ) : (
        <>
          {srSummary && <p className="sr-only">{srSummary}</p>}
          {children}
        </>
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

  // AI Executive Summary State
  const [aiSummary, setAiSummary] = useState(null)
  const [aiLoading, setAiLoading] = useState(true)
  const [refreshAiKey, setRefreshAiKey] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(false)
    Promise.allSettled([getSentiment(), getIssueTypes(), getSLAStats(), getUnitStats()])
      .then(([resS, resI, resSl, resU]) => {
        if (!active) return
        if (resS.status === 'fulfilled') setSentiment(resS.value || [])
        if (resI.status === 'fulfilled') setIssues(resI.value || [])
        if (resSl.status === 'fulfilled') setSLA(resSl.value)
        if (resU.status === 'fulfilled') setUnits(resU.value || [])

        if (resS.status === 'rejected' && resI.status === 'rejected' && resU.status === 'rejected') {
          setError(true)
        }
      })
      .catch(() => { if (active) setError(true) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [period, reloadKey])

  useEffect(() => {
    let active = true
    setAiLoading(true)
    getExecutiveAISummary()
      .then(res => {
        if (active && res) setAiSummary(res)
      })
      .catch(() => {})
      .finally(() => {
        if (active) setAiLoading(false)
      })
    return () => { active = false }
  }, [refreshAiKey, reloadKey])

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

      {/* Executive AI Grounded Narrative Summary Card */}
      <section className="mb-6 rounded-2xl border border-[var(--color-primary)]/20 bg-gradient-to-r from-[var(--color-surface)] via-[var(--color-surface)] to-[var(--color-primary)]/5 p-5 md:p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--color-primary)]">
              Executive AI Grounded Narrative
            </span>
            <span className="rounded-md bg-[var(--color-primary)]/10 px-2 py-0.5 font-mono text-[11px] text-[var(--color-primary)]">
              {aiSummary?.model_used ? `Model: ${aiSummary.model_used}` : 'Qwen3:8B'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {aiSummary?.grounding?.grounding_note && (
              <span className="hidden sm:inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
                ✓ Angka Terverifikasi Faktual
              </span>
            )}
            <button
              type="button"
              onClick={() => setRefreshAiKey(k => k + 1)}
              disabled={aiLoading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 font-mono text-xs text-[var(--color-text)] hover:bg-[var(--color-card-hover)] transition disabled:opacity-50"
            >
              <svg className={`h-3.5 w-3.5 ${aiLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{aiLoading ? 'Menganalisis...' : 'Regenerasi Narasi'}</span>
            </button>
          </div>
        </div>

        <div className="mt-4">
          {aiLoading ? (
            <div className="space-y-2 py-2">
              <div className="h-4 w-full bg-[var(--color-border)]/40 rounded animate-pulse" />
              <div className="h-4 w-5/6 bg-[var(--color-border)]/40 rounded animate-pulse" />
              <div className="h-4 w-4/6 bg-[var(--color-border)]/40 rounded animate-pulse" />
            </div>
          ) : aiSummary?.summary ? (
            <p className="text-sm md:text-base leading-relaxed text-[var(--color-text)]">
              {aiSummary.summary}
            </p>
          ) : (
            <p className="text-sm text-[var(--color-text-muted)] italic">
              Ringkasan naratif analitik belum tersedia.
            </p>
          )}
        </div>

        {aiSummary?.metrics && (
          <div className="mt-4 pt-3 border-t border-[var(--color-border)]/60 flex flex-wrap gap-2 sm:gap-3 text-xs font-mono">
            <span className="rounded-lg bg-[var(--color-bg-secondary)] px-2.5 py-1 text-[var(--color-text-muted)]">
              Total Masukan: <strong className="text-[var(--color-text)]">{aiSummary.metrics.total_records}</strong>
            </span>
            <span className="rounded-lg bg-[var(--color-bg-secondary)] px-2.5 py-1 text-[var(--color-text-muted)]">
              Kepatuhan SLA: <strong className="text-emerald-500">{aiSummary.metrics.overall_compliant_pct}%</strong>
            </span>
            <span className="rounded-lg bg-[var(--color-bg-secondary)] px-2.5 py-1 text-[var(--color-text-muted)]">
              Sentimen Negatif: <strong className="text-rose-500">{aiSummary.metrics.sentiment?.negative_pct}%</strong>
            </span>
            <span className="rounded-lg bg-[var(--color-bg-secondary)] px-2.5 py-1 text-[var(--color-text-muted)]">
              Tiket Kritis Tertunda: <strong className="text-amber-500">{aiSummary.metrics.high_urgency_pending}</strong>
            </span>
          </div>
        )}
      </section>

      {error ? (
        <ErrorState onRetry={() => setReloadKey(k => k + 1)} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          <ChartCard
            title={t('analytics.sentiment_title')}
            loading={loading}
            empty={sentiment.length === 0}
            srSummary={`Ringkasan sentimen aduan: ${sentiment.map(s => `${s.name}: ${s.value}`).join(', ')}`}
          >
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={sentiment} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} stroke="none">
                  {sentiment.map((s, i) => <Cell key={i} fill={sentimentColor(s)} />)}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--color-text-muted)' }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title={t('analytics.issue_title')}
            loading={loading}
            empty={issues.length === 0}
            srSummary={`Kategori masalah: ${issues.map(i => `${i.category}: ${i.count}`).join(', ')}`}
            caption={<Insight label={t('stk.analytics.top_issue', 'Paling sering')} top={topBy(issues, 'category')} />}
          >
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={issues} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                <XAxis type="number" tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis dataKey="category" type="category" tick={AXIS_TICK} tickLine={false} axisLine={false} width={90} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'var(--color-card-hover)' }} />
                <Bar dataKey="count" fill="var(--color-primary)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title={t('analytics.sla_title')}
            loading={loading}
            empty={!sla}
            srSummary={`Kepatuhan SLA: ${sla?.compliant}% terpenuhi, ${sla?.non_compliant}% melanggar SLA.`}
          >
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-8">
              <ResponsiveContainer width={160} height={160}>
                <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="100%" data={slaData} startAngle={90} endAngle={-270}>
                  <RadialBar dataKey="value" cornerRadius={6} background={{ fill: 'var(--color-bg-secondary)' }} />
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
            srSummary={`Distribusi beban unit: ${units.map(u => `${u.unit}: ${u.count}`).join(', ')}`}
            caption={<Insight label={t('stk.analytics.top_unit', 'Unit terbanyak')} top={topBy(units, 'unit')} />}
          >
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={units}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="unit" tick={{ ...AXIS_TICK, fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'var(--color-card-hover)' }} />
                <Bar dataKey="count" fill="var(--color-accent)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}
    </StakeholderLayout>
  )
}