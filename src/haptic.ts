/** Ларзиши нарм (Android/Chrome). Дар Танзимот → Замина хомӯш кардан мумкин аст. */
const KEY = 'darakhti:haptic';

export const hapticOn = (): boolean => { try { return localStorage.getItem(KEY) !== '0'; } catch { return true; } };
export const setHapticOn = (on: boolean) => { try { localStorage.setItem(KEY, on ? '1' : '0'); } catch { /* ignore */ } };

const buzz = (p: number | number[]) => {
  if (!hapticOn()) return;
  try { navigator.vibrate?.(p); } catch { /* ignore */ }
};

export const tap = () => buzz(6);
export const nav = () => buzz(8);
export const success = () => buzz([12, 40, 18]);
export const warn = () => buzz([30, 40, 30]);
export const celebrate = () => buzz([40, 50, 40, 50, 90]);
export const refresh = () => buzz(10);
