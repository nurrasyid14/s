import { useTranslation } from 'react-i18next'
import { AlertTriangle, RefreshCw } from 'lucide-react'

/** Ditampilkan ketika pemanggilan API gagal, agar halaman tidak blank atau crash. */
export default function ErrorState({ onRetry }) {
    const { t } = useTranslation()

    return (
        <div role="alert" className="card-elevated border border-[var(--color-status-danger)]/40 flex flex-col items-center px-4 py-14 text-center bg-[var(--color-surface)]">
            <div
                className="mb-3 flex h-14 w-14 items-center justify-center border border-[var(--color-status-danger)]/30"
                style={{ background: 'color-mix(in srgb, var(--color-status-danger) 10%, transparent)' }}
            >
                <AlertTriangle size={26} className="text-[var(--color-status-danger)]" aria-hidden="true" />
            </div>
            <div className="font-semibold text-[var(--color-text)] tracking-tight">
                {t('stk.error.title', 'Data tidak dapat dimuat.')}
            </div>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                {t('stk.error.desc', 'Silakan coba lagi.')}
            </p>
            {onRetry && (
                <button
                    type="button"
                    onClick={onRetry}
                    className="btn-outline mt-5 inline-flex items-center gap-2 !py-2 !px-4 text-xs font-semibold"
                >
                    <RefreshCw size={14} aria-hidden="true" /> {t('stk.error.retry', 'Coba lagi')}
                </button>
            )}
        </div>
    )
}