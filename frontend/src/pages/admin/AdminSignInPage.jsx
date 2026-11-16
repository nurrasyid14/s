import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Lock, LogIn, AlertCircle, ShieldAlert, ArrowLeft } from 'lucide-react'
import { signIn } from '../../services/authApi.js'
import { useAuth } from '../../context/AuthContext.jsx'
import useBilingual from '../../hooks/useBilingual.js'
import AuthShell from '../../components/layout/AuthShell.jsx'

export default function AdminSignInPage() {
  const { login } = useAuth()
  const { tx } = useBilingual()
  const navigate = useNavigate()

  const [form, setForm] = useState({ email: 'admin@pens.ac.id', password: '' })
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
      } else {
        navigate('/stakeholder')
      }
    } catch {
      setError(tx('Kredensial administrator tidak valid.', 'Invalid administrator credentials.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      variant="admin"
      title={tx('Portal Administrator Sentral', 'Central Administrator Portal')}
      subtitle={tx('Otentikasi khusus verifikasi masukan dan disposisi 14 unit kerja', 'Dedicated authentication for report verification and dispatch to 14 work units')}
      footer={
        <div className="flex items-center justify-between text-xs w-full">
          <Link to="/signin" className="inline-flex items-center gap-1 text-[var(--color-primary)] hover:underline">
            <ArrowLeft size={13} /> {tx('Kembali ke Login Utama', 'Back to Main Sign In')}
          </Link>
          <span className="text-[var(--color-text-muted)] font-mono">PENS Internal</span>
        </div>
      }
    >
      <div className="mb-4 flex items-start gap-2.5 border border-[var(--color-primary)] bg-[var(--color-primary-soft)] p-3 text-xs leading-relaxed text-[var(--color-text)] rounded-xl">
        <ShieldAlert size={16} className="text-[var(--color-primary)] flex-shrink-0 mt-0.5" />
        <span>{tx('Jalur khusus verifikator admin sentral. Akses dibatasi untuk tim pengelola disposisi institusi PENS.', 'Dedicated path for central admin verifiers. Access is restricted to the PENS dispatch management team.')}</span>
      </div>

      {error && (
        <div role="alert" aria-live="assertive" className="mb-4 flex items-center gap-2 border border-[var(--color-status-danger)] bg-[var(--color-status-danger)]/10 p-3 text-sm text-[var(--color-status-danger)] rounded-xl">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="admin-email" className="mb-1.5 block text-xs font-bold uppercase tracking-wider font-mono text-[var(--color-text)]">
            {tx('Email Administrator', 'Administrator Email')}
          </label>
          <input
            id="admin-email"
            name="email"
            type="email"
            required
            value={form.email}
            onChange={handleChange}
            placeholder="admin@pens.ac.id"
            className="input-field text-xs font-mono rounded-xl"
          />
        </div>

        <div>
          <label htmlFor="admin-password" className="mb-1.5 block text-xs font-bold uppercase tracking-wider font-mono text-[var(--color-text)]">
            {tx('Kata Sandi', 'Password')}
          </label>
          <input
            id="admin-password"
            name="password"
            type="password"
            required
            value={form.password}
            onChange={handleChange}
            placeholder="••••••••"
            className="input-field text-xs rounded-xl"
          />
        </div>

        <button type="submit" disabled={loading} className="btn-gold w-full !h-12 !text-base">
          {loading ? (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-on-gold)]/25 border-t-[var(--color-on-gold)]" />
          ) : (
            <><Lock size={15} /> {tx('Masuk ke Pusat Kendali Admin', 'Enter Admin Control Center')}</>
          )}
        </button>
      </form>
    </AuthShell>
  )
}
