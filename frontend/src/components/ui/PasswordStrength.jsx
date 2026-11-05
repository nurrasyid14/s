import { useTranslation } from 'react-i18next'
import { Check, X } from 'lucide-react'

function score(pw) {
  let s = 0
  if (pw.length >= 8) s++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++
  if (/\d/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  return s
}

/** Meter kekuatan kata sandi + indikator kecocokan konfirmasi. */
export default function PasswordStrength({ password, confirm }) {
  const { i18n } = useTranslation()
  const isId = !i18n.language || i18n.language.startsWith('id')
  if (!password) return null

  const s = score(password)
  const levels = isId ? ['Lemah', 'Lemah', 'Cukup', 'Kuat', 'Sangat kuat'] : ['Weak', 'Weak', 'Fair', 'Strong', 'Very strong']
  const color = s <= 1 ? 'var(--color-status-danger)' : s === 2 ? 'var(--color-status-warning)' : 'var(--color-status-success)'
  const match = confirm ? confirm === password : null

  return (
    <div className="animate-fade-in-up -mt-1 space-y-2" aria-live="polite">
      <div className="flex gap-1.5">
        {[0, 1, 2, 3].map(i => (
          <span key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-[var(--color-surface-sunken)]">
            <span
              className="block h-full origin-left rounded-full transition-[transform,background-color] duration-300"
              style={{ transform: `scaleX(${i < s ? 1 : 0})`, background: color }}
            />
          </span>
        ))}
      </div>
      <div className="flex items-center justify-between text-xs">
        <span style={{ color }} className="font-semibold">{levels[s]}</span>
        {match !== null && (
          <span className={`flex items-center gap-1 font-medium ${match ? 'text-[var(--color-status-success)]' : 'text-[var(--color-status-danger)]'}`}>
            {match ? <Check size={13} /> : <X size={13} />}
            {match ? (isId ? 'Kata sandi cocok' : 'Passwords match') : (isId ? 'Belum cocok' : 'Does not match')}
          </span>
        )}
      </div>
    </div>
  )
}
