import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { CountUp } from '../motion/Motion.jsx'

/**
 * StatCard: summary metric card for dashboard (square, border-led styling)
 */

const COLOR_MAP = {
  blue: { icon: 'bg-[var(--color-navy)] text-[var(--color-gold)] border-transparent dark:bg-[var(--color-primary-soft)]' },
  amber: { icon: 'bg-[color-mix(in_srgb,var(--color-status-warning)_15%,transparent)] text-[var(--color-status-warning)] border-[var(--color-status-warning)]/20' },
  red: { icon: 'bg-[color-mix(in_srgb,var(--color-status-danger)_15%,transparent)] text-[var(--color-status-danger)] border-[var(--color-status-danger)]/20' },
  emerald: { icon: 'bg-[color-mix(in_srgb,var(--color-status-success)_15%,transparent)] text-[var(--color-status-success)] border-[var(--color-status-success)]/20' },
}

export default function StatCard({ title, value, subtitle, trend, icon: Icon, color = 'blue', onClick }) {
  const colors = COLOR_MAP[color] || COLOR_MAP.blue
  const isPositive = trend > 0
  const isNeutral = trend === 0 || trend == null

  return (
    <div
      className={`card-elevated rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 ${onClick ? 'press cursor-pointer hover:bg-[var(--color-card-hover)] hover:border-[var(--color-text-muted)]' : ''}`}
      onClick={onClick}
      {...(onClick && {
        role: 'button',
        tabIndex: 0,
        onKeyDown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } },
      })}
    >
      <div className="flex items-start justify-between">
        {/* Icon */}
        <div className={`w-11 h-11 rounded-xl border flex items-center justify-center shadow-xs ${colors.icon}`}>
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
        <div className="text-3xl font-bold tracking-tight tabular text-[var(--color-text)]">{typeof value === 'number' ? <CountUp value={value} /> : value}</div>
        {subtitle && <div className="text-xs text-[var(--color-text-muted)] mt-0.5">{subtitle}</div>}
      </div>

      {/* Title */}
      <div className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] mt-2 font-medium">{title}</div>
    </div>
  )
}