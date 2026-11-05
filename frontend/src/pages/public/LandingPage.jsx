import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  FileEdit, ScanSearch, ShieldCheck, Clock, Users, Globe, Sun, Moon, CheckCircle2, ArrowRight,
  Menu, X, Building2, GraduationCap, Wallet, Wrench, Server, Library, ChevronDown, Send,
  ClipboardCheck, Sparkles, BadgeCheck, Inbox, Lock,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useTheme } from '../../context/ThemeContext.jsx'
import { Reveal, CountUp, Words, useReducedMotion, useSpotlight } from '../../components/motion/Motion.jsx'
import { PhoneFrame, ScreenList, ScreenForm, ScreenDash } from './PhoneMockups.jsx'
import featureTriage from '../../assets/feature-triage.svg'
import slaTracking from '../../assets/sla-tracking.svg'
import shieldSecurity from '../../assets/shield-security.svg'
import kampusBuilding from '../../assets/kampus-building.webp'

/* Pemilih bahasa: L('teks id', 'text en'): mengikuti i18n.language. */
function useL() {
  const { i18n } = useTranslation()
  const isId = !i18n.language || i18n.language.startsWith('id')
  return (id, en) => (isId ? id : en)
}

/* Nilai scroll window yang di-throttle per frame. */
function useScrollY() {
  const [y, setY] = useState(0)
  useEffect(() => {
    let raf = 0
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => { setY(window.scrollY); raf = 0 })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf) }
  }, [])
  return y
}

/* Progres 0..1 sebuah elemen saat melintasi viewport (untuk timeline alur). */
function useSectionProgress(ref) {
  const scrollY = useScrollY()
  const [p, setP] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const vh = window.innerHeight
    const raw = (vh * 0.62 - r.top) / r.height
    setP(Math.max(0, Math.min(1, raw)))
  }, [scrollY, ref])
  return p
}

const dashPath = user =>
  user?.role === 'admin' ? '/admin/dashboard' : user?.role === 'stakeholder' ? '/stakeholder' : '/user/dashboard'

/* ---------- Header: transparan di atas hero, berubah jadi panel navy saat scroll ---------- */
function Header() {
  const { t, i18n } = useTranslation()
  const L = useL()
  const { user, logout } = useAuth()
  const { dark, toggle } = useTheme()
  const [open, setOpen] = useState(false)
  const scrolled = useScrollY() > 24

  const switchLang = () => {
    const next = i18n.language === 'id' ? 'en' : 'id'
    i18n.changeLanguage(next)
    localStorage.setItem('suaralens_lang', next)
  }
  const links = [
    ['#flow', L('Alur', 'Flow')],
    ['#features', L('Fitur', 'Features')],
    ['#campus', L('Kampus', 'Campus')],
    ['#contact', L('Kontak', 'Contact')],
  ]

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 text-white transition-[background-color,box-shadow,backdrop-filter] duration-300 ${scrolled || open ? 'bg-[var(--color-navy)]/90 shadow-[0_8px_30px_-12px_rgba(4,12,36,0.6)] backdrop-blur-md' : 'bg-transparent'
        }`}
    >
      <div className={`mx-auto flex max-w-7xl items-center justify-between px-4 md:px-8 transition-[padding] duration-300 ${scrolled ? 'py-2.5' : 'py-4'}`}>
        <Link to="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-gold)] text-[var(--color-on-gold)] shadow-[0_6px_16px_-6px_rgba(245,183,0,0.7)]">
            <ScanSearch size={19} strokeWidth={2.4} />
          </span>
          <span className="text-xl font-bold tracking-tight">SuaraLens</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 text-sm font-medium" aria-label="Navigasi utama">
          {links.map(([href, label]) => (
            <a key={href} href={href} className="group relative rounded-lg px-3 py-2 text-white/80 transition-colors hover:text-white">
              {label}
              <span className="absolute inset-x-3 bottom-1 h-0.5 origin-left scale-x-0 rounded-full bg-[var(--color-gold)] transition-transform duration-300 group-hover:scale-x-100" />
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button onClick={toggle} aria-label={L('Ganti tema', 'Toggle theme')} className="press flex h-11 w-11 items-center justify-center rounded-xl text-white/85 transition-colors hover:bg-white/10 hover:text-white">
            {dark ? <Sun size={19} className="text-[var(--color-gold)]" /> : <Moon size={19} />}
          </button>
          <button onClick={switchLang} aria-label={L('Ganti bahasa', 'Switch language')} className="press hidden md:flex h-11 items-center gap-1.5 rounded-xl border border-white/25 px-3 text-sm font-medium text-white/90 transition-colors hover:bg-white/10">
            <Globe size={15} />{i18n.language === 'id' ? 'EN' : 'ID'}
          </button>
          {user ? (
            <>
              <Link to={dashPath(user)} className="btn-ghost-light hidden md:inline-flex !h-11 !px-4">{t('nav.dashboard')}</Link>
              <button onClick={() => logout('/')} className="btn-gold hidden md:inline-flex !h-11 !px-4">{t('nav.logout')}</button>
            </>
          ) : (
            <>
              <Link to="/signin" className="btn-ghost-light hidden md:inline-flex !h-11 !px-4">{t('nav.login')}</Link>
              <Link to="/signup-user" className="btn-gold !h-11 !px-4">{t('nav.register')}</Link>
            </>
          )}
          <button className="press md:hidden flex h-11 w-11 items-center justify-center rounded-xl hover:bg-white/10" onClick={() => setOpen(o => !o)} aria-label={L('Buka navigasi', 'Open navigation')} aria-expanded={open}>
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-white/10 px-4 pb-4 pt-2 animate-fade-in-up">
          <div className="stagger flex flex-col">
            {links.map(([href, label], i) => (
              <a key={href} href={href} style={{ '--i': i }} className="rounded-lg px-2 py-3 text-base font-medium text-white/90" onClick={() => setOpen(false)}>{label}</a>
            ))}
            <button onClick={switchLang} style={{ '--i': links.length }} className="flex items-center gap-2 px-2 py-3 text-left text-white/80">
              <Globe size={15} />{i18n.language === 'id' ? 'English' : 'Bahasa Indonesia'}
            </button>
            {user ? (
              <div style={{ '--i': links.length + 1 }} className="mt-2 grid grid-cols-2 gap-2">
                <Link to={dashPath(user)} className="btn-ghost-light" onClick={() => setOpen(false)}>{t('nav.dashboard')}</Link>
                <button onClick={() => { setOpen(false); logout('/') }} className="btn-gold">{t('nav.logout')}</button>
              </div>
            ) : (
              <div style={{ '--i': links.length + 1 }} className="mt-2 grid grid-cols-2 gap-2">
                <Link to="/signin" className="btn-ghost-light" onClick={() => setOpen(false)}>{t('nav.login')}</Link>
                <Link to="/signup-user" className="btn-gold" onClick={() => setOpen(false)}>{t('nav.register')}</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}

/* ---------- Hero: judul kata per kata, gedung parallax, kartu notifikasi mengambang ---------- */
function Hero() {
  const L = useL()
  const { user } = useAuth()
  const reduced = useReducedMotion()
  const y = useScrollY()
  const shift = reduced ? 0 : Math.min(y, 900)

  const line1 = L('Suarakan Aduan,', 'Raise Your Voice,')
  const line2 = L('Kawal Sampai', 'Follow It Through')
  const gold = L('Tuntas', 'To The End')
  const n1 = line1.split(' ').length
  const n2 = line2.split(' ').length

  const primaryTo = user ? (user.role === 'user' ? '/user/submit' : dashPath(user)) : '/signup-user'
  const primaryLabel = user
    ? (user.role === 'user' ? L('Ajukan Aspirasi Baru', 'Submit New Aspiration') : L('Buka Dashboard', 'Open Dashboard'))
    : L('Ajukan Aduan Sekarang', 'Submit a Complaint')

  const stats = [
    { value: 5000, suffix: '+', label: L('Sivitas terlayani', 'Campus members served') },
    { value: 14, label: L('Unit layanan terhubung', 'Connected service units') },
    { value: 24, prefix: '< ', suffix: L(' jam', ' hrs'), label: L('Target respon awal', 'Initial response target') },
    { value: 5, label: L('Langkah ajukan aduan', 'Steps to submit') },
  ]

  return (
    <section className="relative isolate flex min-h-[100svh] flex-col overflow-hidden text-white" style={{ background: 'var(--hero-grad)' }}>
      <div className="dot-grid absolute inset-0 -z-10 opacity-60 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />

      {/* Gedung kampus: bergerak lebih lambat dari scroll (parallax) */}
      <div className="pointer-events-none absolute inset-0 -z-10 flex items-end justify-end" aria-hidden="true">
        <img
          src={kampusBuilding}
          alt=""
          className="h-[48%] w-auto max-w-[70%] object-contain object-bottom opacity-40 sm:h-[66%] md:h-[86%] md:opacity-60 lg:opacity-75 select-none will-change-transform"
          style={{
            transform: `translate3d(0, ${shift * 0.18}px, 0)`,
            filter: 'saturate(0.85) brightness(1.05) drop-shadow(-20px 20px 40px rgba(0,0,0,0.5))',
            maskImage: 'linear-gradient(to bottom, black 70%, transparent 100%), linear-gradient(to left, black 55%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 70%, transparent 100%), linear-gradient(to left, black 55%, transparent 100%)',
            maskComposite: 'intersect',
            WebkitMaskComposite: 'source-in',
          }}
          loading="eager"
          fetchPriority="high"
          decoding="async"
        />
      </div>

      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center px-4 pb-10 pt-28 md:px-8 md:pt-32">
        <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr]">
          <div style={{ transform: `translate3d(0, ${shift * -0.06}px, 0)` }}>
            <a href="#flow" className="blur-in inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-white/[0.07] py-1 pl-1.5 pr-3.5 text-xs font-medium backdrop-blur-sm transition-colors hover:bg-white/[0.14] md:text-sm">
              <span className="flex items-center gap-1.5 rounded-full bg-[var(--color-gold)] px-2 py-0.5 text-[11px] font-bold text-[var(--color-on-gold)]">
                <span className="live-dot h-1.5 w-1.5 rounded-full bg-[var(--color-on-gold)]" />
                {L('Aktif', 'Live')}
              </span>
              {L('Analisis kategori dan urgensi otomatis', 'Automatic category and urgency analysis')}
              <ArrowRight size={14} className="text-white/70" />
            </a>

            <h1 className="mt-6 text-[2.5rem] font-extrabold leading-[1.05] tracking-[-0.035em] sm:text-6xl lg:text-7xl">
              <Words text={line1} />
              <br />
              <Words text={line2} offset={n1} />
              <span className="word gold-underline text-[var(--color-gold)]" style={{ '--w': n1 + n2 }}>{gold}</span>
            </h1>

            <p className="blur-in delay-300 mt-6 max-w-xl text-base leading-relaxed text-white/80 md:text-lg">
              {L('Sampaikan keluhan, masukan, dan saran ke unit layanan kampus dengan aman. Setiap tahap penanganan tercatat dan bisa Anda pantau, dari tiket terbit hingga selesai.',
                'Send complaints, feedback, and suggestions to campus service units safely. Every handling step is recorded and visible to you, from ticket issued to resolved.')}
            </p>

            <div className="blur-in delay-400 mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to={primaryTo} className="btn-gold group !h-12 !px-7 !text-base">
                {primaryLabel}
                <ArrowRight size={18} className="transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
              <Link to={user ? dashPath(user) : '/signin'} className="btn-ghost-light !h-12 !px-7 !text-base">
                {user ? L('Lihat Status Aduan', 'View Complaint Status') : L('Masuk Portal', 'Portal Sign In')}
              </Link>
            </div>

            <div className="blur-in delay-400 mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/70">
              <span className="flex items-center gap-1.5"><Lock size={14} className="text-[var(--color-gold)]" />{L('Opsi anonim', 'Anonymous option')}</span>
              <span className="flex items-center gap-1.5"><BadgeCheck size={14} className="text-[var(--color-gold)]" />{L('Tanpa biaya', 'Free of charge')}</span>
              <span className="flex items-center gap-1.5"><Clock size={14} className="text-[var(--color-gold)]" />{L('Terukur dengan SLA', 'SLA-tracked')}</span>
            </div>
          </div>

          {/* Kartu notifikasi mengambang: memperlihatkan alur nyata dalam sekilas */}
          <div className="relative hidden h-[420px] lg:block" aria-hidden="true">
            <div className="phone-rise absolute right-6 top-0 w-[300px] rounded-2xl border border-white/15 bg-white/[0.08] p-4 backdrop-blur-md" style={{ animationDelay: '500ms' }}>
              <div className="float-slow">
                <div className="flex items-center justify-between text-xs text-white/60">
                  <span className="font-mono">#SL-0247</span>
                  <span className="rounded-full bg-[var(--color-gold)]/20 px-2 py-0.5 font-semibold text-[var(--color-gold)]">{L('Urgensi 8', 'Urgency 8')}</span>
                </div>
                <div className="mt-2 text-sm font-semibold">{L('AC lab 3 mati, praktikum terganggu', 'Lab 3 AC down, practicals disrupted')}</div>
                <div className="mt-3 flex items-center gap-2 text-xs text-white/70">
                  <Send size={13} className="text-[var(--color-gold)]" />{L('Diteruskan ke Sarana & Prasarana', 'Routed to Facilities')}
                </div>
              </div>
            </div>
            <div className="phone-rise absolute left-0 top-36 w-[280px] rounded-2xl border border-white/15 bg-white p-4 text-[var(--color-navy)] shadow-2xl dark:bg-[var(--color-surface)] dark:text-white" style={{ animationDelay: '700ms' }}>
              <div className="float-slow" style={{ animationDelay: '-2s' }}>
                <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-status-success)]">
                  <CheckCircle2 size={15} />{L('Aduan selesai', 'Complaint resolved')}
                </div>
                <div className="mt-2 text-sm font-semibold">{L('Wi-Fi gedung D sudah stabil', 'Building D Wi-Fi is stable')}</div>
                <div className="mt-3 flex gap-1">
                  {[1, 2, 3, 4, 5].map(i => <span key={i} className="h-1.5 flex-1 rounded-full bg-[var(--color-status-success)]" />)}
                </div>
                <div className="mt-2 text-[11px] text-[var(--color-text-muted)]">{L('Ditangani dalam 18 jam', 'Handled in 18 hours')}</div>
              </div>
            </div>
            <div className="phone-rise absolute bottom-4 right-0 w-[250px] rounded-2xl border border-[var(--color-gold)]/40 bg-[var(--color-navy-deep)]/80 p-4 backdrop-blur-md" style={{ animationDelay: '900ms' }}>
              <div className="float-slow" style={{ animationDelay: '-4s' }}>
                <div className="text-xs text-white/60">{L('Kepuasan pelapor', 'Reporter satisfaction')}</div>
                <div className="mt-1 flex items-end gap-1 text-[var(--color-gold)]">
                  {'★★★★★'.split('').map((s, i) => <span key={i} className="text-lg leading-none">{s}</span>)}
                </div>
                <div className="mt-1 text-sm text-white/85">{L('"Cepat dan jelas prosesnya."', '"Fast and clear process."')}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Angka kunci: menghitung naik */}
        <div className="blur-in delay-400 mt-14 grid grid-cols-2 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm md:grid-cols-4">
          {stats.map((s, i) => (
            <div key={s.label} className={`p-5 md:p-6 ${i % 2 === 1 ? 'border-l border-white/10' : ''} ${i >= 2 ? 'border-t border-white/10 md:border-t-0' : ''} ${i === 2 ? 'md:border-l' : ''}`}>
              <div className="text-3xl font-bold tracking-tight md:text-4xl">
                <CountUp value={s.value} prefix={s.prefix} suffix={s.suffix} />
              </div>
              <div className="mt-1 text-xs text-white/65 md:text-sm">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <a href="#units" className="mx-auto mb-5 flex flex-col items-center gap-1 text-[11px] font-medium text-white/60 transition-colors hover:text-white">
        {L('Gulir untuk menjelajah', 'Scroll to explore')}
        <ChevronDown size={16} className="animate-bounce" />
      </a>
    </section>
  )
}

/* ---------- Unit layanan: pita marquee navy dengan ikon emas ---------- */
function Units() {
  const L = useL()
  const units = [
    { icon: GraduationCap, name: L('Akademik', 'Academic') },
    { icon: Users, name: L('Kemahasiswaan', 'Student Affairs') },
    { icon: Wallet, name: L('Keuangan', 'Finance') },
    { icon: Wrench, name: L('Sarana & Prasarana', 'Facilities') },
    { icon: Server, name: L('TIK / IT Center', 'IT Center') },
    { icon: Library, name: L('Perpustakaan', 'Library') },
    { icon: Building2, name: L('Kepegawaian', 'Human Resources') },
    { icon: ShieldCheck, name: L('Keamanan Kampus', 'Campus Security') },
  ]
  const row = [...units, ...units]
  return (
    <section id="units" className="relative overflow-hidden border-y border-white/10 bg-[var(--color-navy-deep)] py-7 text-white">
      <p className="mb-5 text-center text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
        {L('Terhubung langsung dengan unit layanan EEPIS', 'Directly connected to EEPIS service units')}
      </p>
      <div className="group relative [mask-image:linear-gradient(90deg,transparent,black_10%,black_90%,transparent)]">
        <div className="animate-marquee flex w-max gap-3 group-hover:[animation-play-state:paused]">
          {row.map(({ icon: Icon, name }, i) => (
            <div key={i} className="flex items-center gap-2.5 whitespace-nowrap rounded-full border border-white/10 bg-white/[0.05] px-5 py-2.5">
              <Icon size={17} className="text-[var(--color-gold)]" />
              <span className="text-sm font-semibold">{name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ---------- Tampilan ponsel: tiga layar naik bergiliran saat terlihat ---------- */
function MobileShowcase() {
  const L = useL()
  return (
    <section id="showcase" className="relative overflow-hidden bg-[var(--color-bg-secondary)] px-4 pt-20 md:pt-28">
      <div className="mx-auto max-w-3xl text-center">
        <Reveal as="span" className="inline-block rounded-full border border-[var(--color-primary)]/20 bg-[var(--color-primary-soft)] px-3.5 py-1 text-xs font-semibold text-[var(--color-primary)]">
          {L('Di genggaman Anda', 'In your pocket')}
        </Reveal>
        <Reveal as="h2" delay={80} className="mt-4 text-3xl font-bold tracking-tight md:text-5xl">
          {L('Ajukan dan pantau aduan langsung dari ponsel', 'Submit and track complaints right from your phone')}
        </Reveal>
        <Reveal as="p" delay={160} className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-[var(--color-text-muted)]">
          {L('Buat aduan dalam 5 langkah, lampirkan bukti foto, lalu ikuti setiap pembaruan dari unit penanganan tanpa perlu datang ke loket.',
            'Create a complaint in 5 steps, attach photo evidence, then follow every update from the handling unit without visiting the desk.')}
        </Reveal>
      </div>

      <div className="relative mx-auto mt-14 flex max-w-5xl items-end justify-center">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 top-1/3 rounded-t-[50%] bg-[var(--color-primary)]/10 blur-3xl" />
        <Reveal variant="up" delay={250} className="relative z-10 hidden w-[240px] translate-x-16 md:block lg:w-[270px]">
          <div className="-rotate-6 origin-bottom-right"><PhoneFrame><ScreenList L={L} /></PhoneFrame></div>
        </Reveal>
        <Reveal variant="up" delay={100} className="relative z-20 w-[260px] md:w-[290px] lg:w-[310px]">
          <PhoneFrame><ScreenForm L={L} /></PhoneFrame>
        </Reveal>
        <Reveal variant="up" delay={400} className="relative z-10 hidden w-[240px] -translate-x-16 md:block lg:w-[270px]">
          <div className="rotate-6 origin-bottom-left"><PhoneFrame><ScreenDash L={L} /></PhoneFrame></div>
        </Reveal>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-40" style={{ background: 'linear-gradient(to top, var(--color-bg), transparent)' }} />
    </section>
  )
}

/* ---------- Alur penanganan: timeline terisi mengikuti scroll ---------- */
function Flow() {
  const L = useL()
  const ref = useRef(null)
  const progress = useSectionProgress(ref)
  const steps = [
    { icon: FileEdit, title: L('Tiket diterbitkan', 'Ticket issued'), desc: L('Aduan Anda masuk dan langsung mendapat nomor tiket untuk dilacak.', 'Your complaint is logged and gets a trackable ticket number.') },
    { icon: Sparkles, title: L('Analisis otomatis', 'Automatic analysis'), desc: L('Sistem membaca isi aduan untuk menentukan kategori, sentimen, dan tingkat urgensi.', 'The system reads the complaint to set category, sentiment, and urgency.') },
    { icon: ClipboardCheck, title: L('Verifikasi admin', 'Admin verification'), desc: L('Tim sentral memeriksa kelengkapan dan keabsahan laporan.', 'The central team checks the report for completeness and validity.') },
    { icon: Send, title: L('Disposisi ke unit', 'Routed to unit'), desc: L('Aduan diteruskan ke salah satu dari 14 unit yang berwenang, lengkap dengan tenggat SLA.', 'The complaint goes to one of 14 responsible units, with an SLA deadline.') },
    { icon: BadgeCheck, title: L('Selesai dan dievaluasi', 'Resolved and reviewed'), desc: L('Unit mengunggah bukti tindak lanjut, dan Anda bisa memberi penilaian.', 'The unit uploads follow-up evidence, and you can rate the outcome.') },
  ]
  return (
    <section id="flow" className="bg-[var(--color-bg)] px-4 py-24 md:py-32">
      <div className="mx-auto grid max-w-6xl gap-14 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <Reveal as="span" className="inline-block rounded-full bg-[var(--color-gold-soft)] px-3.5 py-1 text-xs font-bold text-[var(--color-gold-ink)]">
            {L('Alur penanganan', 'Handling flow')}
          </Reveal>
          <Reveal as="h2" delay={80} className="mt-4 text-3xl font-bold leading-tight tracking-tight md:text-5xl">
            {L('Lima tahap, semuanya terlihat', 'Five steps, all of them visible')}
          </Reveal>
          <Reveal as="p" delay={160} className="mt-4 text-base leading-relaxed text-[var(--color-text-muted)]">
            {L('Tidak ada aduan yang hilang di meja. Setiap perpindahan tahap tercatat dengan waktu dan penanggung jawabnya.',
              'No complaint gets lost on a desk. Every step change is recorded with its time and the person responsible.')}
          </Reveal>
          <Reveal delay={240} className="mt-8 hidden lg:block">
            <div className="text-sm font-medium text-[var(--color-text-muted)]">{L('Progres contoh tiket', 'Sample ticket progress')}</div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-mono text-5xl font-bold tracking-tight text-[var(--color-primary)]">{Math.round(progress * 100)}%</span>
              <span className="font-mono text-sm text-[var(--color-text-muted)]">#SL-0247</span>
            </div>
          </Reveal>
        </div>

        <ol ref={ref} className="relative">
          <div className="absolute left-[23px] top-2 bottom-2 w-0.5 rounded-full bg-[var(--color-border)]" aria-hidden="true" />
          <div
            className="absolute left-[23px] top-2 w-0.5 rounded-full bg-gradient-to-b from-[var(--color-primary)] to-[var(--color-gold)]"
            style={{ height: `calc(${progress * 100}% - 16px)` }}
            aria-hidden="true"
          />
          {steps.map(({ icon: Icon, title, desc }, i) => {
            const active = progress >= (i + 0.35) / steps.length
            return (
              <li key={title} className="relative flex gap-5 pb-10 last:pb-0">
                <div
                  className={`relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border transition-[background-color,border-color,color,transform,box-shadow] duration-500 ${active
                    ? 'scale-100 border-[var(--color-navy)] bg-[var(--color-navy)] text-[var(--color-gold)] shadow-[0_8px_24px_-8px_rgba(10,36,99,0.6)] dark:border-[var(--color-primary)] dark:bg-[var(--color-primary)] dark:text-white'
                    : 'scale-90 border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)]'
                    }`}
                >
                  <Icon size={20} />
                </div>
                <div className={`pt-1 transition-[opacity,transform] duration-500 ${active ? 'opacity-100 translate-x-0' : 'opacity-45 translate-x-1'}`}>
                  <div className="font-mono text-xs font-semibold text-[var(--color-text-muted)]">{L('Tahap', 'Step')} {i + 1}</div>
                  <h3 className="mt-0.5 text-lg font-bold tracking-tight md:text-xl">{title}</h3>
                  <p className="mt-1.5 max-w-md text-sm leading-relaxed text-[var(--color-text-muted)] md:text-base">{desc}</p>
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}

/* ---------- Fitur: kartu dengan sorotan kursor, kartu tengah navy ---------- */
function FeatureCard({ children, delay, featured }) {
  const spot = useSpotlight()
  return (
    <Reveal
      as="article"
      variant="up"
      delay={delay}
      {...spot}
      className={`spotlight flex flex-col rounded-3xl border p-6 md:p-8 transition-shadow duration-300 hover:shadow-[0_20px_50px_-20px_rgba(10,36,99,0.35)] ${featured
        ? 'border-[var(--color-navy)] bg-[var(--color-navy)] text-white dark:border-[var(--color-primary)]/40'
        : 'border-[var(--color-border)] bg-[var(--color-surface)]'
        }`}
    >
      {children}
    </Reveal>
  )
}

function Features() {
  const L = useL()
  const h3 = 'mt-5 text-xl font-bold leading-tight tracking-tight md:text-2xl'
  return (
    <section id="features" className="relative bg-[var(--color-bg-secondary)] px-4 py-24 md:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal as="span" className="inline-block rounded-full border border-[var(--color-primary)]/20 bg-[var(--color-primary-soft)] px-3.5 py-1 text-xs font-semibold text-[var(--color-primary)]">
            {L('Fitur utama', 'Key features')}
          </Reveal>
          <Reveal as="h2" delay={80} className="mt-4 text-3xl font-bold leading-tight tracking-tight md:text-5xl">
            {L('Dibuat agar aduan benar-benar ditindaklanjuti', 'Built so complaints actually get handled')}
          </Reveal>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          <FeatureCard delay={0}>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]"><Lock size={22} /></div>
            <h3 className={h3}>{L('Aman, bisa anonim', 'Safe, can be anonymous')}</h3>
            <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-muted)]">
              {L('Sampaikan aduan kapan saja. Identitas dapat disamarkan sehingga Anda tidak perlu khawatir.',
                'Report any time. Your identity can be hidden so you have nothing to worry about.')}
            </p>
            <div className="my-6 flex h-40 items-center justify-center rounded-2xl bg-[var(--color-bg-secondary)] p-3">
              <img src={shieldSecurity} alt="" className="h-full w-full object-contain" />
            </div>
            <div className="mt-auto flex items-center justify-between rounded-xl border border-[var(--color-border)] px-3 py-2.5 text-xs">
              <span className="flex items-center gap-2 text-[var(--color-text-muted)]"><Clock size={14} className="text-[var(--color-primary)]" />{L('Respon awal', 'First response')}</span>
              <span className="font-mono font-bold text-[var(--color-status-success)]">&lt; 24 {L('jam', 'hrs')}</span>
            </div>
          </FeatureCard>

          <FeatureCard delay={120} featured>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-gold)] text-[var(--color-on-gold)]"><ScanSearch size={22} /></div>
            <h3 className={h3}>{L('Kategori dan urgensi otomatis', 'Automatic category and urgency')}</h3>
            <p className="mt-3 text-sm leading-relaxed text-white/75">
              {L('Setiap aduan dibaca sistem untuk menentukan kategori, sentimen, dan urgensi sebelum sampai ke unit yang tepat.',
                'Every complaint is read by the system to set category, sentiment, and urgency before it reaches the right unit.')}
            </p>
            <div className="my-6 flex h-40 items-center justify-center rounded-2xl bg-white/[0.06] p-3">
              <img src={featureTriage} alt="" className="h-full w-full object-contain" />
            </div>
            <div className="mt-auto rounded-xl border border-white/15 bg-white/[0.05] p-3 text-xs">
              <div className="flex justify-between font-mono text-white/60">
                <span>{L('Contoh hasil', 'Sample result')}</span>
                <span className="font-semibold text-[var(--color-gold)]">{L('Keyakinan 94%', '94% confidence')}</span>
              </div>
              <p className="mt-1.5 font-medium">"{L('AC lab 3 mati, praktikum terganggu', 'Lab 3 AC broken, sessions disrupted')}"</p>
              <div className="mt-2.5 flex gap-2 font-mono text-[10px]">
                <span className="rounded-md bg-white/10 px-2 py-0.5">SARPRAS</span>
                <span className="rounded-md bg-[var(--color-gold)] px-2 py-0.5 font-bold text-[var(--color-on-gold)]">{L('URGENSI', 'URGENCY')} 7/10</span>
              </div>
            </div>
          </FeatureCard>

          <FeatureCard delay={240}>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]"><Inbox size={22} /></div>
            <h3 className={h3}>{L('Pantau sampai tuntas', 'Track it to the end')}</h3>
            <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-muted)]">
              {L('Lihat status dan tenggat SLA secara langsung. Unit wajib melampirkan bukti tindak lanjut.',
                'See status and SLA deadlines live. Units must attach evidence of follow-up.')}
            </p>
            <div className="my-6 flex h-40 items-center justify-center rounded-2xl bg-[var(--color-bg-secondary)] p-3">
              <img src={slaTracking} alt="" className="h-full w-full object-contain" />
            </div>
            <div className="mt-auto space-y-1.5 text-xs">
              {[
                [L('Verifikasi', 'Verification'), 100],
                [L('Disposisi', 'Routing'), 100],
                [L('Penanganan', 'Handling'), 60],
              ].map(([name, pct], i) => (
                <div key={name}>
                  <div className="flex justify-between text-[var(--color-text-muted)]"><span>{name}</span><span className="font-mono">{pct}%</span></div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-sunken)]">
                    <div className="grow-x h-full rounded-full bg-[var(--color-primary)]" style={{ width: `${pct}%`, '--i': i }} />
                  </div>
                </div>
              ))}
            </div>
          </FeatureCard>
        </div>
      </div>
    </section>
  )
}

/* ---------- Kampus: foto terbuka seperti tirai, poin masuk dari kanan ---------- */
function CampusSpotlight() {
  const L = useL()
  const points = [
    { icon: Wrench, title: L('Sarana dan prasarana', 'Facilities'), desc: L('AC lab, proyektor kelas, hingga lift gedung ditangani tim Sarpras dengan target respon di bawah 24 jam.', 'Lab ACs, classroom projectors, and elevators are handled by Facilities with a response target under 24 hours.') },
    { icon: Server, title: L('Jaringan dan sistem informasi', 'Network and systems'), desc: L('Keluhan Wi-Fi, sistem akademik, dan akun langsung didisposisikan ke IT Center PENS.', 'Wi-Fi, academic system, and account issues go straight to the PENS IT Center.') },
    { icon: GraduationCap, title: L('Layanan akademik', 'Academic services'), desc: L('Mendukung lebih dari 5.000 mahasiswa, dosen, dan tenaga kependidikan.', 'Supporting over 5,000 students, lecturers, and staff.') },
  ]
  return (
    <section id="campus" className="bg-[var(--color-bg)] px-4 py-24 md:py-32">
      <div className="mx-auto grid max-w-6xl items-stretch gap-12 lg:grid-cols-2">
        {/* Di desktop, kartu kiri mengisi penuh tinggi kolom kanan:
            atas sejajar label "Politeknik...", bawah sejajar kartu "Layanan akademik". */}
        <div className="relative min-h-[380px] lg:min-h-0">
          {/* Wrapper polos yang menentukan ukuran (atas-bawah ikut kolom kanan, kiri melebar sampai tepi layar di desktop) */}
          <div className="absolute inset-y-0 left-0 right-0 lg:left-[calc(-1*max(1rem,(100vw_-_72rem)/2))]">
            <Reveal variant="up" className="banner-blue group relative flex h-full w-full overflow-hidden !rounded-3xl !p-0 lg:!rounded-l-none">
              {/* Gedung menempel di pojok kiri bawah kartu */}
              <img
                src={kampusBuilding}
                alt={L('Gedung kampus PENS Surabaya', 'PENS Surabaya campus building')}
                className="pointer-events-none absolute bottom-0 left-0 h-[82%] w-auto max-w-[52%] origin-bottom-left select-none object-contain object-left-bottom transition-transform duration-700 ease-[var(--ease-out)] group-hover:scale-[1.04]"
                style={{ filter: 'saturate(1.1) drop-shadow(12px 12px 24px rgba(4,12,36,0.5))' }}
                loading="lazy"
                decoding="async"
              />
              <div className="relative z-10 ml-auto flex w-1/2 min-w-0 flex-col justify-between p-6 text-right md:p-8">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-gold)]">{L('Gedung PENS', 'PENS Building')}</div>
                  <div className="mt-2 text-2xl font-bold leading-snug tracking-tight md:text-3xl">
                    {L('Setiap sudut kampus punya penanggung jawab', 'Every corner of campus has an owner')}
                  </div>
                </div>
                <Link to="/signup-user" className="group/cta inline-flex items-center justify-end gap-1.5 text-base font-semibold text-white/90 transition-colors hover:text-[var(--color-gold)]">
                  {L('Laporkan kondisi fasilitas', 'Report a facility issue')}
                  <ArrowRight size={17} className="transition-transform duration-200 group-hover/cta:translate-x-1" />
                </Link>
              </div>
            </Reveal>
          </div>
        </div>

        <div className="flex flex-col">
          <Reveal as="span" className="inline-block self-start rounded-full border border-[var(--color-primary)]/20 bg-[var(--color-primary-soft)] px-3.5 py-1 text-xs font-semibold text-[var(--color-primary)]">
            {L('Politeknik Elektronika Negeri Surabaya', 'Electronic Engineering Polytechnic Institute of Surabaya')}
          </Reveal>
          <Reveal as="h2" delay={80} className="mt-4 text-3xl font-bold leading-tight tracking-tight md:text-4xl">
            {L('Terhubung dengan seluruh fasilitas kampus', 'Connected to every campus facility')}
          </Reveal>
          <div className="mt-8 space-y-3">
            {points.map(({ icon: Icon, title, desc }, i) => (
              <Reveal key={title} variant="right" delay={160 + i * 110} className="flex gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition-colors hover:border-[var(--color-primary)]/40">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-navy)] text-[var(--color-gold)] dark:bg-[var(--color-primary-soft)]">
                  <Icon size={20} />
                </div>
                <div>
                  <h3 className="font-bold tracking-tight">{title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--color-text-muted)]">{desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------- CTA penutup: bidang navy dengan cincin emas ---------- */
function CTA() {
  const L = useL()
  const { user } = useAuth()
  return (
    <section id="about" className="relative isolate overflow-hidden px-4 py-24 text-white md:py-32" style={{ background: 'var(--hero-grad)' }}>
      <div className="dot-grid absolute inset-0 -z-10 opacity-50" />
      <div className="absolute left-1/2 top-1/2 -z-10 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--color-gold)]/20" aria-hidden="true" />
      <div className="absolute left-1/2 top-1/2 -z-10 h-[760px] w-[760px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.06]" aria-hidden="true" />
      <div className="mx-auto max-w-3xl text-center">
        <Reveal variant="scale" as="h2" className="text-4xl font-extrabold leading-[1.08] tracking-tight md:text-6xl">
          {L('Suara Anda membentuk', 'Your voice shapes')}<br />
          <span className="text-[var(--color-gold)]">{L('kampus yang lebih baik', 'a better campus')}</span>
        </Reveal>
        <Reveal as="p" delay={120} className="mx-auto mt-5 max-w-xl text-base text-white/75 md:text-lg">
          {L('Daftar dengan email kampus, lalu ajukan aduan pertama Anda dalam beberapa menit.', 'Sign up with your campus email, then submit your first complaint in minutes.')}
        </Reveal>
        <Reveal delay={220} className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
          <Link to={user ? dashPath(user) : '/signup-user'} className="btn-gold group !h-13 !px-8 !text-base">
            <FileEdit size={18} />
            {user ? L('Buka Dashboard', 'Open Dashboard') : L('Daftar sebagai Pelapor', 'Sign Up as Reporter')}
            <ArrowRight size={18} className="transition-transform duration-200 group-hover:translate-x-1" />
          </Link>
          {!user && (
            <Link to="/signup-stakeholder" className="btn-ghost-light !h-13 !px-8 !text-base">
              <ShieldCheck size={18} />{L('Daftar sebagai Unit Pengelola', 'Sign Up as Handling Unit')}
            </Link>
          )}
        </Reveal>
      </div>
    </section>
  )
}

/* ---------- Footer: navy pekat ---------- */
function Footer() {
  const L = useL()
  const [sent, setSent] = useState(false)
  const col = (title, items) => (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-white/50">{title}</h3>
      <ul className="mt-4 space-y-2.5">
        {items.map(([label, href]) => (
          <li key={label}>
            {href.startsWith('/') ? (
              <Link to={href} className="text-sm text-white/75 transition-colors hover:text-[var(--color-gold)]">{label}</Link>
            ) : (
              <a href={href} className="text-sm text-white/75 transition-colors hover:text-[var(--color-gold)]">{label}</a>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
  return (
    <footer id="contact" className="bg-[var(--color-navy-deep)] px-4 pb-10 pt-16 text-white md:px-8">
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-gold)] text-[var(--color-on-gold)]"><ScanSearch size={19} strokeWidth={2.4} /></span>
            <span className="text-xl font-bold tracking-tight">SuaraLens</span>
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/65">
            {L('Dapatkan ringkasan berkala tindak lanjut aduan dan pengumuman layanan kampus.', 'Get periodic summaries of complaint follow-ups and campus service announcements.')}
          </p>
          {sent ? (
            <div role="status" className="animate-fade-in-up mt-5 flex max-w-md items-center gap-2 rounded-xl border border-[var(--color-gold)]/40 bg-[var(--color-gold)]/10 p-3 text-sm font-medium text-[var(--color-gold)]">
              <CheckCircle2 size={16} />{L('Terima kasih, email Anda sudah terdaftar.', 'Thank you, your email is registered.')}
            </div>
          ) : (
            <form className="mt-5 flex max-w-md gap-2" onSubmit={e => { e.preventDefault(); setSent(true) }}>
              <label className="sr-only" htmlFor="footer-email">Email</label>
              <input id="footer-email" type="email" required placeholder="nama@student.pens.ac.id" className="h-11 min-w-0 flex-1 rounded-xl border border-white/15 bg-white/[0.06] px-4 text-sm text-white placeholder:text-white/40 outline-none transition-colors focus:border-[var(--color-gold)]" />
              <button type="submit" className="btn-gold !h-11 !px-5">{L('Kirim', 'Submit')}</button>
            </form>
          )}
        </div>
        <nav className="grid grid-cols-2 gap-8" aria-label="Footer">
          {col(L('Layanan', 'Services'), [[L('Alur Penanganan', 'Handling Flow'), '#flow'], [L('Fitur', 'Features'), '#features'], [L('Unit Layanan', 'Service Units'), '#units'], [L('Masuk Portal', 'Portal Sign In'), '/signin']])}
          {col(L('Bantuan', 'Help'), [[L('Ajukan Aduan', 'Submit Complaint'), '/signup-user'], [L('Daftar Unit Pengelola', 'Register Handling Unit'), '/signup-stakeholder'], [L('Kampus', 'Campus'), '#campus'], [L('Status SLA', 'SLA Status'), '/signin']])}
        </nav>
      </div>
      <div className="mx-auto mt-14 flex max-w-6xl flex-col gap-2 border-t border-white/10 pt-6 text-xs text-white/50 sm:flex-row sm:justify-between">
        <span>© 2026 SuaraLens EEPIS. {L('Hak cipta dilindungi.', 'All rights reserved.')}</span>
        <span>Politeknik Elektronika Negeri Surabaya</span>
      </div>
    </footer>
  )
}

export default function LandingPage() {
  useEffect(() => { document.title = 'SuaraLens: Platform Aspirasi & Pengaduan Kampus' }, [])
  return (
    <div className="min-h-screen w-full bg-[var(--color-bg)] text-[var(--color-text)]">
      <Header />
      <main id="main-content">
        <Hero />
        <Units />
        <MobileShowcase />
        <Flow />
        <Features />
        <CampusSpotlight />
        <CTA />
      </main>
      <Footer />
    </div>
  )
}