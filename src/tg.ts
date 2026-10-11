/**
 * Telegram Mini App: вақте барнома аз тугмаи бот кушода мешавад, Telegram ба hash «tgWebAppData» илова мекунад.
 * Дар ин ҳолат скрипти расмии Telegram бор карда мешавад (дар браузери оддӣ ҳеҷ чиз бор намешавад).
 */
interface TgWebApp {
  ready(): void;
  expand(): void;
  disableVerticalSwipes?(): void;
  openTelegramLink(url: string): void;
  initData: string;
}
declare global {
  interface Window { Telegram?: { WebApp?: TgWebApp } }
}

export const inTelegram = (): boolean => {
  try { return location.hash.includes('tgWebAppData') || sessionStorage.getItem('darakhti:in-tg') === '1'; } catch { return false; }
};

export function initTelegram() {
  if (!inTelegram()) return;
  try { sessionStorage.setItem('darakhti:in-tg', '1'); } catch { /* ignore */ }
  const s = document.createElement('script');
  s.src = 'https://telegram.org/js/telegram-web-app.js';
  s.async = true;
  s.onload = () => {
    const w = window.Telegram?.WebApp;
    w?.ready();
    w?.expand();
    w?.disableVerticalSwipes?.();
    // Воридшавии худкор бо Telegram (агар ворид нашуда бошад)
    if (w?.initData) void import('./sync').then(m => m.telegramAutoLogin(w.initData)).catch(() => {});
  };
  document.head.appendChild(s);
}

/** Пайванди t.me-ро дар дохили Telegram мекушояд (дар Mini App бе баромадан аз барнома), дар ҷои дигар — тавассути navigation. */
export function openTelegramLink(url: string) {
  const w = window.Telegram?.WebApp;
  if (w) w.openTelegramLink(url);
  else window.location.href = url;
}
