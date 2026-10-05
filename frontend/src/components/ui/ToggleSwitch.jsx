/** Switch on/off aksesibel (role="switch") — versi kotak selaras gaya template. */
export default function ToggleSwitch({ checked, onChange, label }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            onClick={() => onChange(!checked)}
            className={`relative h-6 w-11 flex-shrink-0 border transition-smooth focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)] ${checked ? 'bg-[var(--color-btn)] border-[var(--color-btn)]' : 'bg-transparent border-[var(--color-border-strong)]'
                }`}
        >
            <span
                className={`absolute left-0.5 top-0.5 h-4 w-4 transition-smooth ${checked ? 'translate-x-5 bg-[var(--color-btn-text)]' : 'translate-x-0 bg-[var(--color-border-strong)]'
                    }`}
            />
        </button>
    )
}