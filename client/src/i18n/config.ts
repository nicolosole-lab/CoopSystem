import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslations from './locales/en.json';
import itTranslations from './locales/it.json';

// Get the saved language from localStorage (same key as our existing system)
const savedLanguage = localStorage.getItem('app-language') || 'en';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: enTranslations
      },
      it: {
        translation: itTranslations
      }
    },
    lng: savedLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // React already escapes values
    },
    detection: {
      order: ['localStorage'],
      lookupLocalStorage: 'app-language', // Use our existing key
      caches: ['localStorage']
    }
  });

export default i18n;