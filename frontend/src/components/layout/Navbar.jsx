import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Bell, Globe, Sun, Moon, Menu, X, AlertTriangle, CheckCircle2, Clock, Search } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext.jsx'
import { useTheme } from '../../context/ThemeContext.jsx'
import { getUrgentComplaints } from '../../services/analyticsApi.js'
import { STAKEHOLDER_NAV, stakeholderActiveIndex } from './Sidebar.jsx'
import { PillNav, BrandMark } from './NavParts.jsx'
import { formatUrgencyScore } from '../../utils/formatter.js'

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
  const location = useLocation()
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
    const navItems = STAKEHOLDER_NAV.map(({ to, label }) => ({ to, label }))

    return (
      <header className="sticky top-0 z-20 flex h-20 items-center justify-between gap-4 border-b border-[var(--color-border)] bg-[var(--color-surface)]/85 px-4 backdrop-blur-md sm:px-8">
        {/* Kiri: judul halaman */}
        <div className="flex min-w-0 items-center gap-3">
          <Link to="/" className="md:hidden" aria-label="Beranda SuaraLens"><BrandMark size={36} /></Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">Portal Unit</span>
              <span className="rounded-full bg-[var(--color-gold-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--color-gold-ink)]">Stakeholder</span>
            </div>
            <h1 className="truncate text-lg font-bold tracking-tight text-[var(--color-text)]">{title || 'SuaraLens'}</h1>
          </div>
        </div>

        <PillNav items={navItems} activeIndex={stakeholderActiveIndex(location.pathname)} label="Menu stakeholder" />

        {/* Right: Search, Notif Dropdown, User Profile Pill */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Quick Search */}
          <Link
            to="/stakeholder/complaints"
            className="w-10 h-10 rounded-full border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-secondary)] transition shadow-2xs"
            title="Cari Aduan"
            aria-label="Cari aduan"
          >
            <Search size={17} strokeWidth={2.2} />
          </Link>

          {/* Bell Notification with dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotifOpen(o => !o)}
              className="relative w-10 h-10 rounded-full border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-secondary)] transition shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
              aria-label="Notifikasi"
              aria-haspopup="true"
              aria-expanded={notifOpen}
            >
              <Bell size={17} className={notifOpen ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'} />
              {notifCount > 0 && (
                <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-12 w-80 shadow-xl border border-[var(--color-border)] bg-[var(--color-surface)] rounded-2xl z-50 overflow-hidden popover-in">
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
                                Urgency {formatUrgencyScore(n.urgency_score)}
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
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-navy)] font-mono text-xs font-bold text-[var(--color-gold)] dark:bg-[var(--color-primary)] dark:text-white">
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
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-[var(--color-navy)] text-white shadow-[0_8px_30px_-16px_rgba(4,12,36,0.7)]">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5">
            <BrandMark size={34} />
            <span className="text-xl font-bold tracking-tight">SuaraLens</span>
          </Link>

          {/* Desktop */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={toggle}
              className="press flex h-10 w-10 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Toggle theme"
            >
              {dark ? <Sun size={18} className="text-[var(--color-gold)]" /> : <Moon size={18} />}
            </button>

            <button
              onClick={switchLang}
              className="press flex h-10 items-center gap-1.5 rounded-lg border border-white/20 px-3 text-sm font-medium text-white/90 transition-colors hover:bg-white/10"
            >
              <Globe size={14} /> {i18n.language === 'id' ? 'EN' : 'ID'}
            </button>

            {user ? (
              <>
                {user.role === 'user' ? (
                  <>
                    {[['/user/dashboard', 'Transparansi'], ['/user/complaints', 'Riwayat Saya']].map(([to, text]) => {
                      const active = location.pathname === to || (to === '/user/complaints' && location.pathname.startsWith(to))
                      return (
                        <Link key={to} to={to} aria-current={active ? 'page' : undefined} className={`group relative rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${active ? 'text-white' : 'text-white/70 hover:text-white'}`}>
                          {text}
                          <span className={`absolute inset-x-3 -bottom-[13px] h-[3px] origin-center rounded-t-full bg-[var(--color-gold)] transition-transform duration-300 ${active ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-50'}`} />
                        </Link>
                      )
                    })}
                    <Link to="/user/submit" className="btn-gold !h-10 !px-4 !text-sm">
                      + Ajukan
                    </Link>
                  </>
                ) : (
                  <Link to={user.role === 'stakeholder' ? '/stakeholder' : '/admin/dashboard'} className="btn-ghost-light !h-10 !px-4">
                    {t('nav.dashboard')}
                  </Link>
                )}
                <button onClick={logout} className="press h-10 rounded-lg px-3 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-rose-300">
                  {t('nav.logout')}
                </button>
              </>
            ) : (
              <>
                <Link to="/signin" className="btn-ghost-light !h-10 !px-4">
                  {t('nav.login')}
                </Link>
                <Link to="/signup-user" className="btn-gold !h-10 !px-4">
                  {t('nav.register')}
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button className="press md:hidden flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 text-white/85 hover:bg-white/10" onClick={() => setMenuOpen(m => !m)} aria-label="Toggle menu" aria-expanded={menuOpen}>
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden space-y-2 border-t border-white/10 py-3 animate-fade-in-up [&_a]:text-white/90 [&_button]:text-white/85">
            <div className="flex items-center justify-between px-4 py-1">
              <button onClick={switchLang} className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
                <Globe size={15} /> {i18n.language === 'id' ? 'English' : 'Bahasa Indonesia'}
              </button>
              <button onClick={toggle} className="p-1.5 rounded-lg text-[var(--color-text-muted)]">
                {dark ? <Sun size={17} className="text-[var(--color-accent)]" /> : <Moon size={17} />}
              </button>
            </div>
            {!user && (
              <div className="pt-2 border-t border-white/10 space-y-1">
                <Link to="/signin" onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]">{t('nav.login')}</Link>
                <Link to="/signup-user" onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-sm text-[var(--color-primary)] font-semibold">{t('nav.register')}</Link>
              </div>
            )}
            {user && (
              <div className="pt-2 border-t border-white/10 space-y-1">
                {user.role === 'user' ? (
                  <>
                    <Link to="/user/dashboard" onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-sm font-medium text-[var(--color-text)]">
                      Dashboard Transparansi
                    </Link>
                    <Link to="/user/complaints" onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-sm font-medium text-[var(--color-text)]">
                      Riwayat Aduan Saya
                    </Link>
                    <Link to="/user/submit" onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-sm font-semibold text-[var(--color-primary)]">
                      + Ajukan Aspirasi Baru
                    </Link>
                  </>
                ) : (
                  <Link to={user.role === 'stakeholder' ? '/stakeholder' : '/admin/dashboard'} onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-sm font-medium text-[var(--color-text)]">
                    {t('nav.dashboard')}
                  </Link>
                )}
                <button onClick={logout} className="block px-4 py-2 text-sm text-[var(--color-status-danger)] w-full text-left font-medium">{t('nav.logout')}</button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}