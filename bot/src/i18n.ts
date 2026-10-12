/**
 * Забонҳои бот: тоҷикӣ (калидҳо), русӣ, англисӣ. Матнҳо дар код бо тоҷикӣ навишта шудаанд ва `t('матн {0}', қимат)` ва
 * ҷойгузорӣ мекунад. Луғати барнома (src/i18n/*.json) низ истифода мешавад (номҳои ҳисобҳо, категорияҳо, огоҳиномаҳо).
 */
import appRu from '../../src/i18n/ru.json';
import appEn from '../../src/i18n/en.json';
import botRu from './dict-ru.json';
import botEn from './dict-en.json';

export type Lang = 'tg' | 'ru' | 'en';
export type TFn = (key: string, ...args: (string | number)[]) => string;

const DICT: Record<Exclude<Lang, 'tg'>, Record<string, string>> = {
  ru: { ...(appRu as Record<string, string>), ...(botRu as Record<string, string>) },
  en: { ...(appEn as Record<string, string>), ...(botEn as Record<string, string>) },
};

export const isLang = (v: unknown): v is Lang => v === 'tg' || v === 'ru' || v === 'en';

/** Забони Telegram-и корбар: ru → русӣ, en → англисӣ, дигар → тоҷикӣ. */
export const langFromCode = (code?: string): Lang => {
  const c = (code ?? '').toLowerCase();
  return c.startsWith('ru') ? 'ru' : c.startsWith('en') ? 'en' : 'tg';
};

export function makeT(lang: Lang): TFn {
  const d = lang === 'tg' ? null : DICT[lang];
  return (key, ...args) => {
    const tpl = d?.[key] ?? key;
    return tpl.replace(/\{(\d+)\}/g, (_m, i: string) => String(args[Number(i)] ?? ''));
  };
}
