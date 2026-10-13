/** Аз матни OCR-и чек: маблағи ҷамъ, мағоза ва сана. Тоза ва озмоишшаванда (бе DOM). */
export interface ParsedReceipt {
  total: number | null;
  /** Маблағҳои номзад (ҷамъ), аз зиёд ба кам, то 4 адад. */
  candidates: number[];
  merchant: string;
  date: string | null;
}

const NUM = /\d{1,3}(?:[  ]\d{3})+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?/g;
const STRONG = /(итого|итог\b|всего к оплате|к\s*оплате|всего|total|amount due|grand total|jami|ҷамъ|чамъ|ҳамагӣ|хамаги|ба\s*пардохт)/i;
const WEAK = /(сумма|sum\b|сумма к|пардохт|оплата)/i;
// Сатрҳое, ки маблағи ҷамъ нестанд: нақд додаед, бақия, телефон, ИНН, санаи чек
const NOISE = /(сдача|наличн|получено|внесено|cash|change|qaytim|бақия|бакия|баки|тел\b|тел:|телефон|tel\b|phone|инн|ккм|фн\b|рнм|ттн|№|www\.|http)/i;
const DATE_LINE = /\d{1,2}[./-]\d{1,2}[./-]\d{2,4}|\d{4}-\d{2}-\d{2}/;
const SKIP_MERCHANT = /(чек|касс|инн|ккм|тел|телефон|адрес|смена|№|www|http|оплата|дата|время|кассир|фн|фд|фп|ттн|рнм|сно|ндс|итого|sale|receipt|tel\b)/i;

/** «1 250,50» / «1250.5» / «1.250,50» → 1250.5 */
export function toNumber(raw: string): number | null {
  let s = raw.replace(/[  ]/g, '');
  if (!s) return null;
  const dot = s.lastIndexOf('.');
  const comma = s.lastIndexOf(',');
  const dec = Math.max(dot, comma);
  if (dec >= 0 && s.length - dec - 1 <= 2) s = s.slice(0, dec).replace(/[.,]/g, '') + '.' + s.slice(dec + 1);
  else s = s.replace(/[.,]/g, '');
  const n = Number(s);
  return isFinite(n) && n > 0 ? n : null;
}

const numbersIn = (line: string): number[] => {
  const out: number[] = [];
  for (const m of line.matchAll(NUM)) {
    const raw = m[0];
    // ИНН, телефон, рақами чек (рақамҳои дароз бе ҷудокунанда) намеафтанд
    if (/^\d{7,}$/.test(raw.replace(/[  ]/g, '')) && !/[.,]\d{1,2}$/.test(raw)) continue;
    const n = toNumber(raw);
    if (n !== null && n < 100_000_000) out.push(n);
  }
  return out;
};

export function parseDate(text: string, now = new Date()): string | null {
  const re = /(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})|(\d{4})-(\d{2})-(\d{2})/g;
  for (const m of text.matchAll(re)) {
    let y: number; let mo: number; let d: number;
    if (m[4]) { y = +m[4]; mo = +m[5]; d = +m[6]; } else {
      d = +m[1]; mo = +m[2]; y = +m[3]; if (y < 100) y += 2000;
    }
    if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 2015) continue;
    const dt = new Date(y, mo - 1, d);
    if (dt.getMonth() !== mo - 1) continue;
    if (dt.getTime() > now.getTime() + 2 * 86400000) continue;
    return dt.toLocaleDateString('sv-SE');
  }
  return null;
}

const clean = (s: string) => s.replace(/[^\p{L}\p{N}\s.,&'’"«»()\-+/]/gu, ' ').replace(/\s+/g, ' ').trim();

export function guessMerchant(lines: string[]): string {
  for (const raw of lines.slice(0, 8)) {
    const l = clean(raw);
    const letters = (l.match(/\p{L}/gu) ?? []).length;
    if (letters < 3 || letters < l.length * 0.45) continue;
    if (SKIP_MERCHANT.test(l)) continue;
    const t = l.length > 40 ? l.slice(0, 40).trim() : l;
    // «МАГАЗИН ЧОР-БОҒ» → «Магазин Чор-боғ»
    return t === t.toUpperCase() ? t.toLowerCase().replace(/(^|[\s\-«"(])(\p{L})/gu, (_, a: string, b: string) => a + b.toUpperCase()) : t;
  }
  return '';
}

export function parseReceipt(text: string, now = new Date()): ParsedReceipt {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const strong: number[] = [];
  const weak: number[] = [];
  const all: number[] = [];
  lines.forEach((l, i) => {
    if (NOISE.test(l)) return;
    const hasDate = DATE_LINE.test(l);
    const nums = hasDate ? [] : numbersIn(l);
    all.push(...nums);
    const next = lines[i + 1] && !NOISE.test(lines[i + 1]) && !DATE_LINE.test(lines[i + 1]) ? numbersIn(lines[i + 1]) : [];
    if (STRONG.test(l)) strong.push(...(nums.length ? nums : next));
    else if (WEAK.test(l)) weak.push(...(nums.length ? nums : next));
  });
  const uniq = (a: number[]) => [...new Set(a)].sort((x, y) => y - x);
  const pool = strong.length ? uniq(strong) : weak.length ? uniq(weak) : uniq(all.filter(n => n >= 1));
  const candidates = uniq([...pool, ...all]).slice(0, 4);
  return { total: pool[0] ?? candidates[0] ?? null, candidates, merchant: guessMerchant(lines), date: parseDate(text, now) };
}
