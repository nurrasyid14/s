import { Link, useNavigate } from 'react-router-dom'
import { Bell, Globe, Sun, Moon, Menu, X, AlertTriangle, CheckCircle2, Clock } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext.jsx'
import { useTheme } from '../../context/ThemeContext.jsx'
import { getUrgentComplaints } from '../../services/analyticsApi.js'

/**
 * Navbar — adapts between public/user and stakeholder views
 * @param {string}  variant    - 'public' | 'user' | 'stakeholder'
 * @param {number}  notifCount
 * @param {string}  title      - page title (stakeholder only)
 */
export default function Navbar({ variant = 'public', notifCount = 0, title = '' }) {
  const { t, i18n } = useTranslation()
  const { user, logout } = useAuth()
  const { dark, toggle } = useTheme()
  const navigate = useNavigate()
  const [menuOpen,  setMenuOpen]  = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifs,    setNotifs]    = useState([])
  const notifRef = useRef(null)

  function switchLang() {
    const next = i18n.language === 'id' ? 'en' : 'id'
    i18n.changeLanguage(next)
    localStorage.setItem('suaralens_lang', next)
  }

  // Load notifications lazily when dropdown opens
  useEffect(() => {
    if (notifOpen && notifs.length === 0) {
      getUrgentComplaints().then(data => setNotifs(data || []))
    }
  }, [notifOpen])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const URGENCY_COLOR = (score) =>
    score >= 8 ? 'text-red-500'   :
    score >= 5 ? 'text-amber-500' : 'text-emerald-500'

  // ---- Stakeholder variant (inside sidebar layout) ----
  if (variant === 'stakeholder') {
    return (
      <header className="h-14 flex items-center justify-between px-6 bg-[var(--color-bg)] border-b border-[var(--color-border)] sticky top-0 z-20">
        <h1 className="font-semibold text-[var(--color-text)] text-lg">{title}</h1>

        <div className="flex items-center gap-3">
          {/* Bell Notification with dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotifOpen(o => !o)}
              className="relative p-2 rounded-lg hover:bg-[var(--color-card-hover)] transition-colors"
              aria-label="Notifikasi"
            >
              <Bell size={18} className={notifOpen ? 'text-blue-500' : 'text-[var(--color-text-muted)]'} />
              {notifCount > 0 && (
                <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold leading-none">
                  {notifCount > 9 ? '9+' : notifCount}
                </span>
              )}
            </button>

            {/* Dropdown Panel */}
            {notifOpen && (
              <div className="absolute right-0 top-12 w-80 rounded-xl shadow-2xl border border-[var(--color-border)] bg-[var(--color-bg)] z-50 overflow-hidden animate-fade-in">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                  <div className="flex items-center gap-2">
                    <Bell size={15} className="text-blue-500" />
                    <span className="font-semibold text-sm text-[var(--color-text)]">
                      {i18n.language === 'id' ? 'Aduan Perlu Perhatian' : 'Needs Attention'}
                    </span>
                  </div>
                  {notifCount > 0 && (
                    <span className="bg-red-500/20 text-red-500 text-xs font-bold px-2 py-0.5 rounded-full">
                      {notifCount} {i18n.language === 'id' ? 'baru' : 'new'}
                    </span>
                  )}
                </div>

                {/* Notification list */}
                <div className="max-h-72 overflow-y-auto divide-y divide-[var(--color-border)]">
                  {notifs.length === 0 ? (
                    <div className="py-10 text-center">
                      <CheckCircle2 size={32} className="text-emerald-500 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-[var(--color-text)]">Semua aman!</p>
                      <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                        {i18n.language === 'id' ? 'Tidak ada aduan mendesak.' : 'No urgent complaints.'}
                      </p>
                    </div>
                  ) : (
                    notifs.map(n => (
                      <button
                        key={n.id}
                        onClick={() => { navigate(`/stakeholder/complaints/${n.id}`); setNotifOpen(false) }}
                        className="w-full text-left px-4 py-3 hover:bg-[var(--color-card-hover)] transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 flex-shrink-0 ${URGENCY_COLOR(n.urgency_score)}`}>
                            <AlertTriangle size={15} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-xs font-mono text-[var(--color-text-muted)]">
                                {n.ticket_id}
                              </span>
                              <span className={`text-xs font-bold ${URGENCY_COLOR(n.urgency_score)}`}>
                                Urgency {n.urgency_score}
                              </span>
                            </div>
                            <p className="text-sm text-[var(--color-text)] truncate">{n.description}</p>
                            <div className="flex items-center gap-1 mt-1 text-xs text-[var(--color-text-muted)]">
                              <Clock size={11} />
                              <span>{n.is_anonymous ? 'Anonim' : n.sender_name} · {n.sender_role}</span>
                            </div>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>

                {/* Footer */}
                <div className="px-4 py-2.5 border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                  <button
                    onClick={() => { navigate('/stakeholder/followups'); setNotifOpen(false) }}
                    className="text-xs text-blue-500 hover:text-blue-400 font-medium w-full text-center"
                  >
                    {i18n.language === 'id' ? 'Lihat semua tindak lanjut →' : 'View all follow-ups →'}
                  </button>
                </div>
              </div>
            )}
          </div>

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
                  {t('nav.register')}
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
