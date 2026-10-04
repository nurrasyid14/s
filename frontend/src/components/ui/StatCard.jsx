import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

/**
 * StatCard — summary metric card for dashboard (square, border-led styling)
 */

const COLOR_MAP = {
  blue: { icon: 'bg-[var(--color-primary-soft)] text-[var(--color-primary)] border-[var(--color-primary)]/20' },
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
      className={`card-elevated border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition-colors hover:bg-[var(--color-card-hover)] ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        {/* Icon */}
        <div className={`w-10 h-10 border flex items-center justify-center ${colors.icon}`}>
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
        <div className="text-3xl font-bold tracking-tight text-[var(--color-text)]">{value}</div>
        {subtitle && <div className="text-xs text-[var(--color-text-muted)] mt-0.5">{subtitle}</div>}
      </div>

      {/* Title */}
      <div className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] mt-2 font-medium">{title}</div>
    </div>
  )
}