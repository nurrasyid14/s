import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { UserPlus, AlertCircle, Info } from 'lucide-react'
import { signUpStakeholder } from '../../services/authApi.js'
import { useAuth } from '../../context/AuthContext.jsx'
import AuthShell from '../../components/layout/AuthShell.jsx'

const label = 'mb-1 block text-xs font-semibold text-[var(--color-text)]'

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

  return (
    <AuthShell
      accent
      title={t('auth.as_stakeholder')}
      subtitle="Akun stakeholder untuk memantau & menindaklanjuti aduan"
      footer={
        <>
          {t('auth.already_have_account')}{' '}
          <Link to="/signin" className="font-semibold text-[var(--color-primary)] hover:underline">{t('auth.signin')}</Link>
        </>
      }
    >
      <div className="mb-5 flex items-start gap-2 border border-[var(--color-primary)] bg-[var(--color-primary-soft)] p-3.5 text-xs leading-relaxed text-[var(--color-text)]">
        <Info size={15} className="mt-0.5 flex-shrink-0 text-[var(--color-primary)]" />
        <span>Verifikasi email domain institusi akan diaktifkan di versi berikutnya. Saat ini pendaftaran mandiri terbuka untuk peninjauan.</span>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 border border-[var(--color-status-danger)] p-3 text-sm text-[var(--color-status-danger)]">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label className={label}>{t('auth.name')}</label>
          <input name="name" required placeholder="Dr. Nama Lengkap" value={form.name} onChange={handleChange} className="input-field" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>{t('auth.email')}</label>
            <input name="email" type="email" required placeholder="nama@pens.ac.id" value={form.email} onChange={handleChange} className="input-field" />
          </div>
          <div>
            <label className={label}>{t('auth.institution')}</label>
            <input name="institution" required placeholder="PENS" value={form.institution} onChange={handleChange} className="input-field" />
          </div>
        </div>
        <div>
          <label className={label}>{t('auth.position')}</label>
          <input name="position" required placeholder="Kepala Bagian / Departemen..." value={form.position} onChange={handleChange} className="input-field" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>{t('auth.password')}</label>
            <input name="password" type="password" required placeholder="••••••••" value={form.password} onChange={handleChange} className="input-field" />
          </div>
          <div>
            <label className={label}>{t('auth.confirm_password')}</label>
            <input name="confirm_password" type="password" required placeholder="••••••••" value={form.confirm_password} onChange={handleChange} className="input-field" />
          </div>
        </div>
        <label className="flex cursor-pointer items-start gap-2.5 pt-1">
          <input name="agree" type="checkbox" checked={form.agree} onChange={handleChange} className="mt-0.5 accent-[var(--color-primary)]" />
          <span className="text-xs leading-relaxed text-[var(--color-text-muted)]">{t('auth.privacy_agree')}</span>
        </label>
        <button type="submit" disabled={loading} className="btn-solid w-full !py-3">
          {loading ? (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            <><UserPlus size={17} /> {t('auth.register')}</>
          )}
        </button>
      </form>
    </AuthShell>
  )
}