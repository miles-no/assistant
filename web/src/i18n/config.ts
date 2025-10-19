import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import nbNO from './locales/nb-NO.json';
import nnNO from './locales/nn-NO.json';
import lt from './locales/lt.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      'nb-NO': { translation: nbNO },
      'nn-NO': { translation: nnNO },
      lt: { translation: lt },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'nb-NO', 'nn-NO', 'lt'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18n;
