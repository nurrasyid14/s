import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, MessageSquare, BarChart3, ListChecks,
  Paperclip, Settings, LogOut, Sun, Moon, Globe, ScanSearch,
  HelpCircle
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext.jsx'
import { useTheme } from '../../context/ThemeContext.jsx'

const NAV_ITEMS = [
  { key: 'dashboard', to: '/stakeholder', icon: LayoutDashboard, label: 'Overview' },
  { key: 'complaints', to: '/stakeholder/complaints', icon: MessageSquare, label: 'Aduan' },
  { key: 'analytics', to: '/stakeholder/analytics', icon: BarChart3, label: 'Analitik' },
  { key: 'followups', to: '/stakeholder/followups', icon: ListChecks, label: 'Tindak Lanjut' },
  { key: 'evidence', to: '/stakeholder/evidence', icon: Paperclip, label: 'Bukti' },
  { key: 'settings', to: '/stakeholder/settings', icon: Settings, label: 'Pengaturan' },
]

export default function Sidebar({ notifCount = 0 }) {
  const { t, i18n } = useTranslation()
  const { user, logout } = useAuth()
  const { dark, toggle } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()

  function switchLang() {
    const next = i18n.language === 'id' ? 'en' : 'id'
    i18n.changeLanguage(next)
    localStorage.setItem('suaralens_lang', next)
  }

  function handleLogout() {
    logout()
    navigate('/signin')
  }

  return (
    <aside
      className="hidden md:flex w-20 flex-shrink-0 flex-col items-center justify-between py-6 bg-[var(--color-surface)] border-r border-[var(--color-border)] z-30"
      aria-label="Sidebar Navigasi Stakeholder"
    >
      {/* Top: Light/Dark Mode Switcher */}
      <div className="flex flex-col items-center gap-4">
        <button
          onClick={toggle}
          className="w-11 h-11 rounded-2xl flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-bg-secondary)] transition-all shadow-2xs"
          title={dark ? 'Mode Terang' : 'Mode Gelap'}
          aria-label="Toggle tema tampilan"
        >
          {dark ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} />}
        </button>
      </div>

      {/* Center: Icon Rail */}
      <nav className="flex flex-col items-center gap-3 w-full px-3">
        {NAV_ITEMS.map(({ key, to, icon: Icon, label }) => {
          const active = location.pathname === to || (to !== '/stakeholder' && location.pathname.startsWith(to))
          return (
            <Link
              key={key}
              to={to}
              title={label}
              aria-label={label}
              className={`relative w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                active
                  ? 'bg-[#0B1F3A] text-white shadow-md shadow-blue-950/20 dark:bg-[var(--color-primary)] dark:text-white'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-secondary)]'
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.2 : 1.9} />
              {active && (
                <span className="absolute -left-1 w-1.5 h-6 bg-[var(--color-primary)] rounded-r-full" />
              )}
              {key === 'followups' && notifCount > 0 && (
                <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white dark:ring-slate-900" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom: Language, Help, Logout */}
      <div className="flex flex-col items-center gap-3">
        <button
          onClick={switchLang}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-[var(--color-text-muted)] hover:bg-[var(--color-bg-secondary)] text-xs font-mono font-bold"
          title="Ganti Bahasa"
          aria-label="Ganti Bahasa"
        >
          {i18n.language.toUpperCase()}
        </button>
        <button
          onClick={() => alert('Pusat Bantuan Stakeholder Unit: Konsultasikan SOP penanganan tiket kepada Administrator Sentral.')}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-secondary)] transition-colors"
          title="Bantuan Layanan"
          aria-label="Bantuan Layanan"
        >
          <HelpCircle size={19} />
        </button>
        <button
          onClick={handleLogout}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-[var(--color-status-danger)] hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
          title="Keluar dari Portal"
          aria-label="Keluar dari Portal"
        >
          <LogOut size={19} />
        </button>
      </div>
    </aside>
  )
}