/** Switch on/off aksesibel (role="switch"): versi geometris tegas selaras design system. */
export default function ToggleSwitch({ checked, onChange, label }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            onClick={() => onChange(!checked)}
            className={`relative h-6 w-11 flex-shrink-0 rounded-full border transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)] ${checked ? 'bg-[var(--color-primary)] border-[var(--color-primary)]' : 'bg-[var(--color-surface-sunken)] border-[var(--color-border)]'
                }`}
        >
            <span
                className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full shadow-xs transition-all ${checked ? 'translate-x-5 bg-white' : 'translate-x-0 bg-[var(--color-text-muted)]'
                    }`}
            />
        </button>
    )
}