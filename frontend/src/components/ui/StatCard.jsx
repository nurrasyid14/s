import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

/**
 * StatCard — summary metric card for dashboard
 * @param {string}  title    - Label
 * @param {string}  value    - Main metric value
 * @param {string}  subtitle - Unit/description below value
 * @param {number}  trend    - % change (positive=up, negative=down)
 * @param {node}    icon     - Lucide icon component
 * @param {string}  color    - 'blue' | 'teal' | 'amber' | 'red' | 'emerald'
 */

const COLOR_MAP = {
  blue:    { icon: 'bg-blue-500/20    text-blue-400',    border: 'border-blue-500/20'    },
  teal:    { icon: 'bg-teal-500/20    text-teal-400',    border: 'border-teal-500/20'    },
  amber:   { icon: 'bg-amber-500/20   text-amber-400',   border: 'border-amber-500/20'   },
  red:     { icon: 'bg-red-500/20     text-red-400',     border: 'border-red-500/20'     },
  emerald: { icon: 'bg-emerald-500/20 text-emerald-400', border: 'border-emerald-500/20' },
}

export default function StatCard({ title, value, subtitle, trend, icon: Icon, color = 'blue', onClick }) {
  const colors = COLOR_MAP[color] || COLOR_MAP.blue
  const isPositive = trend > 0
  const isNeutral  = trend === 0 || trend == null

  return (
    <div
      className={`card-elevated p-5 cursor-${onClick ? 'pointer' : 'default'} animate-fade-in-up`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        {/* Icon */}
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${colors.icon}`}>
          {Icon && <Icon size={20} strokeWidth={1.8} />}
        </div>
        {/* Trend */}
        {!isNeutral && (
          <div className={`flex items-center gap-1 text-xs font-semibold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
            {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {Math.abs(trend).toFixed(1)}%
          </div>
        )}
        {isNeutral && trend === 0 && (
          <div className="flex items-center gap-1 text-xs font-semibold text-gray-400">
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
