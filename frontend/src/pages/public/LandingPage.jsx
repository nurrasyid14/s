import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Zap, Eye, BarChart2, ArrowRight, Shield } from 'lucide-react'
import Navbar from '../../components/layout/Navbar.jsx'

const STEPS = ['landing.step1', 'landing.step2', 'landing.step3', 'landing.step4']
const STEP_ICONS = ['📝', '🤖', '✅', '📊']

export default function LandingPage() {
  const { t, i18n } = useTranslation()

  return (
    <div className="min-h-screen bg-[#0F172A] text-white">
      <Navbar variant="public" />

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Background gradient blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl" />
          <div className="absolute top-40 right-1/4 w-72 h-72 bg-teal-500/15 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">

            {/* Left — Text & CTA */}
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-600/20 border border-blue-500/30 text-blue-300 text-sm font-medium mb-6 animate-fade-in">
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse-soft" />
                PENS — Politeknik Elektronika Negeri Surabaya
              </div>

              <h1 className="text-5xl md:text-6xl font-extrabold leading-tight mb-4 animate-fade-in-up">
                <span className="gradient-text">{t('landing.hero_title')}</span>
              </h1>
              <p className="text-2xl font-semibold text-slate-200 mb-4 animate-fade-in-up delay-100">
                {t('landing.hero_subtitle')}
              </p>
              <p className="text-slate-400 text-lg mb-10 animate-fade-in-up delay-200">
                {t('landing.hero_desc')}
              </p>

              <div className="flex flex-col sm:flex-row gap-4 animate-fade-in-up delay-300">
                <Link
                  to="/signup-user"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/30 transition-smooth glow-primary"
                >
                  {t('landing.cta_submit')}
                  <ArrowRight size={18} />
                </Link>
                <Link
                  to="/signin"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white font-semibold rounded-xl transition-smooth"
                >
                  {t('landing.cta_stakeholder')}
                </Link>
              </div>

              {/* Stats row */}
              <div className="mt-12 grid grid-cols-3 gap-4 animate-fade-in delay-400">
                {[
                  { v: '2.4k+', l: i18n.language === 'id' ? 'Aduan Diproses' : 'Reports Processed' },
                  { v: '94%',   l: i18n.language === 'id' ? 'SLA Terpenuhi' : 'SLA Met' },
                  { v: '<24h',  l: i18n.language === 'id' ? 'Waktu Respons' : 'Response Time' },
                ].map(({ v, l }) => (
                  <div key={l} className="text-center">
                    <div className="text-2xl font-bold gradient-text">{v}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — Mini Dashboard Illustration */}
            <div className="hidden lg:block animate-fade-in delay-300">
              <div className="relative">
                <div className="absolute inset-0 bg-blue-600/10 rounded-3xl blur-2xl" />
                <div className="relative glass rounded-2xl p-5 border border-white/10">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-500 to-teal-500" />
                      <span className="text-white font-semibold text-sm">SuaraLens Analytics</span>
                    </div>
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
                    </div>
                  </div>

                  {/* Stat cards */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {[
                      { label: 'Total Aduan', value: '247', color: 'text-blue-400', bg: 'bg-blue-500/10' },
                      { label: 'Avg SLA',     value: '3.2h', color: 'text-teal-400', bg: 'bg-teal-500/10' },
                      { label: 'Urgency',     value: '8',   color: 'text-red-400',  bg: 'bg-red-500/10'  },
                    ].map(({ label, value, color, bg }) => (
                      <div key={label} className={`${bg} rounded-xl p-3 border border-white/5`}>
                        <div className="text-slate-400 text-xs mb-1">{label}</div>
                        <div className={`text-lg font-bold ${color}`}>{value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Mini line chart */}
                  <div className="bg-white/5 rounded-xl p-3 mb-3 border border-white/5">
                    <div className="text-slate-400 text-xs mb-2">Tren Aduan (30 hari)</div>
                    <svg viewBox="0 0 280 70" className="w-full" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="heroLineGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%"   stopColor="#14b8a6" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#14b8a6" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      {[14, 35, 56].map(y => (
                        <line key={y} x1="0" y1={y} x2="280" y2={y} stroke="rgba(148,163,184,0.1)" strokeWidth="1" />
                      ))}
                      <path d="M0,55 C20,50 35,45 55,38 C75,30 90,42 110,35 C130,28 145,20 165,15 C185,10 200,22 220,18 C240,14 260,20 280,12 L280,70 L0,70 Z"
                        fill="url(#heroLineGrad)" />
                      <path d="M0,55 C20,50 35,45 55,38 C75,30 90,42 110,35 C130,28 145,20 165,15 C185,10 200,22 220,18 C240,14 260,20 280,12"
                        fill="none" stroke="#14b8a6" strokeWidth="2.5" strokeLinecap="round" />
                      {[[55,38],[110,35],[165,15],[220,18],[280,12]].map(([x,y],i) => (
                        <circle key={i} cx={x} cy={y} r="3.5" fill="#14b8a6" />
                      ))}
                    </svg>
                  </div>

                  {/* Sentiment bars */}
                  <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                    <div className="text-slate-400 text-xs mb-2">Distribusi Sentimen</div>
                    <div className="space-y-1.5">
                      {[
                        { label: 'Negatif', pct: 34, color: 'bg-red-500' },
                        { label: 'Netral',  pct: 45, color: 'bg-amber-400' },
                        { label: 'Positif', pct: 21, color: 'bg-emerald-500' },
                      ].map(({ label, pct, color }) => (
                        <div key={label} className="flex items-center gap-2">
                          <span className="text-slate-400 text-xs w-14 flex-shrink-0">{label}</span>
                          <div className="flex-1 bg-white/10 rounded-full h-1.5">
                            <div className={`${color} h-1.5 rounded-full`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-slate-400 text-xs w-7 text-right">{pct}%</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Floating badge */}
                  <div className="absolute -top-3 -right-3 bg-gradient-to-br from-blue-600 to-teal-600 rounded-xl px-3 py-1.5 shadow-lg">
                    <span className="text-white text-xs font-semibold">🤖 NLP Powered</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-3xl font-bold text-center mb-12 text-white">
          {i18n.language === 'id' ? 'Kenapa SuaraLens?' : 'Why SuaraLens?'}
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: Zap,      titleKey: 'landing.feature_fast',        descKey: 'landing.feature_fast_desc',        color: 'from-blue-500 to-blue-600'    },
            { icon: Eye,      titleKey: 'landing.feature_transparent', descKey: 'landing.feature_transparent_desc', color: 'from-teal-500 to-teal-600'    },
            { icon: BarChart2,titleKey: 'landing.feature_data',        descKey: 'landing.feature_data_desc',        color: 'from-purple-500 to-purple-600' },
          ].map(({ icon: Icon, titleKey, descKey, color }, i) => (
            <div key={titleKey} className={`glass rounded-2xl p-6 hover:scale-[1.02] transition-smooth animate-fade-in-up delay-${(i + 1) * 100}`}>
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-4`}>
                <Icon size={22} className="text-white" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{t(titleKey)}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{t(descKey)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-[#1E293B]/50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-14 text-white">{t('landing.how_title')}</h2>
          <div className="grid md:grid-cols-4 gap-8">
            {STEPS.map((key, i) => (
              <div key={key} className={`flex flex-col items-center text-center animate-fade-in-up delay-${(i + 1) * 100}`}>
                <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600 flex items-center justify-center mb-4 text-3xl shadow-lg">
                  {STEP_ICONS[i]}
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                </div>
                <p className="text-white font-semibold text-sm">{t(key)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Privacy */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="bg-gradient-to-br from-emerald-900/40 to-teal-900/40 border border-emerald-700/30 rounded-2xl p-10 text-center">
          <Shield size={40} className="text-emerald-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-3">{t('landing.privacy_title')}</h2>
          <p className="text-slate-300 max-w-xl mx-auto leading-relaxed">{t('landing.privacy_desc')}</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center">
              <span className="text-white font-bold text-xs">SL</span>
            </div>
            <span className="text-slate-400 text-sm">SuaraLens © 2024 — PENS</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-slate-500">
            <a href="#" className="hover:text-slate-300 transition-colors">FAQ</a>
            <a href="#" className="hover:text-slate-300 transition-colors">Kontak</a>
            <a href="#" className="hover:text-slate-300 transition-colors">Kebijakan Privasi</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
