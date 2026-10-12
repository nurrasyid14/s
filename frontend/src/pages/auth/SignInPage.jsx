import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react'
import { signIn } from '../../services/authApi.js'
import { useAuth } from '../../context/AuthContext.jsx'
import AuthShell from '../../components/layout/AuthShell.jsx'

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
      if (user.role === 'admin') {
        navigate('/admin/dashboard')
      } else if (user.role === 'stakeholder') {
        navigate('/stakeholder')
      } else {
        navigate('/user/dashboard')
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Email atau kata sandi salah.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title={t('auth.signin')}
      subtitle="Masuk ke akun SuaraLens Anda"
      footer={
        <div className="space-y-2">
          <div>
            {t('auth.no_account')}{' '}
            <Link to="/signup-user" className="font-semibold text-[var(--color-primary)] hover:underline">{t('auth.as_user')}</Link>
            {' '}/{' '}
            <Link to="/signup-stakeholder" className="font-semibold text-[var(--color-primary)] hover:underline">{t('auth.as_stakeholder')}</Link>
          </div>
          <div className="pt-2 border-t border-[var(--color-border)] text-center">
            <Link to="/admin/signin" className="text-xs font-mono font-semibold text-[var(--color-primary)] hover:underline">
              Portal Khusus Administrator Sentral →
            </Link>
          </div>
        </div>
      }
    >
      {error && (
        <div role="alert" aria-live="assertive" className="mb-4 flex items-center gap-2 border border-[var(--color-status-danger)] bg-[var(--color-status-danger)]/10 p-3 text-sm text-[var(--color-status-danger)] rounded-xl">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="signin-email" className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">{t('auth.email')}</label>
          <input
            id="signin-email"
            name="email"
            type="email"
            required
            value={form.email}
            onChange={handleChange}
            placeholder="nama@pens.ac.id"
            className="input-field rounded-xl"
          />
        </div>

        <div>
          <label htmlFor="signin-password" className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">{t('auth.password')}</label>
          <div className="relative">
            <input
              id="signin-password"
              name="password"
              type={showPw ? 'text' : 'password'}
              required
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
              className="input-field pr-12 rounded-xl"
            />
            <button
              type="button"
              onClick={() => setShowPw(s => !s)}
              className="absolute right-1 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
              aria-label={showPw ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
            >
              {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <a href="#" className="mt-1.5 block text-right text-xs font-medium text-[var(--color-primary)] hover:underline">{t('auth.forgot_password')}</a>
        </div>

        <button type="submit" disabled={loading} className="btn-solid w-full !py-3 rounded-xl min-h-[44px] flex items-center justify-center gap-2">
          {loading ? (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            <><LogIn size={17} /> {t('auth.signin')}</>
          )}
        </button>
      </form>

      <div className="mt-5 space-y-1 border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4 text-xs text-[var(--color-text-muted)] rounded-xl shadow-xs">
        <p className="font-semibold text-[var(--color-text)]">Demo credentials:</p>
        <p>User: <span className="font-mono font-medium text-[var(--color-primary)]">user@test.com</span></p>
        <p>Stakeholder: <span className="font-mono font-medium text-[var(--color-primary)]">sari@pens.ac.id</span></p>
        <p className="text-[11px]">(password: bebas)</p>
      </div>
    </AuthShell>
  )
}