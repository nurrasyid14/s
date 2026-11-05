import { Link, useLocation } from 'react-router-dom'
import Sidebar, { STAKEHOLDER_NAV, stakeholderActiveIndex } from './Sidebar.jsx'
import Navbar from './Navbar.jsx'
import { useAutoReveal } from '../motion/Motion.jsx'

/** Tab bar bawah untuk layar kecil (sidebar tersembunyi di bawah md). */
function MobileTabBar() {
  const { pathname } = useLocation()
  const active = stakeholderActiveIndex(pathname)
  return (
    <nav aria-label="Menu stakeholder" className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[var(--color-sidebar-bg)] px-2 pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="grid grid-cols-6">
        {STAKEHOLDER_NAV.map(({ to, icon: Icon, label }, i) => (
          <Link
            key={to}
            to={to}
            aria-current={i === active ? 'page' : undefined}
            className={`press flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold transition-colors ${i === active ? 'text-[var(--color-gold)]' : 'text-[var(--color-sidebar-text-muted)]'}`}
          >
            <Icon size={19} />
            <span className="truncate">{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}

/**
 * Shell tunggal untuk seluruh halaman stakeholder: Sidebar navy + Navbar + area konten.
 */
export default function StakeholderLayout({ title, notifCount, narrow = false, children }) {
  const { pathname } = useLocation()
  const revealRef = useAutoReveal([pathname])
  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-bg-secondary)]">
      <Sidebar notifCount={notifCount} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Navbar variant="stakeholder" title={title} notifCount={notifCount} />
        <main id="main-content" className="flex-1 overflow-y-auto p-4 pb-24 sm:p-6 md:pb-6">
          <div key={pathname} ref={revealRef} className={`page-in mx-auto w-full space-y-5 ${narrow ? 'max-w-2xl' : 'max-w-[1400px]'}`}>
            {children}
          </div>
        </main>
      </div>
      <MobileTabBar />
    </div>
  )
}
