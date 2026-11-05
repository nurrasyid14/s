import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/id'

dayjs.extend(relativeTime)

/**
 * Format tanggal ke "15 Jan 2024"
 */
export function formatDate(date, locale = 'id') {
  return dayjs(date).locale(locale).format('D MMM YYYY')
}

/**
 * Format tanggal + jam ke "15 Jan 2024, 13:45"
 */
export function formatDateTime(date, locale = 'id') {
  return dayjs(date).locale(locale).format('D MMM YYYY, HH:mm')
}

/**
 * Format relative time ("2 hari lalu", "baru saja")
 */
export function formatRelative(date, locale = 'id') {
  return dayjs(date).locale(locale).fromNow()
}

/**
 * Format angka dengan separator ribuan
 * 1000 → "1.000" (ID) / "1,000" (EN)
 */
export function formatNumber(num, locale = 'id-ID') {
  return new Intl.NumberFormat(locale).format(num)
}

/**
 * Format persentase
 * 0.34 → "34%"
 */
export function formatPercent(num, decimals = 0) {
  return `${(num * 100).toFixed(decimals)}%`
}

/**
 * Format durasi dalam hari
 * 3.2 → "3,2 hari" / "3.2 days"
 */
export function formatDays(days, locale = 'id') {
  const formatted = Number(days).toFixed(1)
  return locale === 'id' ? `${formatted} hari` : `${formatted} days`
}

/**
 * Map 7 status alur kerja resmi SuaraLens:
 * Diterima -> Diverifikasi -> Didisposisikan -> Diproses -> Ditindaklanjuti -> Dijawab -> Selesai
 */
export const STATUS_MAP = {
  // 7 Status Resmi
  received:     { label: 'Diterima',       labelEn: 'Received',     color: 'sky',    step: 1 },
  verified:     { label: 'Diverifikasi',   labelEn: 'Verified',     color: 'purple', step: 2 },
  dispatched:   { label: 'Didisposisikan', labelEn: 'Dispatched',   color: 'amber',  step: 3 },
  in_progress:  { label: 'Diproses',       labelEn: 'In Progress',  color: 'orange', step: 4 },
  action_taken: { label: 'Ditindaklanjuti',labelEn: 'Action Taken', color: 'teal',   step: 5 },
  answered:     { label: 'Dijawab',        labelEn: 'Answered',     color: 'indigo', step: 6 },
  resolved:     { label: 'Selesai',        labelEn: 'Resolved',     color: 'emerald',step: 7 },

  // Kompatibilitas mundur
  new:          { label: 'Diterima',       labelEn: 'Received',     color: 'sky',    step: 1 },
  process:      { label: 'Diproses',       labelEn: 'In Progress',  color: 'orange', step: 4 },
  done:         { label: 'Selesai',        labelEn: 'Resolved',     color: 'emerald',step: 7 },
  escalate:     { label: 'Didisposisikan', labelEn: 'Dispatched',   color: 'amber',  step: 3 },
}

export const WORKFLOW_STEPS = [
  { key: 'received',     label: 'Diterima',       labelEn: 'Received' },
  { key: 'verified',     label: 'Diverifikasi',   labelEn: 'Verified' },
  { key: 'dispatched',   label: 'Didisposisikan', labelEn: 'Dispatched' },
  { key: 'in_progress',  label: 'Diproses',       labelEn: 'In Progress' },
  { key: 'action_taken', label: 'Ditindaklanjuti',labelEn: 'Action Taken' },
  { key: 'answered',     label: 'Dijawab',        labelEn: 'Answered' },
  { key: 'resolved',     label: 'Selesai',        labelEn: 'Resolved' },
]

export const STREAMLINED_STEPS = [
  { key: 'received', label: 'Diterima',       labelEn: 'Received' },
  { key: 'verified', label: 'Ditinjau Unit',  labelEn: 'Reviewed' },
  { key: 'answered', label: 'Dijawab Resmi',  labelEn: 'Answered' },
  { key: 'resolved', label: 'Selesai & Dicatat', labelEn: 'Recorded' },
]

export function getStatusInfo(status) {
  return STATUS_MAP[status] || { label: status, labelEn: status, color: 'gray' }
}

/**
 * Normalisasi skor urgensi ke skala 0-10 jika model ML menghasilkan rentang 0.0 - 1.0
 */
export function normalizeUrgencyScore(score) {
  const num = Number(score)
  if (isNaN(num) || num <= 0) return 0
  // Jika nilai <= 1.0, berarti dari ML scale [0.0, 1.0] -> konversi ke [0, 10]
  if (num <= 1.0) {
    return Math.min(10, Math.round(num * 100) / 10)
  }
  return Math.min(10, num)
}

/**
 * Map urgency score (0-10) ke level
 */
export function getUrgencyLevel(score) {
  const normalized = normalizeUrgencyScore(score)
  if (normalized >= 8) return { level: 'Tinggi', levelEn: 'High',   color: 'red'    }
  if (normalized >= 5) return { level: 'Sedang', levelEn: 'Medium', color: 'amber'  }
  return              { level: 'Rendah', levelEn: 'Low',    color: 'emerald'}
}

/**
 * Format skor urgensi menjadi angka dengan 1 desimal (contoh: 8.5) atau '0'
 */
export function formatUrgencyScore(score) {
  const normalized = normalizeUrgencyScore(score)
  return normalized === 0 ? '0' : (normalized % 1 === 0 ? normalized.toString() : normalized.toFixed(1))
}

/**
 * Truncate text dengan ellipsis
 */
export function truncate(text, maxLength = 80) {
  if (!text || text.length <= maxLength) return text
  return text.slice(0, maxLength).trim() + '...'
}

/**
 * Generate ticket ID display format
 * "ADS-2024-0892"
 */
export function formatTicketId(id) {
  return `ADS-${dayjs().format('YYYY')}-${String(id).padStart(4, '0')}`
}
