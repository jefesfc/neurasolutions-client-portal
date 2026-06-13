import { create } from 'zustand';
import i18n from '../i18n';

type Lang = 'en' | 'ar';

interface LanguageStore {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

function applyLang(lang: Lang) {
  document.documentElement.dir  = lang === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = lang;
  localStorage.setItem('aios-lang', lang);
  void i18n.changeLanguage(lang);
}

export const useLanguageStore = create<LanguageStore>((set) => ({
  lang: (localStorage.getItem('aios-lang') as Lang) ?? 'en',
  setLang: (lang) => {
    applyLang(lang);
    set({ lang });
  },
}));

// Apply on store load (covers page refresh)
applyLang((localStorage.getItem('aios-lang') as Lang) ?? 'en');
