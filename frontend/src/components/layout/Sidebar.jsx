import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, MessageSquare, BarChart3, ListChecks,
  Paperclip, Settings, LogOut, Sun, Moon, HelpCircle,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext.jsx'
import { useTheme } from '../../context/ThemeContext.jsx'
import useBilingual from '../../hooks/useBilingual.js'
import { RailNav, RailButton, BrandMark } from './NavParts.jsx'

export const STAKEHOLDER_NAV = [
  { key: 'dashboard', to: '/stakeholder', icon: LayoutDashboard, label: 'Overview', labelEn: 'Overview' },
  { key: 'complaints', to: '/stakeholder/complaints', icon: MessageSquare, label: 'Aduan', labelEn: 'Complaints' },
  { key: 'analytics', to: '/stakeholder/analytics', icon: BarChart3, label: 'Analitik', labelEn: 'Analytics' },
  { key: 'followups', to: '/stakeholder/followups', icon: ListChecks, label: 'Tindak Lanjut', labelEn: 'Follow-ups' },
  { key: 'evidence', to: '/stakeholder/evidence', icon: Paperclip, label: 'Bukti', labelEn: 'Evidence' },
  { key: 'settings', to: '/stakeholder/settings', icon: Settings, label: 'Pengaturan', labelEn: 'Settings' },
]

/** Daftar menu dengan label sesuai bahasa aktif. */
export function localizeNav(items, isId) {
  return items.map(item => ({ ...item, label: isId ? item.label : (item.labelEn || item.label) }))
}

export function stakeholderActiveIndex(pathname) {
  return STAKEHOLDER_NAV.findIndex(({ to }) => pathname === to || (to !== '/stakeholder' && pathname.startsWith(to)))
}

export default function Sidebar({ notifCount = 0 }) {
  const { i18n } = useTranslation()
  const { logout } = useAuth()
  const { dark, toggle } = useTheme()
  const { pathname } = useLocation()
  const { tx, isId } = useBilingual()

  function switchLang() {
    const next = i18n.language === 'id' ? 'en' : 'id'
    i18n.changeLanguage(next)
    localStorage.setItem('suaralens_lang', next)
  }

  const items = localizeNav(STAKEHOLDER_NAV, isId).map(item => ({ ...item, badge: item.key === 'followups' && notifCount > 0 }))

  return (
    <aside
      className="z-30 hidden w-20 flex-shrink-0 flex-col items-center justify-between border-r border-[var(--color-sidebar-border)] bg-[var(--color-sidebar-bg)] py-5 md:flex"
      aria-label={tx('Sidebar Navigasi Stakeholder', 'Stakeholder Navigation Sidebar')}
    >
      <Link to="/" aria-label={tx('Beranda SuaraLens', 'SuaraLens Home')}><BrandMark size={40} /></Link>

      <RailNav items={items} activeIndex={stakeholderActiveIndex(pathname)} label={tx('Menu stakeholder', 'Stakeholder menu')} />

      <div className="flex flex-col items-center gap-2">
        <RailButton onClick={toggle} aria-label={dark ? tx('Mode terang', 'Light mode') : tx('Mode gelap', 'Dark mode')} title={dark ? tx('Mode terang', 'Light mode') : tx('Mode gelap', 'Dark mode')}>
          {dark ? <Sun size={19} className="text-[var(--color-gold)]" /> : <Moon size={19} />}
        </RailButton>
        <RailButton onClick={switchLang} aria-label={tx('Ganti bahasa', 'Switch language')} title={tx('Ganti bahasa', 'Switch language')} className="font-mono text-xs font-bold">
          {(i18n.language?.startsWith('en') ? 'EN' : 'ID')}
        </RailButton>
        <RailButton
          onClick={() => alert(tx('Pusat Bantuan Stakeholder Unit: Konsultasikan SOP penanganan tiket kepada Administrator Sentral.', 'Unit Stakeholder Help Center: Consult the ticket handling SOP with the Central Administrator.'))}
          aria-label={tx('Bantuan layanan', 'Service help')}
          title={tx('Bantuan layanan', 'Service help')}
        >
          <HelpCircle size={19} />
        </RailButton>
        <RailButton danger onClick={() => logout('/signin')} aria-label={tx('Keluar dari portal', 'Sign out of portal')} title={tx('Keluar dari portal', 'Sign out of portal')}>
          <LogOut size={19} />
        </RailButton>
      </div>
    </aside>
  )
}
