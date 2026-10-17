import { Link, useNavigate } from 'react-router-dom'
import { Bell, Globe, Sun, Moon, Menu, X, AlertTriangle, CheckCircle2, Clock, ScanSearch } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext.jsx'
import { useTheme } from '../../context/ThemeContext.jsx'
import { getUrgentComplaints } from '../../services/analyticsApi.js'

/**
 * Navbar: adapts between public/user and stakeholder views
 * @param {string}  variant    - 'public' | 'user' | 'stakeholder'
 * @param {number}  notifCount
 * @param {string}  title      - page title (stakeholder only)
 */
export default function Navbar({ variant = 'public', notifCount = 0, title = '' }) {
  const { t, i18n } = useTranslation()
  const { user, logout } = useAuth()
  const { dark, toggle } = useTheme()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifs, setNotifs] = useState([])
  const notifRef = useRef(null)

  function switchLang() {
    const next = i18n.language === 'id' ? 'en' : 'id'
    i18n.changeLanguage(next)
    localStorage.setItem('suaralens_lang', next)
  }

  useEffect(() => {
    if (notifOpen && notifs.length === 0) {
      getUrgentComplaints().then(data => setNotifs(data || []))
    }
  }, [notifOpen])

  useEffect(() => {
    function handleClick(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setNotifOpen(false)
        setMenuOpen(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const URGENCY_COLOR = (score) =>
    score >= 8 ? 'text-[var(--color-status-danger)]' :
      score >= 5 ? 'text-[var(--color-status-warning)]' : 'text-[var(--color-status-success)]'

  // ---- Stakeholder variant (inside sidebar layout) ----
  if (variant === 'stakeholder') {
    const navItems = [
      { to: '/stakeholder', label: 'Overview' },
      { to: '/stakeholder/complaints', label: 'Aduan' },
      { to: '/stakeholder/analytics', label: 'Analitik' },
      { to: '/stakeholder/followups', label: 'Tindak Lanjut' },
      { to: '/stakeholder/evidence', label: 'Bukti' },
      { to: '/stakeholder/settings', label: 'Pengaturan' },
    ]

    return (
      <header className="h-20 flex items-center justify-between px-4 sm:px-8 bg-[var(--color-surface)] border-b border-[var(--color-border)] sticky top-0 z-20 gap-4">
        {/* Left: Brand / Title */}
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#0B1F3A] dark:bg-[var(--color-primary)] text-white flex items-center justify-center shadow-md shadow-blue-950/20">
              <ScanSearch size={20} />
            </div>
            <div className="hidden sm:block">
              <span className="font-extrabold text-base tracking-tight text-[var(--color-text)]">SuaraLens</span>
              <span className="ml-2 text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                Stakeholder
              </span>
            </div>
          </Link>
        </div>

        {/* Center: Floating Pill Navigation (Finexy Signature) */}
        <nav className="hidden lg:flex items-center p-1.5 rounded-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)]/80 shadow-2xs">
          {navItems.map(({ to, label }) => {
            const active = location.pathname === to || (to !== '/stakeholder' && location.pathname.startsWith(to))
            return (
              <Link
                key={to}
                to={to}
                className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                  active
                    ? 'bg-[#0B1F3A] text-white shadow-sm dark:bg-[var(--color-primary)] dark:text-white'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]'
                }`}
              >
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Right: Search, Notif Dropdown, User Profile Pill */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Quick Search */}
          <Link
            to="/stakeholder/complaints"
            className="w-10 h-10 rounded-full border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-secondary)] transition-all shadow-2xs"
            title="Cari Aduan"
          >
            <ScanSearch size={17} />
          </Link>

          {/* Bell Notification with dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotifOpen(o => !o)}
              className="relative w-10 h-10 rounded-full border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-secondary)] transition-all shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
              aria-label="Notifikasi"
            >
              <Bell size={17} className={notifOpen ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'} />
              {notifCount > 0 && (
                <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-12 w-80 shadow-xl border border-[var(--color-border)] bg-[var(--color-surface)] rounded-2xl z-50 overflow-hidden animate-fade-in">
                <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                  <div className="flex items-center gap-2">
                    <Bell size={14} className="text-[var(--color-primary)]" />
                    <span className="font-semibold text-xs tracking-tight uppercase font-mono text-[var(--color-text)]">
                      {i18n.language === 'id' ? 'Aduan Perlu Perhatian' : 'Needs Attention'}
                    </span>
                  </div>
                  {notifCount > 0 && (
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full border border-[var(--color-border)]" style={{ color: 'var(--color-status-danger)', background: 'color-mix(in srgb, var(--color-status-danger) 12%, transparent)' }}>
                      {notifCount} {i18n.language === 'id' ? 'baru' : 'new'}
                    </span>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-[var(--color-border)]">
                  {notifs.length === 0 ? (
                    <div className="py-10 text-center">
                      <CheckCircle2 size={32} className="text-[var(--color-status-success)] mx-auto mb-2" />
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

                <div className="px-4 py-2.5 border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                  <button
                    onClick={() => { navigate('/stakeholder/followups'); setNotifOpen(false) }}
                    className="text-xs text-[var(--color-primary)] hover:underline font-medium w-full text-center"
                  >
                    {i18n.language === 'id' ? 'Lihat semua tindak lanjut' : 'View all follow-ups'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Pill (Finexy Avatar & Dropdown Pill) */}
          <div className="flex items-center gap-2.5 pl-1.5 pr-3 py-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xs">
            <div className="w-8 h-8 rounded-full bg-[#1D4ED8] text-white flex items-center justify-center text-xs font-bold font-mono shadow-xs">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="hidden xl:block text-left leading-tight">
              <div className="text-xs font-bold text-[var(--color-text)] truncate max-w-[120px]">
                {user?.name || 'Unit Pelaksana'}
              </div>
              <div className="text-[10px] font-mono text-[var(--color-text-muted)] truncate max-w-[120px]">
                {user?.role === 'stakeholder' ? 'Stakeholder' : 'Admin'}
              </div>
            </div>
          </div>
        </div>
      </header>
    )
  }

  // ---- Public / User variant ----
  return (
    <nav className="sticky top-0 z-50 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg shadow-xs flex items-center justify-center bg-[var(--color-btn)] text-[var(--color-btn-text)]">
              <ScanSearch size={18} strokeWidth={2.2} />
            </div>
            <span className="font-bold text-[var(--color-text)] text-xl tracking-tight">SuaraLens</span>
          </Link>

          {/* Desktop */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={toggle}
              className="p-2 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-card-hover)] transition-colors"
              aria-label="Toggle theme"
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <button
              onClick={switchLang}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-[var(--color-text)] border border-[var(--color-border)] hover:bg-[var(--color-card-hover)] transition-colors shadow-xs"
            >
              <Globe size={14} /> {i18n.language === 'id' ? 'EN' : 'ID'}
            </button>

            {user ? (
              <>
                <Link to={user.role === 'stakeholder' ? '/stakeholder' : '/user/dashboard'} className="btn-outline !py-2 !px-4 rounded-lg shadow-xs">
                  {t('nav.dashboard')}
                </Link>
                <button onClick={logout} className="btn-solid !py-2 !px-4 rounded-lg shadow-xs">
                  {t('nav.logout')}
                </button>
              </>
            ) : (
              <>
                <Link to="/signin" className="btn-outline !py-2 !px-4 rounded-lg shadow-xs">
                  {t('nav.login')}
                </Link>
                <Link to="/signup-user" className="btn-solid !py-2 !px-4 rounded-lg shadow-xs">
                  {t('nav.register')}
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button className="md:hidden p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg" onClick={() => setMenuOpen(m => !m)} aria-label="Toggle menu">
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden py-3 border-t border-[var(--color-border)] space-y-2 animate-fade-in">
            <div className="flex items-center justify-between px-4 py-1">
              <button onClick={switchLang} className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
                <Globe size={15} /> {i18n.language === 'id' ? 'English' : 'Bahasa Indonesia'}
              </button>
              <button onClick={toggle} className="p-1.5 rounded-lg text-[var(--color-text-muted)]">
                {dark ? <Sun size={17} className="text-[var(--color-accent)]" /> : <Moon size={17} />}
              </button>
            </div>
            {!user && (
              <div className="pt-2 border-t border-[var(--color-border)] space-y-1">
                <Link to="/signin" onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]">{t('nav.login')}</Link>
                <Link to="/signup-user" onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-sm text-[var(--color-primary)] font-semibold">{t('nav.register')}</Link>
              </div>
            )}
            {user && (
              <div className="pt-2 border-t border-[var(--color-border)] space-y-1">
                <Link to={user.role === 'stakeholder' ? '/stakeholder' : '/user/dashboard'} onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-sm font-medium text-[var(--color-text)]">
                  {t('nav.dashboard')}
                </Link>
                <button onClick={logout} className="block px-4 py-2 text-sm text-[var(--color-status-danger)] w-full text-left font-medium">{t('nav.logout')}</button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}