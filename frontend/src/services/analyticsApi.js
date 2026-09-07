import api from './api.js'
import dayjs from 'dayjs'

const USE_MOCK = true

function delay(ms) { return new Promise(r => setTimeout(r, ms)) }

// Generate mock trend data (30 days)
function generateTrend() {
  return Array.from({ length: 30 }, (_, i) => ({
    date: dayjs().subtract(29 - i, 'day').format('D MMM'),
    count: Math.floor(5 + Math.random() * 20),
  }))
}

const MOCK_SUMMARY = {
  total_complaints: 247,
  total_complaints_trend: 12.3,
  avg_sla_days: 3.2,
  avg_sla_trend: -0.5,
  negative_sentiment_pct: 0.34,
  negative_sentiment_trend: -2.1,
  high_urgency_pending: 8,
}

const MOCK_DISTRIBUTION = [
  { role: 'Mahasiswa', count: 161, pct: 0.65 },
  { role: 'Dosen',     count: 49,  pct: 0.20 },
  { role: 'Tenaga Admin', count: 25, pct: 0.10 },
  { role: 'Mitra',     count: 12,  pct: 0.05 },
]

const MOCK_SENTIMENT = [
  { name: 'Negatif',  nameEn: 'Negative', value: 34, color: '#ef4444' },
  { name: 'Netral',   nameEn: 'Neutral',  value: 45, color: '#f59e0b' },
  { name: 'Positif',  nameEn: 'Positive', value: 21, color: '#10b981' },
]

const MOCK_ISSUES = [
  { category: 'Fasilitas',       count: 89 },
  { category: 'Akademik',        count: 67 },
  { category: 'Administrasi',    count: 52 },
  { category: 'Keuangan',        count: 24 },
  { category: 'Lainnya',         count: 15 },
]

const MOCK_SLA = { compliant: 78, non_compliant: 22 }

const MOCK_UNIT = [
  { unit: 'Sarana Prasarana', count: 89 },
  { unit: 'Akademik',         count: 67 },
  { unit: 'Kemahasiswaan',    count: 52 },
  { unit: 'Keuangan',         count: 24 },
  { unit: 'IT Center',        count: 15 },
]

const MOCK_URGENT = [
  { id: 1, ticket_id: 'ADS-2024-0021', description: 'AC Lab Komputer rusak sudah 2 minggu', urgency_score: 8.9 },
  { id: 2, ticket_id: 'ADS-2024-0034', description: 'Nilai semester tidak muncul di sistem', urgency_score: 8.5 },
  { id: 3, ticket_id: 'ADS-2024-0047', description: 'Beasiswa tidak cair padahal sudah memenuhi syarat', urgency_score: 9.1 },
]

// =============================================
// ANALYTICS API
// =============================================

export async function getSummary() {
  if (USE_MOCK) { await delay(400); return MOCK_SUMMARY }
  const res = await api.get('/analytics/summary')
  return res.data
}

export async function getTrend(period = 'monthly') {
  if (USE_MOCK) { await delay(500); return generateTrend() }
  const res = await api.get('/analytics/trend', { params: { period } })
  return res.data
}

export async function getDistribution() {
  if (USE_MOCK) { await delay(400); return MOCK_DISTRIBUTION }
  const res = await api.get('/analytics/distribution')
  return res.data
}

export async function getSentiment() {
  if (USE_MOCK) { await delay(400); return MOCK_SENTIMENT }
  const res = await api.get('/analytics/sentiment')
  return res.data
}

export async function getIssueTypes() {
  if (USE_MOCK) { await delay(400); return MOCK_ISSUES }
  const res = await api.get('/analytics/issues')
  return res.data
}

export async function getSLAStats() {
  if (USE_MOCK) { await delay(400); return MOCK_SLA }
  const res = await api.get('/analytics/sla')
  return res.data
}

export async function getUnitStats() {
  if (USE_MOCK) { await delay(400); return MOCK_UNIT }
  const res = await api.get('/analytics/units')
  return res.data
}

export async function getUrgentComplaints() {
  if (USE_MOCK) { await delay(400); return MOCK_URGENT }
  const res = await api.get('/analytics/urgent')
  return res.data
}
