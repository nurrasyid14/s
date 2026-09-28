import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { UserPlus, AlertCircle, Info } from 'lucide-react'
import { signUpStakeholder } from '../../services/authApi.js'
import { useAuth } from '../../context/AuthContext.jsx'

export default function SignUpStakeholderPage() {
  const { t } = useTranslation()
  const { login } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    name: '', email: '', position: '', institution: 'PENS',
    password: '', confirm_password: '', agree: false,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (form.password !== form.confirm_password) { setError('Kata sandi tidak cocok.'); return }
    if (!form.agree) { setError('Harap setujui kebijakan privasi.'); return }
    setLoading(true)
    try {
      const { user } = await signUpStakeholder({ ...form, role: 'stakeholder' })
      login(user)
      navigate('/stakeholder')
    } catch { setError('Gagal mendaftar. Coba lagi.') }
    finally { setLoading(false) }
  }

  const inputCls = "w-full px-4 py-3 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] placeholder-[var(--color-text-muted)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40 focus:border-[var(--color-primary)] transition-smooth"

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-2.5 justify-center mb-8">
          <span className="text-[var(--color-text)] font-bold text-xl">SuaraLens</span>
        </Link>

        <div className="card-elevated rounded-xl p-8 border-t-2 border-t-[var(--color-accent)]">
          <h2 className="text-2xl font-bold text-[var(--color-text)] mb-1">{t('auth.as_stakeholder')}</h2>
          <p className="text-[var(--color-text-muted)] text-sm mb-4">Akun stakeholder untuk memantau & menindaklanjuti aduan</p>

          {/* Notice */}
          <div className="flex items-start gap-2 mb-5 p-3 bg-[color-mix(in_srgb,var(--color-accent)_12%,transparent)] border border-[var(--color-accent)]/40 rounded-lg text-[var(--color-accent-dark)] text-xs">
            <Info size={13} className="flex-shrink-0 mt-0.5" />
            <span>Verifikasi email domain institusi akan diaktifkan di versi berikutnya. Saat ini self-register terbuka untuk demo MVP.</span>
          </div>

          {error && (
            <div className="flex items-center gap-2 mb-4 p-3 bg-[color-mix(in_srgb,var(--color-status-danger)_10%,transparent)] border border-[var(--color-status-danger)]/30 rounded-lg text-[var(--color-status-danger)] text-sm">
              <AlertCircle size={15} /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[var(--color-text)] mb-1.5">{t('auth.name')}</label>
              <input name="name" required placeholder="Dr. Nama Lengkap" value={form.name} onChange={handleChange} className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--color-text)] mb-1.5">{t('auth.email')}</label>
                <input name="email" type="email" required placeholder="nama@pens.ac.id" value={form.email} onChange={handleChange} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--color-text)] mb-1.5">{t('auth.institution')}</label>
                <input name="institution" required placeholder="PENS" value={form.institution} onChange={handleChange} className={inputCls} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text)] mb-1.5">{t('auth.position')}</label>
              <input name="position" required placeholder="Kepala Bagian..." value={form.position} onChange={handleChange} className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--color-text)] mb-1.5">{t('auth.password')}</label>
                <input name="password" type="password" required placeholder="••••••••" value={form.password} onChange={handleChange} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--color-text)] mb-1.5">{t('auth.confirm_password')}</label>
                <input name="confirm_password" type="password" required placeholder="••••••••" value={form.confirm_password} onChange={handleChange} className={inputCls} />
              </div>
            </div>
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input name="agree" type="checkbox" checked={form.agree} onChange={handleChange} className="mt-0.5 accent-[var(--color-primary)]" />
              <span className="text-xs text-[var(--color-text-muted)]">{t('auth.privacy_agree')}</span>
            </label>
            <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] disabled:opacity-60 text-white font-semibold rounded-lg transition-smooth">
              {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><UserPlus size={17} /> {t('auth.register')}</>}
            </button>
          </form>
          <p className="text-center text-sm text-[var(--color-text-muted)] mt-5">
            {t('auth.already_have_account')}{' '}
            <Link to="/signin" className="text-[var(--color-primary)] hover:underline font-medium">{t('auth.signin')}</Link>
          </p>
        </div>
      </div>
    </div>
  )
}