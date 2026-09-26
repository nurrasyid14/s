import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Sidebar from '../../components/layout/Sidebar.jsx'
import Navbar from '../../components/layout/Navbar.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { useTheme } from '../../context/ThemeContext.jsx'
import { User, Bell, Palette, Globe, Save } from 'lucide-react'

export default function Settings() {
    const { t, i18n } = useTranslation()
    const { user } = useAuth()
    const { dark, toggle } = useTheme()
    const [form, setForm] = useState({ name: user?.name || '', position: user?.position || '', email: user?.email || '' })
    const [notifPrefs, setNotifPrefs] = useState({ email_urgent: true, email_daily: false })
    const [saved, setSaved] = useState(false)

    function handleSave(e) {
        e.preventDefault()
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
    }

    const inputCls = "w-full px-4 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40"

    return (
        <div className="flex h-screen overflow-hidden bg-[var(--color-bg)]">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Navbar variant="stakeholder" title={t('nav.settings')} />
                <main className="flex-1 overflow-y-auto p-6 max-w-2xl space-y-5">

                    {/* Profile */}
                    <form onSubmit={handleSave} className="card-elevated rounded-xl p-6">
                        <h3 className="font-semibold text-[var(--color-text)] mb-4 flex items-center gap-2">
                            <User size={16} className="text-[var(--color-primary)]" /> {t('nav.profile')}
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">{t('auth.name')}</label>
                                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">{t('auth.position')}</label>
                                <input value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))} className={inputCls} />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">{t('auth.email')}</label>
                                <input value={form.email} disabled className={`${inputCls} opacity-60 cursor-not-allowed`} />
                            </div>
                        </div>
                        <button type="submit" className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-sm font-semibold rounded-lg transition-smooth">
                            <Save size={15} /> {saved ? '✓ ' + t('common.save') : t('common.save')}
                        </button>
                    </form>

                    {/* Notifications */}
                    <div className="card-elevated rounded-xl p-6">
                        <h3 className="font-semibold text-[var(--color-text)] mb-4 flex items-center gap-2">
                            <Bell size={16} className="text-[var(--color-primary)]" /> Notifikasi
                        </h3>
                        <div className="space-y-3">
                            {[
                                { key: 'email_urgent', label: 'Email untuk aduan urgency tinggi' },
                                { key: 'email_daily', label: 'Ringkasan email harian' },
                            ].map(({ key, label }) => (
                                <div key={key} className="flex items-center justify-between">
                                    <span className="text-sm text-[var(--color-text)]">{label}</span>
                                    <button
                                        type="button"
                                        role="switch"
                                        aria-checked={notifPrefs[key]}
                                        onClick={() => setNotifPrefs(p => ({ ...p, [key]: !p[key] }))}
                                        className={`w-11 h-6 rounded-full transition-smooth ${notifPrefs[key] ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'}`}>
                                        <span className={`block w-4 h-4 bg-white rounded-full shadow transition-smooth mt-1 ${notifPrefs[key] ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Appearance */}
                    <div className="card-elevated rounded-xl p-6">
                        <h3 className="font-semibold text-[var(--color-text)] mb-4 flex items-center gap-2">
                            <Palette size={16} className="text-[var(--color-primary)]" /> Tampilan & Bahasa
                        </h3>
                        <div className="flex items-center justify-between py-2">
                            <span className="text-sm text-[var(--color-text)]">Mode Gelap</span>
                            <button onClick={toggle} role="switch" aria-checked={dark} className={`w-11 h-6 rounded-full transition-smooth ${dark ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'}`}>
                                <span className={`block w-4 h-4 bg-white rounded-full shadow transition-smooth mt-1 ${dark ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>
                        <div className="flex items-center justify-between py-2">
                            <span className="text-sm text-[var(--color-text)] flex items-center gap-2"><Globe size={14} /> Bahasa</span>
                            <select value={i18n.language} onChange={e => { i18n.changeLanguage(e.target.value); localStorage.setItem('suaralens_lang', e.target.value) }}
                                className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-sm text-[var(--color-text)]">
                                <option value="id">Bahasa Indonesia</option>
                                <option value="en">English</option>
                            </select>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    )
}