/**
 * Kelompok tombol pill untuk memilih satu opsi (periode, tab status).
 * options: [{ key, label }]. Nilai aktif ditandai lewat aria-pressed, bukan hanya warna.
 */
export default function SegmentedControl({ options, value, onChange, label }) {
    return (
        <div
            role="group"
            aria-label={label}
            className="inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] p-1"
        >
            {options.map(option => {
                const active = option.key === value
                return (
                    <button
                        key={option.key}
                        type="button"
                        aria-pressed={active}
                        onClick={() => onChange(option.key)}
                        className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-smooth focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${active
                                ? 'bg-[var(--color-primary)] text-white shadow-sm'
                                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                            }`}
                    >
                        {option.label}
                    </button>
                )
            })}
        </div>
    )
}