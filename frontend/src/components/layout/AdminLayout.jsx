import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { useTheme } from '../../context/ThemeContext.jsx'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard, CheckSquare, Send, ListFilter,
  LogOut, Sun, Moon, Menu, X, Search, Bell,
  HelpCircle, ChevronDown, BarChart3,
} from 'lucide-react'
import { RailNav, RailButton, PillNav, BrandMark } from './NavParts.jsx'
import { useAutoReveal } from '../motion/Motion.jsx'

const NAV_LINKS = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Overview', desc: 'Ringkasan & Metrik' },
  { to: '/admin/verifikasi', icon: CheckSquare, label: 'Verifikasi', desc: 'Validasi Tiket' },
  { to: '/admin/disposisi', icon: Send, label: 'Disposisi', desc: 'Distribusi 14 Unit' },
  { to: '/admin/complaints', icon: ListFilter, label: 'Aduan', desc: 'Semua Tiket' },
  { to: '/stakeholder', icon: BarChart3, label: 'Portal Unit', desc: 'Mode Stakeholder' },
]

function activeIndexOf(pathname) {
  return NAV_LINKS.findIndex(({ to }) => pathname === to || (to !== '/admin/dashboard' && pathname.startsWith(to)))
}

export default function AdminLayout({ title, children }) {
  const { user, logout } = useAuth()
  const { dark, toggle } = useTheme()
  const { i18n } = useTranslation()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef(null)
  const activeIndex = activeIndexOf(location.pathname)
  const revealRef = useAutoReveal([location.pathname])

  useEffect(() => {
    function onDown(e) { if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false) }
    function onKey(e) { if (e.key === 'Escape') { setProfileOpen(false); setMobileOpen(false) } }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [])

  function handleSignOut() {
    logout('/admin/signin')
  }

  function switchLang() {
    const next = i18n.language === 'id' ? 'en' : 'id'
    i18n.changeLanguage(next)
    localStorage.setItem('suaralens_lang', next)
  }

  const iconBtn = 'press relative flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-border)] text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text)]'

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-bg-secondary)]">
      {/* Rail ikon navy */}
      <aside className="z-20 hidden w-20 flex-shrink-0 flex-col items-center justify-between border-r border-[var(--color-sidebar-border)] bg-[var(--color-sidebar-bg)] py-5 md:flex">
        <Link to="/" aria-label="Beranda SuaraLens"><BrandMark size={40} /></Link>
        <RailNav items={NAV_LINKS} activeIndex={activeIndex} label="Menu administrator" />
        <div className="flex flex-col items-center gap-2">
          <RailButton onClick={toggle} aria-label={dark ? 'Mode terang' : 'Mode gelap'} title={dark ? 'Mode terang' : 'Mode gelap'}>
            {dark ? <Sun size={19} className="text-[var(--color-gold)]" /> : <Moon size={19} />}
          </RailButton>
          <RailButton onClick={switchLang} aria-label="Ganti bahasa" title="Ganti bahasa" className="font-mono text-xs font-bold">
            {i18n.language.toUpperCase()}
          </RailButton>
          <RailButton
            onClick={() => alert('Bantuan Administrator: Hubungi Tim IT Center PENS atau baca dokumentasi tata kelola penanganan aduan.')}
            aria-label="Pusat bantuan"
            title="Pusat bantuan"
          >
            <HelpCircle size={19} />
          </RailButton>
          <RailButton danger onClick={handleSignOut} aria-label="Keluar dari portal" title="Keluar dari portal">
            <LogOut size={19} />
          </RailButton>
        </div>
      </aside>

      {/* Drawer mobile navy */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden" role="dialog" aria-modal="true" aria-label="Navigasi administrator">
          <div className="backdrop-in fixed inset-0 bg-[var(--color-navy-deep)]/60 backdrop-blur-xs" onClick={() => setMobileOpen(false)} aria-hidden="true" />
          <aside className="drawer-in relative z-10 flex h-full w-72 max-w-[85vw] flex-col justify-between bg-[var(--color-sidebar-bg)] p-5 text-white shadow-2xl">
            <div>
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2.5">
                  <BrandMark size={34} />
                  <span className="font-bold">SuaraLens</span>
                  <span className="rounded-full bg-[var(--color-gold)] px-2 py-0.5 text-[10px] font-bold text-[var(--color-on-gold)]">ADMIN</span>
                </div>
                <button onClick={() => setMobileOpen(false)} className="press rounded-lg p-1.5 text-white/70 hover:bg-white/10" aria-label="Tutup navigasi">
                  <X size={20} />
                </button>
              </div>
              <nav className="stagger mt-4 space-y-1.5">
                {NAV_LINKS.map(({ to, icon: Icon, label, desc }, i) => {
                  const active = i === activeIndex
                  return (
                    <Link
                      key={to}
                      to={to}
                      style={{ '--i': i }}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition-colors ${
                        active ? 'bg-[var(--color-gold)] text-[var(--color-on-gold)]' : 'text-white/80 hover:bg-white/10'
                      }`}
                    >
                      <Icon size={18} />
                      <div>
                        <div>{label}</div>
                        <div className="text-[11px] font-normal opacity-70">{desc}</div>
                      </div>
                    </Link>
                  )
                })}
              </nav>
            </div>
            <div className="space-y-2 border-t border-white/10 pt-4">
              <div className="grid grid-cols-2 gap-2">
                <button onClick={toggle} className="press flex items-center justify-center gap-2 rounded-xl border border-white/15 p-2.5 text-sm text-white/85">
                  {dark ? <Sun size={16} className="text-[var(--color-gold)]" /> : <Moon size={16} />}{dark ? 'Terang' : 'Gelap'}
                </button>
                <button onClick={switchLang} className="press rounded-xl border border-white/15 p-2.5 font-mono text-sm font-bold text-white/85">
                  {i18n.language === 'id' ? 'EN' : 'ID'}
                </button>
              </div>
              <button onClick={handleSignOut} className="press flex w-full items-center justify-center gap-2 rounded-xl bg-rose-500/15 p-3 text-sm font-semibold text-rose-200">
                <LogOut size={16} /> Keluar Portal
              </button>
            </div>
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="z-10 flex h-20 items-center justify-between gap-4 border-b border-[var(--color-border)] bg-[var(--color-surface)]/85 px-4 backdrop-blur-md sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="press rounded-xl p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-secondary)] md:hidden"
              aria-label="Buka navigasi"
              aria-expanded={mobileOpen}
            >
              <Menu size={22} />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">SuaraLens</span>
                <span className="rounded-full bg-[var(--color-gold-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--color-gold-ink)]">Admin Sentral</span>
              </div>
              <h1 className="truncate text-lg font-bold tracking-tight text-[var(--color-text)]">{title || NAV_LINKS[activeIndex]?.label || 'Dashboard'}</h1>
            </div>
          </div>

          <PillNav items={NAV_LINKS} activeIndex={activeIndex} label="Menu administrator" />

          <div className="flex items-center gap-2.5">
            <Link to="/admin/complaints" className={iconBtn} title="Cari aduan" aria-label="Cari aduan">
              <Search size={17} />
            </Link>
            <Link to="/admin/verifikasi" className={iconBtn} title="Antrean verifikasi" aria-label="Antrean verifikasi">
              <Bell size={17} />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-[var(--color-surface)]" />
            </Link>

            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(o => !o)}
                aria-haspopup="menu"
                aria-expanded={profileOpen}
                className="press flex items-center gap-2.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] py-1.5 pl-1.5 pr-3 transition-colors hover:bg-[var(--color-bg-secondary)]"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-navy)] font-mono text-xs font-bold text-[var(--color-gold)] dark:bg-[var(--color-primary)] dark:text-white">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
                </div>
                <div className="hidden text-left leading-tight xl:block">
                  <div className="max-w-[120px] truncate text-xs font-bold text-[var(--color-text)]">{user?.name || 'Admin Sentral'}</div>
                  <div className="max-w-[120px] truncate font-mono text-[10px] text-[var(--color-text-muted)]">{user?.email || 'admin@pens.ac.id'}</div>
                </div>
                <ChevronDown size={14} className={`text-[var(--color-text-muted)] transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`} />
              </button>

              {profileOpen && (
                <div role="menu" className="popover-in absolute right-0 top-12 z-50 w-60 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2 shadow-xl">
                  <div className="border-b border-[var(--color-border)] px-3 py-2">
                    <div className="text-xs font-bold text-[var(--color-text)]">{user?.name || 'Administrator'}</div>
                    <div className="font-mono text-[11px] text-[var(--color-text-muted)]">{user?.email || 'admin@pens.ac.id'}</div>
                  </div>
                  <div className="py-1">
                    <Link role="menuitem" to="/stakeholder" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-[var(--color-text)] hover:bg-[var(--color-bg-secondary)]">
                      <BarChart3 size={15} /> Buka Dashboard Unit
                    </Link>
                    <button role="menuitem" onClick={handleSignOut} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-[var(--color-status-danger)] hover:bg-[var(--color-status-danger)]/10">
                      <LogOut size={15} /> Keluar Portal
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main id="main-content" className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div key={location.pathname} ref={revealRef} className="page-in mx-auto max-w-[1500px] space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
