import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  FileEdit, ScanSearch, ShieldCheck, BarChart3, ArrowRight, Clock, Users, MessageSquare,
  CheckCircle, AlertCircle, TrendingUp, Workflow, Lock, Home, Plus,
} from 'lucide-react'
import Navbar from '../../components/layout/Navbar.jsx'

/* ---------- helpers ---------- */
// Pemilih bahasa: L('teks id', 'text en'). Mekanisme i18n.language tetap dipertahankan.
function useL() {
  const { i18n } = useTranslation()
  const isId = !i18n.language || i18n.language.startsWith('id')
  return (id, en) => (isId ? id : en)
}

const C = {
  neg: 'var(--l-neg)', neu: 'var(--l-neu)', pos: 'var(--l-pos)',
}
const DARK = `--color-bg:#07130F;--color-bg-secondary:#0C1E18;--color-surface:#0F241C;--color-border:#1E3D31;--color-text:#E9F7F0;--color-text-muted:#93B5A7;--color-primary:#3DDC97;--color-primary-dark:#22C083;--color-primary-soft:#12332A;--color-accent:#FFC94A;--l-sky:#46D1E0;--l-neg:#FF7A6E;--l-neu:#F5B14A;--l-pos:#3DDC97;--l-shadow:rgba(0,0,0,.55);--l-shadow-lg:rgba(34,192,131,.35);color-scheme:dark;`
// Tema halaman ini di-scope ke .landing-root. Gelap aktif lewat .dark / [data-theme="dark"],
// atau otomatis mengikuti sistem bila aplikasi belum menetapkan tema sendiri.
const THEME_CSS = `
.landing-root{--color-bg:#F3FBF7;--color-bg-secondary:#E4F6EC;--color-surface:#FFFFFF;--color-border:#DCEFE5;--color-text:#0C2A22;--color-text-muted:#527065;--color-primary:#12A26B;--color-primary-dark:#0B7F54;--color-primary-soft:#DDF5E8;--color-accent:#F5B82E;--l-sky:#2BB6C9;--l-neg:#E0493D;--l-neu:#C98207;--l-pos:#0E9A62;--l-shadow:rgba(12,80,55,.28);--l-shadow-lg:rgba(12,110,75,.38);--l-grad:linear-gradient(135deg,#0F9464 0%,#0B7F54 55%,#0A6B66 100%);color-scheme:light}
.dark .landing-root,[data-theme="dark"] .landing-root{${DARK}}
@media (prefers-color-scheme: dark){:root:not(.light):not(.dark):not([data-theme]) .landing-root{${DARK}}}
.l-grad{background:var(--l-grad);color:#fff}
html.landing-snap{--nav-h:4rem;scroll-padding-top:var(--nav-h);scroll-behavior:smooth}
@media (max-width:1023px){html.landing-snap{scroll-snap-type:y proximity}}
@media (prefers-reduced-motion:reduce){html.landing-snap{scroll-behavior:auto}}
.landing-page{scroll-snap-align:start;scroll-snap-stop:always;min-height:calc(100svh - var(--nav-h,4rem));display:flex;flex-direction:column;justify-content:center}
.l-dots{background:radial-gradient(var(--color-primary) 1.6px,transparent 2px) 0 0/16px 16px;opacity:.3}
@media (min-width:1024px) and (max-height:820px){.l-play{zoom:.86}}
@media (min-width:1024px) and (max-height:700px){.l-play{zoom:.72}}
@keyframes l-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
@keyframes l-ring{to{stroke-dashoffset:var(--to)}}
@keyframes l-bar{to{transform:scaleX(1)}}
@keyframes l-barv{to{transform:scaleY(1)}}
.l-float{animation:l-float 6s ease-in-out infinite}
.l-ring{stroke-dasharray:214;stroke-dashoffset:214}
.l-bar{transform-origin:left;transform:scaleX(0)}
.l-barv{transform-origin:bottom;transform:scaleY(0)}
.l-play .l-ring,.l-reveal.in .l-ring{animation:l-ring 1.4s .5s ease-out forwards}
.l-play .l-bar,.l-reveal.in .l-bar{animation:l-bar 1s .2s ease-out forwards}
.l-reveal.in .l-barv{animation:l-barv .9s .3s ease-out forwards}
.l-reveal{opacity:0;transform:translateY(24px);transition:opacity .7s ease-out,transform .7s ease-out}
.l-reveal.in{opacity:1;transform:none}
@media (prefers-reduced-motion:reduce){.l-float{animation:none}.l-ring{animation:none!important;stroke-dashoffset:var(--to)}.l-bar,.l-barv{animation:none!important;transform:none}.l-reveal{opacity:1;transform:none;transition:none}}
`
const PANEL = 'bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] shadow-[0_18px_40px_-24px_var(--l-shadow)]'
const BTN = 'inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full font-semibold transition-all duration-300 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]'
const SECTION = 'w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20'

const Heading = ({ children, sub, center }) => (
  <div className={center ? 'l-reveal text-center max-w-2xl mx-auto mb-12 md:mb-16' : 'l-reveal max-w-xl'}>
    <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-[1.1]">{children}</h2>
    {sub && <p className="mt-4 text-base md:text-lg text-[var(--color-text-muted)] leading-relaxed">{sub}</p>}
  </div>
)

const Badge = ({ label, color }) => (
  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ color, background: `color-mix(in srgb, ${color} 12%, transparent)` }}>
    <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />{label}
  </span>
)

const TREND = 'M0,55 C20,50 35,45 55,38 C75,30 90,42 110,35 C130,28 145,20 165,15 C185,10 200,22 220,18 C240,14 260,20 280,12'
const Trend = ({ h = 'h-16' }) => (
  <svg viewBox="0 0 280 70" preserveAspectRatio="none" className={`w-full ${h}`} aria-hidden="true">
    <defs>
      <linearGradient id="tg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" style={{ stopColor: 'var(--l-sky)', stopOpacity: 0.35 }} />
        <stop offset="1" style={{ stopColor: 'var(--l-sky)', stopOpacity: 0 }} />
      </linearGradient>
    </defs>
    <path d={`${TREND} L280,70 L0,70 Z`} fill="url(#tg)" />
    <path d={TREND} fill="none" strokeWidth="2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" style={{ stroke: 'var(--color-primary)' }} />
  </svg>
)

/* ---------- hero ---------- */
const MUTED = 'text-[var(--color-text-muted)]'
const Ring = ({ pct, track, color, size = 'w-24 h-24', w = 9, children }) => (
  <div className={`relative shrink-0 ${size}`}>
    <svg viewBox="0 0 84 84" className="w-full h-full -rotate-90" aria-hidden="true">
      <circle cx="42" cy="42" r="34" fill="none" strokeWidth={w} style={{ stroke: track }} />
      <circle cx="42" cy="42" r="34" fill="none" strokeWidth={w} strokeLinecap="round" className="l-ring" style={{ stroke: color, '--to': 214 * (1 - pct / 100) }} />
    </svg>
    <div className="absolute inset-0 flex items-center justify-center font-extrabold">{children}</div>
  </div>
)

function Phone() {
  const L = useL()
  const rows = [
    ['SL-0247', L('AC ruang lab 3', 'Lab 3 air conditioner'), 80, C.neu],
    ['SL-0244', L('Wi-Fi gedung D', 'Building D Wi-Fi'), 100, C.pos],
  ]
  return (
    <div className="relative mx-auto w-[16.5rem] sm:w-[18.5rem] rounded-[2.75rem] bg-[#0C2A22] p-2.5 ring-2 ring-[#9DB3AA] shadow-[0_40px_80px_-24px_var(--l-shadow-lg)]">
      <div className="relative overflow-hidden rounded-[2.25rem] bg-[var(--color-bg)] text-[var(--color-text)]">
        <div className="absolute left-1/2 top-2 h-5 w-20 -translate-x-1/2 rounded-full bg-[#0C2A22]" />
        <div className="flex justify-between px-6 pt-3 text-[10px] font-semibold"><span>9:41</span><span>5G</span></div>
        <div className="px-4 pb-3 pt-6">
          <div className={`text-xs ${MUTED}`}>{L('Selamat pagi,', 'Good morning,')}</div>
          <div className="font-bold">Rina</div>
          <div className="mt-3 flex items-center gap-3 rounded-2xl l-grad p-3">
            <Ring pct={75} track="rgba(255,255,255,.28)" color="#fff" size="w-16 h-16" w={10}><span className="text-sm">75%</span></Ring>
            <div className="text-[11px] leading-5">
              <div className="text-xs font-semibold">{L('Progres aduan', 'Complaint progress')}</div>
              <div>#SL-0247, {L('tahap 4 dari 5', 'step 4 of 5')}</div>
              <div>{L('Sisa SLA 2j 10m', 'SLA left 2h 10m')}</div>
            </div>
          </div>
          <div className="mb-2 mt-4 flex justify-between text-xs"><span className="font-bold">{L('Aduan Saya', 'My Complaints')}</span><span className="text-[var(--color-primary)]">{L('Lihat', 'View')}</span></div>
          <ul className="space-y-2">
            {rows.map(([id, title, pct, col], i) => (
              <li key={id} className="rounded-xl bg-[var(--color-surface)] px-3 py-2 shadow-sm ring-1 ring-[var(--color-border)]">
                <div className="flex justify-between text-[11px]"><span className="font-semibold">{title}</span><span className={MUTED}>{id}</span></div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--color-border)]"><div className="l-bar h-full rounded-full" style={{ width: `${pct}%`, background: col, animationDelay: `${900 + i * 150}ms` }} /></div>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex items-center justify-around border-t border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5">
          <Home size={16} className="text-[var(--color-primary)]" /><BarChart3 size={16} className={MUTED} />
          <span className="-mt-6 flex h-10 w-10 items-center justify-center rounded-full l-grad shadow-lg"><Plus size={18} /></span>
          <MessageSquare size={16} className={MUTED} /><Users size={16} className={MUTED} />
        </div>
      </div>
    </div>
  )
}

function HeroVisual() {
  const L = useL()
  const chip = 'l-float absolute flex items-center gap-2 rounded-2xl bg-[var(--color-surface)] px-3.5 py-2.5 text-xs font-semibold shadow-xl ring-1 ring-[var(--color-border)]'
  return (
    <div className="l-play relative mx-auto max-w-md lg:max-w-none py-4">
      <div className="absolute inset-x-6 top-2 -bottom-2 rounded-[5rem] bg-[var(--color-primary-soft)]" aria-hidden="true" />
      <div className="l-dots absolute right-2 top-4 h-28 w-24" aria-hidden="true" />
      <div className="landing-rise relative" style={{ animationDelay: '200ms' }}><div className="l-float"><Phone /></div></div>
      <div className={`${chip} left-0 top-28 sm:-left-2`} style={{ animationDelay: '-2s' }}><CheckCircle size={16} className="text-[var(--color-primary)]" />{L('Aduan terverifikasi', 'Complaint verified')}</div>
      <div className={`${chip} right-0 bottom-32 sm:-right-2`} style={{ animationDelay: '-4s' }}><Clock size={16} className="text-[var(--color-primary)]" />{L('SLA terpenuhi 94%', 'SLA met 94%')}</div>
      <span className="l-float absolute left-6 bottom-16 h-5 w-5 rounded-full bg-[var(--color-accent)]" style={{ animationDelay: '-1s' }} aria-hidden="true" />
    </div>
  )
}

function FeatureStrip() {
  const L = useL()
  const f = [
    [FileEdit, L('Ajukan Aduan', 'Submit Complaints'), L('Kirim aduan lengkap dengan detail kapan saja.', 'Send a complaint with details any time.')],
    [ScanSearch, L('Verifikasi Cepat', 'Fast Verification'), L('Aduan dicek dan dikategorikan sebelum ditangani.', 'Complaints are checked and categorized first.')],
    [Clock, L('Pantau SLA', 'Track SLA'), L('Waktu respons dan tenggat terlihat jelas.', 'Response time and deadlines stay visible.')],
    [BarChart3, L('Analitik Aduan', 'Complaint Analytics'), L('Lihat tren dan sentimen untuk keputusan yang lebih baik.', 'See trends and sentiment to decide better.')],
  ]
  return (
    <div id="features" className={`${PANEL} l-reveal mt-8 lg:mt-6 grid rounded-[2rem] sm:grid-cols-2 lg:grid-cols-4 lg:divide-x divide-[var(--color-border)]`}>
      {f.map(([Icon, title, desc]) => (
        <div key={title} className="flex items-start gap-4 p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-primary-soft)]"><Icon size={20} className="text-[var(--color-primary)]" /></div>
          <div>
            <h3 className="text-base font-bold leading-snug">{title}</h3>
            <p className={`mt-1 text-xs leading-relaxed ${MUTED}`}>{desc}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function Hero() {
  const { t } = useTranslation()
  const L = useL()
  return (
    <section className="landing-page">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 md:pt-6 pb-6">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-6">
          <div>
            <div className="landing-rise inline-flex items-center gap-2 rounded-full bg-[var(--color-surface)] px-3.5 py-1.5 text-xs font-semibold text-[var(--color-primary)] shadow-sm ring-1 ring-[var(--color-border)]">
              <ShieldCheck size={14} />{L('Platform manajemen aduan PENS', 'PENS complaint management platform')}
            </div>
            <h1 className="landing-rise mt-6 text-5xl font-extrabold leading-[1.05] tracking-tight md:text-6xl" style={{ animationDelay: '100ms' }}>
              <span className="block">{L('Kelola Aduan,', 'Manage Complaints,')}</span><span className="block">{L('Bangun Kepercayaan.', 'Build Trust.')}</span>
            </h1>
            <p className={`landing-rise mt-6 max-w-md text-lg leading-relaxed ${MUTED}`} style={{ animationDelay: '200ms' }}>
              {L('Terima, proses, pantau, dan analisis aduan dalam satu platform. Setiap aduan punya jalur yang jelas sampai selesai.',
                'Receive, process, monitor, and analyze complaints in one platform. Every complaint gets a clear path to resolution.')}
            </p>
            <div className="landing-rise mt-8 flex flex-col gap-3 sm:flex-row" style={{ animationDelay: '300ms' }}>
              <Link to="/signup-user" className={`${BTN} l-grad shadow-lg shadow-[var(--l-shadow)] hover:-translate-y-0.5 hover:brightness-110`}>
                {t('landing.cta_submit', L('Ajukan Aduan', 'Submit a Complaint'))}<ArrowRight size={17} />
              </Link>
              <Link to="/signin" className={`${BTN} text-[var(--color-primary)] ring-1 ring-[var(--color-primary)] hover:bg-[var(--color-primary-soft)]`}>
                {t('landing.cta_stakeholder', L('Masuk sebagai Stakeholder', 'Sign in as Stakeholder'))}
              </Link>
            </div>
            <p className={`landing-rise mt-5 text-sm ${MUTED}`} style={{ animationDelay: '400ms' }}>{L('Pantau status aduan Anda kapan saja, tanpa antre.', 'Track your complaint status any time, no queue.')}</p>
          </div>
          <HeroVisual />
        </div>
        <FeatureStrip />
      </div>
    </section>
  )
}

function Problem() {
  const L = useL()
  const items = [
    [MessageSquare, L('Aduan tersebar', 'Scattered complaints'), L('Aduan masuk lewat banyak kanal, sulit dikelola di satu tempat.', 'Complaints arrive through many channels and are hard to manage in one place.')],
    [Clock, L('Progres sulit dipantau', 'Progress is hard to follow'), L('Status, penanggung jawab, dan tenggat tidak terlihat jelas.', 'Status, owner, and deadline are not clearly visible.')],
    [TrendingUp, L('Minim insight', 'Little insight'), L('Data aduan belum dipakai untuk melihat pola dan mengambil keputusan.', 'Complaint data is rarely used to spot patterns and decide.')],
  ]
  return (
    <section id="problem" className={`${SECTION} landing-page`}>
      <Heading center>{L('Mengelola aduan tidak seharusnya rumit', "Complaint management shouldn't be complicated")}</Heading>
      <div className={`${PANEL} l-reveal rounded-3xl grid md:grid-cols-3 md:divide-x divide-y md:divide-y-0 divide-[var(--color-border)]`}>
        {items.map(([Icon, title, desc]) => (
          <div key={title} className="p-8 md:p-10">
            <Icon size={22} className="text-[var(--color-neg,#B3261E)] mb-5" style={{ color: C.neg }} />
            <h3 className="text-lg font-bold mb-2">{title}</h3>
            <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
      <p className="l-reveal mt-6 flex items-center justify-center gap-2 text-center text-sm font-semibold text-[var(--color-primary)] md:text-base">
        <CheckCircle size={18} className="shrink-0" />{L('SuaraLens menyatukan semuanya dalam satu platform.', 'SuaraLens brings everything into one platform.')}
      </p>
    </section>
  )
}

function HowItWorks() {
  const L = useL()
  const steps = [
    [FileEdit, L('Ajukan', 'Submit'), L('Pengguna mengirim aduan.', 'A user sends a complaint.')],
    [ScanSearch, L('Verifikasi', 'Verify'), L('Aduan dicek dan dikategorikan.', 'It is checked and categorized.')],
    [Workflow, L('Selesaikan', 'Resolve'), L('Unit terkait menangani aduan.', 'The responsible unit handles it.')],
    [BarChart3, L('Analisis', 'Analyze'), L('Data diolah menjadi insight.', 'Data becomes insight.')],
  ]
  return (
    <section id="workflow" className={`${SECTION} landing-page`}>
      <Heading center>{L('Cara kerja SuaraLens', 'How SuaraLens works')}</Heading>
      <div className="relative grid md:grid-cols-4 gap-10 md:gap-6">
        <div className="absolute left-7 top-7 bottom-7 w-px bg-[var(--color-border)] md:hidden" aria-hidden="true" />
        <div className="absolute top-7 left-[12.5%] right-[12.5%] h-px bg-[var(--color-border)] hidden md:block" aria-hidden="true" />
        {steps.map(([Icon, title, desc], i) => (
          <div key={title} className="l-reveal relative flex md:flex-col md:items-center md:text-center gap-5 md:gap-4" style={{ transitionDelay: `${i * 120}ms` }}>
            <div className="relative w-14 h-14 shrink-0 rounded-full bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] shadow-md flex items-center justify-center">
              <Icon size={22} className="text-[var(--color-primary)]" />
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[var(--color-accent)] text-[#0C2A22] text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
            </div>
            <div><h3 className="font-bold">{title}</h3><p className="text-sm text-[var(--color-text-muted)] mt-1 max-w-[14rem]">{desc}</p></div>
          </div>
        ))}
      </div>
    </section>
  )
}

function Analytics() {
  const L = useL()
  const days = L('SSRKJSM', 'MTWTFSS').split('')
  const bars = [40, 65, 50, 80, 60, 90, 72]
  const points = [L('Tren, sentimen, dan tingkat urgensi dalam satu dashboard', 'Trend, sentiment, and urgency in one dashboard'), L('Kinerja SLA dan tingkat penyelesaian per unit', 'SLA performance and resolution rate per unit'), L('Bahan laporan untuk pengambilan keputusan', 'Ready material for decision-making')]
  const card = `${PANEL} l-reveal rounded-3xl p-4 sm:p-5`
  const d = (n) => ({ transitionDelay: `${n}ms` })
  return (
    <section id="analytics" className="landing-page">
      <div className={`${SECTION} grid items-center gap-12 lg:grid-cols-5`}>
        <div className="lg:col-span-2">
          <Heading sub={L('Setiap aduan menambah data. SuaraLens membantu membaca polanya.', 'Every complaint adds data. SuaraLens helps you read the pattern.')}>
            {L('Ubah aduan menjadi insight yang bisa ditindaklanjuti', 'Turn complaints into actionable insights')}
          </Heading>
          <ul className="mt-8 space-y-3">
            {points.map((p) => <li key={p} className="flex gap-3 text-sm"><CheckCircle size={18} className="mt-0.5 shrink-0 text-[var(--color-primary)]" />{p}</li>)}
          </ul>
        </div>
        <div className="relative lg:col-span-3">
          <div className="absolute -inset-4 -z-10 rounded-[3rem] bg-[var(--color-primary-soft)] opacity-70" aria-hidden="true" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className={card}>
              <div className={`text-xs ${MUTED}`}>{L('Total aduan', 'Total complaints')}</div>
              <div className="mt-1 text-3xl font-extrabold tracking-tight">247</div>
              <Trend h="h-10" />
              <div className="text-[11px] text-[var(--color-primary)]">+12% {L('dari kemarin', 'vs yesterday')}</div>
            </div>
            <div className={`${card} col-span-2 flex flex-col items-center text-center sm:col-span-1 sm:row-span-2`} style={d(100)}>
              <div className={`self-start text-xs ${MUTED}`}>{L('Kepatuhan SLA', 'SLA compliance')}</div>
              <div className="my-4"><Ring pct={94} track="var(--color-border)" color="var(--color-primary)" size="w-32 h-32" w={9}><span className="text-3xl">94%</span></Ring></div>
              <div className={`text-xs ${MUTED}`}>{L('Target 90%', 'Target 90%')}</div>
              <div className="mt-auto flex h-16 w-full items-end justify-between gap-1.5 pt-4">
                {bars.map((h, i) => <div key={i} className="flex flex-1 flex-col items-center gap-1"><div className="l-barv w-full rounded-full bg-[var(--color-primary)]" style={{ height: `${h * 0.6}%`, minHeight: 6, animationDelay: `${i * 80}ms`, opacity: i === 5 ? 1 : 0.4 }} /><span className={`text-[9px] ${MUTED}`}>{days[i]}</span></div>)}
              </div>
            </div>
            <div className={card} style={d(200)}>
              <div className={`text-xs ${MUTED}`}>{L('Rata-rata respons', 'Average response')}</div>
              <div className="mt-1 text-3xl font-extrabold tracking-tight">3.2 <span className={`text-sm font-medium ${MUTED}`}>/ 4 {L('jam', 'h')}</span></div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--color-border)]"><div className="l-bar h-full w-[80%] rounded-full bg-[var(--color-sky,var(--l-sky))]" style={{ background: 'var(--l-sky)' }} /></div>
            </div>
            <div className={card} style={d(300)}>
              <div className="flex items-center justify-between"><div className={`text-xs ${MUTED}`}>{L('Urgensi tinggi', 'High urgency')}</div><AlertCircle size={18} style={{ color: C.neg }} /></div>
              <div className="mt-1 text-3xl font-extrabold tracking-tight">8</div>
              <div className={`mt-2 text-[11px] ${MUTED}`}>{L('Perlu ditangani hari ini', 'Needs attention today')}</div>
            </div>
            <div className={`${card} col-span-2 sm:col-span-1`} style={d(400)}>
              <div className="flex items-center justify-between"><div className={`text-xs ${MUTED}`}>{L('Selesai', 'Resolved')}</div><CheckCircle size={18} className="text-[var(--color-primary)]" /></div>
              <div className="mt-1 text-3xl font-extrabold tracking-tight">163 <span className={`text-sm font-medium ${MUTED}`}>/ 247</span></div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--color-border)]"><div className="l-bar h-full w-[66%] rounded-full bg-[var(--color-primary)]" /></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function Roles() {
  const L = useL()
  const roles = [
    [MessageSquare, 'User', L('Mengajukan dan melacak aduan.', 'Submit and track complaints.')],
    [ScanSearch, L('Verifikator', 'Verifier'), L('Meninjau dan memvalidasi aduan masuk.', 'Review and validate incoming complaints.')],
    [Workflow, 'Staff', L('Menangani aduan yang ditugaskan.', 'Handle assigned complaints.')],
    [ShieldCheck, 'Supervisor', L('Memantau kinerja dan SLA.', 'Monitor performance and SLA.')],
    [BarChart3, 'Stakeholder', L('Menganalisis tren dan kinerja organisasi.', 'Analyze trends and organizational performance.')],
  ]
  return (
    <section className={`${SECTION} landing-page`}>
      <Heading center sub={L('Setiap peran melihat dan mengerjakan hal yang sesuai tugasnya.', 'Each role sees and does what fits its job.')}>
        {L('Satu platform. Peran berbeda.', 'One platform. Different roles.')}
      </Heading>
      <div className="relative grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="absolute top-[3.75rem] left-[10%] right-[10%] h-px bg-[var(--color-border)] hidden lg:block" aria-hidden="true" />
        {roles.map(([Icon, name, desc], i) => (
          <div key={name} className={`${PANEL} l-reveal relative rounded-3xl p-6 text-center`} style={{ transitionDelay: `${i * 90}ms` }}>
            <div className="w-14 h-14 mx-auto rounded-full bg-[var(--color-primary-soft)] flex items-center justify-center mb-4"><Icon size={22} className="text-[var(--color-primary)]" /></div>
            <h3 className="font-bold mb-1">{name}</h3>
            <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
      <Metrics />
    </section>
  )
}

function Metrics() {
  const L = useL()
  const m = [['94%', L('SLA terpenuhi', 'SLA compliance')], ['3.2j', L('Rata-rata respons', 'Average response')], ['247', L('Aduan terlacak', 'Complaints tracked')], ['100%', L('Status terlihat', 'Visible status')]]
  return (
    <div className="l-reveal mt-10">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px overflow-hidden rounded-2xl bg-[var(--color-border)] ring-1 ring-[var(--color-border)]">
        {m.map(([v, l]) => (
          <div key={l} className="bg-[var(--color-surface)] px-5 py-4">
            <div className="text-2xl md:text-3xl font-extrabold tracking-tight text-[var(--color-primary)]">{v}</div>
            <div className="text-xs text-[var(--color-text-muted)] mt-0.5">{l}</div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-right text-[var(--color-text-muted)]">{L('Data demo untuk ilustrasi, bukan hasil nyata.', 'Demo data for illustration, not real results.')}</p>
    </div>
  )
}

function Security() {
  const { t } = useTranslation()
  const L = useL()
  const items = [[Lock, L('Akses berbasis peran', 'Role-based access')], [MessageSquare, L('Pelacakan aduan', 'Complaint tracking')], [Clock, L('Riwayat aktivitas', 'Activity history')], [ShieldCheck, L('Privasi data', 'Data privacy')], [Workflow, L('Alur yang transparan', 'Transparent workflow')]]
  return (
    <section className="landing-page">
      <div className={`${SECTION} !py-12 grid lg:grid-cols-2 gap-10 items-center`}>
        <div>
          <ShieldCheck size={32} className="text-[var(--color-primary)] mb-5" />
          <Heading sub={t('landing.privacy_desc')}>{L('Dibangun untuk transparansi dan akuntabilitas', 'Built for transparency and accountability')}</Heading>
        </div>
        <ul className="grid sm:grid-cols-2 gap-3">
          {items.map(([Icon, l]) => <li key={l} className="flex items-center gap-3 rounded-2xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] px-4 py-4 text-sm font-semibold"><Icon size={18} className="text-[var(--color-primary)]" />{l}</li>)}
        </ul>
      </div>
    </section>
  )
}

function FinalCTA() {
  const { t } = useTranslation()
  const L = useL()
  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-14">
      <div className="l-reveal relative overflow-hidden rounded-[2rem] px-6 py-14 md:py-20 text-center text-white l-grad">
        <div className="absolute -top-24 -right-16 w-72 h-72 rounded-full blur-3xl opacity-30 bg-[var(--color-accent)]" aria-hidden="true" />
        <h2 className="relative text-3xl md:text-5xl font-extrabold tracking-tight max-w-2xl mx-auto leading-[1.1]">{L('Siap membuat pengelolaan aduan lebih baik?', 'Ready to make complaint management better?')}</h2>
        <p className="relative mt-4 text-white/80 max-w-xl mx-auto">{L('Beri setiap aduan jalur yang jelas dari pengajuan sampai penyelesaian.', 'Give every complaint a clear path from submission to resolution.')}</p>
        <div className="relative mt-9 flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/signup-user" className={`${BTN} bg-white text-[#0B7F54] hover:bg-white/90 hover:-translate-y-0.5`}>{t('landing.cta_submit', L('Ajukan Aduan', 'Submit a Complaint'))}<ArrowRight size={17} /></Link>
          <Link to="/signin" className={`${BTN} ring-1 ring-white/50 text-white hover:bg-white/10`}>{t('landing.cta_stakeholder', L('Masuk sebagai Stakeholder', 'Sign in as Stakeholder'))}</Link>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  const L = useL()
  const cols = [
    ['Product', [['Features', '#features'], [L('Cara Kerja', 'How It Works'), '#workflow'], ['Analytics', '#analytics']]],
    [L('Sumber Daya', 'Resources'), [['FAQ', '#'], [L('Bantuan', 'Help'), '#'], [L('Kontak', 'Contact'), '#']]],
    ['Legal', [[L('Kebijakan Privasi', 'Privacy Policy'), '#'], [L('Syarat & Ketentuan', 'Terms'), '#']]],
  ]
  return (
    <footer className="border-t border-[var(--color-border)] py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid sm:grid-cols-2 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2.5"><div className="w-6 h-6 rounded-md l-grad" /><span className="font-bold">SuaraLens</span></div>
          <p className="text-sm text-[var(--color-text-muted)] mt-3">Complaint Management Platform</p>
        </div>
        {cols.map(([h, links]) => (
          <div key={h}>
            <div className="text-sm font-semibold mb-3">{h}</div>
            <ul className="space-y-2 text-sm text-[var(--color-text-muted)]">
              {links.map(([l, href]) => <li key={l}><a href={href} className="hover:text-[var(--color-text)] transition-colors">{l}</a></li>)}
            </ul>
          </div>
        ))}
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 pt-6 border-t border-[var(--color-border)] text-xs text-[var(--color-text-muted)]">
        SuaraLens © {new Date().getFullYear()} — PENS, Politeknik Elektronika Negeri Surabaya
      </div>
    </footer>
  )
}

/* ---------- page ---------- */
export default function LandingPage() {
  const { t, i18n } = useTranslation() // dipertahankan agar mekanisme i18n tetap sama
  void t; void i18n
  // Scroll-snap per halaman: aktif hanya selama landing page tampil.
  useEffect(() => {
    const root = document.documentElement
    root.classList.add('landing-snap')
    const desktop = window.matchMedia('(min-width: 1024px)')
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    const px = (v) => (v.endsWith('rem') ? parseFloat(v) * 16 : parseFloat(v) || 0)
    let locked = false
    // Pindah satu halaman. Return false bila halaman aktif masih punya isi (biarkan scroll normal).
    const go = (dir) => {
      const pages = [...document.querySelectorAll('.landing-page')]
      const top = px(getComputedStyle(root).getPropertyValue('--nav-h').trim())
      let cur = 0
      pages.forEach((el, i) => { if (el.getBoundingClientRect().top <= top + 8) cur = i })
      const r = pages[cur].getBoundingClientRect()
      if (dir > 0 && r.bottom > window.innerHeight + 8) return false
      if (dir < 0 && r.top < top - 8) return false
      const next = pages[cur + dir]
      if (!next) return false
      locked = true
      next.scrollIntoView({ behavior: reduce.matches ? 'auto' : 'smooth', block: 'start' })
      setTimeout(() => { locked = false }, 900)
      return true
    }
    const onWheel = (e) => {
      if (!desktop.matches || e.ctrlKey || Math.abs(e.deltaY) < 4) return
      if (locked) { e.preventDefault(); return }
      if (go(Math.sign(e.deltaY))) e.preventDefault()
    }
    const onKey = (e) => {
      if (!desktop.matches || locked || e.target.closest?.('input,textarea,select,button,a,[contenteditable]')) return
      const dir = e.key === 'ArrowDown' || e.key === 'PageDown' ? 1 : e.key === 'ArrowUp' || e.key === 'PageUp' ? -1 : e.key === ' ' ? (e.shiftKey ? -1 : 1) : 0
      if (dir && go(dir)) e.preventDefault()
    }
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target) } }), { threshold: 0.15 })
    document.querySelectorAll('.l-reveal').forEach((el) => io.observe(el))
    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('keydown', onKey)
    return () => {
      root.classList.remove('landing-snap')
      io.disconnect()
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('keydown', onKey)
    }
  }, [])
  return (
    <div className="landing-root min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] overflow-x-clip transition-colors duration-300">
      <style>{THEME_CSS + `
        @keyframes landing-rise { from { opacity: 0; transform: translateY(24px) } to { opacity: 1; transform: none } }
        .landing-rise { animation: landing-rise .8s ease-out both; }
        @media (prefers-reduced-motion: reduce) { .landing-rise { animation: none } }
      `}</style>
      <Navbar variant="public" />
      <Hero />
      <Problem />
      <HowItWorks />
      <Analytics />
      <Roles />
      <Security />
      <div className="landing-page"><FinalCTA /><Footer /></div>
    </div>
  )
}