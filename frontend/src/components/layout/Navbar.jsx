import { Link, useNavigate } from 'react-router-dom'
import { Bell, Globe, Sun, Moon, Menu, X, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext.jsx'
import { useTheme } from '../../context/ThemeContext.jsx'

/**
 * Navbar — adapts between public/user and stakeholder views
 * @param {string}  variant - 'public' | 'user' | 'stakeholder'
 * @param {number}  notifCount
 * @param {string}  title   - page title (stakeholder only)
 */
export default function Navbar({ variant = 'public', notifCount = 0, title = '' }) {
  const { t, i18n } = useTranslation()
  const { user, logout } = useAuth()
  const { dark, toggle } = useTheme()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  function switchLang() {
    const next = i18n.language === 'id' ? 'en' : 'id'
    i18n.changeLanguage(next)
    localStorage.setItem('suaralens_lang', next)
  }

  // ---- Stakeholder variant (inside sidebar layout) ----
  if (variant === 'stakeholder') {
    return (
      <header className="h-14 flex items-center justify-between px-6 bg-[var(--color-bg)] border-b border-[var(--color-border)] sticky top-0 z-10">
        <h1 className="font-semibold text-[var(--color-text)] text-lg">{title}</h1>
        <div className="flex items-center gap-3">
          {/* Notif */}
          <button className="relative p-2 rounded-lg hover:bg-[var(--color-card-hover)] transition-colors">
            <Bell size={18} className="text-[var(--color-text-muted)]" />
            {notifCount > 0 && (
              <span className="absolute top-1 right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold leading-none">
                {notifCount}
              </span>
            )}
          </button>
          {/* Dark mode */}
          <button onClick={toggle} className="p-2 rounded-lg hover:bg-[var(--color-card-hover)] transition-colors">
            {dark ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-[var(--color-text-muted)]" />}
          </button>
          {/* Language */}
          <button onClick={switchLang} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-xs font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-card-hover)] transition-colors">
            <Globe size={13} /> {i18n.language.toUpperCase()}
          </button>
        </div>
      </header>
    )
  }

  // ---- Public / User variant ----
  return (
    <nav className="sticky top-0 z-50 bg-[#0F172A]/90 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">SL</span>
            </div>
            <span className="font-bold text-white text-lg">SuaraLens</span>
          </Link>

          {/* Desktop */}
          <div className="hidden md:flex items-center gap-3">
            <button onClick={switchLang} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 transition-colors">
              <Globe size={13} /> {i18n.language === 'id' ? 'EN' : 'ID'}
            </button>

            {user ? (
              <>
                <Link to={user.role === 'stakeholder' ? '/stakeholder' : '/user/dashboard'} className="text-sm text-slate-300 hover:text-white transition-colors">
                  {t('nav.dashboard')}
                </Link>
                <button onClick={logout} className="text-sm text-red-400 hover:text-red-300 transition-colors">
                  {t('nav.logout')}
                </button>
              </>
            ) : (
              <>
                <Link to="/signin" className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white border border-slate-700 rounded-lg hover:border-slate-500 transition-colors">
                  {t('nav.login')}
                </Link>
                <Link to="/signup-user" className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors">
                  {t('form.submit')}
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button className="md:hidden p-2 text-slate-400 hover:text-white" onClick={() => setMenuOpen(m => !m)}>
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden py-3 border-t border-white/10 space-y-1 animate-fade-in">
            <button onClick={switchLang} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-400 hover:text-white">
              <Globe size={15} /> {i18n.language === 'id' ? 'Switch to English' : 'Ganti ke Bahasa Indonesia'}
            </button>
            {!user && (
              <>
                <Link to="/signin" onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-sm text-slate-300 hover:text-white">{t('nav.login')}</Link>
                <Link to="/signup-user" onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-sm text-white font-semibold">{t('nav.register')}</Link>
              </>
            )}
            {user && (
              <button onClick={logout} className="block px-4 py-2 text-sm text-red-400 w-full text-left">{t('nav.logout')}</button>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
