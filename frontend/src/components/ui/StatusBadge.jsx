import { getStatusInfo, getUrgencyLevel } from '../../utils/formatter.js'
import { useTranslation } from 'react-i18next'

const COLOR_CLASSES = {
  blue:    'bg-blue-100    text-blue-700    dark:bg-blue-900/30    dark:text-blue-300',
  amber:   'bg-amber-100   text-amber-700   dark:bg-amber-900/30   dark:text-amber-300',
  emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  red:     'bg-red-100     text-red-700     dark:bg-red-900/30     dark:text-red-300',
  gray:    'bg-gray-100    text-gray-700    dark:bg-gray-800       dark:text-gray-300',
}

/**
 * StatusBadge — displays complaint status with color coding
 * @param {string} status - 'new' | 'process' | 'done' | 'escalate'
 */
export function StatusBadge({ status }) {
  const { i18n } = useTranslation()
  const info = getStatusInfo(status)
  const label = i18n.language === 'en' ? info.labelEn : info.label
  const colorClass = COLOR_CLASSES[info.color] || COLOR_CLASSES.gray

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${colorClass}`}>
      {label}
    </span>
  )
}

/**
 * UrgencyBadge — displays urgency level with color coding
 * @param {number} score - 0-10
 */
export function UrgencyBadge({ score }) {
  const { i18n } = useTranslation()
  const info = getUrgencyLevel(score)
  const label = i18n.language === 'en' ? `${info.levelEn} (${score})` : `${info.level} (${score})`
  const colorClass = COLOR_CLASSES[info.color] || COLOR_CLASSES.gray

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${colorClass}`}>
      {label}
    </span>
  )
}
