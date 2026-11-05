import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ScanSearch, Sun, Moon, ArrowLeft, CheckCircle2, Send, ClipboardCheck, FileEdit, ShieldCheck, BarChart3, Lock, Clock } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext.jsx'
import { useReducedMotion } from '../motion/Motion.jsx'

/* Pesan panel kiri per jenis halaman */
const COPY = {
  signin: {
    id: { kicker: 'Selamat datang kembali', title: 'Pantau setiap aduan sampai tuntas', points: ['Status tiket diperbarui setiap kali unit bergerak', 'Notifikasi aduan mendesak di satu tempat', 'Riwayat penanganan lengkap dengan bukti'] },
    en: { kicker: 'Welcome back', title: 'Follow every complaint to resolution', points: ['Ticket status updates whenever a unit acts', 'Urgent complaint alerts in one place', 'Full handling history with evidence'] },
    icons: [Clock, ShieldCheck, ClipboardCheck],
  },
  user: {
    id: { kicker: 'Untuk mahasiswa, dosen, dan staf', title: 'Suara Anda didengar, prosesnya terlihat', points: ['Ajukan aduan dalam 5 langkah', 'Pilih kirim secara anonim', 'Dapat kabar di setiap tahap penanganan'] },
    en: { kicker: 'For students, lecturers, and staff', title: 'Your voice is heard, the process is visible', points: ['Submit a complaint in 5 steps', 'Choose to send anonymously', 'Get updates at every handling step'] },
    icons: [FileEdit, Lock, CheckCircle2],
  },
  stakeholder: {
    id: { kicker: 'Untuk unit layanan kampus', title: 'Tangani aduan unit Anda dengan terukur', points: ['Antrean aduan diurutkan menurut urgensi', 'Tenggat SLA terpantau otomatis', 'Analitik sentimen untuk evaluasi layanan'] },
    en: { kicker: 'For campus service units', title: 'Handle your unit’s complaints measurably', points: ['Queue sorted by urgency', 'SLA deadlines tracked automatically', 'Sentiment analytics for service review'] },
    icons: [ClipboardCheck, Clock, BarChart3],
  },
  admin: {
    id: { kicker: 'Akses terbatas', title: 'Pusat kendali verifikasi dan disposisi', points: ['Verifikasi aduan sebelum diteruskan', 'Disposisi ke 14 unit kerja', 'Pantau kepatuhan SLA lintas unit'] },
    en: { kicker: 'Restricted access', title: 'Control center for verification and routing', points: ['Verify complaints before routing', 'Route to 14 work units', 'Monitor SLA compliance across units'] },
    icons: [ShieldCheck, Send, BarChart3],
  },
}

/* Kartu tiket yang statusnya berganti: memperlihatkan alur dalam sekilas */
function LiveTicket({ isId }) {
  const reduced = useReducedMotion()
  const stages = isId
    ? [['Tiket diterbitkan', FileEdit, 1], ['Diverifikasi admin', ClipboardCheck, 2], ['Diteruskan ke Sarpras', Send, 3], ['Sedang ditangani', Clock, 4], ['Selesai', CheckCircle2, 5]]
    : [['Ticket issued', FileEdit, 1], ['Verified by admin', ClipboardCheck, 2], ['Routed to Facilities', Send, 3], ['In progress', Clock, 4], ['Resolved', CheckCircle2, 5]]
  const [i, setI] = useState(reduced ? 4 : 0)
  useEffect(() => {
    if (reduced) return undefined
    const id = setInterval(() => setI(n => (n + 1) % stages.length), 2200)
    return () => clearInterval(id)
  }, [reduced, stages.length])
  const [label, Icon, step] = stages[i]
  const done = step === 5

  return (
    <div className="rounded-2xl border border-white/15 bg-white/[0.07] p-5 backdrop-blur-md" aria-hidden="true">
      <div className="flex items-center justify-between text-xs text-white/60">
        <span className="font-mono">#SL-0247</span>
        <span className="flex items-center gap-1.5"><span className="live-dot h-1.5 w-1.5 rounded-full bg-[var(--color-gold)]" />live</span>
      </div>
      <div className="mt-2 text-sm font-semibold text-white">{isId ? 'AC ruang lab 3 tidak dingin' : 'Lab 3 AC not cooling'}</div>
      <div key={i} className="animate-fade-in-up mt-3 flex items-center gap-2 text-sm font-medium" style={{ color: done ? '#34D399' : 'var(--color-gold)' }}>
        <Icon size={16} />{label}
      </div>
      <div className="mt-3 flex gap-1.5">
        {[1, 2, 3, 4, 5].map(n => (
          <span key={n} className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/15">
            <span
              className="block h-full rounded-full transition-transform duration-500 ease-[var(--ease-out)] origin-left"
              style={{ transform: `scaleX(${n <= step ? 1 : 0})`, background: done ? '#34D399' : 'var(--color-gold)' }}
            />
          </span>
        ))}
      </div>
    </div>
  )
}

/* Tab Pelapor / Unit Pengelola di atas kartu daftar, indikator bergeser */
function SignUpTabs({ isId }) {
  const { pathname } = useLocation()
  const tabs = [
    ['/signup-user', isId ? 'Pelapor' : 'Reporter'],
    ['/signup-stakeholder', isId ? 'Unit Pengelola' : 'Handling Unit'],
  ]
  const idx = Math.max(0, tabs.findIndex(([to]) => to === pathname))
  return (
    <div className="relative mb-6 grid grid-cols-2 rounded-xl bg-[var(--color-bg-secondary)] p-1" role="tablist">
      <span
        className="absolute bottom-1 top-1 left-1 w-[calc(50%-4px)] rounded-lg bg-[var(--color-navy)] shadow-sm transition-transform duration-300 ease-[var(--ease-out)] dark:bg-[var(--color-primary)]"
        style={{ transform: `translateX(${idx * 100}%)` }}
        aria-hidden="true"
      />
      {tabs.map(([to, label], i) => (
        <Link
          key={to}
          to={to}
          role="tab"
          aria-selected={i === idx}
          className={`relative z-10 rounded-lg py-2 text-center text-sm font-semibold transition-colors duration-200 ${i === idx ? 'text-white' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
        >
          {label}
        </Link>
      ))}
    </div>
  )
}

/**
 * Kerangka halaman autentikasi: panel navy bercerita di kiri, kartu form di kanan.
 * variant: signin | user | stakeholder | admin
 */
export default function AuthShell({ title, subtitle, children, footer, variant = 'signin', wide = false }) {
  const { dark, toggle } = useTheme()
  const { i18n } = useTranslation()
  const isId = !i18n.language || i18n.language.startsWith('id')
  const copy = COPY[variant] || COPY.signin
  const text = isId ? copy.id : copy.en
  const isSignUp = variant === 'user' || variant === 'stakeholder'

  return (
    <div className="flex min-h-screen w-full bg-[var(--color-bg-secondary)]">
      {/* Panel kiri: biru */}
      <aside className="relative isolate hidden w-[44%] max-w-[640px] flex-col justify-between overflow-hidden p-10 text-white lg:flex xl:p-14" style={{ background: 'var(--hero-grad)' }}>
        <div className="dot-grid absolute inset-0 -z-10 opacity-60" />
        <div className="absolute -bottom-40 -right-40 -z-10 h-[480px] w-[480px] rounded-full border border-[var(--color-gold)]/20" />
        <div className="absolute -bottom-24 -right-24 -z-10 h-[300px] w-[300px] rounded-full border border-white/10" />

        <Link to="/" className="flex w-fit items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-gold)] text-[var(--color-on-gold)]"><ScanSearch size={19} strokeWidth={2.4} /></span>
          <span className="text-xl font-bold tracking-tight">SuaraLens</span>
        </Link>

        <div>
          <div className="blur-in text-sm font-semibold uppercase tracking-[0.16em] text-[var(--color-gold)]">{text.kicker}</div>
          <h2 className="blur-in delay-100 mt-3 text-4xl font-bold leading-[1.1] tracking-tight xl:text-5xl">{text.title}</h2>
          <ul className="stagger mt-8 space-y-3.5">
            {text.points.map((p, i) => {
              const Icon = copy.icons[i]
              return (
                <li key={p} style={{ '--i': i + 4 }} className="flex items-center gap-3 text-white/85">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-[var(--color-gold)]"><Icon size={16} /></span>
                  {p}
                </li>
              )
            })}
          </ul>
        </div>

        <div className="blur-in delay-400 max-w-sm"><LiveTicket isId={isId} /></div>
      </aside>

      {/* Area kanan: kartu form */}
      <div className="relative flex flex-1 flex-col">
        {/* Pita biru tipis di layar kecil agar identitas tetap terasa */}
        <div className="absolute inset-x-0 top-0 h-56 lg:hidden" style={{ background: 'var(--hero-grad)' }} />

        <header className="relative z-10 flex items-center justify-between px-4 py-4 md:px-8">
          <Link to="/" className="group flex items-center gap-2 text-sm font-medium text-white lg:text-[var(--color-text-muted)] lg:hover:text-[var(--color-text)]">
            <ArrowLeft size={16} className="transition-transform duration-200 group-hover:-translate-x-0.5" />
            <span className="lg:hidden font-bold text-base">SuaraLens</span>
            <span className="hidden lg:inline">{isId ? 'Kembali ke beranda' : 'Back to home'}</span>
          </Link>
          <button onClick={toggle} aria-label={isId ? 'Ganti tema' : 'Toggle theme'} className="press flex h-11 w-11 items-center justify-center rounded-xl text-white transition-colors hover:bg-white/10 lg:text-[var(--color-text-muted)] lg:hover:bg-[var(--color-card-hover)] lg:hover:text-[var(--color-text)]">
            {dark ? <Sun size={18} className="text-[var(--color-gold)]" /> : <Moon size={18} />}
          </button>
        </header>

        <main id="main-content" className="relative z-10 flex flex-1 items-start justify-center px-4 pb-12 pt-2 lg:items-center lg:pt-0">
          <div className={`modal-in w-full ${wide ? 'max-w-xl' : 'max-w-md'}`}>
            <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-7 shadow-[0_24px_60px_-24px_rgba(10,36,99,0.35)] md:p-9">
              {isSignUp && <SignUpTabs isId={isId} />}
              <h1 className="text-[1.75rem] font-bold leading-tight tracking-[-0.03em] text-[var(--color-text)]">{title}</h1>
              {subtitle && <p className="mt-1.5 mb-6 text-sm text-[var(--color-text-muted)]">{subtitle}</p>}
              <div className="stagger-auto">{children}</div>
              {footer && <div className="mt-6 border-t border-[var(--color-border)] pt-5 text-center text-sm text-[var(--color-text-muted)]">{footer}</div>}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
