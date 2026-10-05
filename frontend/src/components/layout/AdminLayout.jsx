import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import {
  LayoutDashboard, CheckSquare, Send, ListFilter,
  LogOut, ShieldAlert, FileText, ArrowRight
} from 'lucide-react'

export default function AdminLayout({ title, notifCount = 0, children }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  function handleSignOut() {
    logout()
    navigate('/signin')
  }

  const navLinks = [
    { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard Admin' },
    { to: '/admin/verifikasi', icon: CheckSquare, label: 'Verifikasi Tiket' },
    { to: '/admin/disposisi', icon: Send, label: 'Disposisi 14 Unit' },
    { to: '/admin/complaints', icon: ListFilter, label: 'Semua Aduan' },
  ]

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-bg)]">
      {/* Sidebar Admin */}
      <aside className="w-64 flex-shrink-0 border-r border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col justify-between">
        <div>
          {/* Logo / Header */}
          <div className="p-5 border-b border-[var(--color-border)]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-6 bg-[var(--color-primary)] inline-block" />
              <div>
                <span className="font-mono text-base font-extrabold tracking-tight text-[var(--color-text)]">
                  Suara<span className="text-[var(--color-primary)]">Lens</span>
                </span>
                <span className="ml-2 px-1.5 py-0.5 text-[9px] font-mono uppercase bg-[var(--color-primary)] text-white font-bold">
                  ADMIN
                </span>
              </div>
            </div>
            <div className="text-[11px] font-mono text-[var(--color-text-muted)] mt-1.5">
              Portal Verifikasi & Disposisi Sentral
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {navLinks.map(({ to, icon: Icon, label }) => {
              const active = location.pathname === to || (to !== '/admin/dashboard' && location.pathname.startsWith(to))
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-3 px-3 py-2.5 text-xs font-semibold transition-colors ${
                    active
                      ? 'bg-[var(--color-primary)] text-white shadow-sm'
                      : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text)]'
                  }`}
                >
                  <Icon size={16} />
                  <span>{label}</span>
                </Link>
              )
            })}
          </nav>
        </div>

        {/* User Card & Logout */}
        <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-none border border-[var(--color-border)] bg-[var(--color-primary)] text-white flex items-center justify-center font-mono font-bold text-xs">
              A
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-[var(--color-text)] truncate">{user?.name || 'Admin Sentral'}</div>
              <div className="text-[10px] font-mono text-[var(--color-text-muted)] truncate">{user?.email || 'admin@pens.ac.id'}</div>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 p-2 text-xs font-semibold text-[var(--color-status-danger)] border border-[var(--color-border)] hover:bg-[var(--color-surface)] transition-colors"
          >
            <LogOut size={13} /> Keluar Portal Admin
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="h-14 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-bold font-mono tracking-tight text-[var(--color-text)] uppercase">
              {title || 'Pusat Kendali Administrator'}
            </h1>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono text-[var(--color-text-muted)]">
            <span className="px-2 py-0.5 border border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
              Institusi: PENS
            </span>
            <Link to="/stakeholder" className="text-[var(--color-primary)] hover:underline inline-flex items-center gap-1">
              Portal Unit <ArrowRight size={12} />
            </Link>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-[1400px] mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
