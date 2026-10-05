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
      navigate(user.role === 'stakeholder' ? '/stakeholder' : '/user/dashboard')
    } catch {
      setError('Email atau kata sandi salah.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title={t('auth.signin')}
      subtitle="Masuk ke akun SuaraLens Anda"
      footer={
        <>
          {t('auth.no_account')}{' '}
          <Link to="/signup-user" className="font-semibold text-[var(--color-primary)] hover:underline">{t('auth.as_user')}</Link>
          {' '}/{' '}
          <Link to="/signup-stakeholder" className="font-semibold text-[var(--color-primary)] hover:underline">{t('auth.as_stakeholder')}</Link>
        </>
      }
    >
      {error && (
        <div className="mb-4 flex items-center gap-2 border border-[var(--color-status-danger)] p-3 text-sm text-[var(--color-status-danger)]">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">{t('auth.email')}</label>
          <input name="email" type="email" required value={form.email} onChange={handleChange} placeholder="nama@pens.ac.id" className="input-field" />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">{t('auth.password')}</label>
          <div className="relative">
            <input
              name="password"
              type={showPw ? 'text' : 'password'}
              required
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
              className="input-field pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPw(s => !s)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              aria-label="Tampilkan kata sandi"
            >
              {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
          <a href="#" className="mt-1.5 block text-right text-xs font-medium text-[var(--color-primary)] hover:underline">{t('auth.forgot_password')}</a>
        </div>

        <button type="submit" disabled={loading} className="btn-solid w-full !py-3">
          {loading ? (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            <><LogIn size={17} /> {t('auth.signin')}</>
          )}
        </button>
      </form>

      <div className="mt-5 space-y-1 border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3.5 text-xs text-[var(--color-text-muted)]">
        <p className="font-semibold text-[var(--color-text)]">Demo credentials:</p>
        <p>User: <span className="font-mono font-medium text-[var(--color-primary)]">user@test.com</span></p>
        <p>Stakeholder: <span className="font-mono font-medium text-[var(--color-primary)]">sari@pens.ac.id</span></p>
        <p className="text-[11px]">(password: bebas)</p>
      </div>
    </AuthShell>
  )
}