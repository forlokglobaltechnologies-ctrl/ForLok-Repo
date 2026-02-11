import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enTranslations from '../locales/en.json';
import teTranslations from '../locales/te.json';
import hiTranslations from '../locales/hi.json';

i18n
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v3',
    resources: {
      en: {
        translation: enTranslations,
      },
      te: {
        translation: teTranslations,
      },
      hi: {
        translation: hiTranslations,
      },
    },
    lng: 'en', // default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;
