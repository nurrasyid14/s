/** Switch on/off aksesibel (role="switch") dengan label untuk screen reader. */
export default function ToggleSwitch({ checked, onChange, label }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            onClick={() => onChange(!checked)}
            className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-smooth focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)] ${checked ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'
                }`}
        >
            <span
                className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow transition-smooth ${checked ? 'translate-x-5' : 'translate-x-0'
                    }`}
            />
        </button>
    )
}