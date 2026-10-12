import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  FileEdit, ScanSearch, ShieldCheck, BarChart3, Clock, MessageSquare, Users, Globe, Sun, Moon,
  CheckCircle2, ArrowRight, Menu, X, Building2, GraduationCap, Wallet, Wrench, Server, Library,
  Home, Plus, Bell, Search, Paperclip, Lock, RotateCw, Sparkles, ChevronDown,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useTheme } from '../../context/ThemeContext.jsx'
import heroIllustration from '../../assets/hero-illustration.svg'
import featureTriage from '../../assets/feature-triage.svg'
import slaTracking from '../../assets/sla-tracking.svg'
import shieldSecurity from '../../assets/shield-security.svg'
import kampusImg from '../../assets/kampus.webp'
import kampusBuilding from '../../assets/kampus-building.webp'

/* Pemilih bahasa: L('teks id', 'text en'): mengikuti i18n.language. */
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

/* ---------- Bingkai ponsel (desain responsif berbasis proporsi) ---------- */
function PhoneFrame({ children, className = '', style }) {
  return (
    <div className={className} style={style}>
      <svg width="100%" viewBox="0 0 433 882" preserveAspectRatio="xMidYMid meet" fill="none" xmlns="http://www.w3.org/2000/svg" className="block drop-shadow-2xl">
        <path d="M2 73C2 32.6832 34.6832 0 75 0H357C397.317 0 430 32.6832 430 73V809C430 849.317 397.317 882 357 882H75C34.6832 882 2 849.317 2 809V73Z" style={{ fill: 'var(--phone-body)' }} />
        <path d="M0 171C0 170.448 0.447715 170 1 170H3V204H1C0.447715 204 0 203.552 0 203V171Z" style={{ fill: 'var(--phone-body)' }} />
        <path d="M1 234C1 233.448 1.44772 233 2 233H3.5V300H2C1.44772 300 1 299.552 1 299V234Z" style={{ fill: 'var(--phone-body)' }} />
        <path d="M1 319C1 318.448 1.44772 318 2 318H3.5V385H2C1.44772 385 1 384.552 1 384V319Z" style={{ fill: 'var(--phone-body)' }} />
        <path d="M430 279H432C432.552 279 433 279.448 433 280V384C433 384.552 432.552 385 432 385H430V279Z" style={{ fill: 'var(--phone-body)' }} />
        <path d="M6 74C6 35.3401 37.3401 4 76 4H356C394.66 4 426 35.3401 426 74V808C426 846.66 394.66 878 356 878H76C37.3401 878 6 846.66 6 808V74Z" style={{ fill: 'var(--phone-bezel)' }} />
        <path opacity="0.5" d="M174 5H258V5.5C258 6.60457 257.105 7.5 256 7.5H176C174.895 7.5 174 6.60457 174 5.5V5Z" style={{ fill: 'var(--phone-body)' }} />
        <path d="M21.25 75C21.25 44.2101 46.2101 19.25 77 19.25H355C385.79 19.25 410.75 44.2101 410.75 75V807C410.75 837.79 385.79 862.75 355 862.75H77C46.2101 862.75 21.25 837.79 21.25 807V75Z" style={{ fill: 'var(--phone-screen)' }} />
        <foreignObject x="21.25" y="19.25" width="389.5" height="843.5">
          <div xmlns="http://www.w3.org/1999/xhtml" style={{ width: '100%', height: '100%', borderRadius: 55.75, overflow: 'hidden', position: 'relative', background: 'var(--color-surface)', color: 'var(--color-text)', fontFamily: 'Geist, sans-serif' }}>
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

/* ---------- Layar mockup ponsel ---------- */
const NAVY = 'var(--color-btn)'
const BLUE = 'var(--color-primary)'
const LINE = 'var(--color-border)'
const MUTE = 'var(--color-text-muted)'

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
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 92, borderTop: `1px solid ${LINE}`, background: 'var(--color-surface)', display: 'flex', justifyContent: 'space-around', alignItems: 'flex-start', paddingTop: 18 }}>
      {items.map((Ic, i) => (
        <div key={i} style={{ width: 52, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, background: i === 2 ? NAVY : 'transparent', color: i === 2 ? 'var(--color-btn-text)' : i === active ? BLUE : MUTE }}>
          <Ic size={24} />
        </div>
      ))}
    </div>
  )
}

function Chip({ children, color = BLUE }) {
  return <span style={{ fontSize: 13, fontWeight: 600, padding: '4px 10px', borderRadius: 999, color, background: `${color}1A`, border: `1px solid ${color}33` }}>{children}</span>
}

function ScreenList({ L }) {
  const rows = [
    ['SL-0247', L('AC ruang lab 3 tidak dingin', 'Lab 3 AC not cooling'), L('Diproses', 'In progress'), 'var(--color-status-warning)'],
    ['SL-0244', L('Wi-Fi gedung D putus-putus', 'Building D Wi-Fi unstable'), L('Selesai', 'Resolved'), 'var(--color-status-success)'],
    ['SL-0239', L('Antrean KRS terlalu lama', 'KRS queue too long'), L('Baru', 'New'), BLUE],
    ['SL-0231', L('Buku referensi kurang', 'Not enough references'), L('Selesai', 'Resolved'), 'var(--color-status-success)'],
  ]
  return (
    <>
      <ScreenHeader sub={L('Selamat pagi, Rina', 'Good morning, Rina')} title={L('Aduan Saya', 'My Complaints')} />
      <div style={{ margin: '0 26px', padding: 18, borderRadius: 16, background: NAVY, color: 'var(--color-btn-text)', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
        <div style={{ fontSize: 14, opacity: 0.8 }}>{L('Progres terbaru', 'Latest progress')} · #SL-0247</div>
        <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.03em', marginTop: 6 }}>{L('Tahap 4 dari 5', 'Step 4 of 5')}</div>
        <div style={{ display: 'flex', gap: 5, marginTop: 14 }}>
          {[1, 2, 3, 4, 5].map(n => <div key={n} style={{ flex: 1, height: 5, borderRadius: 3, background: n <= 4 ? 'var(--color-primary)' : 'rgba(255,255,255,.25)' }} />)}
        </div>
      </div>
      <div style={{ padding: '22px 26px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {rows.map(([id, title, st, col]) => (
          <div key={id} style={{ border: `1px solid ${LINE}`, borderRadius: 14, padding: '14px 16px', background: 'var(--color-bg-secondary)', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
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
          {[1, 2, 3, 4, 5].map(n => <div key={n} style={{ flex: 1, height: 5, borderRadius: 3, background: n <= 3 ? BLUE : LINE }} />)}
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, marginTop: 26, color: 'var(--color-text)' }}>{L('Kategori', 'Category')}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
          {[L('Fasilitas', 'Facilities'), L('Akademik', 'Academic'), L('Administrasi', 'Admin'), L('Keuangan', 'Finance')].map((c, i) => (
            <span key={c} style={{ fontSize: 14, padding: '8px 14px', borderRadius: 8, border: `1px solid ${i === 0 ? NAVY : LINE}`, background: i === 0 ? NAVY : 'var(--color-surface)', color: i === 0 ? 'var(--color-btn-text)' : 'var(--color-text)' }}>{c}</span>
          ))}
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, marginTop: 26, color: 'var(--color-text)' }}>{L('Deskripsi aduan', 'Complaint details')}</div>
        <div style={{ marginTop: 10, border: '1px solid var(--color-border)', borderRadius: 12, padding: 14, height: 190, fontSize: 15, lineHeight: 1.5, color: 'var(--color-text)', background: 'var(--color-bg-secondary)' }}>
          {L('Pendingin ruangan lab 3 tidak berfungsi sejak Senin. Praktikum menjadi terganggu karena suhu ruangan terlalu panas.', 'The lab 3 air conditioner has not worked since Monday. Practical sessions are disrupted because the room is too hot.')}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: MUTE, marginTop: 8 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Paperclip size={14} />{L('Lampirkan bukti', 'Attach evidence')}</span>
          <span>112 / 50+</span>
        </div>
        <div style={{ marginTop: 30, background: NAVY, color: 'var(--color-btn-text)', textAlign: 'center', padding: '15px 0', fontSize: 16, fontWeight: 500, borderRadius: 10, boxShadow: '0 4px 12px rgba(11,31,58,0.2)' }}>{L('Lanjut', 'Continue')}</div>
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
            <div key={k} style={{ border: `1px solid ${i === 3 ? BLUE : LINE}`, borderRadius: 12, padding: '12px 14px', background: 'var(--color-bg-secondary)' }}>
              <div style={{ fontSize: 12.5, color: MUTE }}>{k}</div>
              <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.04em', marginTop: 4, color: i === 3 ? BLUE : 'var(--color-text)' }}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{ border: `1px solid ${LINE}`, borderRadius: 14, marginTop: 14, padding: 16, background: 'var(--color-bg-secondary)' }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)' }}>{L('Tren 7 hari', '7-day trend')}</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 150, marginTop: 14 }}>
            {bars.map((h, i) => <div key={i} style={{ flex: 1, height: `${h}%`, borderRadius: '4px 4px 0 0', background: i === 5 ? NAVY : 'var(--color-primary)' }} />)}
          </div>
        </div>
        <div style={{ border: `1px solid ${LINE}`, borderRadius: 12, marginTop: 14, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, background: 'var(--color-bg-secondary)' }}>
          <Bell size={18} color={BLUE} />
          <div style={{ fontSize: 14, color: 'var(--color-text)' }}><b>SL-0247</b> · {L('Urgensi 8, perlu ditinjau', 'Urgency 8, needs review')}</div>
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
    ['#campus', L('Kampus', 'Campus')],
    ['#features', L('Fitur', 'Features')],
    ['#units', L('Unit Layanan', 'Service Units')],
    ['#about', L('Tentang', 'About')],
    ['#contact', L('Kontak', 'Contact')],
  ]
  const dash = user?.role === 'stakeholder' ? '/stakeholder' : '/user/dashboard'
  return (
    <header className="relative w-full border-b border-white/30 text-white">
      <div className="flex w-full items-center justify-between py-4 px-4 md:px-10">
        <Link to="/" className="flex items-center gap-2.5 text-white">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg shadow-xs bg-white/15 text-white border border-white/25">
            <ScanSearch size={18} />
          </span>
          <span className="text-xl font-bold tracking-tight text-white">SuaraLens</span>
        </Link>
        <nav className="hidden md:flex items-center gap-4 lg:gap-8 text-sm lg:text-base font-medium">
          {links.map(([href, label]) => <a key={href} href={href} className="text-white/85 hover:text-white transition-colors">{label}</a>)}
        </nav>
        <div className="flex items-center gap-2.5">
          <button onClick={toggle} aria-label="Toggle theme" className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-xl text-white/85 hover:text-white hover:bg-white/10 transition-colors">{dark ? <Sun size={19} /> : <Moon size={19} />}</button>
          <button onClick={switchLang} aria-label="Ganti Bahasa" className="hidden md:flex min-h-[44px] items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-white/90 border border-white/30 hover:bg-white/10 transition-colors"><Globe size={16} />{i18n.language === 'id' ? 'EN' : 'ID'}</button>
          {user ? (
            <>
              <Link to={dash} className="hidden md:flex min-h-[44px] items-center px-4 py-2 border border-white/60 rounded-xl text-sm font-medium text-white transition-all shadow-xs hover:bg-white/10">{t('nav.dashboard')}</Link>
              <button onClick={logout} className="min-h-[44px] px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-md bg-white text-[#0B1F3A] hover:bg-white/90 hover:-translate-y-0.5">{t('nav.logout')}</button>
            </>
          ) : (
            <>
              <Link to="/signin" className="hidden md:flex min-h-[44px] items-center px-4 py-2 border border-white/60 rounded-xl text-sm font-medium text-white transition-all shadow-xs hover:bg-white/10">{t('nav.login')}</Link>
              <Link to="/signup-user" className="flex min-h-[44px] items-center px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-md bg-white text-[#0B1F3A] hover:bg-white/90 hover:-translate-y-0.5">{t('nav.register')}</Link>
            </>
          )}
          <button className="md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-xl text-white hover:bg-white/10 transition-colors" onClick={() => setOpen(o => !o)} aria-label="Buka Navigasi">{open ? <X size={20} /> : <Menu size={20} />}</button>
        </div>
      </div>
      {open && (
        <div className="md:hidden border-t border-white/20 bg-[#0B1F3A]/95 text-white backdrop-blur-md px-4 py-3 flex flex-col gap-3 text-sm font-medium animate-fade-in">
          {links.map(([href, label]) => <a key={href} href={href} className="text-white/85 hover:text-white" onClick={() => setOpen(false)}>{label}</a>)}
          <button onClick={switchLang} className="flex items-center gap-2 text-left text-white/90"><Globe size={15} />{i18n.language === 'id' ? 'English' : 'Bahasa Indonesia'}</button>
          {!user && <Link to="/signin" className="text-white/90 hover:text-white font-medium" onClick={() => setOpen(false)}>{t('nav.login')}</Link>}
        </div>
      )}
    </header>
  )
}

/* ---------- Hero (Page 1: Pas 1 Layar Penuh Desktop) ---------- */
function Hero() {
  const L = useL()
  return (
    <section className="relative w-full flex-1 flex flex-col justify-between items-center px-4 py-2 md:py-4 overflow-hidden">
      {/* Background Gedung Kampus PENS (Paling Kanan & Paling Terang) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 flex items-end justify-end">
        <img
          src={kampusBuilding}
          alt="Gedung Kampus PENS Surabaya"
          className="h-[55%] sm:h-[72%] md:h-[90%] lg:h-[100%] max-h-[920px] w-auto max-w-[55%] sm:max-w-none object-contain object-bottom select-none transition-all duration-700"
          style={{
            filter: 'brightness(1.16) contrast(1.08) saturate(1.15) drop-shadow(-15px 15px 35px rgba(0,0,0,0.55))',
            maskImage: 'linear-gradient(to bottom, black 80%, transparent 100%), linear-gradient(to left, black 70%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 80%, transparent 100%), linear-gradient(to left, black 70%, transparent 100%)',
            maskComposite: 'intersect',
            WebkitMaskComposite: 'source-in',
          }}
          loading="eager"
          fetchPriority="high"
          decoding="async"
        />
      </div>

      <div className="w-full relative z-10" />

      {/* Konten Utama Hero Tepat di Tengah Layar */}
      <div className="flex w-full flex-col items-center max-w-4xl mx-auto my-auto text-center px-2 py-4 relative z-10">
        <div className="blur-in">
          <a href="#showcase" className="inline-flex items-center gap-2 border border-white/30 bg-white/10 px-3.5 py-1 text-xs md:text-sm font-medium backdrop-blur-sm transition-all hover:bg-white/20 rounded-full shadow-xs">
            <span className="px-2 py-0.5 text-[10px] md:text-xs font-bold rounded-full bg-blue-500 text-white shadow-2xs">{L('Baru', 'New')}</span>
            <span className="pr-1 text-white font-medium">{L('Analitik sentimen aduan berbasis NLP terintegrasi', 'Integrated NLP-based complaint sentiment analytics')}</span>
          </a>
        </div>

        <div className="blur-in delay-100">
          <h1 className="mt-4 max-w-4xl text-center text-3xl sm:text-4xl md:text-5xl lg:text-[3.5rem] font-extrabold leading-[1.12] tracking-tight text-white" style={{ textShadow: '0px 4px 16px rgba(0,0,0,0.2)' }}>
            {L('Suarakan Aduan', 'Raise Any Complaint')}<br />{L('Tanpa Ragu', 'Without Hesitation')}
          </h1>
        </div>

        <div className="blur-in delay-200">
          <p className="mt-3 max-w-2xl px-4 text-center text-sm md:text-base text-white/90 leading-relaxed font-normal">
            {L('Sampaikan keluhan, masukan, dan saran kepada unit layanan kampus dengan aman. Pantau setiap tahap penanganan hingga tuntas, secara transparan dan terukur.',
              'Send complaints, feedback, and suggestions to campus service units safely. Track every handling step through to resolution, transparently and measurably.')}
          </p>
        </div>

        <div className="blur-in delay-300 w-full flex flex-col items-center">
          <div className="mt-6 flex w-full flex-col items-center justify-center gap-3 px-4 sm:w-auto sm:flex-row">
            <Link to="/signup-user" className="w-full min-h-[46px] flex items-center justify-center px-8 py-2.5 rounded-xl font-bold text-sm md:text-base transition-all text-center sm:w-auto bg-white text-[#0B1F3A] hover:bg-slate-100 shadow-lg hover:shadow-xl hover:-translate-y-0.5">{L('Ajukan Aduan', 'Submit a Complaint')}</Link>
            <Link to="/signin" className="w-full min-h-[46px] flex items-center justify-center px-8 py-2.5 border border-white/80 rounded-xl text-white font-semibold text-sm md:text-base transition-all text-center sm:w-auto hover:bg-white/10 shadow-sm hover:-translate-y-0.5">{L('Masuk Stakeholder', 'Stakeholder Sign In')}</Link>
          </div>

          {/* Showcase Vector Dashboard SuaraLens */}
          <div className="mt-8 w-full max-w-3xl px-2">
            <div className="rounded-3xl border border-white/30 bg-white/10 backdrop-blur-md p-2.5 shadow-2xl overflow-hidden hover:border-white/50 transition-all">
              <img
                src={heroIllustration}
                alt="SuaraLens Campus Dashboard Illustration"
                className="w-full h-auto max-h-[280px] md:max-h-[320px] object-contain rounded-2xl block mx-auto"
                loading="eager"
              />
            </div>
            <div className="mt-3 flex items-center justify-center gap-2">
              <span className="text-[11px] text-blue-200/80 font-medium px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 flex items-center gap-1.5 shadow-2xs">
                <Building2 size={12} className="text-blue-300" /> Gedung Pascasarjana Terpadu PENS
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Petunjuk Scroll ke Page 2 (Tampilan Ponsel) */}
      <div className="w-full pt-4 pb-3 flex justify-center relative z-10">
        <a href="#showcase" className="flex flex-col items-center gap-1 text-xs text-white/75 hover:text-white transition-colors group">
          <span className="tracking-wide text-[11px] font-medium">{L('Gulir ke bawah untuk melihat tampilan aplikasi ponsel', 'Scroll down to preview mobile app')}</span>
          <span className="p-1 rounded-full border border-white/20 bg-white/10 group-hover:bg-white/20 transition-all animate-bounce">
            <ChevronDown size={15} />
          </span>
        </a>
      </div>
    </section>
  )
}

/* ---------- Page 2: Showcase Mobile Phone Mockups ---------- */
function MobileShowcase() {
  const L = useL()
  return (
    <section id="showcase" className="relative w-full pt-12 pb-16 flex flex-col items-center overflow-hidden border-t border-white/10" style={{ background: 'var(--color-bg)' }}>
      <Hatch className="h-9 border-y border-white/20 mb-8 text-white w-full" opacity="opacity-20" />

      <div className="mx-auto flex max-w-4xl flex-col items-center text-center px-4 mb-14">
        <span className="px-3.5 py-1 text-xs font-semibold rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/25 mb-3.5">
          {L('Pengalaman Mobile Responsif', 'Responsive Mobile Experience')}
        </span>
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-[var(--color-text)]">
          {L('Pantau & Ajukan Aduan di Genggaman Anda', 'Track & Submit Reports On The Go')}
        </h2>
        <p className="mt-3.5 text-sm md:text-base text-[var(--color-text-muted)] max-w-2xl leading-relaxed">
          {L('Dirancang responsif untuk kemudahan akses di perangkat ponsel. Pantau riwayat penanganan, buat aduan dalam 5 langkah mudah, dan ikuti tindak lanjut SLA langsung dari ponsel Anda.',
            'Designed responsively for seamless mobile access. Track handling history, submit reports in 5 simple steps, and monitor resolution deadlines directly from your smartphone.')}
        </p>
      </div>

      <div className="w-full flex justify-center relative z-10 px-4 overflow-hidden">
        <div className="relative flex min-h-[480px] md:min-h-[580px] lg:min-h-[660px] w-full items-center justify-center">
          <div className="relative flex h-full w-full max-w-4xl items-center justify-center">
            <div className="hidden md:block absolute w-[220px] md:w-[260px] lg:w-[280px] z-10" style={{ transform: 'translateX(-78%)' }}>
              <PhoneFrame className="phone-rise w-full" style={{ animationDelay: '300ms' }}><ScreenList L={L} /></PhoneFrame>
            </div>
            <div className="relative w-[250px] md:w-[280px] lg:w-[305px] z-20">
              <PhoneFrame className="phone-rise w-full" style={{ animationDelay: '150ms' }}><ScreenForm L={L} /></PhoneFrame>
            </div>
            <div className="hidden md:block absolute w-[220px] md:w-[260px] lg:w-[280px] z-10" style={{ transform: 'translateX(78%)' }}>
              <PhoneFrame className="phone-rise w-full" style={{ animationDelay: '450ms' }}><ScreenDash L={L} /></PhoneFrame>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-44 z-20 pointer-events-none" style={{ background: 'linear-gradient(to top, var(--hero-fade), transparent)' }} />
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
    <section id="units" className="w-full flex flex-col items-center pt-8 pb-12 relative z-20" style={{ background: 'var(--color-bg)' }}>
      <h2 className="reveal text-center text-sm md:text-base font-medium mb-8 px-4" style={{ color: 'var(--color-text-muted)' }}>
        {L('Dipercaya oleh unit layanan kampus EEPIS', 'Trusted by EEPIS campus service units')}
      </h2>
      <div className="w-full flex flex-col max-w-6xl px-4">
        <div className="w-full border rounded-2xl overflow-hidden shadow-xs grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 divide-x divide-y lg:divide-y-0" style={{ borderColor: 'var(--color-border)', background: 'color-mix(in srgb, var(--color-surface) 75%, transparent)' }}>
          {units.map(([Icon, name]) => (
            <div key={name} className="reveal flex h-24 items-center justify-center gap-2.5 p-4 text-[var(--color-text)] hover:bg-black/5 dark:hover:bg-white/5 transition-all" style={{ borderColor: 'var(--color-border)' }}>
              <Icon size={20} className="text-[var(--color-primary)]" /><span className="text-base font-semibold tracking-tight">{name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ---------- Sorotan Kampus EEPIS ---------- */
function CampusSpotlight() {
  const L = useL()
  return (
    <section id="campus" className="w-full px-4 py-16 md:px-8 md:py-24" style={{ background: 'var(--color-bg)' }}>
      <div className="mx-auto flex max-w-6xl flex-col items-center">
        <span className="reveal px-3.5 py-1 text-xs font-semibold rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/25 mb-3.5">
          {L('Kampus Politeknik Elektronika Negeri Surabaya', 'Electronic Engineering Polytechnic Institute of Surabaya')}
        </span>
        <h2 className="reveal max-w-2xl text-center text-3xl font-bold leading-tight tracking-tight md:text-5xl lg:text-4xl" style={{ color: 'var(--color-text)' }}>
          {L('Fasilitas Kampus Unggul & Terpercaya', 'World-Class Campus & Transparent Facilities')}
        </h2>
        <p className="reveal mt-3 max-w-2xl text-center text-sm md:text-base text-[var(--color-text-muted)] leading-relaxed">
          {L('SuaraLens terhubung langsung dengan seluruh fasilitas laboratorium, ruang kuliah, dan gedung kampus PENS untuk memastikan lingkungan belajar yang nyaman dan terawat.',
            'SuaraLens connects directly with all PENS campus laboratories, classrooms, and buildings to ensure a comfortable and well-maintained learning environment.')}
        </p>

        <div className="reveal mt-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center w-full">
          {/* Foto Kampus dengan Frame & Badge Floating */}
          <div className="lg:col-span-6 relative group">
            <div className="relative rounded-3xl overflow-hidden border border-[var(--color-border)] shadow-xl bg-slate-900">
              <img
                src={kampusImg}
                alt="Gedung Pascasarjana & Kampus Terpadu PENS"
                className="w-full h-[460px] md:h-[520px] object-cover object-center group-hover:scale-105 transition-all duration-500"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B1F3A]/90 via-[#0B1F3A]/25 to-transparent pointer-events-none" />
              
              {/* Floating Badge Top */}
              <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-[#0B1F3A]/80 text-white backdrop-blur-md border border-white/20 shadow-sm flex items-center gap-1.5">
                  <Building2 size={13} className="text-blue-300" /> Kampus PENS Surabaya
                </span>
                <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-500 text-white shadow-sm font-mono">
                  Terakreditasi Unggul
                </span>
              </div>

              {/* Floating Badge Bottom */}
              <div className="absolute bottom-4 left-4 right-4 p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white shadow-lg">
                <div className="text-sm font-bold tracking-tight">Gedung Pascasarjana &amp; Lab Riset Terpadu</div>
                <div className="text-xs text-blue-100/80 mt-0.5">Pusat inovasi teknologi terapan dan layanan akademik modern</div>
              </div>
            </div>
          </div>

          {/* Kolom Informasi Integrasi Kampus */}
          <div className="lg:col-span-6 space-y-4">
            <div className="p-6 rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950 text-[var(--color-primary)] flex items-center justify-center flex-shrink-0">
                  <Wrench size={20} />
                </div>
                <h3 className="text-base font-bold text-[var(--color-text)]">
                  {L('Pemeliharaan Sarana & Prasarana Cepat', 'Fast Facilities Maintenance')}
                </h3>
              </div>
              <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
                {L('Kerusakan fasilitas seperti pendingin ruangan lab, proyektor kelas, atau lift gedung ditangani langsung oleh tim Sarana Prasarana dengan target respon awal di bawah 24 jam.',
                  'Facilities issues such as lab air conditioners, classroom projectors, or building elevators are handled directly by the Facilities team with initial response under 24 hours.')}
              </p>
            </div>

            <div className="p-6 rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center flex-shrink-0">
                  <Server size={20} />
                </div>
                <h3 className="text-base font-bold text-[var(--color-text)]">
                  {L('Infrastruktur Jaringan & IT Siaga', 'Reliable IT & Network Infrastructure')}
                </h3>
              </div>
              <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
                {L('Keluhan kestabilan Wi-Fi kampus, sistem informasi akademik, dan akun komputasi langsung didisposisikan ke IT Center PENS dengan pemantauan terbuka.',
                  'Reports regarding campus Wi-Fi stability, academic information systems, and computing accounts are routed immediately to the PENS IT Center.')}
              </p>
            </div>

            <div className="p-6 rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center flex-shrink-0">
                  <GraduationCap size={20} />
                </div>
                <h3 className="text-base font-bold text-[var(--color-text)]">
                  {L('Ekosistem Akademik Transparan', 'Transparent Academic Ecosystem')}
                </h3>
              </div>
              <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
                {L('Mendukung kenyamanan lebih dari 5.000 mahasiswa, dosen, dan tenaga kependidikan dalam mewujudkan kampus teknik terbaik berstandar internasional.',
                  'Supporting over 5,000 students, faculty, and staff in building an outstanding engineering campus with international standards.')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------- Fitur (3 kartu terstruktur berbasis alur nyata) ---------- */
function Features() {
  const L = useL()
  const h3 = 'text-2xl font-bold leading-tight tracking-tight md:text-xl lg:text-2xl'
  const p = 'mt-3 text-sm leading-relaxed text-[var(--color-text-muted)]'
  return (
    <section id="features" className="w-full px-4 py-20 md:px-8 md:py-24" style={{ background: 'var(--color-bg)' }}>
      <div className="mx-auto flex max-w-6xl flex-col items-center">
        <h2 className="reveal max-w-2xl text-center text-3xl font-bold leading-tight tracking-tight md:text-5xl lg:text-4xl" style={{ color: 'var(--color-text)' }}>
          {L('Sistem Aspirasi Kampus', 'Campus Accountability Platform')}<br />{L('yang Transparan & Terukur', 'Transparent & Measurable')}
        </h2>
        <div className="mt-14 grid w-full grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
          {/* Card 1: Pengaduan 24 Jam & Anonim */}
          <article className="reveal flex min-h-[460px] flex-col border p-6 md:p-8 rounded-3xl shadow-sm hover:shadow-md transition-all duration-200" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
            <div className="w-11 h-11 flex items-center justify-center border rounded-2xl mb-4 shadow-xs" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-secondary)', color: 'var(--color-primary)' }}>
              <Clock size={20} />
            </div>
            <h3 className={h3}>{L('Aduan 24 jam setiap hari', 'Complaints 24/7')}</h3>
            <p className={p}>
              {L('Sampaikan keluhan, masukan, atau saran kapan saja dari ponsel Anda. Identitas dapat disamarkan, tanpa antre di loket, tanpa biaya.',
                'Send a complaint, feedback, or suggestion any time from your phone. Identity can stay anonymous, no queue at the desk, no cost.')}
            </p>

            {/* SVG Asset 1 */}
            <div className="w-full h-44 rounded-2xl overflow-hidden my-4 border border-[var(--color-border)] bg-[var(--color-bg-secondary)] flex items-center justify-center p-3">
              <img src={shieldSecurity} alt="Enkripsi Identitas Pelapor" className="w-full h-full object-contain" />
            </div>

            <div className="mt-auto border-t pt-4" style={{ borderColor: 'var(--color-border)' }}>
              <div className="flex items-center justify-between text-xs font-mono py-2 px-3 border rounded-xl" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-secondary)' }}>
                <span className="flex items-center gap-2"><Clock size={14} className="text-[var(--color-primary)]" /> {L('Target Respon Awal', 'Initial Response SLA')}</span>
                <span className="font-bold text-[var(--color-status-success)]">&lt; 24 Jam</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-[var(--color-text-muted)] mt-2">
                <ShieldCheck size={14} className="text-[var(--color-status-success)] shrink-0" />
                <span>{L('Enkripsi identitas pelapor (opsi pelaporan anonim aman)', 'Reporter identity encryption (secure anonymous reporting)')}</span>
              </div>
            </div>
          </article>

          {/* Card 2: Verifikasi & Triage NLP */}
          <article className="reveal flex min-h-[460px] flex-col border-2 p-6 md:p-8 rounded-3xl shadow-md hover:shadow-lg transition-all duration-200" style={{ borderColor: 'var(--color-primary)', background: 'var(--color-surface)' }}>
            <div className="w-11 h-11 flex items-center justify-center border rounded-2xl mb-4 shadow-xs" style={{ borderColor: 'var(--color-primary)', background: 'var(--color-primary-soft)', color: 'var(--color-primary)' }}>
              <ScanSearch size={20} />
            </div>
            <h3 className={h3}>{L('Verifikasi & kategori otomatis', 'Automatic verification & triage')}</h3>
            <p className={p}>
              {L('Setiap aduan dianalisis NLP untuk menentukan kategori, tingkat urgensi, dan sentimen sebelum diteruskan ke unit yang tepat.',
                'Every complaint is analyzed with NLP to set category, urgency, and sentiment before reaching the right unit.')}
            </p>

            {/* SVG Asset 2 */}
            <div className="w-full h-44 rounded-2xl overflow-hidden my-4 border border-[var(--color-primary)]/40 bg-[var(--color-bg-secondary)] flex items-center justify-center p-3">
              <img src={featureTriage} alt="Triage AI NLP Otomatis" className="w-full h-full object-contain" />
            </div>

            <div className="mt-auto border-t pt-4" style={{ borderColor: 'var(--color-border)' }}>
              <div className="p-3 border rounded-xl text-xs" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-secondary)' }}>
                <div className="flex items-center justify-between text-[11px] font-mono text-[var(--color-text-muted)]">
                  <span>{L('Simulasi Deteksi NLP', 'NLP Detection Preview')}</span>
                  <span className="text-[var(--color-status-info)] font-semibold">{L('Akurasi 94%', '94% Confidence')}</span>
                </div>
                <p className="font-medium mt-1 text-[var(--color-text)]">"{L('AC lab 3 mati, praktikum terganggu', 'Lab 3 AC broken, sessions disrupted')}"</p>
                <div className="flex gap-2 mt-2 pt-2 border-t text-[10px] font-mono" style={{ borderColor: 'var(--color-border)' }}>
                  <span className="px-2 py-0.5 border rounded-md" style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}>SARPRAS</span>
                  <span className="px-2 py-0.5 border rounded-md" style={{ borderColor: 'var(--color-status-warning)', color: 'var(--color-status-warning)' }}>URGENSI 7/10</span>
                </div>
              </div>
            </div>
          </article>

          {/* Card 3: Pantau Sampai Tuntas & SLA */}
          <article className="reveal flex min-h-[460px] flex-col border p-6 md:p-8 rounded-3xl shadow-sm hover:shadow-md transition-all duration-200" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
            <div className="w-11 h-11 flex items-center justify-center border rounded-2xl mb-4 shadow-xs" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-secondary)', color: 'var(--color-primary)' }}>
              <CheckCircle2 size={20} />
            </div>
            <h3 className={h3}>{L('Pantau sampai tuntas', 'Track it to the end')}</h3>
            <p className={p}>
              {L('Lihat status dan tenggat SLA secara langsung. Unit pengelola menindaklanjuti dengan bukti dan jejak yang transparan bagi semua pihak.',
                'See status and SLA deadlines live. Handling units follow up with evidence and an audit trail visible to everyone.')}
            </p>

            {/* SVG Asset 3 */}
            <div className="w-full h-44 rounded-2xl overflow-hidden my-4 border border-[var(--color-border)] bg-[var(--color-bg-secondary)] flex items-center justify-center p-3">
              <img src={slaTracking} alt="Pelacakan SLA Penanganan" className="w-full h-full object-contain" />
            </div>

            <div className="mt-auto border-t pt-4" style={{ borderColor: 'var(--color-border)' }}>
              <div className="flex flex-col gap-1.5 text-xs font-mono">
                {[
                  [L('1. Tiket Diterbitkan', '1. Ticket Issued'), '✓ Selesai'],
                  [L('2. Verifikasi Tim Sentral', '2. Admin Verification'), '✓ Selesai'],
                  [L('3. Disposisi ke Unit Terkait', '3. Dispatched to Unit'), 'Proses'],
                  [L('4. Penuntasan & Evaluasi SLA', '4. Resolution & Review'), 'Antre'],
                ].map(([stepName, st], idx) => (
                  <div key={idx} className="flex items-center justify-between py-1 px-2.5 border rounded-lg" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-secondary)' }}>
                    <span className="truncate text-[11px]">{stepName}</span>
                    <span className={`text-[10px] font-bold ${idx < 2 ? 'text-[var(--color-status-success)]' : idx === 2 ? 'text-[var(--color-status-warning)]' : 'text-[var(--color-text-muted)]'}`}>{st}</span>
                  </div>
                ))}
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}

/* ---------- Banner CTA ---------- */
function StoreBtn({ to, icon: Icon, small, big }) {
  return (
    <Link to={to} className="flex items-center gap-3 border border-white/70 bg-black/90 backdrop-blur-sm px-6 py-3 rounded-2xl text-left text-white transition-all shadow-md hover:shadow-xl hover:-translate-y-0.5 hover:bg-black">
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
    <section id="about" className="relative w-full flex flex-col items-center justify-center py-20 md:py-28 overflow-hidden">
      <div className="hero-grad absolute inset-0 -z-0" />
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-center px-4 md:px-8 relative z-10">
        <h2 className="reveal text-center text-3xl font-bold tracking-tight text-white md:text-5xl lg:text-6xl mb-8 drop-shadow-sm leading-tight">
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
      <h3 className="text-sm font-bold tracking-widest uppercase text-[var(--color-text-muted)] whitespace-nowrap">{title}</h3>
      <ul className="mt-4 space-y-3">
        {items.map(([label, href]) => (
          <li key={label}>
            <a href={href} className="text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors leading-relaxed">
              {label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
  return (
    <footer id="contact" className="w-full px-6 pb-20 pt-16 md:px-12 lg:px-20" style={{ background: 'var(--color-bg)' }}>
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(340px,420px)] lg:gap-20">
        <div className="flex min-h-[220px] flex-col justify-between gap-8">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{L('Pusat Informasi & Buletin', 'Campus Bulletin')}</h2>
            <p className="text-sm mt-1 text-[var(--color-text-muted)]">
              {L('Dapatkan ringkasan berkala tindak lanjut aduan dan pengumuman layanan kampus.', 'Get periodic summaries of complaint follow-ups and campus service announcements.')}
            </p>
            {sent ? (
              <div className="mt-4 p-3 border border-[var(--color-status-success)]/40 bg-[var(--color-status-success)]/10 text-[var(--color-status-success)] text-sm font-medium rounded-xl">
                {L('Terima kasih! Email Anda telah terdaftar untuk menerima pembaruan layanan.', 'Thank you! Your email is registered for service updates.')}
              </div>
            ) : (
              <form className="mt-4 flex max-w-[420px] items-center gap-2" onSubmit={e => { e.preventDefault(); setSent(true) }}>
                <label className="sr-only" htmlFor="footer-email">Email</label>
                <input id="footer-email" type="email" required placeholder={L('nama@student.pens.ac.id', 'user@domain.ac.id')} className="input-field min-h-[44px] min-w-0 flex-1 text-sm rounded-xl" />
                <button type="submit" className="min-h-[44px] px-5 text-sm font-semibold transition-all rounded-xl shadow-xs hover:opacity-90" style={{ background: 'var(--color-btn)', color: 'var(--color-btn-text)' }}>{L('Kirim', 'Submit')}</button>
              </form>
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--color-text-muted)]">© 2026 SuaraLens EEPIS. {L('Hak cipta dilindungi.', 'All rights reserved.')}</p>
          </div>
        </div>
        <nav className="grid grid-cols-2 gap-8" aria-label="Footer">
          {col(L('Layanan', 'Services'), [[L('Tentang SuaraLens', 'About SuaraLens'), '#about'], [L('Fitur & Keamanan', 'Features & Security'), '#features'], [L('Daftar Unit', 'Service Units'), '#units'], [L('Masuk Portal', 'Portal Sign In'), '/signin']])}
          {col(L('Aspirasi & Bantuan', 'Help & Support'), [[L('Kontak Layanan', 'Service Contact'), '#contact'], [L('Alur Penanganan', 'Handling Process'), '#features'], [L('Ajukan Pengaduan', 'Submit Complaint'), '/signup-user'], [L('Status SLA', 'SLA Tracking'), '/signin']])}
        </nav>
      </div>
    </footer>
  )
}

export default function LandingPage() {
  const rootRef = useReveal()
  useEffect(() => { document.title = 'SuaraLens: Platform Aspirasi & Pengaduan Kampus' }, [])
  return (
    <div ref={rootRef} className="min-h-screen w-full flex flex-col" style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}>
      <main className="mx-auto w-full max-w-[1400px] border-x flex flex-col flex-1 relative z-10" style={{ borderColor: 'var(--color-border)' }}>
        {/* Page 1: Pas 1 Layar Penuh Desktop */}
        <div className="relative w-full flex flex-col min-h-screen">
          <div className="hero-grad absolute top-0 left-1/2 -translate-x-1/2 w-[100vw] h-full z-[-1]" />
          <div className="absolute inset-0 border-x border-white/30 pointer-events-none z-50" />
          <Header />
          <Hero />
        </div>

        {/* Page 2: Showcase 3 Gambar Mockup Mobile Phone */}
        <MobileShowcase />

        <Units />
        <CampusSpotlight />
        <Features />
        <Hatch className="h-8 border-y" opacity="opacity-10" />
        <CTA />
        <Footer />
      </main>
    </div>
  )
}