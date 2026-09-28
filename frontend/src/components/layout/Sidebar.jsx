import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, MessageSquare, BarChart3, ListChecks,
  Paperclip, Settings, LogOut, ChevronDown, ChevronUp,
  Sun, Moon, Globe,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext.jsx'
import { useTheme } from '../../context/ThemeContext.jsx'
import { useState } from 'react'

const NAV_ITEMS = [
  { key: 'dashboard', to: '/stakeholder', icon: LayoutDashboard },
  { key: 'complaints', to: '/stakeholder/complaints', icon: MessageSquare },
  { key: 'analytics', to: '/stakeholder/analytics', icon: BarChart3 },
  { key: 'followups', to: '/stakeholder/followups', icon: ListChecks },
  { key: 'evidence', to: '/stakeholder/evidence', icon: Paperclip },
  { key: 'settings', to: '/stakeholder/settings', icon: Settings },
]

// Panel selalu biru institusional solid, terlepas dari mode terang/gelap
// konten utama — ini pilihan desain (bukan token tema), jadi warnanya
// ditulis langsung, bukan lewat var(--color-bg) dsb.
const PANEL_BG = '#163B68' // sedikit lebih gelap dari --color-primary, kontras cukup untuk teks putih
const PANEL_BORDER = 'rgba(255,255,255,0.08)'

export default function Sidebar({ notifCount = 0 }) {
  const { t, i18n } = useTranslation()
  const { user, logout } = useAuth()
  const { dark, toggle } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)

  function switchLang() {
    const next = i18n.language === 'id' ? 'en' : 'id'
    i18n.changeLanguage(next)
    localStorage.setItem('suaralens_lang', next)
  }

  return (
    <aside
      className={`h-screen sticky top-0 flex flex-col transition-all duration-300 ${collapsed ? 'w-16' : 'w-60'}`}
      style={{ background: PANEL_BG, borderRight: `1px solid ${PANEL_BORDER}` }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5" style={{ borderBottom: `1px solid ${PANEL_BORDER}` }}>
        {!collapsed && (
          <span className="font-bold text-white text-lg tracking-tight">SuaraLens</span>
        )}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="ml-auto text-white/60 hover:text-white transition-colors"
        >
          {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-0.5">
        {NAV_ITEMS.map(({ key, to, icon: Icon }) => {
          const active = location.pathname === to || (to !== '/stakeholder' && location.pathname.startsWith(to))
          return (
            <Link
              key={key}
              to={to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-smooth border-l-4 ${active
                ? 'bg-white/10 text-white border-l-[var(--color-accent)]'
                : 'text-white/60 hover:bg-white/5 hover:text-white border-l-transparent'
                }`}
            >
              <Icon size={18} strokeWidth={1.8} className="flex-shrink-0" />
              {!collapsed && <span>{t(`nav.${key}`)}</span>}
              {!collapsed && key === 'followups' && notifCount > 0 && (
                <span className="ml-auto bg-[var(--color-accent)] text-[#163B68] text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {notifCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom actions */}
      <div className="px-2 py-3 space-y-1" style={{ borderTop: `1px solid ${PANEL_BORDER}` }}>
        <button
          onClick={toggle}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-white/60 hover:bg-white/5 hover:text-white transition-smooth text-sm"
        >
          {dark ? <Sun size={16} /> : <Moon size={16} />}
          {!collapsed && <span>{dark ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>
        <button
          onClick={switchLang}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-white/60 hover:bg-white/5 hover:text-white transition-smooth text-sm"
        >
          <Globe size={16} />
          {!collapsed && <span>{i18n.language === 'id' ? 'English' : 'Bahasa'}</span>}
        </button>
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-white/70 hover:bg-white/5 hover:text-white transition-smooth text-sm"
        >
          <LogOut size={16} />
          {!collapsed && <span>{t('nav.logout')}</span>}
        </button>
      </div>

      {/* User info */}
      {!collapsed && user && (
        <div className="px-3 py-3" style={{ borderTop: `1px solid ${PANEL_BORDER}` }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[var(--color-accent)] flex items-center justify-center flex-shrink-0">
              <span className="text-[#163B68] text-xs font-bold">{user.name?.charAt(0) || 'S'}</span>
            </div>
            <div className="min-w-0">
              <div className="text-white text-xs font-semibold truncate">{user.name}</div>
              <div className="text-white/50 text-xs truncate">{user.position || user.email}</div>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}