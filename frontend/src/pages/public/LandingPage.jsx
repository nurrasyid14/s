import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  FileEdit, ScanSearch, ShieldCheck, BarChart3, Clock, MessageSquare, Users, Globe, Sun, Moon,
  CheckCircle2, ArrowRight, Menu, X, Building2, GraduationCap, Wallet, Wrench, Server, Library,
  Home, Plus, Bell, Search, Paperclip,
} from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useTheme } from '../../context/ThemeContext.jsx'

/* Pemilih bahasa: L('teks id', 'text en') — mengikuti i18n.language. */
function useL() {
  const { i18n } = useTranslation()
  const isId = !i18n.language || i18n.language.startsWith('id')
  return (id, en) => (isId ? id : en)
}

/* Reveal saat scroll: blur + naik 14px (animasi seperti referensi). */
function useReveal() {
  const ref = useRef(null)
  useEffect(() => {
    const root = ref.current
    if (!root) return undefined
    const items = root.querySelectorAll('.reveal')
    if (!('IntersectionObserver' in window)) {
      items.forEach(el => el.classList.add('in'))
      return undefined
    }
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('in')
          io.unobserve(e.target)
        }
      })
    }, { threshold: 0.15 })
    items.forEach((el, i) => {
      el.style.transitionDelay = `${(i % 6) * 70}ms`
      io.observe(el)
    })
    return () => io.disconnect()
  }, [])
  return ref
}

const Hatch = ({ className = '', opacity = 'opacity-10' }) => (
  <div className={`relative w-full overflow-hidden ${className}`}>
    <div className={`hatch absolute inset-0 ${opacity}`} style={{ color: 'var(--hatch)' }} />
  </div>
)

/* ---------- Bingkai ponsel (path SVG identik dengan referensi) ---------- */
function PhoneFrame({ children, className = '', style }) {
  return (
    <div className={className} style={style}>
      <svg width="100%" viewBox="0 0 433 882" preserveAspectRatio="xMidYMid meet" fill="none" xmlns="http://www.w3.org/2000/svg" className="block">
        <path d="M2 73C2 32.6832 34.6832 0 75 0H357C397.317 0 430 32.6832 430 73V809C430 849.317 397.317 882 357 882H75C34.6832 882 2 849.317 2 809V73Z" style={{ fill: 'var(--phone-body)' }} />
        <path d="M0 171C0 170.448 0.447715 170 1 170H3V204H1C0.447715 204 0 203.552 0 203V171Z" style={{ fill: 'var(--phone-body)' }} />
        <path d="M1 234C1 233.448 1.44772 233 2 233H3.5V300H2C1.44772 300 1 299.552 1 299V234Z" style={{ fill: 'var(--phone-body)' }} />
        <path d="M1 319C1 318.448 1.44772 318 2 318H3.5V385H2C1.44772 385 1 384.552 1 384V319Z" style={{ fill: 'var(--phone-body)' }} />
        <path d="M430 279H432C432.552 279 433 279.448 433 280V384C433 384.552 432.552 385 432 385H430V279Z" style={{ fill: 'var(--phone-body)' }} />
        <path d="M6 74C6 35.3401 37.3401 4 76 4H356C394.66 4 426 35.3401 426 74V808C426 846.66 394.66 878 356 878H76C37.3401 878 6 846.66 6 808V74Z" style={{ fill: 'var(--phone-bezel)' }} />
        <path opacity="0.5" d="M174 5H258V5.5C258 6.60457 257.105 7.5 256 7.5H176C174.895 7.5 174 6.60457 174 5.5V5Z" style={{ fill: 'var(--phone-body)' }} />
        <path d="M21.25 75C21.25 44.2101 46.2101 19.25 77 19.25H355C385.79 19.25 410.75 44.2101 410.75 75V807C410.75 837.79 385.79 862.75 355 862.75H77C46.2101 862.75 21.25 837.79 21.25 807V75Z" style={{ fill: 'var(--phone-screen)' }} />
        <foreignObject x="21.25" y="19.25" width="389.5" height="843.5">
          <div xmlns="http://www.w3.org/1999/xhtml" style={{ width: '100%', height: '100%', borderRadius: 55.75, overflow: 'hidden', position: 'relative', background: '#FFFFFF', color: '#0A1220', fontFamily: 'Geist, sans-serif' }}>
            {children}
          </div>
        </foreignObject>
        <path d="M154 48.5C154 38.2827 162.283 30 172.5 30H259.5C269.717 30 278 38.2827 278 48.5C278 58.7173 269.717 67 259.5 67H172.5C162.283 67 154 58.7173 154 48.5Z" style={{ fill: 'var(--phone-bezel)' }} />
        <path d="M249 48.5C249 42.701 253.701 38 259.5 38C265.299 38 270 42.701 270 48.5C270 54.299 265.299 59 259.5 59C253.701 59 249 54.299 249 48.5Z" style={{ fill: '#111' }} />
        <path d="M254 48.5C254 45.4624 256.462 43 259.5 43C262.538 43 265 45.4624 265 48.5C265 51.5376 262.538 54 259.5 54C256.462 54 254 51.5376 254 48.5Z" fill="rgba(255,255,255,0.3)" />
      </svg>
    </div>
  )
}

/* ---------- Layar mockup (dirancang pada kanvas 389x843) ---------- */
const NAVY = '#0B1F3A'
const BLUE = '#2563EB'
const LINE = 'rgba(10,18,32,0.12)'
const MUTE = 'rgba(10,18,32,0.55)'

function ScreenHeader({ title, sub }) {
  return (
    <div style={{ padding: '70px 26px 16px' }}>
      <div style={{ fontSize: 15, color: MUTE }}>{sub}</div>
      <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.04em', marginTop: 2 }}>{title}</div>
    </div>
  )
}

function TabBar({ active }) {
  const items = [Home, MessageSquare, Plus, BarChart3, Users]
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 92, borderTop: `1px solid ${LINE}`, background: '#fff', display: 'flex', justifyContent: 'space-around', alignItems: 'flex-start', paddingTop: 18 }}>
      {items.map((Ic, i) => (
        <div key={i} style={{ width: 52, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: i === 2 ? NAVY : 'transparent', color: i === 2 ? '#fff' : i === active ? BLUE : MUTE }}>
          <Ic size={24} />
        </div>
      ))}
    </div>
  )
}

function Chip({ children, color = BLUE }) {
  return <span style={{ fontSize: 13, fontWeight: 600, padding: '4px 10px', color, background: `${color}1A` }}>{children}</span>
}

function ScreenList({ L }) {
  const rows = [
    ['SL-0247', L('AC ruang lab 3 tidak dingin', 'Lab 3 AC not cooling'), L('Diproses', 'In progress'), '#B45309'],
    ['SL-0244', L('Wi-Fi gedung D putus-putus', 'Building D Wi-Fi unstable'), L('Selesai', 'Resolved'), '#15803D'],
    ['SL-0239', L('Antrean KRS terlalu lama', 'KRS queue too long'), L('Baru', 'New'), BLUE],
    ['SL-0231', L('Buku referensi kurang', 'Not enough references'), L('Selesai', 'Resolved'), '#15803D'],
  ]
  return (
    <>
      <ScreenHeader sub={L('Selamat pagi, Rina', 'Good morning, Rina')} title={L('Aduan Saya', 'My Complaints')} />
      <div style={{ margin: '0 26px', padding: 18, background: NAVY, color: '#fff' }}>
        <div style={{ fontSize: 14, opacity: 0.75 }}>{L('Progres terbaru', 'Latest progress')} · #SL-0247</div>
        <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.03em', marginTop: 6 }}>{L('Tahap 4 dari 5', 'Step 4 of 5')}</div>
        <div style={{ display: 'flex', gap: 5, marginTop: 14 }}>
          {[1, 2, 3, 4, 5].map(n => <div key={n} style={{ flex: 1, height: 5, background: n <= 4 ? '#60A5FA' : 'rgba(255,255,255,.25)' }} />)}
        </div>
      </div>
      <div style={{ padding: '22px 26px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {rows.map(([id, title, st, col]) => (
          <div key={id} style={{ border: `1px solid ${LINE}`, padding: '14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: MUTE, fontFamily: 'Geist Mono, monospace' }}>{id}</span>
              <Chip color={col}>{st}</Chip>
            </div>
            <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.02em', marginTop: 8 }}>{title}</div>
          </div>
        ))}
      </div>
      <TabBar active={1} />
    </>
  )
}

function ScreenForm({ L }) {
  return (
    <>
      <ScreenHeader sub={L('Langkah 3 dari 5', 'Step 3 of 5')} title={L('Ajukan Aduan', 'Submit Complaint')} />
      <div style={{ padding: '0 26px' }}>
        <div style={{ display: 'flex', gap: 5 }}>
          {[1, 2, 3, 4, 5].map(n => <div key={n} style={{ flex: 1, height: 5, background: n <= 3 ? BLUE : LINE }} />)}
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, marginTop: 26 }}>{L('Kategori', 'Category')}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
          {[L('Fasilitas', 'Facilities'), L('Akademik', 'Academic'), L('Administrasi', 'Admin'), L('Keuangan', 'Finance')].map((c, i) => (
            <span key={c} style={{ fontSize: 14, padding: '8px 14px', border: `1px solid ${i === 0 ? NAVY : LINE}`, background: i === 0 ? NAVY : '#fff', color: i === 0 ? '#fff' : '#0A1220' }}>{c}</span>
          ))}
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, marginTop: 26 }}>{L('Deskripsi aduan', 'Complaint details')}</div>
        <div style={{ marginTop: 10, border: '1px solid rgba(10,18,32,.55)', padding: 14, height: 190, fontSize: 15, lineHeight: 1.5, color: '#0A1220' }}>
          {L('Pendingin ruangan lab 3 tidak berfungsi sejak Senin. Praktikum menjadi terganggu karena suhu ruangan terlalu panas…', 'The lab 3 air conditioner has not worked since Monday. Practical sessions are disrupted because the room is too hot…')}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: MUTE, marginTop: 8 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Paperclip size={14} />{L('Lampirkan bukti', 'Attach evidence')}</span>
          <span>112 / 50+</span>
        </div>
        <div style={{ marginTop: 30, background: NAVY, color: '#fff', textAlign: 'center', padding: '15px 0', fontSize: 16, fontWeight: 500 }}>{L('Lanjut', 'Continue')}</div>
      </div>
      <TabBar active={2} />
    </>
  )
}

function ScreenDash({ L }) {
  const bars = [38, 52, 44, 66, 58, 82, 74]
  return (
    <>
      <ScreenHeader sub={L('Portal Stakeholder', 'Stakeholder Portal')} title={L('Ringkasan', 'Overview')} />
      <div style={{ padding: '0 26px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[[L('Total aduan', 'Total'), '1.284'], [L('Rata-rata SLA', 'Avg SLA'), '2,4 hr'], [L('Sentimen negatif', 'Negative'), '31%'], [L('Urgensi tinggi', 'High urgency'), '12']].map(([k, v], i) => (
            <div key={k} style={{ border: `1px solid ${i === 3 ? BLUE : LINE}`, padding: '12px 14px' }}>
              <div style={{ fontSize: 12.5, color: MUTE }}>{k}</div>
              <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.04em', marginTop: 4, color: i === 3 ? BLUE : '#0A1220' }}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{ border: `1px solid ${LINE}`, marginTop: 14, padding: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{L('Tren 7 hari', '7-day trend')}</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 150, marginTop: 14 }}>
            {bars.map((h, i) => <div key={i} style={{ flex: 1, height: `${h}%`, background: i === 5 ? NAVY : '#93B4F5' }} />)}
          </div>
        </div>
        <div style={{ border: `1px solid ${LINE}`, marginTop: 14, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Bell size={18} color={BLUE} />
          <div style={{ fontSize: 14 }}><b>SL-0247</b> · {L('Urgensi 8, perlu ditinjau', 'Urgency 8, needs review')}</div>
        </div>
      </div>
      <TabBar active={3} />
    </>
  )
}

/* ---------- Header ---------- */
function Header() {
  const { t, i18n } = useTranslation()
  const L = useL()
  const { user, logout } = useAuth()
  const { dark, toggle } = useTheme()
  const [open, setOpen] = useState(false)

  const switchLang = () => {
    const next = i18n.language === 'id' ? 'en' : 'id'
    i18n.changeLanguage(next)
    localStorage.setItem('suaralens_lang', next)
  }
  const links = [
    ['#features', L('Fitur', 'Features')],
    ['#units', L('Unit Layanan', 'Service Units')],
    ['#about', L('Tentang', 'About')],
    ['#contact', L('Kontak', 'Contact')],
  ]
  const dash = user?.role === 'stakeholder' ? '/stakeholder' : '/user/dashboard'
  return (
    <header className="relative w-full border-b border-white/50" style={{ color: 'var(--color-text)' }}>
      <div className="flex w-full items-center justify-between py-6 px-4 md:px-8">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center" style={{ background: 'var(--color-btn)', color: 'var(--color-btn-text)' }}>
            <ScanSearch size={16} />
          </span>
          <span className="text-xl font-bold tracking-tight">SuaraLens</span>
        </Link>
        <nav className="hidden md:flex items-center gap-4 lg:gap-8 text-sm lg:text-base font-medium">
          {links.map(([href, label]) => <a key={href} href={href} className="hover:opacity-70 transition-opacity">{label}</a>)}
        </nav>
        <div className="flex items-center gap-3">
          <button onClick={toggle} aria-label="Toggle theme" className="p-2 hover:opacity-70 transition-opacity">{dark ? <Sun size={18} /> : <Moon size={18} />}</button>
          <button onClick={switchLang} className="hidden md:flex items-center gap-1 text-sm font-medium hover:opacity-70 transition-opacity"><Globe size={15} />{i18n.language === 'id' ? 'EN' : 'ID'}</button>
          {user ? (
            <>
              <Link to={dash} className="hidden md:block px-4 py-2 border text-sm font-medium transition-colors hover:bg-black/5" style={{ borderColor: 'var(--color-text)' }}>{t('nav.dashboard')}</Link>
              <button onClick={logout} className="px-4 py-2 text-sm font-medium transition-colors" style={{ background: 'var(--color-btn)', color: 'var(--color-btn-text)' }}>{t('nav.logout')}</button>
            </>
          ) : (
            <>
              <Link to="/signin" className="hidden md:block px-4 py-2 border text-sm font-medium transition-colors hover:bg-black/5" style={{ borderColor: 'var(--color-text)' }}>{t('nav.login')}</Link>
              <Link to="/signup-user" className="px-4 py-2 text-sm font-medium transition-colors hover:opacity-90" style={{ background: 'var(--color-btn)', color: 'var(--color-btn-text)' }}>{t('nav.register')}</Link>
            </>
          )}
          <button className="md:hidden p-2" onClick={() => setOpen(o => !o)} aria-label="Menu">{open ? <X size={20} /> : <Menu size={20} />}</button>
        </div>
      </div>
      {open && (
        <div className="md:hidden border-t border-white/50 px-4 py-3 flex flex-col gap-3 text-sm font-medium animate-fade-in">
          {links.map(([href, label]) => <a key={href} href={href} onClick={() => setOpen(false)}>{label}</a>)}
          <button onClick={switchLang} className="flex items-center gap-2 text-left"><Globe size={15} />{i18n.language === 'id' ? 'English' : 'Bahasa Indonesia'}</button>
          {!user && <Link to="/signin" onClick={() => setOpen(false)}>{t('nav.login')}</Link>}
        </div>
      )}
    </header>
  )
}

/* ---------- Hero ---------- */
function Hero() {
  const L = useL()
  return (
    <section className="relative w-full pt-8 md:pt-12 flex flex-col items-center overflow-hidden">
      <div className="flex w-full flex-col items-center">
        <div className="blur-in">
          <a href="#features" className="flex w-fit items-center gap-2 border p-1 text-xs md:text-sm font-medium backdrop-blur-sm transition-colors hover:bg-white/20" style={{ borderColor: 'var(--color-border)' }}>
            <span className="px-3 py-1 text-[10px] md:text-xs" style={{ background: 'var(--color-btn)', color: 'var(--color-btn-text)' }}>{L('Baru', 'New')}</span>
            <span className="pr-2" style={{ color: 'var(--color-text-muted)' }}>{L('Analitik sentimen aduan berbasis NLP →', 'NLP-based complaint sentiment analytics →')}</span>
          </a>
        </div>
        <div className="blur-in delay-100">
          <h1 className="mt-6 max-w-4xl px-4 text-center text-4xl font-bold leading-[1.1] tracking-tight text-white md:text-7xl" style={{ textShadow: '0px 4px 4px rgba(0,0,0,0.09)' }}>
            {L('Suarakan Aduan', 'Raise Any Complaint')}<br />{L('Tanpa Ragu', 'Without Hesitation')}
          </h1>
        </div>
        <div className="blur-in delay-200">
          <p className="mt-4 max-w-xl px-4 text-center text-base text-white/90">
            {L('Sampaikan keluhan, masukan, dan saran kepada unit layanan kampus dengan aman. Pantau setiap tahap penanganan hingga tuntas, secara transparan dan terukur.',
              'Send complaints, feedback, and suggestions to campus service units safely. Track every handling step through to resolution, transparently and measurably.')}
          </p>
        </div>
        <div className="blur-in delay-300">
          <div className="mt-8 flex w-full flex-col items-center gap-4 px-4 sm:w-auto sm:flex-row">
            <Link to="/signup-user" className="w-full px-6 py-2.5 font-medium text-base transition-colors text-center sm:w-auto hover:opacity-90" style={{ background: 'var(--color-btn)', color: 'var(--color-btn-text)' }}>{L('Ajukan Aduan', 'Submit a Complaint')}</Link>
            <Link to="/signin" className="w-full px-6 py-2.5 border border-white text-white font-medium text-base transition-colors text-center sm:w-auto hover:bg-white/10">{L('Masuk Stakeholder', 'Stakeholder Sign In')}</Link>
          </div>
        </div>
      </div>

      <Hatch className="h-10 border-y border-white my-5 text-white" opacity="opacity-30" />
      <div className="absolute" style={{ display: 'none' }} />

      <div className="w-full flex justify-center -mt-4 relative z-10 -mb-4">
        <div className="relative flex min-h-[380px] md:min-h-[520px] lg:min-h-[640px] w-full items-center justify-center">
          <div className="relative flex h-full w-full max-w-4xl items-center justify-center">
            <div className="absolute w-[220px] md:w-[260px] lg:w-[280px] z-10" style={{ transform: 'translateX(-78%)' }}>
              <PhoneFrame className="phone-rise w-full" style={{ animationDelay: '300ms' }}><ScreenList L={L} /></PhoneFrame>
            </div>
            <div className="relative w-[240px] md:w-[280px] lg:w-[300px] z-20">
              <PhoneFrame className="phone-rise w-full" style={{ animationDelay: '150ms' }}><ScreenForm L={L} /></PhoneFrame>
            </div>
            <div className="absolute w-[220px] md:w-[260px] lg:w-[280px] z-10" style={{ transform: 'translateX(78%)' }}>
              <PhoneFrame className="phone-rise w-full" style={{ animationDelay: '450ms' }}><ScreenDash L={L} /></PhoneFrame>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-48 z-20 pointer-events-none" style={{ background: 'linear-gradient(to top, var(--hero-fade), transparent)' }} />
    </section>
  )
}

/* ---------- Unit layanan (setara bar logo referensi) ---------- */
function Units() {
  const L = useL()
  const units = [
    [GraduationCap, L('Akademik', 'Academic')],
    [Users, L('Kemahasiswaan', 'Student Affairs')],
    [Wallet, L('Keuangan', 'Finance')],
    [Wrench, L('Sarana & Prasarana', 'Facilities')],
    [Server, 'IT Center'],
    [Library, L('Perpustakaan', 'Library')],
  ]
  return (
    <section id="units" className="w-full flex flex-col items-center pt-24 pb-16 relative z-20" style={{ background: 'var(--color-bg)' }}>
      <h2 className="reveal text-center text-sm md:text-base font-medium mb-10 px-4" style={{ color: 'var(--color-text-muted)' }}>
        {L('Dipercaya oleh unit layanan kampus EEPIS', 'Trusted by EEPIS campus service units')}
      </h2>
      <div className="w-full flex flex-col">
        <Hatch className="reveal h-8 border-t" opacity="opacity-10" />
        <div className="w-full border-y grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 divide-x divide-y lg:divide-y-0" style={{ borderColor: 'var(--color-border)', background: 'color-mix(in srgb, var(--color-surface) 50%, transparent)' }}>
          {units.map(([Icon, name]) => (
            <div key={name} className="reveal flex h-24 items-center justify-center gap-2 p-4 opacity-60 hover:opacity-100 transition-opacity" style={{ borderColor: 'var(--color-border)' }}>
              <Icon size={20} /><span className="text-base font-semibold tracking-tight">{name}</span>
            </div>
          ))}
        </div>
        <Hatch className="reveal h-8 border-b" opacity="opacity-10" />
      </div>
    </section>
  )
}

/* ---------- Fitur (3 kartu) ---------- */
function Wave() {
  const hs = [16, 34, 24, 50, 30, 20, 46, 28, 40, 18, 36, 48, 30, 22, 16, 34, 24, 48, 28, 18]
  return (
    <div className="relative flex w-full items-center justify-center overflow-hidden max-w-[260px]" style={{ height: 96, color: 'color-mix(in srgb, var(--color-primary) 40%, transparent)', WebkitMaskImage: 'linear-gradient(90deg,transparent,black 14%,black 86%,transparent)', maskImage: 'linear-gradient(90deg,transparent,black 14%,black 86%,transparent)' }} role="img" aria-label="Aktivitas aduan">
      <div className="flex h-full items-center justify-center" style={{ gap: 3 }}>
        {hs.map((h, i) => <span key={i} className="animate-wave block bg-current" style={{ width: 4, height: h * 1.4, animationDelay: `${i * 70}ms` }} />)}
      </div>
    </div>
  )
}

function IconMarquee() {
  const icons = [FileEdit, ScanSearch, ShieldCheck, BarChart3, Clock, MessageSquare, Users, Building2, CheckCircle2, Bell, Search, Paperclip]
  const row = icons.map((Ic, i) => <Ic key={i} size={44} strokeWidth={1.4} className="shrink-0" />)
  return (
    <div className="mt-auto mb-10 w-full overflow-hidden" style={{ WebkitMaskImage: 'linear-gradient(to right,transparent,black 10%,black 90%,transparent)', maskImage: 'linear-gradient(to right,transparent,black 10%,black 90%,transparent)' }}>
      <div className="animate-marquee flex w-max items-center gap-6 pr-6" style={{ color: 'color-mix(in srgb, var(--color-primary) 40%, transparent)' }}>
        {row}{row}
      </div>
    </div>
  )
}

function Features() {
  const L = useL()
  const h3 = 'text-3xl font-semibold leading-[1.05] tracking-[-0.055em] md:text-2xl lg:text-[2.55rem]'
  const p = 'mt-5 text-sm leading-6 md:text-xs md:leading-5 lg:text-[13px] lg:leading-6'
  return (
    <section id="features" className="w-full px-4 py-20 md:px-8 md:py-24" style={{ background: 'var(--color-bg)' }}>
      <div className="mx-auto flex max-w-6xl flex-col items-center">
        <h2 className="reveal max-w-2xl text-center text-3xl leading-[0.95] tracking-[-0.04em] md:text-5xl lg:text-4xl" style={{ color: 'var(--color-text-muted)' }}>
          {L('Semua yang Anda Butuhkan', 'Everything You Need To')}<br />{L('untuk Aduan yang Tuntas', 'Get Complaints Resolved')}
        </h2>
        <div className="mt-14 grid w-full grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
          <article className="reveal flex min-h-[430px] flex-col border p-8 md:p-9" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
            <h3 className={`${h3} lg:max-w-[13rem]`}>{L('Aduan 24 jam setiap hari', 'Complaints 24/7')}</h3>
            <p className={p} style={{ color: 'var(--color-text-muted)' }}>
              {L('Sampaikan keluhan, masukan, atau saran kapan saja dari ponsel Anda. Identitas dapat disamarkan, tanpa antre di loket, tanpa biaya.',
                'Send a complaint, feedback, or suggestion any time from your phone. Identity can stay anonymous, no queue at the desk, no cost.')}
            </p>
            <div className="mt-auto border-l pl-5" style={{ borderColor: 'var(--color-border)' }}><Wave /></div>
          </article>

          <article className="reveal flex min-h-[430px] flex-col border p-8 md:p-9" style={{ borderColor: 'var(--color-primary)', background: 'var(--color-surface)' }}>
            <h3 className={`${h3} lg:max-w-[15rem]`}>{L('Verifikasi & kategori otomatis', 'Automatic verification & triage')}</h3>
            <p className={`${p} mb-2`} style={{ color: 'var(--color-text-muted)' }}>
              {L('Setiap aduan dianalisis NLP untuk menentukan kategori, tingkat urgensi, dan sentimen sebelum diteruskan ke unit yang tepat.',
                'Every complaint is analyzed with NLP to set category, urgency, and sentiment before reaching the right unit.')}
            </p>
            <div className="mt-auto">
              <div className="ml-auto block w-fit max-w-full rounded-tl-full rounded-tr-full rounded-bl-full px-5 py-2.5 text-left text-[11px] font-medium leading-[1.4] text-white shadow-sm" style={{ background: 'var(--color-primary)' }}>
                {L('AC ruang lab 3 tidak berfungsi sejak Senin', 'Lab 3 AC has not worked since Monday')}
              </div>
              <div className="mt-8 flex items-center gap-1.5 ml-2">
                {[0, 1, 2].map(i => <span key={i} className="size-2.5 rounded-full animate-pulse-soft" style={{ background: 'var(--color-border-strong)', opacity: 0.4, animationDelay: `${i * 200}ms` }} />)}
              </div>
              <p className="mt-3 ml-2 text-[8px] font-medium" style={{ color: 'var(--color-text-muted)' }}>{L('Menganalisis kategori dan urgensi aduan', 'Analyzing category and urgency')}</p>
            </div>
          </article>

          <article className="reveal flex min-h-[430px] flex-col border p-8 md:p-9" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
            <h3 className={`${h3} lg:max-w-[15rem]`}>{L('Pantau sampai tuntas', 'Track it to the end')}</h3>
            <p className={p} style={{ color: 'var(--color-text-muted)' }}>
              {L('Lihat status dan tenggat SLA secara langsung. Unit pengelola menindaklanjuti dengan bukti dan jejak yang transparan bagi semua pihak.',
                'See status and SLA deadlines live. Handling units follow up with evidence and an audit trail visible to everyone.')}
            </p>
            <IconMarquee />
          </article>
        </div>
      </div>
    </section>
  )
}

/* ---------- Banner CTA ---------- */
function StoreBtn({ to, icon: Icon, small, big }) {
  return (
    <Link to={to} className="flex items-center gap-3 border border-white/70 bg-black px-5 py-2.5 text-left text-white transition-colors hover:bg-black/80">
      <Icon size={26} />
      <span className="flex flex-col leading-tight">
        <span className="text-[10px] uppercase tracking-wider text-white/70">{small}</span>
        <span className="text-lg font-semibold tracking-tight">{big}</span>
      </span>
    </Link>
  )
}

function CTA() {
  const L = useL()
  return (
    <section id="about" className="relative w-full flex flex-col items-center justify-center py-40 overflow-hidden">
      <div className="hero-grad absolute inset-0 -z-0" />
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-center px-4 md:px-8 relative z-10">
        <h2 className="reveal text-center text-4xl font-bold tracking-tight text-white md:text-6xl lg:text-[4.5rem] mb-10 drop-shadow-sm">
          {L('Platform Aduan Kampus', 'The Campus Complaint')}<br />{L('yang Didengar', 'Platform That Listens')}
        </h2>
        <div className="reveal flex flex-row flex-wrap items-center justify-center gap-4">
          <StoreBtn to="/signup-user" icon={FileEdit} small={L('Sebagai pelapor', 'As a reporter')} big={L('Ajukan Aduan', 'Submit Complaint')} />
          <StoreBtn to="/signin" icon={ShieldCheck} small={L('Sebagai pengelola', 'As a handler')} big={L('Masuk Stakeholder', 'Stakeholder Sign In')} />
        </div>
      </div>
    </section>
  )
}

/* ---------- Footer ---------- */
function Footer() {
  const L = useL()
  const [sent, setSent] = useState(false)
  const col = (title, items) => (
    <div>
      <h3 className="text-3xl font-normal tracking-[-0.035em]">{title}</h3>
      <ul className="mt-5 space-y-3">
        {items.map(([label, href]) => (
          <li key={label}><a href={href} className="text-2xl font-normal tracking-[-0.04em] transition-colors hover:opacity-100 opacity-40">{label}</a></li>
        ))}
      </ul>
    </div>
  )
  return (
    <footer id="contact" className="w-full px-6 pb-28 pt-20 md:px-12 lg:px-28 lg:pb-44 lg:pt-24" style={{ background: 'var(--color-bg)' }}>
      <div className="grid gap-16 lg:grid-cols-[minmax(0,1fr)_minmax(340px,420px)] lg:gap-24">
        <div className="flex min-h-[280px] flex-col justify-between gap-20">
          <div>
            <h2 className="text-3xl font-normal tracking-[-0.035em]">{L('Kabar Terbaru', 'Newsletter')}</h2>
            <form className="mt-4 flex max-w-[390px] items-center gap-2" onSubmit={e => { e.preventDefault(); setSent(true) }}>
              <label className="sr-only" htmlFor="footer-email">Email</label>
              <input id="footer-email" type="email" required placeholder={L('Masukkan email Anda', 'Enter Your Email')} className="input-field h-12 min-w-0 flex-1 text-lg" />
              <button type="submit" className="h-12 px-4 text-lg font-normal transition-colors hover:opacity-85" style={{ background: 'var(--color-btn)', color: 'var(--color-btn-text)' }}>{sent ? '✓' : L('Kirim', 'Submit')}</button>
            </form>
          </div>
          <div>
            <p className="text-lg font-normal tracking-[-0.03em]" style={{ color: 'var(--color-text-muted)' }}>© 2026 SuaraLens · EEPIS. {L('Hak cipta dilindungi.', 'All rights reserved.')}</p>
          </div>
        </div>
        <nav className="grid grid-cols-2 gap-14 lg:gap-20" aria-label="Footer">
          {col(L('Produk', 'Brand'), [[L('Tentang', 'About'), '#about'], [L('Fitur', 'Features'), '#features'], [L('Unit Layanan', 'Units'), '#units'], [L('Masuk', 'Sign In'), '/signin']])}
          {col(L('Bantuan', 'Support'), [[L('Bantuan', 'Help'), '#contact'], [L('Panduan', 'Guidelines'), '#features'], ['FAQ', '#features'], [L('Privasi', 'Privacy'), '#contact']])}
        </nav>
      </div>
    </footer>
  )
}

export default function LandingPage() {
  const rootRef = useReveal()
  useEffect(() => { document.title = 'SuaraLens — Platform Aduan Kampus' }, [])
  return (
    <div ref={rootRef} className="min-h-screen w-full flex flex-col" style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}>
      <main className="mx-auto w-full max-w-[1400px] border-x flex flex-col flex-1 relative z-10" style={{ borderColor: 'var(--color-border)' }}>
        <div className="relative w-full flex flex-col">
          <div className="hero-grad absolute top-0 left-1/2 -translate-x-1/2 w-[100vw] h-full z-[-1]" />
          <div className="absolute inset-0 border-x border-white/30 pointer-events-none z-50" />
          <Header />
          <Hero />
        </div>
        <Units />
        <Features />
        <Hatch className="h-8 border-y" opacity="opacity-10" />
        <CTA />
        <Footer />
      </main>
    </div>
  )
}