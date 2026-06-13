import { useLanguageStore } from '../store/language-store';
import { translations } from './index';

function resolve(obj: Record<string, unknown>, key: string): string {
  const parts = key.split('.');
  let val: unknown = obj;
  for (const p of parts) {
    if (val == null || typeof val !== 'object') return key;
    val = (val as Record<string, unknown>)[p];
  }
  return typeof val === 'string' ? val : key;
}

export function useT() {
  const lang = useLanguageStore((s) => s.lang);
  const dict = translations[lang] as unknown as Record<string, unknown>;
  return (key: string) => resolve(dict, key);
}
