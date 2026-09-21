import { getStatusInfo, getUrgencyLevel } from '../../utils/formatter.js'
import { useTranslation } from 'react-i18next'

const COLOR_VARS = {
  blue: 'var(--color-status-info)',
  amber: 'var(--color-status-warning)',
  emerald: 'var(--color-status-success)',
  red: 'var(--color-status-danger)',
  gray: 'var(--color-status-neutral)',
}

function badgeStyle(colorKey) {
  const c = COLOR_VARS[colorKey] || COLOR_VARS.gray
  return {
    color: c,
    background: `color-mix(in srgb, ${c} 12%, transparent)`,
  }
}

/**
 * StatusBadge — displays complaint status with color coding
 * @param {string} status - 'new' | 'process' | 'done' | 'escalate'
 */
export function StatusBadge({ status }) {
  const { i18n } = useTranslation()
  const info = getStatusInfo(status)
  const label = i18n.language === 'en' ? info.labelEn : info.label

  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold" style={badgeStyle(info.color)}>
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

  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold" style={badgeStyle(info.color)}>
      {label}
    </span>
  )
}