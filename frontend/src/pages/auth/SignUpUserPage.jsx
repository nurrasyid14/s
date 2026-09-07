import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { UserPlus, AlertCircle } from 'lucide-react'
import { signUpUser } from '../../services/authApi.js'
import { useAuth } from '../../context/AuthContext.jsx'

const ROLES = ['Mahasiswa', 'Dosen', 'Tenaga Administrasi', 'Mitra']
const ROLES_EN = ['Student', 'Lecturer', 'Administrative Staff', 'Partner']

export default function SignUpUserPage() {
  const { t, i18n } = useTranslation()
  const { login } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    name: '', email: '', nim_nip: '', phone: '',
    user_role: '', password: '', confirm_password: '', agree: false,
  })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

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

  const inputCls = "w-full px-4 py-3 bg-slate-800/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-smooth"

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center px-4 py-12">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md animate-fade-in-up">
        <Link to="/" className="flex items-center gap-2 justify-center mb-8">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center">
            <span className="text-white font-bold">SL</span>
          </div>
          <span className="text-white font-bold text-xl">SuaraLens</span>
        </Link>

        <div className="glass rounded-2xl p-8 border border-white/10">
          <h2 className="text-2xl font-bold text-white mb-1">{t('auth.as_user')}</h2>
          <p className="text-slate-400 text-sm mb-6">Buat akun untuk mengajukan aduan atau masukan</p>

          {error && (
            <div className="flex items-center gap-2 mb-4 p-3 bg-red-900/30 border border-red-700/50 rounded-lg text-red-300 text-sm">
              <AlertCircle size={15} /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">{t('auth.name')}</label>
              <input name="name" required placeholder="Nama Lengkap" value={form.name} onChange={handleChange} className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">{t('auth.email')}</label>
                <input name="email" type="email" required placeholder="email@pens.ac.id" value={form.email} onChange={handleChange} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">{t('auth.nim_nip')}</label>
                <input name="nim_nip" required placeholder="NIM / NIP" value={form.nim_nip} onChange={handleChange} className={inputCls} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">{t('auth.phone')}</label>
                <input name="phone" placeholder="08xx..." value={form.phone} onChange={handleChange} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">{t('auth.role')}</label>
                <select name="user_role" required value={form.user_role} onChange={handleChange} className={inputCls}>
                  <option value="">-- Pilih --</option>
                  {roles.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">{t('auth.password')}</label>
                <input name="password" type="password" required placeholder="••••••••" value={form.password} onChange={handleChange} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">{t('auth.confirm_password')}</label>
                <input name="confirm_password" type="password" required placeholder="••••••••" value={form.confirm_password} onChange={handleChange} className={inputCls} />
              </div>
            </div>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input name="agree" type="checkbox" checked={form.agree} onChange={handleChange} className="mt-0.5 accent-blue-500" />
              <span className="text-xs text-slate-400">{t('auth.privacy_agree')}</span>
            </label>

            <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-semibold rounded-xl transition-smooth">
              {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><UserPlus size={17} /> {t('auth.signup')}</>}
            </button>
          </form>

          <p className="text-center text-sm text-slate-400 mt-5">
            {t('auth.already_have_account')}{' '}
            <Link to="/signin" className="text-blue-400 hover:text-blue-300 font-medium">{t('auth.signin')}</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
