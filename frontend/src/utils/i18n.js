import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import id from '../locales/id.js'
import en from '../locales/en.js'

i18n
  .use(initReactI18next)
  .init({
    resources: { id, en },
    lng: localStorage.getItem('suaralens_lang') || 'id',
    fallbackLng: 'id',
    interpolation: { escapeValue: false },
  })

export default i18n
