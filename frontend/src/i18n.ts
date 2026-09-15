import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import uz from './locales/uz.json';
import en from './locales/en.json';

const STORAGE_KEY = 'language';

i18n.use(initReactI18next).init({
  resources: {
    uz: { translation: uz },
    en: { translation: en },
  },
  lng: localStorage.getItem(STORAGE_KEY) ?? 'uz',
  fallbackLng: 'uz',
  interpolation: { escapeValue: false },
});

export function setLanguage(lang: 'uz' | 'en') {
  localStorage.setItem(STORAGE_KEY, lang);
  i18n.changeLanguage(lang);
}

export default i18n;
