import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Lock, LogIn, AlertCircle, ShieldAlert, ArrowLeft } from 'lucide-react'
import { signIn } from '../../services/authApi.js'
import { useAuth } from '../../context/AuthContext.jsx'
import AuthShell from '../../components/layout/AuthShell.jsx'

export default function AdminSignInPage() {
  const { login } = useAuth()
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
      setError('Kredensial administrator tidak valid.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="Portal Administrator Sentral"
      subtitle="Otentikasi khusus verifikasi masukan dan disposisi 14 unit kerja"
      footer={
        <div className="flex items-center justify-between text-xs w-full">
          <Link to="/signin" className="inline-flex items-center gap-1 text-[var(--color-primary)] hover:underline">
            <ArrowLeft size={13} /> Kembali ke Login Utama
          </Link>
          <span className="text-[var(--color-text-muted)] font-mono">PENS Internal</span>
        </div>
      }
    >
      <div className="mb-4 flex items-start gap-2.5 border border-[var(--color-primary)] bg-[var(--color-primary-soft)] p-3 text-xs leading-relaxed text-[var(--color-text)]">
        <ShieldAlert size={16} className="text-[var(--color-primary)] flex-shrink-0 mt-0.5" />
        <span>Jalur khusus verifikator admin sentral. Akses dibatasi untuk tim pengelola disposisi institusi PENS.</span>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 border border-[var(--color-status-danger)] p-3 text-sm text-[var(--color-status-danger)]">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider font-mono text-[var(--color-text)]">
            Email Administrator
          </label>
          <input
            name="email"
            type="email"
            required
            value={form.email}
            onChange={handleChange}
            placeholder="admin@pens.ac.id"
            className="input-field text-xs font-mono"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider font-mono text-[var(--color-text)]">
            Kata Sandi
          </label>
          <input
            name="password"
            type="password"
            required
            value={form.password}
            onChange={handleChange}
            placeholder="••••••••"
            className="input-field text-xs"
          />
        </div>

        <button type="submit" disabled={loading} className="btn-solid w-full !py-3 text-xs font-bold tracking-wider uppercase">
          {loading ? (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            <><Lock size={15} /> Masuk ke Pusat Kendali Admin</>
          )}
        </button>
      </form>

      <div className="mt-5 border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3 text-[11px] text-[var(--color-text-muted)] font-mono">
        <span className="font-bold text-[var(--color-text)] block mb-0.5">Demo Admin Credentials:</span>
        Email: <span className="text-[var(--color-primary)] font-bold">admin@pens.ac.id</span> | Sandi: bebas
      </div>
    </AuthShell>
  )
}
