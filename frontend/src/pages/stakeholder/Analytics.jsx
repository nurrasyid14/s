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

const PERIOD_OPTIONS = ['dashboard.period_week', 'dashboard.period_month', 'analytics.period_custom']
const COLORS = { Negatif: '#ef4444', Netral: '#f59e0b', Positif: '#10b981', Negative: '#ef4444', Neutral: '#f59e0b', Positive: '#10b981' }

export default function Analytics() {
  const { t } = useTranslation()
  const [period,    setPeriod]    = useState(0)
  const [sentiment, setSentiment] = useState([])
  const [issues,    setIssues]    = useState([])
  const [sla,       setSLA]       = useState(null)
  const [units,     setUnits]     = useState([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    Promise.all([getSentiment(), getIssueTypes(), getSLAStats(), getUnitStats()])
      .then(([s, i, sl, u]) => { setSentiment(s); setIssues(i); setSLA(sl); setUnits(u) })
      .finally(() => setLoading(false))
  }, [period])

  const slaData = sla ? [
    { name: 'SLA', value: sla.compliant, fill: '#10b981' },
    { name: 'Breach', value: sla.non_compliant, fill: '#ef4444' },
  ] : []

  const ttStyle = { background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-bg)]">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar variant="stakeholder" title={t('analytics.title')} />
        <main className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Period filter */}
          <div className="flex gap-2">
            {[0, 1, 2].map(i => (
              <button key={i} onClick={() => setPeriod(i)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-smooth ${period === i ? 'bg-blue-600 text-white' : 'border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
                {t(PERIOD_OPTIONS[i])}
              </button>
            ))}
          </div>

          {/* Charts grid */}
          <div className="grid lg:grid-cols-2 gap-5">
            {/* Sentiment */}
            <div className="card-elevated p-5">
              <h3 className="font-semibold text-[var(--color-text)] mb-4">{t('analytics.sentiment_title')}</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={sentiment} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} paddingAngle={3}>
                    {sentiment.map((s, i) => <Cell key={i} fill={COLORS[s.name] || s.color} />)}
                  </Pie>
                  <Tooltip contentStyle={ttStyle} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Issues */}
            <div className="card-elevated p-5">
              <h3 className="font-semibold text-[var(--color-text)] mb-4">{t('analytics.issue_title')}</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={issues} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <YAxis dataKey="category" type="category" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={90} />
                  <Tooltip contentStyle={ttStyle} cursor={{ fill: 'rgba(148,163,184,0.05)' }} />
                  <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* SLA */}
            <div className="card-elevated p-5">
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
                    <div className="text-3xl font-bold text-emerald-400">{sla?.compliant}%</div>
                    <div className="text-xs text-[var(--color-text-muted)]">SLA Terpenuhi</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-red-400">{sla?.non_compliant}%</div>
                    <div className="text-xs text-[var(--color-text-muted)]">Pelanggaran SLA</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Unit comparison */}
            <div className="card-elevated p-5">
              <h3 className="font-semibold text-[var(--color-text)] mb-4">{t('analytics.unit_title')}</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={units}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" vertical={false} />
                  <XAxis dataKey="unit" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={ttStyle} cursor={{ fill: 'rgba(148,163,184,0.05)' }} />
                  <Bar dataKey="count" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
