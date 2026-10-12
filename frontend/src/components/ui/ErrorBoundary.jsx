import React from 'react'
import { AlertTriangle, RotateCw, Home } from 'lucide-react'

/**
 * ErrorBoundary - menangkap runtime exception pada component tree
 * Mencegah white screen crash pada aplikasi React
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    if (this.props.onReset) {
      this.props.onReset()
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-[360px] w-full flex items-center justify-center p-6 bg-[var(--color-bg)]">
          <div
            role="alert"
            className="w-full max-w-md rounded-2xl border border-[var(--color-status-danger)]/30 bg-[var(--color-surface)] p-6 text-center shadow-lg"
          >
            <div
              className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--color-status-danger)]/30"
              style={{ background: 'color-mix(in srgb, var(--color-status-danger) 12%, transparent)' }}
            >
              <AlertTriangle size={28} className="text-[var(--color-status-danger)]" />
            </div>

            <h2 className="text-lg font-bold text-[var(--color-text)]">
              Terjadi Kesalahan Tampilan
            </h2>
            <p className="mt-2 text-xs text-[var(--color-text-muted)] leading-relaxed">
              Komponen ini mengalami kendala saat memproses data. Anda dapat mencoba memuat ulang tampilan atau kembali ke halaman utama.
            </p>

            {this.state.error?.message && (
              <div className="mt-3 p-2.5 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-left font-mono text-[11px] text-[var(--color-status-danger)] overflow-x-auto max-h-24">
                {this.state.error.message}
              </div>
            )}

            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="btn-primary inline-flex items-center gap-2 !py-2 !px-4 text-xs font-semibold rounded-xl"
              >
                <RotateCw size={14} /> Coba Muat Ulang
              </button>
              <a
                href="/"
                className="btn-outline inline-flex items-center gap-2 !py-2 !px-4 text-xs font-semibold rounded-xl"
              >
                <Home size={14} /> Beranda
              </a>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
