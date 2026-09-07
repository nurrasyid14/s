import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle, AlertCircle } from 'lucide-react'
import { submitComplaint } from '../../services/complaintApi.js'
import Navbar from '../../components/layout/Navbar.jsx'

const TYPES = [
  { key: 'complaint', emoji: '⚠️', titleKey: 'form.type_complaint', descKey: 'form.type_complaint_desc' },
  { key: 'feedback',  emoji: '💬', titleKey: 'form.type_feedback',  descKey: 'form.type_feedback_desc' },
  { key: 'suggestion',emoji: '💡', titleKey: 'form.type_suggestion',descKey: 'form.type_suggestion_desc'},
]

const CATEGORIES = [
  { key: 'facility', labelKey: 'form.category_facility' },
  { key: 'academic', labelKey: 'form.category_academic' },
  { key: 'admin',    labelKey: 'form.category_admin'    },
  { key: 'finance',  labelKey: 'form.category_finance'  },
  { key: 'other',    labelKey: 'form.category_other'    },
]

const UNITS = [
  'Bagian Akademik', 'Sarana & Prasarana', 'Kemahasiswaan',
  'Keuangan', 'IT Center', 'Perpustakaan', 'Lainnya',
]

const TOTAL_STEPS = 5

export default function ComplaintForm() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [step,       setStep]       = useState(1)
  const [loading,    setLoading]    = useState(false)
  const [submitted,  setSubmitted]  = useState(null)
  const [error,      setError]      = useState('')
  const [form, setForm] = useState({
    type: '', category: '', description: '', unit: '',
    attachments: [], is_anonymous: false,
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
        <div className="max-w-md mx-auto px-4 pt-24 text-center animate-fade-in-up">
          <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-[var(--color-text)] mb-2">{t('form.success_title')}</h2>
          <p className="text-[var(--color-text-muted)] mb-3">{t('form.success_desc')}</p>
          <div className="text-2xl font-mono font-bold gradient-text mb-8">{submitted.ticket_id}</div>
          <div className="flex gap-3 justify-center">
            <button onClick={() => navigate('/user/complaints')} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold text-sm transition-smooth">
              {t('form.track_status')}
            </button>
            <button onClick={() => { setSubmitted(null); setStep(1); setForm({ type:'',category:'',description:'',unit:'',attachments:[],is_anonymous:false }) }}
              className="px-6 py-2.5 border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] rounded-xl font-semibold text-sm transition-smooth"
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
        <div className="flex items-center mb-10">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => {
            const n = i + 1
            const done = step > n
            const active = step === n
            return (
              <div key={n} className="flex items-center flex-1 last:flex-none">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-smooth flex-shrink-0
                  ${done ? 'bg-teal-500 text-white' : active ? 'bg-blue-600 text-white ring-4 ring-blue-600/30' : 'bg-[var(--color-border)] text-[var(--color-text-muted)]'}`}>
                  {done ? '✓' : n}
                </div>
                <div className={`text-xs mt-6 absolute translate-x-0 whitespace-nowrap hidden sm:block`} style={{ marginTop: '2.2rem', position: 'relative', textAlign: 'center', width: 0, overflow: 'visible' }}>
                </div>
                {n < TOTAL_STEPS && (
                  <div className={`flex-1 h-0.5 mx-1 transition-smooth ${done ? 'bg-teal-500' : 'bg-[var(--color-border)]'}`} />
                )}
              </div>
            )
          })}
        </div>
        <div className="flex justify-between text-xs text-[var(--color-text-muted)] mb-8 -mt-6">
          {['form.step1_title','form.step2_title','form.step3_title','form.step4_title','form.step5_title'].map(k => (
            <span key={k} className="text-center" style={{ width: '20%' }}>{t(k)}</span>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 mb-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700/50 rounded-lg text-red-600 dark:text-red-300 text-sm">
            <AlertCircle size={15} /> {error}
          </div>
        )}

        {/* Card */}
        <div className="card-elevated p-6 mb-6">
          {/* Step 1 — Jenis */}
          {step === 1 && (
            <div className="animate-fade-in">
              <h3 className="font-semibold text-[var(--color-text)] mb-4">{t('form.step1_title')}</h3>
              <div className="grid gap-3">
                {TYPES.map(({ key, emoji, titleKey, descKey }) => (
                  <button key={key} onClick={() => setField('type', key)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-smooth flex items-start gap-3
                      ${form.type === key ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-[var(--color-border)] hover:border-[var(--color-text-muted)]'}`}>
                    <span className="text-2xl">{emoji}</span>
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
            <div className="animate-fade-in">
              <h3 className="font-semibold text-[var(--color-text)] mb-4">{t('form.category')}</h3>
              <div className="grid grid-cols-2 gap-2 mb-5">
                {CATEGORIES.map(({ key, labelKey }) => (
                  <button key={key} onClick={() => setField('category', key)}
                    className={`py-3 px-4 rounded-xl border-2 text-sm font-medium transition-smooth
                      ${form.category === key ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300' : 'border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-text-muted)]'}`}>
                    {t(labelKey)}
                  </button>
                ))}
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">{t('form.unit')}</label>
                <select value={form.unit} onChange={e => setField('unit', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                  <option value="">-- Pilih Unit --</option>
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Step 3 — Deskripsi */}
          {step === 3 && (
            <div className="animate-fade-in">
              <h3 className="font-semibold text-[var(--color-text)] mb-4">{t('form.description')}</h3>
              <textarea
                value={form.description}
                onChange={e => setField('description', e.target.value)}
                placeholder={t('form.description_placeholder')}
                rows={7}
                className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-sm text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
              />
              <div className="flex justify-between mt-1.5">
                <span className="text-xs text-[var(--color-text-muted)]">{t('form.description_hint')}</span>
                <span className={`text-xs font-medium ${form.description.length >= 50 ? 'text-emerald-500' : 'text-amber-500'}`}>
                  {form.description.length}/500
                </span>
              </div>
            </div>
          )}

          {/* Step 4 — Lampiran */}
          {step === 4 && (
            <div className="animate-fade-in">
              <h3 className="font-semibold text-[var(--color-text)] mb-2">{t('form.attachment')}</h3>
              <p className="text-sm text-[var(--color-text-muted)] mb-4">{t('form.attachment_desc')}</p>
              <div className="border-2 border-dashed border-[var(--color-border)] rounded-xl p-10 text-center hover:border-blue-500/50 transition-smooth cursor-pointer">
                <div className="text-3xl mb-2">📎</div>
                <p className="text-sm text-[var(--color-text-muted)]">Klik atau drag & drop file di sini</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">JPG, PNG, PDF — max 5MB</p>
              </div>
              {/* Anon toggle */}
              <div className="mt-5 flex items-start gap-3 p-4 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)]">
                <div className="relative inline-block mt-0.5">
                  <input id="anon" type="checkbox" checked={form.is_anonymous} onChange={e => setField('is_anonymous', e.target.checked)} className="sr-only" />
                  <label htmlFor="anon" onClick={() => setField('is_anonymous', !form.is_anonymous)}
                    className={`block w-11 h-6 rounded-full cursor-pointer transition-smooth ${form.is_anonymous ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`}>
                    <span className={`block w-4 h-4 bg-white rounded-full shadow transition-smooth mt-1 ${form.is_anonymous ? 'translate-x-6' : 'translate-x-1'}`} />
                  </label>
                </div>
                <div>
                  <div className="text-sm font-semibold text-[var(--color-text)]">{t('form.anon_toggle')}</div>
                  <div className="text-xs text-[var(--color-text-muted)] mt-0.5">{t('form.anon_desc')}</div>
                </div>
              </div>
            </div>
          )}

          {/* Step 5 — Konfirmasi */}
          {step === 5 && (
            <div className="animate-fade-in space-y-4">
              <h3 className="font-semibold text-[var(--color-text)] mb-4">{t('form.step5_title')}</h3>
              {/* Summary */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { label: 'Jenis', value: form.type },
                  { label: 'Kategori', value: form.category },
                  { label: 'Unit', value: form.unit || '-' },
                  { label: 'Anonim', value: form.is_anonymous ? 'Ya' : 'Tidak' },
                ].map(({ label, value }) => (
                  <div key={label} className="p-3 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)]">
                    <div className="text-xs text-[var(--color-text-muted)]">{label}</div>
                    <div className="font-semibold text-[var(--color-text)] capitalize mt-0.5">{value}</div>
                  </div>
                ))}
              </div>
              <div className="p-3 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-sm">
                <div className="text-xs text-[var(--color-text-muted)] mb-1">Deskripsi</div>
                <p className="text-[var(--color-text)]">{form.description}</p>
              </div>
              {/* NLP Preview */}
              <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-50 dark:bg-blue-500/5">
                <div className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-3">🤖 {t('form.preview_title')}</div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="p-3 rounded-lg bg-white dark:bg-slate-800/60 border border-[var(--color-border)] shadow-sm">
                    <div className="text-[var(--color-text-muted)] mb-1">Kategori</div>
                    <div className="font-bold text-[var(--color-text)] capitalize">{form.category || '-'}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-white dark:bg-slate-800/60 border border-[var(--color-border)] shadow-sm">
                    <div className="text-[var(--color-text-muted)] mb-1">Urgensi</div>
                    <div className="font-bold text-amber-600 dark:text-amber-400">Sedang</div>
                  </div>
                  <div className="p-3 rounded-lg bg-white dark:bg-slate-800/60 border border-[var(--color-border)] shadow-sm">
                    <div className="text-[var(--color-text-muted)] mb-1">Sentimen</div>
                    <div className="font-bold text-red-600 dark:text-red-400">Negatif</div>
                  </div>
                </div>
                <p className="text-xs text-[var(--color-text-muted)] mt-2">⚠️ {t('form.preview_note')}</p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          {step > 1 && (
            <button onClick={prevStep} className="px-6 py-3 border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] rounded-xl font-semibold text-sm transition-smooth">
              ← {t('form.back')}
            </button>
          )}
          {step < TOTAL_STEPS ? (
            <button onClick={nextStep} className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-sm transition-smooth">
              {t('form.next')} →
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={loading} className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-semibold rounded-xl text-sm transition-smooth flex items-center justify-center gap-2">
              {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : t('form.submit')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
