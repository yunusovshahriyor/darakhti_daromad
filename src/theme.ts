export type ThemeMode = 'auto' | 'light' | 'dark';
export type Accent = 'green' | 'blue' | 'purple' | 'orange' | 'pink';

export const THEME_KEY = 'darakhti:theme';
export const ACCENT_KEY = 'darakhti:accent';

/** Рангҳои асосӣ: [равшан, равшани дуюм, торик, торики дуюм]. «Сабз» — пешфарз (аз style.css). */
export const ACCENTS: Record<Accent, { name: string; c: [string, string, string, string] | null }> = {
  green: { name: 'Сабз', c: null },
  blue: { name: 'Кабуд', c: ['#2563eb', '#3b82f6', '#60a5fa', '#3b82f6'] },
  purple: { name: 'Бунафш', c: ['#7c3aed', '#8b5cf6', '#a78bfa', '#8b5cf6'] },
  orange: { name: 'Норинҷӣ', c: ['#ea580c', '#f97316', '#fb923c', '#f97316'] },
  pink: { name: 'Гулобӣ', c: ['#db2777', '#ec4899', '#f472b6', '#ec4899'] },
};

const read = (k: string): string | null => { try { return localStorage.getItem(k); } catch { return null; } };

export const getTheme = (): ThemeMode => {
  const v = read(THEME_KEY);
  return v === 'light' || v === 'dark' ? v : 'auto';
};
export const getAccent = (): Accent => {
  const v = read(ACCENT_KEY) as Accent | null;
  return v && v in ACCENTS ? v : 'green';
};

const isDark = (m: ThemeMode) => (m === 'auto' ? window.matchMedia('(prefers-color-scheme: dark)').matches : m === 'dark');

/** Мавзӯ ва ранги асосиро ба саҳифа татбиқ мекунад. */
export function applyTheme(mode: ThemeMode = getTheme(), accent: Accent = getAccent()) {
  const root = document.documentElement;
  if (mode === 'auto') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', mode);
  const dark = isDark(mode);
  const c = ACCENTS[accent].c;
  for (const v of ['--primary', '--primary-2', '--success']) root.style.removeProperty(v);
  if (c) {
    root.style.setProperty('--primary', dark ? c[2] : c[0]);
    root.style.setProperty('--primary-2', dark ? c[3] : c[1]);
    root.style.setProperty('--success', dark ? c[2] : c[0]);
  }
  // Ранги сатри ҳолат/браузер
  const bar = dark ? '#13201a' : '#fbfdfb';
  document.querySelectorAll('meta[name="theme-color"]').forEach(m => m.setAttribute('content', bar));
}

export function setTheme(mode: ThemeMode, accent: Accent) {
  try { localStorage.setItem(THEME_KEY, mode); localStorage.setItem(ACCENT_KEY, accent); } catch { /* ignore */ }
  applyTheme(mode, accent);
}

/** Дар оғози барнома: татбиқ + пайгирии тағйири мавзӯи система. */
export function initTheme() {
  applyTheme();
  try { window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => applyTheme()); } catch { /* ignore */ }
}
