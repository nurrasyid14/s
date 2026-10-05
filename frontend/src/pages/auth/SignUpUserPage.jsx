import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { UserPlus, AlertCircle } from 'lucide-react'
import { signUpUser } from '../../services/authApi.js'
import { useAuth } from '../../context/AuthContext.jsx'
import AuthShell from '../../components/layout/AuthShell.jsx'

const ROLES = ['Mahasiswa', 'Dosen', 'Tenaga Administrasi', 'Mitra']
const ROLES_EN = ['Student', 'Lecturer', 'Administrative Staff', 'Partner']

const label = 'mb-1 block text-xs font-semibold text-[var(--color-text)]'

export default function SignUpUserPage() {
  const { t, i18n } = useTranslation()
  const { login } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    name: '', email: '', nim_nip: '', phone: '',
    user_role: '', password: '', confirm_password: '', agree: false,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const roles = i18n.language === 'id' ? ROLES : ROLES_EN

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (form.password !== form.confirm_password) {
      setError('Kata sandi tidak cocok.')
      return
    }
    if (!form.agree) { setError('Harap setujui kebijakan privasi.'); return }
    setLoading(true)
    try {
      const { user } = await signUpUser({ ...form, role: 'user' })
      login(user)
      navigate('/user/dashboard')
    } catch {
      setError('Gagal mendaftar. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title={t('auth.as_user')}
      subtitle="Buat akun untuk menyampaikan aspirasi dan aduan"
      footer={
        <>
          {t('auth.already_have_account')}{' '}
          <Link to="/signin" className="font-semibold text-[var(--color-primary)] hover:underline">{t('auth.signin')}</Link>
        </>
      }
    >
      {error && (
        <div className="mb-4 flex items-center gap-2 border border-[var(--color-status-danger)] p-3 text-sm text-[var(--color-status-danger)]">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label className={label}>{t('auth.name')}</label>
          <input name="name" required placeholder="Nama Lengkap" value={form.name} onChange={handleChange} className="input-field" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>{t('auth.email')}</label>
            <input name="email" type="email" required placeholder="email@pens.ac.id" value={form.email} onChange={handleChange} className="input-field" />
          </div>
          <div>
            <label className={label}>{t('auth.nim_nip')}</label>
            <input name="nim_nip" required placeholder="NIM / NIP" value={form.nim_nip} onChange={handleChange} className="input-field" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>{t('auth.phone')}</label>
            <input name="phone" placeholder="08xx..." value={form.phone} onChange={handleChange} className="input-field" />
          </div>
          <div>
            <label className={label}>{t('auth.role')}</label>
            <select name="user_role" required value={form.user_role} onChange={handleChange} className="input-field">
              <option value="">-- Pilih --</option>
              {roles.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
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
            <><UserPlus size={17} /> {t('auth.signup')}</>
          )}
        </button>
      </form>
    </AuthShell>
  )
}