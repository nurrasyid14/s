import { useTranslation } from 'react-i18next'

/**
 * Teks dua bahasa untuk dashboard.
 * Mengikuti bahasa aktif (toggle ID/EN di navbar); bahasa lain jatuh ke Indonesia.
 *
 *   const { tx, locale } = useBilingual()
 *   tx('Selamat datang', 'Welcome')          // teks
 *   toLocaleDateString(locale, {...})         // 'id-ID' | 'en-US'
 */
export default function useBilingual() {
  const { i18n } = useTranslation()
  const isId = !i18n.language || i18n.language.startsWith('id')
  const tx = (id, en) => (isId ? id : en)
  const locale = isId ? 'id-ID' : 'en-US'
  const lang = isId ? 'id' : 'en'
  return { tx, locale, lang, isId }
}
