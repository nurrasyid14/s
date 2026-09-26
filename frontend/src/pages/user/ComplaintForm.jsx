import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle, AlertCircle, AlertTriangle, MessageCircle, Lightbulb, Check, Paperclip, Bot, ShieldCheck } from 'lucide-react'
import { submitComplaint } from '../../services/complaintApi.js'
import Navbar from '../../components/layout/Navbar.jsx'

const TYPES = [
  { key: 'complaint', icon: AlertTriangle, titleKey: 'form.type_complaint', descKey: 'form.type_complaint_desc' },
  { key: 'feedback', icon: MessageCircle, titleKey: 'form.type_feedback', descKey: 'form.type_feedback_desc' },
  { key: 'suggestion', icon: Lightbulb, titleKey: 'form.type_suggestion', descKey: 'form.type_suggestion_desc' },
]

const CATEGORIES = [
  { key: 'facility', labelKey: 'form.category_facility' },
  { key: 'academic', labelKey: 'form.category_academic' },
  { key: 'admin', labelKey: 'form.category_admin' },
  { key: 'finance', labelKey: 'form.category_finance' },
  { key: 'other', labelKey: 'form.category_other' },
]

const UNITS = [
  'Bagian Akademik', 'Sarana & Prasarana', 'Kemahasiswaan',
  'Keuangan', 'IT Center', 'Perpustakaan', 'Lainnya',
]

const TOTAL_STEPS = 5

export default function ComplaintForm() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(null)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    type: '', category: '', description: '', unit: '',
    attachments: [],
  })

  function setField(k, v) { setForm(f => ({ ...f, [k]: v })); setError('') }

  function canNext() {
    if (step === 1) return !!form.type
    if (step === 2) return !!form.category
    if (step === 3) return form.description.length >= 50
    return true
  }

  function nextStep() {
    if (!canNext()) { setError(step === 3 ? `Minimal 50 karakter (sekarang: ${form.description.length})` : 'Pilih salah satu dulu.'); return }
    setStep(s => Math.min(s + 1, TOTAL_STEPS))
    setError('')
  }
  function prevStep() { setStep(s => Math.max(s - 1, 1)); setError('') }

  async function handleSubmit() {
    setLoading(true)
    try {
      const result = await submitComplaint(form)
      setSubmitted(result)
    } catch {
      setError('Gagal mengirim aduan. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  // ---- Success screen ----
  if (submitted) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)]">
        <Navbar variant="user" />
        <div className="max-w-md mx-auto px-4 pt-24 text-center">
          <div className="w-16 h-16 rounded-full bg-[color-mix(in_srgb,var(--color-status-success)_12%,transparent)] flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={32} className="text-[var(--color-status-success)]" />
          </div>
          <h2 className="text-2xl font-bold text-[var(--color-text)] mb-2">{t('form.success_title')}</h2>
          <p className="text-[var(--color-text-muted)] mb-3">{t('form.success_desc')}</p>
          <div className="text-2xl font-mono font-bold text-[var(--color-primary)] mb-8">{submitted.ticket_id}</div>
          <div className="flex gap-3 justify-center">
            <button onClick={() => navigate('/user/complaints')} className="px-6 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white rounded-lg font-semibold text-sm transition-smooth">
              {t('form.track_status')}
            </button>
            <button onClick={() => { setSubmitted(null); setStep(1); setForm({ type: '', category: '', description: '', unit: '', attachments: [] }) }}
              className="px-6 py-2.5 border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] rounded-lg font-semibold text-sm transition-smooth"
            >
              Ajukan Lagi
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <Navbar variant="user" />
      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Header */}
        <h1 className="text-2xl font-bold text-[var(--color-text)] mb-6">{t('form.title')}</h1>

        {/* Step Progress */}
        <div className="flex items-center mb-3">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => {
            const n = i + 1
            const done = step > n
            const active = step === n
            return (
              <div key={n} className="flex items-center flex-1 last:flex-none">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-smooth flex-shrink-0
                  ${done ? 'bg-[var(--color-accent)] text-[var(--color-text)]' : active ? 'bg-[var(--color-primary)] text-white ring-4 ring-[var(--color-primary)]/20' : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] border border-[var(--color-border)]'}`}>
                  {done ? <Check size={14} /> : n}
                </div>
                {n < TOTAL_STEPS && (
                  <div className={`flex-1 h-0.5 mx-1 transition-smooth ${done ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-border)]'}`} />
                )}
              </div>
            )
          })}
        </div>
        <div className="flex justify-between text-xs text-[var(--color-text-muted)] mb-8">
          {['form.step1_title', 'form.step2_title', 'form.step3_title', 'form.step4_title', 'form.step5_title'].map(k => (
            <span key={k} className="text-center" style={{ width: '20%' }}>{t(k)}</span>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 mb-4 p-3 bg-[color-mix(in_srgb,var(--color-status-danger)_10%,transparent)] border border-[var(--color-status-danger)]/30 rounded-lg text-[var(--color-status-danger)] text-sm">
            <AlertCircle size={15} /> {error}
          </div>
        )}

        {/* Card */}
        <div className="card-elevated rounded-xl p-6 mb-6">
          {/* Step 1 — Jenis */}
          {step === 1 && (
            <div>
              <h3 className="font-semibold text-[var(--color-text)] mb-4">{t('form.step1_title')}</h3>
              <div className="grid gap-3">
                {TYPES.map(({ key, icon: Icon, titleKey, descKey }) => (
                  <button key={key} onClick={() => setField('type', key)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-smooth flex items-start gap-3
                      ${form.type === key ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)]' : 'border-[var(--color-border)] hover:border-[var(--color-text-muted)]'}`}>
                    <Icon size={20} className="text-[var(--color-primary)] flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-[var(--color-text)] text-sm">{t(titleKey)}</div>
                      <div className="text-xs text-[var(--color-text-muted)] mt-0.5">{t(descKey)}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2 — Kategori */}
          {step === 2 && (
            <div>
              <h3 className="font-semibold text-[var(--color-text)] mb-4">{t('form.category')}</h3>
              <div className="grid grid-cols-2 gap-2 mb-5">
                {CATEGORIES.map(({ key, labelKey }) => (
                  <button key={key} onClick={() => setField('category', key)}
                    className={`py-3 px-4 rounded-lg border-2 text-sm font-medium transition-smooth
                      ${form.category === key ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]' : 'border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-text-muted)]'}`}>
                    {t(labelKey)}
                  </button>
                ))}
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">{t('form.unit')}</label>
                <select value={form.unit} onChange={e => setField('unit', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40">
                  <option value="">-- Pilih Unit --</option>
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Step 3 — Deskripsi */}
          {step === 3 && (
            <div>
              <h3 className="font-semibold text-[var(--color-text)] mb-4">{t('form.description')}</h3>
              <textarea
                value={form.description}
                onChange={e => setField('description', e.target.value)}
                placeholder={t('form.description_placeholder')}
                rows={7}
                className="w-full px-4 py-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-sm text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40 resize-none"
              />
              <div className="flex justify-between mt-1.5">
                <span className="text-xs text-[var(--color-text-muted)]">{t('form.description_hint')}</span>
                <span className={`text-xs font-medium ${form.description.length >= 50 ? 'text-[var(--color-status-success)]' : 'text-[var(--color-status-warning)]'}`}>
                  {form.description.length}/500
                </span>
              </div>
            </div>
          )}

          {/* Step 4 — Lampiran */}
          {step === 4 && (
            <div>
              <h3 className="font-semibold text-[var(--color-text)] mb-2">{t('form.attachment')}</h3>
              <p className="text-sm text-[var(--color-text-muted)] mb-4">{t('form.attachment_desc')}</p>
              <div className="border-2 border-dashed border-[var(--color-border)] rounded-lg p-10 text-center hover:border-[var(--color-primary)]/50 transition-smooth cursor-pointer">
                <Paperclip size={24} className="text-[var(--color-text-muted)] mx-auto mb-2" />
                <p className="text-sm text-[var(--color-text-muted)]">Klik atau drag & drop file di sini</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">JPG, PNG, PDF — max 5MB</p>
              </div>
              {/* Automatic anonymization guarantee — no toggle, applies to every submission */}
              <div className="mt-5 flex items-start gap-3 p-4 rounded-lg border" style={{ borderColor: 'color-mix(in srgb, var(--color-status-success) 40%, transparent)', background: 'color-mix(in srgb, var(--color-status-success) 8%, transparent)' }}>
                <ShieldCheck size={18} className="text-[var(--color-status-success)] flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-semibold text-[var(--color-text)]">{t('form.anon_toggle')}</div>
                  <div className="text-xs text-[var(--color-text-muted)] mt-0.5">{t('form.anon_desc')}</div>
                </div>
              </div>
            </div>
          )}

          {/* Step 5 — Konfirmasi */}
          {step === 5 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-[var(--color-text)] mb-4">{t('form.step5_title')}</h3>
              {/* Summary */}
              <div className="grid grid-cols-3 gap-3 text-sm">
                {[
                  { label: 'Jenis', value: form.type },
                  { label: 'Kategori', value: form.category },
                  { label: 'Unit', value: form.unit || '-' },
                ].map(({ label, value }) => (
                  <div key={label} className="p-3 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)]">
                    <div className="text-xs text-[var(--color-text-muted)]">{label}</div>
                    <div className="font-semibold text-[var(--color-text)] capitalize mt-0.5">{value}</div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 text-xs text-[var(--color-status-success)]">
                <ShieldCheck size={13} /> {t('form.anon_toggle')}
              </div>
              <div className="p-3 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-sm">
                <div className="text-xs text-[var(--color-text-muted)] mb-1">Deskripsi</div>
                <p className="text-[var(--color-text)]">{form.description}</p>
              </div>
              {/* NLP Preview */}
              <div className="p-4 rounded-lg border border-[var(--color-primary)]/30 bg-[var(--color-primary-soft)]">
                <div className="flex items-center gap-1.5 text-sm font-semibold text-[var(--color-primary)] mb-3">
                  <Bot size={15} /> {t('form.preview_title')}
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
                    <div className="text-[var(--color-text-muted)] mb-1">Kategori</div>
                    <div className="font-bold text-[var(--color-text)] capitalize">{form.category || '-'}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
                    <div className="text-[var(--color-text-muted)] mb-1">Urgensi</div>
                    <div className="font-bold text-[var(--color-status-warning)]">Sedang</div>
                  </div>
                  <div className="p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
                    <div className="text-[var(--color-text-muted)] mb-1">Sentimen</div>
                    <div className="font-bold text-[var(--color-status-danger)]">Negatif</div>
                  </div>
                </div>
                <div className="flex items-start gap-1.5 text-xs text-[var(--color-text-muted)] mt-2">
                  <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
                  {t('form.preview_note')}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          {step > 1 && (
            <button onClick={prevStep} className="px-6 py-3 border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] rounded-lg font-semibold text-sm transition-smooth">
              {t('form.back')}
            </button>
          )}
          {step < TOTAL_STEPS ? (
            <button onClick={nextStep} className="flex-1 py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white font-semibold rounded-lg text-sm transition-smooth">
              {t('form.next')}
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={loading} className="flex-1 py-3 bg-[var(--color-status-success)] hover:opacity-90 disabled:opacity-60 text-white font-semibold rounded-lg text-sm transition-smooth flex items-center justify-center gap-2">
              {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : t('form.submit')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}