import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react'
import { signIn } from '../../services/authApi.js'
import { useAuth } from '../../context/AuthContext.jsx'

export default function SignInPage() {
  const { t } = useTranslation()
  const { login } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({ email: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { user } = await signIn(form)
      login(user)
      navigate(user.role === 'stakeholder' ? '/stakeholder' : '/user/dashboard')
    } catch (err) {
      setError('Email atau kata sandi salah.')
    } finally {
      setLoading(false)
    }
  }

  const inputCls = "w-full px-4 py-3 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] placeholder-[var(--color-text-muted)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40 focus:border-[var(--color-primary)] transition-smooth"

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 justify-center mb-8">
          <div className="w-9 h-9 rounded-lg bg-[var(--color-primary)] flex items-center justify-center">
            <span className="text-white font-bold">SL</span>
          </div>
          <span className="text-[var(--color-text)] font-bold text-xl">SuaraLens</span>
        </Link>

        <div className="card-elevated rounded-xl p-8">
          <h2 className="text-2xl font-bold text-[var(--color-text)] mb-1">{t('auth.signin')}</h2>
          <p className="text-[var(--color-text-muted)] text-sm mb-6">Masuk ke akun SuaraLens Anda</p>

          {error && (
            <div className="flex items-center gap-2 mb-4 p-3 bg-[color-mix(in_srgb,var(--color-status-danger)_10%,transparent)] border border-[var(--color-status-danger)]/30 rounded-lg text-[var(--color-status-danger)] text-sm">
              <AlertCircle size={15} /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">{t('auth.email')}</label>
              <input
                name="email"
                type="email"
                required
                value={form.email}
                onChange={handleChange}
                placeholder="nama@pens.ac.id"
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">{t('auth.password')}</label>
              <div className="relative">
                <input
                  name="password"
                  type={showPw ? 'text' : 'password'}
                  required
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className={`${inputCls} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(s => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                >
                  {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              <a href="#" className="text-xs text-[var(--color-primary)] hover:underline mt-1 block text-right">{t('auth.forgot_password')}</a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] disabled:opacity-60 text-white font-semibold rounded-lg transition-smooth mt-2"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <><LogIn size={17} /> {t('auth.signin')}</>
              )}
            </button>
          </form>

          {/* Demo hint */}
          <div className="mt-4 p-3 bg-[var(--color-bg)] rounded-lg text-xs text-[var(--color-text-muted)] space-y-1 border border-[var(--color-border)]">
            <p className="font-medium text-[var(--color-text)]">Demo credentials:</p>
            <p>User: <span className="text-[var(--color-primary)]">user@test.com</span></p>
            <p>Stakeholder: <span className="text-[var(--color-primary)]">sari@pens.ac.id</span></p>
            <p>(password: apapun)</p>
          </div>

          <p className="text-center text-sm text-[var(--color-text-muted)] mt-5">
            {t('auth.no_account')}{' '}
            <Link to="/signup-user" className="text-[var(--color-primary)] hover:underline font-medium">{t('auth.as_user')}</Link>
            {' '}/{' '}
            <Link to="/signup-stakeholder" className="text-[var(--color-primary)] hover:underline font-medium">{t('auth.as_stakeholder')}</Link>
          </p>
        </div>
      </div>
    </div>
  )
}