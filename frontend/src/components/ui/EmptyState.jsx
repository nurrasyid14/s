/**
 * Empty state seragam untuk daftar/halaman yang tidak punya data.
 * Versi kotak tajam sesuai template referensi.
 */
export default function EmptyState({ icon: Icon, title, description, tone = 'neutral', action }) {
    const iconColor =
        tone === 'success' ? 'text-[var(--color-status-success)]' : 'text-[var(--color-text-muted)]'

    return (
        <div role="status" className="card-elevated border border-[var(--color-border)] flex flex-col items-center px-4 py-14 text-center bg-[var(--color-surface)]">
            <div className="mb-3 flex h-14 w-14 items-center justify-center border border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                <Icon size={26} className={iconColor} aria-hidden="true" />
            </div>
            <div className="font-semibold text-[var(--color-text)] tracking-tight">{title}</div>
            {description && (
                <p className="mt-1 max-w-sm text-sm text-[var(--color-text-muted)]">{description}</p>
            )}
            {action && <div className="mt-5">{action}</div>}
        </div>
    )
}