import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
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

import { UNITS } from '../../data/units.js'

const TOTAL_STEPS = 5
const MAX_ATTACHMENT_SIZE_BYTES = 5 * 1024 * 1024

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
    if (!canNext()) {
      setError(step === 3 ? `Minimal 50 karakter (sekarang: ${form.description.length})` : 'Pilih salah satu dulu.')
      return
    }
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
          <div className="w-16 h-16 border border-[var(--color-status-success)]/40 flex items-center justify-center mx-auto mb-6" style={{ background: 'color-mix(in srgb, var(--color-status-success) 12%, transparent)' }}>
            <CheckCircle size={32} className="text-[var(--color-status-success)]" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-[var(--color-text)] mb-2">{t('form.success_title')}</h2>
          <p className="text-[var(--color-text-muted)] text-sm mb-4">{t('form.success_desc')}</p>
          <div className="text-2xl font-mono font-bold text-[var(--color-primary)] border border-[var(--color-border)] bg-[var(--color-surface)] py-3 px-6 mb-8 inline-block">
            {submitted.ticket_id}
          </div>
          <div className="flex gap-3 justify-center">
            <button onClick={() => navigate(`/user/complaints/${submitted.id}`)} className="btn-solid">
              {t('form.track_status')}
            </button>
            <button
              onClick={() => { setSubmitted(null); setStep(1); setForm({ type: '', category: '', description: '', unit: '', attachments: [] }) }}
              className="btn-outline"
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
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-[var(--color-text)]">{t('form.title')}</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1.5">Sampaikan keluhan, aspirasi, atau masukan Anda dengan aman dan terverifikasi.</p>
        </div>

        {/* Step Progress */}
        <div className="flex items-center mb-4" role="navigation" aria-label="Progres Pengajuan">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => {
            const n = i + 1
            const done = step > n
            const active = step === n
            return (
              <div key={n} className="flex items-center flex-1 last:flex-none">
                <div
                  aria-current={active ? 'step' : undefined}
                  aria-label={`Langkah ${n}: ${t(['form.step1_title', 'form.step2_title', 'form.step3_title', 'form.step4_title', 'form.step5_title'][i])}`}
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-xs flex-shrink-0
                  ${done ? 'bg-[var(--color-btn)] text-[var(--color-btn-text)]' : active ? 'bg-[var(--color-primary)] text-white ring-4 ring-[var(--color-primary)]/20' : 'border border-[var(--color-border)] text-[var(--color-text-muted)] bg-[var(--color-surface)]'}`}>
                  {done ? <Check size={15} aria-hidden="true" /> : n}
                </div>
                {n < TOTAL_STEPS && (
                  <div className={`flex-1 h-1 mx-2 rounded-full transition-colors ${done ? 'bg-[var(--color-btn)]' : 'bg-[var(--color-border)]'}`} />
                )}
              </div>
            )
          })}
        </div>
        <div className="flex justify-between text-xs text-[var(--color-text-muted)] mb-8 font-medium">
          {['form.step1_title', 'form.step2_title', 'form.step3_title', 'form.step4_title', 'form.step5_title'].map(k => (
            <span key={k} className="text-center" style={{ width: '20%' }}>{t(k)}</span>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div role="alert" aria-live="polite" className="flex items-center gap-2 mb-4 p-3.5 border border-[var(--color-status-danger)]/40 rounded-xl text-[var(--color-status-danger)] text-sm shadow-xs" style={{ background: 'color-mix(in srgb, var(--color-status-danger) 10%, transparent)' }}>
            <AlertCircle size={16} aria-hidden="true" /> {error}
          </div>
        )}

        {/* Card */}
        <div className="card-elevated rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 md:p-8 mb-6 shadow-sm">
          {/* Step 1: Jenis */}
          {step === 1 && (
            <div>
              <h3 className="font-semibold text-lg text-[var(--color-text)] mb-4">{t('form.step1_title')}</h3>
              <div className="grid gap-3">
                {TYPES.map(({ key, icon: Icon, titleKey, descKey }) => (
                  <button key={key} type="button" onClick={() => setField('type', key)}
                    className={`w-full text-left p-4.5 border rounded-xl transition-all flex items-start gap-3.5 shadow-2xs hover:shadow-xs min-h-[44px]
                      ${form.type === key ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/20' : 'border-[var(--color-border)] hover:border-[var(--color-text-muted)] hover:bg-[var(--color-bg-secondary)]'}`}>
                    <Icon size={20} className="flex-shrink-0 mt-0.5 text-[var(--color-primary)]" aria-hidden="true" />
                    <div>
                      <div className="font-semibold text-[var(--color-text)] text-sm">{t(titleKey)}</div>
                      <div className="text-xs text-[var(--color-text-muted)] mt-0.5">{t(descKey)}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Kategori */}
          {step === 2 && (
            <div>
              <h3 className="font-semibold text-lg text-[var(--color-text)] mb-4">{t('form.category')}</h3>
              <div className="grid grid-cols-2 gap-2.5 mb-6">
                {CATEGORIES.map(({ key, labelKey }) => (
                  <button key={key} type="button" onClick={() => setField('category', key)}
                    className={`py-3 px-4 border rounded-xl text-sm font-medium transition-all shadow-2xs min-h-[44px]
                      ${form.category === key ? 'border-[var(--color-btn)] bg-[var(--color-btn)] text-[var(--color-btn-text)] shadow-xs' : 'border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-text-muted)] hover:bg-[var(--color-bg-secondary)]'}`}>
                    {t(labelKey)}
                  </button>
                ))}
              </div>
              <div>
                <label htmlFor="complaint-unit" className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">{t('form.unit')}</label>
                <select
                  id="complaint-unit"
                  value={form.unit}
                  onChange={e => setField('unit', e.target.value)}
                  className="input-field rounded-lg"
                >
                  <option value="">-- Rekomendasi Sistem (Otomatis) atau Pilih Unit --</option>
                  {UNITS.map(u => <option key={u.id} value={u.name}>{u.name} ({u.code})</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Step 3: Deskripsi */}
          {step === 3 && (
            <div>
              <label htmlFor="complaint-desc" className="block font-semibold text-lg text-[var(--color-text)] mb-4">
                {t('form.description')}
              </label>
              <textarea
                id="complaint-desc"
                aria-describedby="desc-hint"
                value={form.description}
                onChange={e => setField('description', e.target.value)}
                placeholder={t('form.description_placeholder')}
                rows={7}
                className="input-field resize-none leading-relaxed rounded-xl"
              />
              <div className="flex justify-between mt-2 text-xs" id="desc-hint">
                <span className="text-[var(--color-text-muted)]">{t('form.description_hint')}</span>
                <span className={`font-mono font-medium ${form.description.length >= 50 ? 'text-[var(--color-status-success)]' : 'text-[var(--color-status-warning)]'}`}>
                  {form.description.length}/500
                </span>
              </div>
            </div>
          )}

          {/* Step 4: Lampiran */}
          {step === 4 && (
            <div>
              <h3 className="font-semibold text-lg text-[var(--color-text)] mb-2">{t('form.attachment')}</h3>
              <p className="text-sm text-[var(--color-text-muted)] mb-5">{t('form.attachment_desc')}</p>
              
              <label
                htmlFor="file-upload"
                className="border-2 border-dashed border-[var(--color-border)] rounded-2xl p-10 text-center hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)]/20 transition-all cursor-pointer bg-[var(--color-bg-secondary)] block focus-within:ring-2 focus-within:ring-[var(--color-primary)]"
              >
                <input
                  id="file-upload"
                  type="file"
                  accept="image/png,image/jpeg,application/pdf"
                  className="sr-only"
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (!file) return

                    if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
                      setError('Ukuran file maksimal 5 MB.')
                      e.target.value = ''
                      return
                    }

                    setForm(f => ({ ...f, attachments: [file.name] }))
                    setError('')
                  }}
                />
                <Paperclip size={24} className="text-[var(--color-text-muted)] mx-auto mb-2" aria-hidden="true" />
                <p className="text-sm font-medium text-[var(--color-text)]">
                  {form.attachments.length > 0 ? `File Terpilih: ${form.attachments[0]}` : 'Klik atau tarik file ke sini'}
                </p>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">JPG, PNG, PDF (maksimal 5MB)</p>
              </label>

              <div className="mt-5 flex items-start gap-3.5 p-4.5 border border-[var(--color-primary)]/30 rounded-xl bg-[var(--color-primary-soft)]">
                <ShieldCheck size={20} className="text-[var(--color-primary)] flex-shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <div className="text-sm font-bold text-[var(--color-text)] flex items-center gap-2">
                    <span>Nilai Inti SuaraLens: Anonimitas Mutlak (Wajib)</span>
                    <span className="px-2.5 py-0.5 text-[10px] font-mono uppercase bg-[var(--color-primary)] text-white font-semibold rounded-full shadow-2xs">100% Terenkripsi</span>
                  </div>
                  <div className="text-xs text-[var(--color-text-muted)] mt-1 leading-relaxed">
                    SuaraLens dibangun di atas prinsip anonimitas mutlak. Identitas pribadi Anda tidak pernah disimpan atau diberikan kepada Admin Verifikator, Unit Kerja, maupun pihak mana pun. Aduan Anda ditindaklanjuti secara objektif dan transparan melalui Nomor Tiket Unik Anda.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Konfirmasi */}
          {step === 5 && (
            <div className="space-y-5">
              <h3 className="font-semibold text-lg text-[var(--color-text)] mb-4">{t('form.step5_title')}</h3>
              <div className="grid grid-cols-3 gap-3 text-sm">
                {[
                  { label: 'Jenis', value: form.type },
                  { label: 'Kategori', value: form.category },
                  { label: 'Unit', value: form.unit || '-' },
                ].map(({ label, value }) => (
                  <div key={label} className="p-3.5 border border-[var(--color-border)] bg-[var(--color-bg-secondary)] rounded-xl">
                    <div className="text-xs uppercase tracking-wider text-[var(--color-text-muted)]">{label}</div>
                    <div className="font-semibold text-[var(--color-text)] capitalize mt-1">{value}</div>
                  </div>
                ))}
              </div>
              <div className="p-4 border border-[var(--color-border)] text-sm rounded-xl bg-[var(--color-surface)]">
                <div className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] mb-1">Deskripsi Aduan</div>
                <p className="text-[var(--color-text)] leading-relaxed whitespace-pre-line">{form.description}</p>
              </div>
              {/* NLP Preview */}
              <div className="p-4.5 border border-[var(--color-primary)]/30 bg-[var(--color-primary-soft)] rounded-xl">
                <div className="flex items-center gap-1.5 text-sm font-semibold text-[var(--color-primary)] mb-3">
                  <Bot size={16} /> {t('form.preview_title')}
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="p-3 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-lg">
                    <div className="text-[var(--color-text-muted)] mb-1">Kategori</div>
                    <div className="font-bold text-[var(--color-text)] capitalize">{form.category || '-'}</div>
                  </div>
                  <div className="p-3 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-lg">
                    <div className="text-[var(--color-text-muted)] mb-1">Urgensi</div>
                    <div className="font-bold text-[var(--color-status-warning)]">Sedang</div>
                  </div>
                  <div className="p-3 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-lg">
                    <div className="text-[var(--color-text-muted)] mb-1">Sentimen</div>
                    <div className="font-bold text-[var(--color-status-danger)]">Negatif</div>
                  </div>
                </div>
                <div className="flex items-start gap-1.5 text-xs text-[var(--color-text-muted)] mt-3">
                  <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
                  {t('form.preview_note')}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          {step > 1 && (
            <button onClick={prevStep} className="btn-outline">
              {t('form.back')}
            </button>
          )}
          {step < TOTAL_STEPS ? (
            <button onClick={nextStep} className="btn-solid flex-1 !py-3">
              {t('form.next')}
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={loading} className="btn-primary flex-1 !py-3">
              {loading ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Memproses &amp; Menganalisis AI...</span>
                </>
              ) : t('form.submit')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}