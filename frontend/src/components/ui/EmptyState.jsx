/**
 * Empty state seragam untuk daftar/halaman yang tidak punya data.
 * tone="success" dipakai ketika kosong berarti kabar baik (mis. tidak ada antrian).
 */
export default function EmptyState({ icon: Icon, title, description, tone = 'neutral', action }) {
    const iconColor =
        tone === 'success' ? 'text-[var(--color-status-success)]' : 'text-[var(--color-text-muted)]'

    return (
        <div role="status" className="card-elevated flex flex-col items-center rounded-xl px-4 py-14 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-bg-secondary)]">
                <Icon size={26} className={iconColor} aria-hidden="true" />
            </div>
            <div className="font-semibold text-[var(--color-text)]">{title}</div>
            {description && (
                <p className="mt-1 max-w-sm text-sm text-[var(--color-text-muted)]">{description}</p>
            )}
            {action && <div className="mt-4">{action}</div>}
        </div>
    )
}