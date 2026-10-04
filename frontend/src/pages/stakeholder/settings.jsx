import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import StakeholderLayout from '../../components/layout/StakeholderLayout.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import ToggleSwitch from '../../components/ui/ToggleSwitch.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { useTheme } from '../../context/ThemeContext.jsx'
import { User, Bell, Palette, Globe, Save, Check } from 'lucide-react'

const SAVED_MESSAGE_MS = 2000

const inputCls =
    'input-field w-full text-xs font-mono'

function SectionCard({ icon: Icon, title, children }) {
    return (
        <section className="border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
            <h3 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider font-mono text-[var(--color-text)]">
                <Icon size={15} className="text-[var(--color-primary)]" aria-hidden="true" /> {title}
            </h3>
            {children}
        </section>
    )
}

function SettingRow({ label, icon: Icon, children }) {
    return (
        <div className="flex items-center justify-between gap-4 py-2.5">
            <span className="flex items-center gap-2 text-xs font-medium text-[var(--color-text)]">
                {Icon && <Icon size={14} aria-hidden="true" />} {label}
            </span>
            {children}
        </div>
    )
}

export default function Settings() {
    const { t, i18n } = useTranslation()
    const { user } = useAuth()
    const { dark, toggle } = useTheme()
    const [form, setForm] = useState({ name: user?.name || '', position: user?.position || '', email: user?.email || '' })
    const [notifPrefs, setNotifPrefs] = useState({ email_urgent: true, email_daily: false })
    const [saved, setSaved] = useState(false)

    useEffect(() => {
        if (!saved) return undefined
        const timer = setTimeout(() => setSaved(false), SAVED_MESSAGE_MS)
        return () => clearTimeout(timer)
    }, [saved])

    // TODO: profil dan preferensi notifikasi masih disimpan di state lokal.
    // Hubungkan ke service update profil/preferensi ketika tersedia.
    function handleSave(e) {
        e.preventDefault()
        setSaved(true)
    }

    const currentLang = i18n.language?.startsWith('en') ? 'en' : 'id'

    const notifOptions = [
        { key: 'email_urgent', label: t('stk.settings.notif_urgent', 'Email untuk aduan urgency tinggi') },
        { key: 'email_daily', label: t('stk.settings.notif_daily', 'Ringkasan email harian') },
    ]

    return (
        <StakeholderLayout title={t('nav.settings')} narrow>
            <PageHeader
                heading={t('stk.settings.heading', 'Pengaturan akun')}
                description={t('stk.settings.description', 'Atur profil, notifikasi, tampilan, dan bahasa.')}
            />

            {/* Ringkasan akun */}
            <div className="flex items-center gap-4 border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                <div
                    className="flex h-12 w-12 flex-shrink-0 items-center justify-center border border-[var(--color-border)] bg-[var(--color-primary)] text-lg font-bold font-mono text-white"
                    aria-hidden="true"
                >
                    {(form.name || user?.email || '?').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                    <div className="truncate font-semibold text-sm text-[var(--color-text)]">{form.name || '—'}</div>
                    <div className="truncate text-xs text-[var(--color-text-muted)] mt-0.5">
                        {[form.position, t('stk.settings.role', 'Stakeholder')].filter(Boolean).join(' · ')}
                    </div>
                    <div className="truncate text-xs font-mono text-[var(--color-text-muted)] mt-0.5">{form.email}</div>
                </div>
            </div>

            {/* Profil */}
            <form onSubmit={handleSave} className="border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
                <h3 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider font-mono text-[var(--color-text)]">
                    <User size={15} className="text-[var(--color-primary)]" aria-hidden="true" /> {t('nav.profile')}
                </h3>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="settings-name" className="mb-1.5 block text-xs font-mono uppercase text-[var(--color-text-muted)]">{t('auth.name')}</label>
                        <input id="settings-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} />
                    </div>
                    <div>
                        <label htmlFor="settings-position" className="mb-1.5 block text-xs font-mono uppercase text-[var(--color-text-muted)]">{t('auth.position')}</label>
                        <input id="settings-position" value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))} className={inputCls} />
                    </div>
                    <div>
                        <label htmlFor="settings-email" className="mb-1.5 block text-xs font-mono uppercase text-[var(--color-text-muted)]">{t('auth.email')}</label>
                        <input id="settings-email" value={form.email} disabled className={`${inputCls} cursor-not-allowed opacity-60`} />
                    </div>
                </div>
                <div className="mt-5 flex items-center gap-3 pt-4 border-t border-[var(--color-border)]">
                    <button
                        type="submit"
                        className="btn-solid inline-flex items-center gap-2 text-xs py-2 px-4 font-medium"
                    >
                        <Save size={14} aria-hidden="true" /> {t('common.save')}
                    </button>
                    {saved && (
                        <span role="status" className="inline-flex items-center gap-1.5 text-xs font-mono text-[var(--color-status-success)]">
                            <Check size={13} aria-hidden="true" /> {t('stk.settings.saved', 'Perubahan disimpan')}
                        </span>
                    )}
                </div>
            </form>

            {/* Notifikasi */}
            <SectionCard icon={Bell} title={t('stk.settings.notifications', 'Notifikasi')}>
                <div className="space-y-1 divide-y divide-[var(--color-border)]">
                    {notifOptions.map(({ key, label }) => (
                        <SettingRow key={key} label={label}>
                            <ToggleSwitch
                                label={label}
                                checked={notifPrefs[key]}
                                onChange={value => setNotifPrefs(p => ({ ...p, [key]: value }))}
                            />
                        </SettingRow>
                    ))}
                </div>
            </SectionCard>

            {/* Tampilan & bahasa */}
            <SectionCard icon={Palette} title={t('stk.settings.appearance', 'Tampilan & bahasa')}>
                <div className="divide-y divide-[var(--color-border)]">
                    <SettingRow label={t('stk.settings.dark_mode', 'Mode gelap')}>
                        <ToggleSwitch label={t('stk.settings.dark_mode', 'Mode gelap')} checked={dark} onChange={() => toggle()} />
                    </SettingRow>
                    <SettingRow label={t('stk.settings.language', 'Bahasa')} icon={Globe}>
                        <select
                            aria-label={t('stk.settings.language', 'Bahasa')}
                            value={currentLang}
                            onChange={e => {
                                i18n.changeLanguage(e.target.value)
                                localStorage.setItem('suaralens_lang', e.target.value)
                            }}
                            className="border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-mono text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
                        >
                            <option value="id">Bahasa Indonesia</option>
                            <option value="en">English</option>
                        </select>
                    </SettingRow>
                </div>
            </SectionCard>
        </StakeholderLayout>
    )
}