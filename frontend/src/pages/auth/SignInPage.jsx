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
  const [error, setError]   = useState('')

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

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center px-4">
      {/* Background blob */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md animate-fade-in-up">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 justify-center mb-8">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center">
            <span className="text-white font-bold">SL</span>
          </div>
          <span className="text-white font-bold text-xl">SuaraLens</span>
        </Link>

        <div className="glass rounded-2xl p-8 border border-white/10">
          <h2 className="text-2xl font-bold text-white mb-1">{t('auth.signin')}</h2>
          <p className="text-slate-400 text-sm mb-6">Masuk ke akun SuaraLens Anda</p>

          {error && (
            <div className="flex items-center gap-2 mb-4 p-3 bg-red-900/30 border border-red-700/50 rounded-lg text-red-300 text-sm">
              <AlertCircle size={15} /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">{t('auth.email')}</label>
              <input
                name="email"
                type="email"
                required
                value={form.email}
                onChange={handleChange}
                placeholder="nama@pens.ac.id"
                className="w-full px-4 py-3 bg-slate-800/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-smooth"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">{t('auth.password')}</label>
              <div className="relative">
                <input
                  name="password"
                  type={showPw ? 'text' : 'password'}
                  required
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-slate-800/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-smooth pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(s => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              <a href="#" className="text-xs text-blue-400 hover:text-blue-300 mt-1 block text-right">{t('auth.forgot_password')}</a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-semibold rounded-xl transition-smooth mt-2"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <><LogIn size={17} /> {t('auth.signin')}</>
              )}
            </button>
          </form>

          {/* Demo hint */}
          <div className="mt-4 p-3 bg-slate-800/50 rounded-lg text-xs text-slate-400 space-y-1">
            <p className="font-medium text-slate-300">Demo credentials:</p>
            <p>User: <span className="text-blue-300">user@test.com</span></p>
            <p>Stakeholder: <span className="text-teal-300">sari@pens.ac.id</span></p>
            <p className="text-slate-500">(password: apapun)</p>
          </div>

          <p className="text-center text-sm text-slate-400 mt-5">
            {t('auth.no_account')}{' '}
            <Link to="/signup-user" className="text-blue-400 hover:text-blue-300 font-medium">{t('auth.as_user')}</Link>
            {' '}/{' '}
            <Link to="/signup-stakeholder" className="text-teal-400 hover:text-teal-300 font-medium">{t('auth.as_stakeholder')}</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
