import { create } from 'zustand';

export type Lang = 'en' | 'ar';

interface LanguageStore {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

function applyLangToDOM(lang: Lang) {
  document.documentElement.dir  = lang === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = lang;
  localStorage.setItem('aios-lang', lang);
}

// Apply saved language immediately on load (before first render) to avoid flash
applyLangToDOM((localStorage.getItem('aios-lang') as Lang) ?? 'en');

export const useLanguageStore = create<LanguageStore>((set) => ({
  lang: (localStorage.getItem('aios-lang') as Lang) ?? 'en',
  setLang: (lang) => {
    applyLangToDOM(lang);
    set({ lang });
  },
}));
