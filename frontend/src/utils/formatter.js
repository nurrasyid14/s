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
 * Map status key ke label & warna Tailwind
 */
export const STATUS_MAP = {
  new:      { label: 'Baru',       labelEn: 'New',         color: 'blue'   },
  process:  { label: 'Diproses',   labelEn: 'In Progress', color: 'amber'  },
  done:     { label: 'Selesai',    labelEn: 'Resolved',    color: 'emerald'},
  escalate: { label: 'Dieskalasi', labelEn: 'Escalated',   color: 'red'    },
}

export function getStatusInfo(status) {
  return STATUS_MAP[status] || { label: status, labelEn: status, color: 'gray' }
}

/**
 * Map urgency score (0-10) ke level
 */
export function getUrgencyLevel(score) {
  if (score >= 8) return { level: 'Tinggi', levelEn: 'High',   color: 'red'    }
  if (score >= 5) return { level: 'Sedang', levelEn: 'Medium', color: 'amber'  }
  return              { level: 'Rendah', levelEn: 'Low',    color: 'emerald'}
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
