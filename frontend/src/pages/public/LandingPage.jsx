import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FileEdit, ScanSearch, ShieldCheck, BarChart3, ArrowRight } from 'lucide-react'
import Navbar from '../../components/layout/Navbar.jsx'

const STEPS = [
  { key: 'landing.step1', icon: FileEdit },
  { key: 'landing.step2', icon: ScanSearch },
  { key: 'landing.step3', icon: ShieldCheck },
  { key: 'landing.step4', icon: BarChart3 },
]

export default function LandingPage() {
  const { t, i18n } = useTranslation()

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <Navbar variant="public" />

      {/* Hero */}
      <section className="border-b border-[var(--color-border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <div className="grid lg:grid-cols-2 gap-12 items-center">

            {/* Left — Text & CTA */}
            <div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] text-xs font-semibold mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]" />
                PENS — Politeknik Elektronika Negeri Surabaya
              </div>

              <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-4 text-[var(--color-text)]">
                {t('landing.hero_title')}
              </h1>
              <p className="text-xl font-semibold text-[var(--color-primary)] mb-4">
                {t('landing.hero_subtitle')}
              </p>
              <p className="text-[var(--color-text-muted)] text-base mb-9 max-w-lg leading-relaxed">
                {t('landing.hero_desc')}
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  to="/signup-user"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white font-semibold rounded-lg transition-smooth"
                >
                  {t('landing.cta_submit')}
                  <ArrowRight size={17} />
                </Link>
                <Link
                  to="/signin"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 border border-[var(--color-border)] hover:border-[var(--color-primary)] text-[var(--color-text)] font-semibold rounded-lg transition-smooth"
                >
                  {t('landing.cta_stakeholder')}
                </Link>
              </div>

              {/* Stats row */}
              <div className="mt-12 grid grid-cols-3 gap-6 pt-8 border-t border-[var(--color-border)]">
                {[
                  { v: '2.400+', l: i18n.language === 'id' ? 'Aduan Diproses' : 'Reports Processed' },
                  { v: '94%', l: i18n.language === 'id' ? 'SLA Terpenuhi' : 'SLA Met' },
                  { v: '<24 jam', l: i18n.language === 'id' ? 'Waktu Respons' : 'Response Time' },
                ].map(({ v, l }) => (
                  <div key={l}>
                    <div className="text-2xl font-extrabold text-[var(--color-primary)]">{v}</div>
                    <div className="text-xs text-[var(--color-text-muted)] mt-1">{l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — Dashboard preview */}
            <div className="hidden lg:block">
              <div className="card-elevated rounded-xl p-5">
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-[var(--color-border)]">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-[var(--color-primary)]" />
                    <span className="font-semibold text-sm">SuaraLens Analytics</span>
                  </div>
                  <span className="text-xs text-[var(--color-text-muted)] font-mono">30 hari terakhir</span>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { label: 'Total Aduan', value: '247' },
                    { label: 'Avg SLA', value: '3.2h' },
                    { label: 'Urgensi', value: '8' },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-lg p-3 border border-[var(--color-border)]">
                      <div className="text-[var(--color-text-muted)] text-xs mb-1">{label}</div>
                      <div className="text-lg font-bold text-[var(--color-text)]">{value}</div>
                    </div>
                  ))}
                </div>

                <div className="rounded-lg p-3 mb-3 border border-[var(--color-border)]">
                  <div className="text-[var(--color-text-muted)] text-xs mb-2">Tren Aduan (30 hari)</div>
                  <svg viewBox="0 0 280 70" className="w-full" preserveAspectRatio="none">
                    <path d="M0,55 C20,50 35,45 55,38 C75,30 90,42 110,35 C130,28 145,20 165,15 C185,10 200,22 220,18 C240,14 260,20 280,12"
                      fill="none" stroke="#1D4E89" strokeWidth="2.5" strokeLinecap="round" />
                    {[[55, 38], [110, 35], [165, 15], [220, 18], [280, 12]].map(([x, y], i) => (
                      <circle key={i} cx={x} cy={y} r="3" fill="#F2B705" />
                    ))}
                  </svg>
                </div>

                <div className="rounded-lg p-3 border border-[var(--color-border)]">
                  <div className="text-[var(--color-text-muted)] text-xs mb-2">Distribusi Sentimen</div>
                  <div className="space-y-1.5">
                    {[
                      { label: 'Negatif', pct: 34, color: '#B3261E' },
                      { label: 'Netral', pct: 45, color: '#B8860B' },
                      { label: 'Positif', pct: 21, color: '#1E7145' },
                    ].map(({ label, pct, color }) => (
                      <div key={label} className="flex items-center gap-2">
                        <span className="text-[var(--color-text-muted)] text-xs w-14 flex-shrink-0">{label}</span>
                        <div className="flex-1 bg-[var(--color-bg-secondary)] rounded-full h-1.5">
                          <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: color }} />
                        </div>
                        <span className="text-[var(--color-text-muted)] text-xs w-8 text-right">{pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-2xl font-bold text-center mb-10">
          {i18n.language === 'id' ? 'Kenapa SuaraLens?' : 'Why SuaraLens?'}
        </h2>
        <div className="grid md:grid-cols-3 gap-5">
          {[
            { icon: ScanSearch, titleKey: 'landing.feature_fast', descKey: 'landing.feature_fast_desc' },
            { icon: ShieldCheck, titleKey: 'landing.feature_transparent', descKey: 'landing.feature_transparent_desc' },
            { icon: BarChart3, titleKey: 'landing.feature_data', descKey: 'landing.feature_data_desc' },
          ].map(({ icon: Icon, titleKey, descKey }) => (
            <div key={titleKey} className="card-elevated rounded-xl p-6">
              <div className="w-10 h-10 rounded-lg bg-[var(--color-primary-soft)] flex items-center justify-center mb-4">
                <Icon size={19} className="text-[var(--color-primary)]" />
              </div>
              <h3 className="text-base font-bold mb-1.5">{t(titleKey)}</h3>
              <p className="text-[var(--color-text-muted)] text-sm leading-relaxed">{t(descKey)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works — this IS a sequence, numbering earns its place here */}
      <section className="bg-[var(--color-surface)] border-y border-[var(--color-border)] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-center mb-12">{t('landing.how_title')}</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {STEPS.map(({ key, icon: Icon }, i) => (
              <div key={key} className="text-center">
                <div className="relative w-14 h-14 rounded-full bg-[var(--color-bg)] border border-[var(--color-border)] flex items-center justify-center mb-3 mx-auto">
                  <Icon size={22} className="text-[var(--color-primary)]" />
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[var(--color-accent)] text-[var(--color-text)] text-[10px] font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                </div>
                <p className="font-medium text-sm">{t(key)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Privacy */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <ShieldCheck size={32} className="text-[var(--color-primary)] mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-3">{t('landing.privacy_title')}</h2>
        <p className="text-[var(--color-text-muted)] leading-relaxed">{t('landing.privacy_desc')}</p>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--color-border)] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded bg-[var(--color-primary)]" />
            <span className="text-[var(--color-text-muted)] text-sm">SuaraLens © 2024 — PENS</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-[var(--color-text-muted)]">
            <a href="#" className="hover:text-[var(--color-text)] transition-colors">FAQ</a>
            <a href="#" className="hover:text-[var(--color-text)] transition-colors">Kontak</a>
            <a href="#" className="hover:text-[var(--color-text)] transition-colors">Kebijakan Privasi</a>
          </div>
        </div>
      </footer>
    </div>
  )
}