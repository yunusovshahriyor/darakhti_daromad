/**
 * Забонҳо: тоҷикӣ (асосӣ), русӣ, англисӣ.
 * Матнҳои барнома бо тоҷикӣ навишта шудаанд; барои русӣ/англисӣ матнҳои DOM (ва атрибутҳои placeholder, aria-label, title, alt)
 * аз луғат (`src/i18n/*.json`) иваз мешаванд. Матнҳои шаблонӣ бо `{0}`, `{1}` (қиматҳои динамикӣ) шабакаи ибора мешаванд.
 * Иваз кардани забон саҳифаро аз нав мекушояд.
 */
import { BASE, activeCode, swapUnit } from './currency';
export type Lang = 'tg' | 'ru' | 'en';
export const LANGS: { id: Lang; name: string }[] = [
  { id: 'tg', name: 'Тоҷикӣ' },
  { id: 'ru', name: 'Русский' },
  { id: 'en', name: 'English' },
];

export const LANG_KEY = 'darakhti:lang';

const detect = (): Lang => {
  const n = (navigator.language || '').toLowerCase();
  return n.startsWith('ru') ? 'ru' : n.startsWith('en') ? 'en' : 'tg';
};

export function currentLang(): Lang {
  try {
    const v = localStorage.getItem(LANG_KEY);
    if (v === 'tg' || v === 'ru' || v === 'en') return v;
  } catch { /* ignore */ }
  return detect();
}

let active: Lang = 'tg';
export const activeLang = () => active;

export function setLang(l: Lang) {
  try { localStorage.setItem(LANG_KEY, l); } catch { /* ignore */ }
  location.reload();
}

// ---------- Луғат ----------
let exact = new Map<string, string>();
let patterns: { re: RegExp; to: string }[] = [];

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function build(dict: Record<string, string>) {
  exact = new Map();
  patterns = [];
  for (const [k, v] of Object.entries(dict)) {
    if (/\{\d+\}/.test(k)) {
      const parts = k.split(/(\{\d+\})/);
      const src = parts.map(p => (/^\{\d+\}$/.test(p) ? '(.+?)' : esc(p))).join('');
      patterns.push({ re: new RegExp(`^${src}$`, 's'), to: v });
    } else exact.set(k, v);
  }
  // ибораҳои дарозтар аввал
  patterns.sort((a, b) => b.re.source.length - a.re.source.length);
}

const cyr = /[Ѐ-ӿ]/;

const lower1 = (x: string) => x.charAt(0).toLowerCase() + x.slice(1);
const upper1 = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);

// Номи моҳҳо дар сатрҳои омехта («Октябр 2026», «5–11 Окт», «06 октябр 2026»)
const M_TG = ['январ', 'феврал', 'март', 'апрел', 'май', 'июн', 'июл', 'август', 'сентябр', 'октябр', 'ноябр', 'декабр'];
const M_SH = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const M_RU = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const M_RU_G = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const M_RU_S = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
const M_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const M_EN_S = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_RE = /(?<![\p{L}])(январ|феврал|март|апрел|май|июн|июл|август|сентябр|октябр|ноябр|декабр|янв|фев|мар|апр|авг|сен|окт|ноя|дек)(?![\p{L}])/giu;

function monthWords(text: string): string {
  return text.replace(MONTH_RE, (w: string, _g: string, off: number, all: string) => {
    const lw = w.toLowerCase();
    let i = M_TG.indexOf(lw);
    const after = all.slice(off + w.length);
    const before = all.slice(0, off);
    // «Июн»/«Июл»/«Май»/«Март»: пур, агар баъдаш сол ояд; дар ҳолати дигар — кӯтоҳ
    const yearNext = /^\s+\d{4}/.test(after);
    const full = i >= 0 && (lw !== 'июн' && lw !== 'июл' || yearNext);
    if (i < 0) i = M_SH.indexOf(lw);
    if (i < 0) return w;
    let out: string;
    if (active === 'en') out = full ? M_EN[i] : M_EN_S[i];
    else out = full ? (/\d\s+$/.test(before) ? M_RU_G[i] : M_RU[i]) : M_RU_S[i];
    return w.charAt(0) === w.charAt(0).toLowerCase() ? lower1(out) : out;
  });
}

/** Як порча: ибораи дақиқ, шабакаи ибора, ҳарфи хурд/калон, ҷудокунандаҳо (« · », « — », вергул). */
function core(text: string, depth = 0): string {
  const hit = exact.get(text);
  if (hit !== undefined) return hit;
  for (const p of patterns) {
    const r = p.re.exec(text);
    if (r) return p.to.replace(/\{(\d+)\}/g, (_x, i: string) => (depth < 3 ? core(r[Number(i) + 1] ?? '', depth + 1) : r[Number(i) + 1] ?? ''));
  }
  const cap = exact.get(upper1(text));
  if (cap !== undefined && upper1(text) !== text) return lower1(cap);
  if (depth < 3) {
    // Эмодзи/аломатҳои аввал ва охир («🛒 Хароҷот»): худи матн тарҷума мешавад
    const e = /^([^\p{L}\p{N}«»(]+)([\s\S]*?)([^\p{L}\p{N}»)]*)$/u.exec(text);
    if (e && e[2] && (e[1] || e[3])) { const x = core(e[2], depth + 1); if (x !== e[2]) return e[1] + x + e[3]; }
    const parts = text.split(/(\s[·—|/]\s|,\s|:\s)/);
    if (parts.length > 1) {
      let changed = false;
      const out = parts.map((q, i) => {
        if (i % 2 === 1 || !q.trim()) return q;
        const t = core(q.trim(), depth + 1);
        if (t !== q.trim()) changed = true;
        return t;
      });
      if (changed) return out.join('');
    }
    const t = /^(.*?)(\s*[·:—]+)$/.exec(text);
    if (t && t[1]) { const x = core(t[1], depth + 1); if (x !== t[1]) return x + t[2]; }
  }
  return monthWords(text);
}

/** Матнро тарҷума мекунад (фосилаҳои аввал ва охир нигоҳ дошта мешаванд). */
export function tr(text: string, keepUnit = false): string {
  const conv = activeCode() !== BASE && !keepUnit;
  if ((active === 'tg' && !conv) || !text || !cyr.test(text)) return text;
  const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(text);
  if (!m || !m[2]) return text;
  const src = m[2].replace(/\s+/g, ' ');
  let out = active === 'tg' ? src : core(src);
  if (conv) out = swapUnit(out);
  return out === src ? text : m[1] + out + m[3];
}

// ---------- DOM ----------
const ATTRS = ['placeholder', 'aria-label', 'title', 'alt'];
const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'NOSCRIPT']);
const done = new WeakMap<Node, string>(); // нодҳо ва натиҷаи тарҷумаи онҳо (то ду маротиба тарҷума нашавад)

function textNode(n: Text) {
  const parent = n.parentElement;
  if (parent && SKIP.has(parent.tagName)) return;
  const v = n.data;
  if (done.get(n) === v) return;
  const out = tr(v, !!parent?.closest('[data-nocur]'));
  if (out !== v) { n.data = out; done.set(n, out); }
}

function attrs(el: Element) {
  for (const a of ATTRS) {
    const v = el.getAttribute(a);
    if (v && cyr.test(v)) {
      const out = tr(v);
      if (out !== v) el.setAttribute(a, out);
    }
  }
}

function walk(root: Node) {
  if (root.nodeType === Node.TEXT_NODE) { textNode(root as Text); return; }
  if (root.nodeType !== Node.ELEMENT_NODE) return;
  const el = root as Element;
  if (SKIP.has(el.tagName)) return;
  attrs(el);
  const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let n: Node | null = w.nextNode();
  while (n) {
    if (n.nodeType === Node.TEXT_NODE) textNode(n as Text);
    else attrs(n as Element);
    n = w.nextNode();
  }
}

/** Пеш аз рендер: луғатро бор мекунад ва нигаҳбонро оғоз мекунад. */
export async function initI18n(): Promise<void> {
  active = currentLang();
  document.documentElement.lang = active;
  if (active === 'tg' && activeCode() === BASE) return;
  if (active !== 'tg') {
    const mod = active === 'ru' ? await import('./i18n/ru.json') : await import('./i18n/en.json');
    build(mod.default as Record<string, string>);
  }
  document.title = tr(document.title);
  walk(document.body);
  new MutationObserver(list => {
    for (const m of list) {
      if (m.type === 'childList') m.addedNodes.forEach(walk);
      else if (m.type === 'characterData') textNode(m.target as Text);
      else if (m.type === 'attributes') attrs(m.target as Element);
    }
  }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
}
