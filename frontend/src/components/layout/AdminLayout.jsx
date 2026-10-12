import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { useTheme } from '../../context/ThemeContext.jsx'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard, CheckSquare, Send, ListFilter,
  LogOut, Sun, Moon, Globe, Menu, X, Search, Bell,
  HelpCircle, ChevronDown, BarChart3, ScanSearch, Settings
} from 'lucide-react'

export default function AdminLayout({ title, notifCount = 0, children }) {
  const { user, logout } = useAuth()
  const { dark, toggle } = useTheme()
  const { i18n } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  function handleSignOut() {
    logout()
    navigate('/signin')
  }

  function switchLang() {
    const next = i18n.language === 'id' ? 'en' : 'id'
    i18n.changeLanguage(next)
    localStorage.setItem('suaralens_lang', next)
  }

  const navLinks = [
    { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Overview', desc: 'Ringkasan & Metrik' },
    { to: '/admin/verifikasi', icon: CheckSquare, label: 'Verifikasi', desc: 'Validasi Tiket' },
    { to: '/admin/disposisi', icon: Send, label: 'Disposisi', desc: 'Distribusi 14 Unit' },
    { to: '/admin/complaints', icon: ListFilter, label: 'Aduan', desc: 'Semua Tiket' },
    { to: '/stakeholder', icon: BarChart3, label: 'Portal Unit', desc: 'Mode Stakeholder' },
  ]

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-bg-secondary)]">
      {/* 1. Left Slim Icon Rail (Finexy Style) */}
      <aside className="hidden md:flex w-20 flex-shrink-0 flex-col items-center justify-between py-6 bg-[var(--color-surface)] border-r border-[var(--color-border)] z-20">
        {/* Top: Theme Toggle */}
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

        {/* Center: Icon Rail Navigation */}
        <nav className="flex flex-col items-center gap-3 w-full px-3">
          {navLinks.map(({ to, icon: Icon, label }) => {
            const active = location.pathname === to || (to !== '/admin/dashboard' && location.pathname.startsWith(to))
            return (
              <Link
                key={to}
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
              </Link>
            )
          })}
        </nav>

        {/* Bottom: Help & Logout */}
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
            onClick={() => alert('Bantuan Administrator: Hubungi Tim IT Center PENS atau baca dokumentasi tata kelola penanganan aduan.')}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-secondary)] transition-colors"
            title="Pusat Bantuan"
            aria-label="Pusat Bantuan"
          >
            <HelpCircle size={19} />
          </button>
          <button
            onClick={handleSignOut}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-[var(--color-status-danger)] hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            title="Keluar dari Portal"
            aria-label="Keluar dari Portal"
          >
            <LogOut size={19} />
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative w-72 max-w-[85vw] bg-[var(--color-surface)] border-r border-[var(--color-border)] h-full z-10 p-5 flex flex-col justify-between shadow-2xl animate-fade-in">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[var(--color-border)]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#0B1F3A] text-white flex items-center justify-center font-bold">
                    <ScanSearch size={18} />
                  </div>
                  <div>
                    <span className="font-bold text-base text-[var(--color-text)]">SuaraLens</span>
                    <span className="ml-2 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[var(--color-primary)] text-white">ADMIN</span>
                  </div>
                </div>
                <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg text-[var(--color-text-muted)]">
                  <X size={20} />
                </button>
              </div>
              <nav className="mt-4 space-y-1.5">
                {navLinks.map(({ to, icon: Icon, label, desc }) => {
                  const active = location.pathname === to
                  return (
                    <Link
                      key={to}
                      to={to}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition-all ${
                        active
                          ? 'bg-[#0B1F3A] text-white dark:bg-[var(--color-primary)]'
                          : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-secondary)]'
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
            <div className="pt-4 border-t border-[var(--color-border)]">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2 p-3 text-sm font-semibold text-[var(--color-status-danger)] border border-[var(--color-border)] rounded-xl hover:bg-[var(--color-bg-secondary)]"
              >
                <LogOut size={16} /> Keluar Portal
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* 2. Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Top Header Bar (Finexy Style) */}
        <header className="h-20 px-4 sm:px-8 bg-[var(--color-surface)] border-b border-[var(--color-border)] flex items-center justify-between gap-4 z-10">
          {/* Left: Brand Identity */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 rounded-xl text-[var(--color-text-muted)] hover:bg-[var(--color-bg-secondary)]"
              aria-label="Buka navigasi"
            >
              <Menu size={22} />
            </button>
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#0B1F3A] dark:bg-[var(--color-primary)] text-white flex items-center justify-center shadow-md shadow-blue-950/20">
                <ScanSearch size={22} />
              </div>
              <div className="hidden sm:block">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-lg tracking-tight text-[var(--color-text)]">SuaraLens</span>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    Admin Sentral
                  </span>
                </div>
              </div>
            </Link>
          </div>

          {/* Center: Floating Pill Navigation Tabs (Finexy Signature Pill) */}
          <nav className="hidden lg:flex items-center p-1.5 rounded-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)]/80 shadow-2xs">
            {navLinks.map(({ to, label }) => {
              const active = location.pathname === to || (to !== '/admin/dashboard' && location.pathname.startsWith(to))
              return (
                <Link
                  key={to}
                  to={to}
                  className={`px-5 py-2 rounded-full text-xs font-semibold transition-all ${
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

          {/* Right: Actions, Search, Notifications, User Profile Pill */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Search Icon Button */}
            <Link
              to="/admin/complaints"
              className="w-10 h-10 rounded-full border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-secondary)] transition-all shadow-2xs"
              title="Cari Aduan / Tiket"
            >
              <Search size={17} />
            </Link>

            {/* Notification Bell */}
            <Link
              to="/admin/verifikasi"
              className="relative w-10 h-10 rounded-full border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-secondary)] transition-all shadow-2xs"
              title="Notifikasi Antrean"
            >
              <Bell size={17} />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            </Link>

            {/* Info / Help Button */}
            <button
              onClick={() => alert('Portal Pengaduan Sivitas Kampus PENS - Status Server: Normal')}
              className="hidden sm:flex w-10 h-10 rounded-full border border-[var(--color-border)] items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-secondary)] transition-all shadow-2xs"
              title="Informasi Sistem"
            >
              <HelpCircle size={17} />
            </button>

            {/* User Profile Pill (Finexy Avatar & Dropdown Pill) */}
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2.5 pl-1.5 pr-3 py-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-bg-secondary)] transition-all shadow-2xs"
              >
                <div className="w-8 h-8 rounded-full bg-[#1D4ED8] text-white flex items-center justify-center text-xs font-bold font-mono shadow-xs">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
                </div>
                <div className="hidden xl:block text-left leading-tight">
                  <div className="text-xs font-bold text-[var(--color-text)] truncate max-w-[120px]">
                    {user?.name || 'Dr. Admin Sentral'}
                  </div>
                  <div className="text-[10px] font-mono text-[var(--color-text-muted)] truncate max-w-[120px]">
                    {user?.email || 'admin@pens.ac.id'}
                  </div>
                </div>
                <ChevronDown size={14} className="text-[var(--color-text-muted)]" />
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-12 w-56 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xl p-2 z-50 animate-fade-in">
                  <div className="px-3 py-2 border-b border-[var(--color-border)]">
                    <div className="text-xs font-bold text-[var(--color-text)]">{user?.name || 'Administrator'}</div>
                    <div className="text-[11px] text-[var(--color-text-muted)] font-mono">{user?.email || 'admin@pens.ac.id'}</div>
                  </div>
                  <div className="py-1">
                    <Link
                      to="/stakeholder"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-xl text-[var(--color-text)] hover:bg-[var(--color-bg-secondary)]"
                    >
                      <BarChart3 size={15} /> Buka Dashboard Unit
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-xl text-[var(--color-status-danger)] hover:bg-red-50 dark:hover:bg-red-950/30"
                    >
                      <LogOut size={15} /> Keluar Portal
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Viewport */}
        <main id="main-content" className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="max-w-[1500px] mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
