/**
 * Забонҳо: тоҷикӣ (асосӣ), русӣ, англисӣ.
 * Матнҳои барнома бо тоҷикӣ навишта шудаанд; барои русӣ/англисӣ матнҳои DOM (ва атрибутҳои placeholder, aria-label, title, alt)
 * аз луғат (`src/i18n/*.json`) иваз мешаванд. Матнҳои шаблонӣ бо `{0}`, `{1}` (қиматҳои динамикӣ) шабакаи ибора мешаванд.
 * Иваз кардани забон саҳифаро аз нав мекушояд.
 */
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
  return text;
}

/** Матнро тарҷума мекунад (фосилаҳои аввал ва охир нигоҳ дошта мешаванд). */
export function tr(text: string): string {
  if (active === 'tg' || !text || !cyr.test(text)) return text;
  const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(text);
  if (!m || !m[2]) return text;
  const src = m[2].replace(/\s+/g, ' ');
  const out = core(src);
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
  const out = tr(v);
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
  if (active === 'tg') return;
  const mod = active === 'ru' ? await import('./i18n/ru.json') : await import('./i18n/en.json');
  build(mod.default as Record<string, string>);
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
