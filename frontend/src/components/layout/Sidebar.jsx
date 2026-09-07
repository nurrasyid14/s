import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, MessageSquare, BarChart3, ListChecks,
  Paperclip, Settings, LogOut, ChevronDown, ChevronUp,
  Bell, Sun, Moon, Globe,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext.jsx'
import { useTheme } from '../../context/ThemeContext.jsx'
import { useState } from 'react'

const NAV_ITEMS = [
  { key: 'dashboard',  to: '/stakeholder',             icon: LayoutDashboard },
  { key: 'complaints', to: '/stakeholder/complaints',  icon: MessageSquare   },
  { key: 'analytics',  to: '/stakeholder/analytics',   icon: BarChart3       },
  { key: 'followups',  to: '/stakeholder/followups',   icon: ListChecks      },
  { key: 'evidence',   to: '/stakeholder/evidence',    icon: Paperclip       },
  { key: 'settings',   to: '/stakeholder/settings',    icon: Settings        },
]

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
    <aside className={`h-screen sticky top-0 flex flex-col bg-[#1E293B] border-r border-[#334155] transition-all duration-300 ${collapsed ? 'w-16' : 'w-60'}`}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-[#334155]">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm">SL</span>
        </div>
        {!collapsed && (
          <span className="font-bold text-white text-lg tracking-tight">SuaraLens</span>
        )}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="ml-auto text-slate-400 hover:text-white transition-colors"
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
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-smooth group ${
                active
                  ? 'bg-blue-600/20 text-blue-300 border border-blue-600/30'
                  : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
              }`}
            >
              <Icon size={18} strokeWidth={1.8} className="flex-shrink-0" />
              {!collapsed && <span>{t(`nav.${key}`)}</span>}
              {!collapsed && key === 'followups' && notifCount > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {notifCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom actions */}
      <div className="px-2 py-3 border-t border-[#334155] space-y-1">
        {/* Dark mode toggle */}
        <button
          onClick={toggle}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-slate-400 hover:bg-slate-700/50 hover:text-white transition-smooth text-sm"
        >
          {dark ? <Sun size={16} /> : <Moon size={16} />}
          {!collapsed && <span>{dark ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>
        {/* Language */}
        <button
          onClick={switchLang}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-slate-400 hover:bg-slate-700/50 hover:text-white transition-smooth text-sm"
        >
          <Globe size={16} />
          {!collapsed && <span>{i18n.language === 'id' ? 'English' : 'Bahasa'}</span>}
        </button>
        {/* Logout */}
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-red-400 hover:bg-red-900/20 transition-smooth text-sm"
        >
          <LogOut size={16} />
          {!collapsed && <span>{t('nav.logout')}</span>}
        </button>
      </div>

      {/* User info */}
      {!collapsed && user && (
        <div className="px-3 py-3 border-t border-[#334155]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">{user.name?.charAt(0) || 'S'}</span>
            </div>
            <div className="min-w-0">
              <div className="text-white text-xs font-semibold truncate">{user.name}</div>
              <div className="text-slate-400 text-xs truncate">{user.position || user.email}</div>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
