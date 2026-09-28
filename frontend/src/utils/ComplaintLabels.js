import { useTranslation } from 'react-i18next'

// Nilai default (Bahasa Indonesia) dipakai jika key terjemahan belum ditambahkan ke file locale.
const TYPE_LABELS = { complaint: 'Aduan', feedback: 'Masukan', suggestion: 'Saran' }
const CATEGORY_LABELS = {
    facility: 'Fasilitas',
    academic: 'Akademik',
    admin: 'Administrasi',
    finance: 'Keuangan',
    other: 'Lainnya',
}
const SENTIMENT_LABELS = { negative: 'Negatif', neutral: 'Netral', positive: 'Positif' }

export const COMPLAINT_TYPES = Object.keys(TYPE_LABELS)

/** Mengembalikan fungsi pelabelan yang mengikuti bahasa aktif. */
export function useComplaintLabels() {
    const { t } = useTranslation()

    const label = (group, defaults) => value =>
        value ? t(`stk.${group}.${value}`, defaults[value] ?? value) : '—'

    return {
        typeLabel: label('type', TYPE_LABELS),
        categoryLabel: label('category', CATEGORY_LABELS),
        sentimentLabel: label('sentiment', SENTIMENT_LABELS),
    }
}