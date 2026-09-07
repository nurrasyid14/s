import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import Sidebar from '../../components/layout/Sidebar.jsx'
import Navbar from '../../components/layout/Navbar.jsx'
import StatCard from '../../components/ui/StatCard.jsx'
import { MessageSquare, Clock, Frown, AlertTriangle } from 'lucide-react'
import {
  getSummary, getTrend, getDistribution, getUrgentComplaints,
} from '../../services/analyticsApi.js'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { useTranslation as useT } from 'react-i18next'

export default function StakeholderDashboard() {
  const { t } = useTranslation()
  const [summary,  setSummary]  = useState(null)
  const [trend,    setTrend]    = useState([])
  const [dist,     setDist]     = useState([])
  const [urgent,   setUrgent]   = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    Promise.all([getSummary(), getTrend(), getDistribution(), getUrgentComplaints()])
      .then(([s, tr, d, u]) => { setSummary(s); setTrend(tr); setDist(d); setUrgent(u) })
      .finally(() => setLoading(false))
  }, [])

  const DONUT_COLORS = ['#3b82f6', '#14b8a6', '#a855f7', '#f59e0b']

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-bg)]">
      <Sidebar notifCount={urgent.length} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar variant="stakeholder" title={t('dashboard.title')} notifCount={urgent.length} />
        <main className="flex-1 overflow-y-auto p-6">

          {/* Stat Cards */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            <StatCard
              title={t('dashboard.total_complaints')}
              value={loading ? '—' : summary?.total_complaints.toLocaleString()}
              trend={summary?.total_complaints_trend}
              icon={MessageSquare} color="blue"
            />
            <StatCard
              title={t('dashboard.avg_sla')}
              value={loading ? '—' : `${summary?.avg_sla_days} ${t('dashboard.days')}`}
              trend={summary?.avg_sla_trend}
              icon={Clock} color="teal"
            />
            <StatCard
              title={t('dashboard.negative_sentiment')}
              value={loading ? '—' : `${Math.round((summary?.negative_sentiment_pct || 0) * 100)}%`}
              trend={summary?.negative_sentiment_trend}
              icon={Frown} color="amber"
            />
            <StatCard
              title={t('dashboard.high_urgency')}
              value={loading ? '—' : String(summary?.high_urgency_pending)}
              icon={AlertTriangle} color="red"
            />
          </div>

          {/* Charts row */}
          <div className="grid lg:grid-cols-3 gap-4 mb-6">
            {/* Trend chart */}
            <div className="lg:col-span-2 card-elevated p-5">
              <h3 className="font-semibold text-[var(--color-text)] mb-4">{t('dashboard.trend_title')}</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} interval={4} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }}
                    labelStyle={{ color: '#94a3b8' }}
                    itemStyle={{ color: '#2dd4bf' }}
                  />
                  <Line type="monotone" dataKey="count" stroke="#14b8a6" strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: '#14b8a6' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Donut chart */}
            <div className="card-elevated p-5">
              <h3 className="font-semibold text-[var(--color-text)] mb-4">{t('dashboard.distribution_title')}</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={dist} dataKey="count" nameKey="role" cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3}>
                    {dist.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }}
                    formatter={(v, n) => [v, n]}
                  />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Urgent complaints */}
          <div className="card-elevated p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[var(--color-text)] flex items-center gap-2">
                <AlertTriangle size={16} className="text-red-400" />
                {t('dashboard.attention_title')}
              </h3>
              <Link to="/stakeholder/followups" className="text-xs text-blue-400 hover:text-blue-300">{t('common.see_all')}</Link>
            </div>
            {urgent.length === 0 ? (
              <div className="text-center py-10 text-[var(--color-text-muted)]">
                <div className="text-3xl mb-2">✅</div>
                <p className="text-sm">Tidak ada aduan yang memerlukan perhatian segera.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {urgent.map(c => (
                  <Link to={`/stakeholder/complaints/${c.id}`} key={c.id}
                    className="flex items-center gap-4 p-3.5 rounded-xl hover:bg-[var(--color-card-hover)] transition-smooth border border-[var(--color-border)]">
                    <span className="px-2.5 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-bold uppercase tracking-wider flex-shrink-0">
                      URGENCY {c.urgency_score}
                    </span>
                    <span className="text-sm text-[var(--color-text)] flex-1 truncate">{c.description}</span>
                    <span className="text-xs text-blue-400 flex-shrink-0">{t('dashboard.review')} →</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
