import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

/**
 * StatCard — summary metric card for dashboard
 * @param {string}  title    - Label
 * @param {string}  value    - Main metric value
 * @param {string}  subtitle - Unit/description below value
 * @param {number}  trend    - % change (positive=up, negative=down)
 * @param {node}    icon     - Lucide icon component
 * @param {string}  color    - 'blue' | 'amber' | 'red' | 'emerald'
 */

const COLOR_MAP = {
  blue: { icon: 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]' },
  amber: { icon: 'bg-[color-mix(in_srgb,var(--color-status-warning)_15%,transparent)] text-[var(--color-status-warning)]' },
  red: { icon: 'bg-[color-mix(in_srgb,var(--color-status-danger)_15%,transparent)] text-[var(--color-status-danger)]' },
  emerald: { icon: 'bg-[color-mix(in_srgb,var(--color-status-success)_15%,transparent)] text-[var(--color-status-success)]' },
}

export default function StatCard({ title, value, subtitle, trend, icon: Icon, color = 'blue', onClick }) {
  const colors = COLOR_MAP[color] || COLOR_MAP.blue
  const isPositive = trend > 0
  const isNeutral = trend === 0 || trend == null

  return (
    <div
      className={`card-elevated rounded-xl p-5 cursor-${onClick ? 'pointer' : 'default'}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        {/* Icon */}
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${colors.icon}`}>
          {Icon && <Icon size={20} strokeWidth={1.8} />}
        </div>
        {/* Trend */}
        {!isNeutral && (
          <div className={`flex items-center gap-1 text-xs font-semibold ${isPositive ? 'text-[var(--color-status-success)]' : 'text-[var(--color-status-danger)]'}`}>
            {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {Math.abs(trend).toFixed(1)}%
          </div>
        )}
        {isNeutral && trend === 0 && (
          <div className="flex items-center gap-1 text-xs font-semibold text-[var(--color-text-muted)]">
            <Minus size={14} /> 0%
          </div>
        )}
      </div>

      {/* Value */}
      <div className="mt-3">
        <div className="text-2xl font-bold text-[var(--color-text)] leading-none">{value}</div>
        {subtitle && <div className="text-xs text-[var(--color-text-muted)] mt-0.5">{subtitle}</div>}
      </div>

      {/* Title */}
      <div className="text-sm text-[var(--color-text-muted)] mt-2 font-medium">{title}</div>
    </div>
  )
}