import { Link } from 'react-router-dom'
import { ScanSearch, Sun, Moon } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext.jsx'

/**
 * Kerangka halaman autentikasi: latar gradasi hero (putih ke biru ke putih),
 * bingkai border-x dan kartu kotak, meniru struktur halaman referensi.
 */
export default function AuthShell({ title, subtitle, children, footer, accent = false }) {
  const { dark, toggle } = useTheme()
  return (
    <div className="min-h-screen w-full flex flex-col bg-[var(--color-bg)]">
      <div className="relative mx-auto flex w-full max-w-[1400px] flex-1 flex-col border-x border-[var(--color-border)]">
        <div className="hero-grad absolute top-0 left-1/2 -translate-x-1/2 w-[100vw] h-full z-0" />
        <header className="relative z-10 flex items-center justify-between border-b border-white/30 px-4 py-6 md:px-8 text-white">
          <Link to="/" className="flex items-center gap-2.5 text-white">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg shadow-xs bg-white/15 text-white border border-white/25">
              <ScanSearch size={18} />
            </span>
            <span className="text-xl font-bold tracking-tight text-white">SuaraLens</span>
          </Link>
          <button onClick={toggle} aria-label="Toggle theme" className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2.5 rounded-xl text-white/85 hover:text-white hover:bg-white/10 transition-colors">
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </header>

        <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-12">
          <div className="blur-in w-full max-w-md">
            <div
              className={`border bg-[var(--color-surface)] p-8 md:p-9 rounded-2xl shadow-xl backdrop-blur-sm ${accent ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/20' : 'border-[var(--color-border)]'}`}
            >
              <h1 className="text-3xl font-semibold tracking-[-0.045em] text-[var(--color-text)]">{title}</h1>
              {subtitle && <p className="mt-2 mb-6 text-sm text-[var(--color-text-muted)]">{subtitle}</p>}
              {children}
              {footer && <div className="mt-6 border-t border-[var(--color-border)] pt-5 text-center text-sm text-[var(--color-text-muted)]">{footer}</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
