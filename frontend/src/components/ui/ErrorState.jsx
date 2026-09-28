import { useTranslation } from 'react-i18next'
import { AlertTriangle, RefreshCw } from 'lucide-react'

/** Ditampilkan ketika pemanggilan API gagal, agar halaman tidak blank atau crash. */
export default function ErrorState({ onRetry }) {
    const { t } = useTranslation()

    return (
        <div role="alert" className="card-elevated flex flex-col items-center rounded-xl px-4 py-14 text-center">
            <div
                className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl"
                style={{ background: 'color-mix(in srgb, var(--color-status-danger) 12%, transparent)' }}
            >
                <AlertTriangle size={26} className="text-[var(--color-status-danger)]" aria-hidden="true" />
            </div>
            <div className="font-semibold text-[var(--color-text)]">
                {t('stk.error.title', 'Data tidak dapat dimuat.')}
            </div>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                {t('stk.error.desc', 'Silakan coba lagi.')}
            </p>
            {onRetry && (
                <button
                    type="button"
                    onClick={onRetry}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-text)] transition-smooth hover:bg-[var(--color-card-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                >
                    <RefreshCw size={14} aria-hidden="true" /> {t('stk.error.retry', 'Coba lagi')}
                </button>
            )}
        </div>
    )
}