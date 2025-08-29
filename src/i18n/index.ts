import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import te from './locales/te.json';
import hi from './locales/hi.json';
import gu from './locales/gu.json';
import bn from './locales/bn.json';

const resources = {
  en: { translation: en },
  te: { translation: te },
  hi: { translation: hi },
  gu: { translation: gu },
  bn: { translation: bn },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: localStorage.getItem('lang') || 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;