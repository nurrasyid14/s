import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import Sidebar from '../../components/layout/Sidebar.jsx'
import Navbar from '../../components/layout/Navbar.jsx'
import {
  getSentiment, getIssueTypes, getSLAStats, getUnitStats,
} from '../../services/analyticsApi.js'
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  RadialBarChart, RadialBar,
} from 'recharts'

const PERIOD_OPTIONS = ['analytics.period_week', 'analytics.period_month', 'analytics.period_custom']
const COLORS = {
  Negatif: '#B3261E', Negative: '#B3261E',
  Netral: '#B8860B', Neutral: '#B8860B',
  Positif: '#1E7145', Positive: '#1E7145',
}

export default function Analytics() {
  const { t } = useTranslation()
  const [period, setPeriod] = useState(0)
  const [sentiment, setSentiment] = useState([])
  const [issues, setIssues] = useState([])
  const [sla, setSLA] = useState(null)
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getSentiment(), getIssueTypes(), getSLAStats(), getUnitStats()])
      .then(([s, i, sl, u]) => { setSentiment(s); setIssues(i); setSLA(sl); setUnits(u) })
      .finally(() => setLoading(false))
  }, [period])

  const slaData = sla ? [
    { name: 'SLA', value: sla.compliant, fill: '#1E7145' },
    { name: 'Breach', value: sla.non_compliant, fill: '#B3261E' },
  ] : []

  const ttStyle = { background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '12px', color: 'var(--color-text)' }

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-bg)]">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar variant="stakeholder" title={t('analytics.title')} />
        <main className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Period filter */}
          <div className="inline-flex items-center gap-1 p-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]">
            {PERIOD_OPTIONS.map((key, i) => (
              <button key={i} onClick={() => setPeriod(i)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-smooth ${period === i ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
                {t(key)}
              </button>
            ))}
          </div>

          {/* Charts grid */}
          <div className="grid lg:grid-cols-2 gap-5">
            {/* Sentiment */}
            <div className="card-elevated rounded-xl p-5">
              <h3 className="font-semibold text-[var(--color-text)] mb-4">{t('analytics.sentiment_title')}</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={sentiment} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} paddingAngle={3}>
                    {sentiment.map((s, i) => <Cell key={i} fill={COLORS[s.name] || s.color} />)}
                  </Pie>
                  <Tooltip contentStyle={ttStyle} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px', color: 'var(--color-text-muted)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Issues */}
            <div className="card-elevated rounded-xl p-5">
              <h3 className="font-semibold text-[var(--color-text)] mb-4">{t('analytics.issue_title')}</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={issues} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false} />
                  <YAxis dataKey="category" type="category" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false} width={90} />
                  <Tooltip contentStyle={ttStyle} cursor={{ fill: 'var(--color-card-hover)' }} />
                  <Bar dataKey="count" fill="#1D4E89" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* SLA */}
            <div className="card-elevated rounded-xl p-5">
              <h3 className="font-semibold text-[var(--color-text)] mb-4">{t('analytics.sla_title')}</h3>
              <div className="flex items-center gap-8">
                <ResponsiveContainer width={160} height={160}>
                  <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="100%" data={slaData} startAngle={90} endAngle={-270}>
                    <RadialBar dataKey="value" cornerRadius={4} />
                    <Tooltip contentStyle={ttStyle} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="space-y-3">
                  <div>
                    <div className="text-3xl font-bold text-[var(--color-status-success)]">{sla?.compliant}%</div>
                    <div className="text-xs text-[var(--color-text-muted)]">SLA Terpenuhi</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-[var(--color-status-danger)]">{sla?.non_compliant}%</div>
                    <div className="text-xs text-[var(--color-text-muted)]">Pelanggaran SLA</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Unit comparison */}
            <div className="card-elevated rounded-xl p-5">
              <h3 className="font-semibold text-[var(--color-text)] mb-4">{t('analytics.unit_title')}</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={units}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="unit" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={ttStyle} cursor={{ fill: 'var(--color-card-hover)' }} />
                  <Bar dataKey="count" fill="#F2B705" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}