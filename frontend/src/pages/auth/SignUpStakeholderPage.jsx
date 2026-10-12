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
      <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-[var(--color-primary)]/30 bg-[var(--color-primary-soft)] p-3.5 text-xs leading-relaxed text-[var(--color-text)]">
        <Info size={16} className="mt-0.5 shrink-0 text-[var(--color-primary)]" />
        <span>Verifikasi email domain institusi akan diaktifkan di versi berikutnya. Saat ini pendaftaran mandiri terbuka untuk peninjauan.</span>
      </div>

      {error && (
        <div role="alert" className="mb-4 flex items-center gap-2.5 rounded-xl border border-[var(--color-status-danger)]/30 bg-[var(--color-status-danger)]/10 p-3.5 text-sm text-[var(--color-status-danger)]">
          <AlertCircle size={16} className="shrink-0" /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="stakeholder-name" className={label}>{t('auth.name')}</label>
          <input id="stakeholder-name" name="name" required placeholder="Dr. Nama Lengkap" value={form.name} onChange={handleChange} className="input-field rounded-xl" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label htmlFor="stakeholder-email" className={label}>{t('auth.email')}</label>
            <input id="stakeholder-email" name="email" type="email" required placeholder="nama@pens.ac.id" value={form.email} onChange={handleChange} className="input-field rounded-xl" />
          </div>
          <div>
            <label htmlFor="stakeholder-institution" className={label}>{t('auth.institution')}</label>
            <input id="stakeholder-institution" name="institution" required placeholder="PENS" value={form.institution} onChange={handleChange} className="input-field rounded-xl" />
          </div>
        </div>
        <div>
          <label htmlFor="stakeholder-position" className={label}>{t('auth.position')}</label>
          <input id="stakeholder-position" name="position" required placeholder="Kepala Bagian / Departemen..." value={form.position} onChange={handleChange} className="input-field rounded-xl" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label htmlFor="stakeholder-password" className={label}>{t('auth.password')}</label>
            <input id="stakeholder-password" name="password" type="password" required placeholder="••••••••" value={form.password} onChange={handleChange} className="input-field rounded-xl" />
          </div>
          <div>
            <label htmlFor="stakeholder-confirm-password" className={label}>{t('auth.confirm_password')}</label>
            <input id="stakeholder-confirm-password" name="confirm_password" type="password" required placeholder="••••••••" value={form.confirm_password} onChange={handleChange} className="input-field rounded-xl" />
          </div>
        </div>
        <label className="flex cursor-pointer items-start gap-2.5 pt-1">
          <input name="agree" type="checkbox" checked={form.agree} onChange={handleChange} className="mt-1 h-4 w-4 rounded accent-[var(--color-primary)]" />
          <span className="text-xs leading-relaxed text-[var(--color-text-muted)]">{t('auth.privacy_agree')}</span>
        </label>
        <button type="submit" disabled={loading} className="btn-solid w-full min-h-[44px] !py-3 rounded-xl shadow-xs hover:shadow-md transition-all">
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