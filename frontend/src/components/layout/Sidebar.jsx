import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, MessageSquare, BarChart3, ListChecks,
  Paperclip, Settings, LogOut, Sun, Moon, HelpCircle,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext.jsx'
import { useTheme } from '../../context/ThemeContext.jsx'
import { RailNav, RailButton, BrandMark } from './NavParts.jsx'

export const STAKEHOLDER_NAV = [
  { key: 'dashboard', to: '/stakeholder', icon: LayoutDashboard, label: 'Overview' },
  { key: 'complaints', to: '/stakeholder/complaints', icon: MessageSquare, label: 'Aduan' },
  { key: 'analytics', to: '/stakeholder/analytics', icon: BarChart3, label: 'Analitik' },
  { key: 'followups', to: '/stakeholder/followups', icon: ListChecks, label: 'Tindak Lanjut' },
  { key: 'evidence', to: '/stakeholder/evidence', icon: Paperclip, label: 'Bukti' },
  { key: 'settings', to: '/stakeholder/settings', icon: Settings, label: 'Pengaturan' },
]

export function stakeholderActiveIndex(pathname) {
  return STAKEHOLDER_NAV.findIndex(({ to }) => pathname === to || (to !== '/stakeholder' && pathname.startsWith(to)))
}

export default function Sidebar({ notifCount = 0 }) {
  const { i18n } = useTranslation()
  const { logout } = useAuth()
  const { dark, toggle } = useTheme()
  const { pathname } = useLocation()

  function switchLang() {
    const next = i18n.language === 'id' ? 'en' : 'id'
    i18n.changeLanguage(next)
    localStorage.setItem('suaralens_lang', next)
  }

  const items = STAKEHOLDER_NAV.map(item => ({ ...item, badge: item.key === 'followups' && notifCount > 0 }))

  return (
    <aside
      className="z-30 hidden w-20 flex-shrink-0 flex-col items-center justify-between border-r border-[var(--color-sidebar-border)] bg-[var(--color-sidebar-bg)] py-5 md:flex"
      aria-label="Sidebar Navigasi Stakeholder"
    >
      <Link to="/" aria-label="Beranda SuaraLens"><BrandMark size={40} /></Link>

      <RailNav items={items} activeIndex={stakeholderActiveIndex(pathname)} label="Menu stakeholder" />

      <div className="flex flex-col items-center gap-2">
        <RailButton onClick={toggle} aria-label={dark ? 'Mode terang' : 'Mode gelap'} title={dark ? 'Mode terang' : 'Mode gelap'}>
          {dark ? <Sun size={19} className="text-[var(--color-gold)]" /> : <Moon size={19} />}
        </RailButton>
        <RailButton onClick={switchLang} aria-label="Ganti bahasa" title="Ganti bahasa" className="font-mono text-xs font-bold">
          {i18n.language.toUpperCase()}
        </RailButton>
        <RailButton
          onClick={() => alert('Pusat Bantuan Stakeholder Unit: Konsultasikan SOP penanganan tiket kepada Administrator Sentral.')}
          aria-label="Bantuan layanan"
          title="Bantuan layanan"
        >
          <HelpCircle size={19} />
        </RailButton>
        <RailButton danger onClick={() => logout('/signin')} aria-label="Keluar dari portal" title="Keluar dari portal">
          <LogOut size={19} />
        </RailButton>
      </div>
    </aside>
  )
}
