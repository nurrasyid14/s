import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, MessageSquare, BarChart3, ListChecks,
  Paperclip, Settings, LogOut, ChevronsLeft, ChevronsRight,
  Sun, Moon, Globe, ScanSearch,
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

const itemCls =
  'flex items-center gap-3 px-3 py-2.5 w-full text-sm font-medium transition-colors text-[var(--color-sidebar-text-muted)] hover:text-[var(--color-sidebar-text)] hover:bg-[var(--color-sidebar-hover)]'

export default function Sidebar({ notifCount = 0 }) {
  const { t, i18n } = useTranslation()
  const { user, logout } = useAuth()
  const { dark, toggle } = useTheme()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)

  function switchLang() {
    const next = i18n.language === 'id' ? 'en' : 'id'
    i18n.changeLanguage(next)
    localStorage.setItem('suaralens_lang', next)
  }

  return (
    <aside
      className={`h-screen sticky top-0 flex flex-col transition-all duration-300 z-30 bg-[var(--color-sidebar-bg)] border-r border-[var(--color-sidebar-border)] ${collapsed ? 'w-16' : 'w-60'}`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-14 border-b border-[var(--color-sidebar-border)]">
        <Link to="/" className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 flex items-center justify-center flex-shrink-0 bg-[var(--color-sidebar-active-bg)] text-[var(--color-sidebar-active-text)]">
            <ScanSearch size={16} strokeWidth={2.2} />
          </div>
          {!collapsed && <span className="font-bold text-[var(--color-sidebar-text)] text-xl tracking-tight truncate font-sans">SuaraLens</span>}
        </Link>
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="ml-auto text-[var(--color-sidebar-text-muted)] hover:text-[var(--color-sidebar-text)] transition-colors p-1"
            aria-label="Perkecil sidebar"
          >
            <ChevronsLeft size={16} />
          </button>
        )}
      </div>
      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="mx-auto mt-2 text-[var(--color-sidebar-text-muted)] hover:text-[var(--color-sidebar-text)] p-1"
          aria-label="Perluas sidebar"
        >
          <ChevronsRight size={16} />
        </button>
      )}

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ key, to, icon: Icon }) => {
          const active = location.pathname === to || (to !== '/stakeholder' && location.pathname.startsWith(to))
          return (
            <Link
              key={key}
              to={to}
              className={active
                ? 'flex items-center gap-3 px-3 py-2.5 text-sm font-medium bg-[var(--color-sidebar-active-bg)] text-[var(--color-sidebar-active-text)]'
                : itemCls}
            >
              <Icon size={18} strokeWidth={1.8} className="flex-shrink-0" />
              {!collapsed && <span>{t(`nav.${key}`)}</span>}
              {!collapsed && key === 'followups' && notifCount > 0 && (
                <span className="ml-auto bg-[var(--color-primary)] text-white text-xs font-bold w-5 h-5 flex items-center justify-center font-mono">
                  {notifCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom actions */}
      <div className="px-2 py-3 space-y-1 border-t border-[var(--color-sidebar-border)]">
        <button onClick={toggle} className={itemCls}>
          {dark ? <Sun size={16} /> : <Moon size={16} />}
          {!collapsed && <span>{dark ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>
        <button onClick={switchLang} className={itemCls}>
          <Globe size={16} />
          {!collapsed && <span>{i18n.language === 'id' ? 'English' : 'Bahasa'}</span>}
        </button>
        <button onClick={logout} className={`${itemCls} !text-[var(--color-status-danger)]`}>
          <LogOut size={16} />
          {!collapsed && <span>{t('nav.logout')}</span>}
        </button>
      </div>

      {/* User info */}
      {!collapsed && user && (
        <div className="px-3 py-3 border-t border-[var(--color-sidebar-border)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 flex items-center justify-center flex-shrink-0 bg-[var(--color-primary)] text-white font-bold text-xs font-mono">
              {user.name?.charAt(0) || 'S'}
            </div>
            <div className="min-w-0">
              <div className="text-[var(--color-sidebar-text)] text-xs font-semibold truncate">{user.name}</div>
              <div className="text-[var(--color-sidebar-text-muted)] text-xs truncate">{user.position || user.email}</div>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}