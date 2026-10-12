import { guessCategory } from './categories';
import type { Expense, Income, State } from './types';

/** Хароҷоте, ки худи корбар сабт кардааст (на қарз/орзу/қарзи додашуда). */
const own = (e: Expense) => !e.debtId && !e.dreamId && !e.loanId && !e.title.startsWith('Қарз:');

const norm = (s: string) => s.trim().toLowerCase();

export interface Hint { title: string; category?: string; amount: number; account: string; n: number }

/** Пешниҳоди «пештар навиштаед»: аз таърих — эзоҳҳои ба матни воридшуда монанд (аз ҳама зиёд такрорёфта аввал). */
export function expenseHints(expenses: Expense[], text: string, limit = 3): Hint[] {
  const q = norm(text);
  if (q.length < 2) return [];
  const map = new Map<string, Hint & { cat: Map<string, number> }>();
  for (const e of expenses.filter(own)) {
    const k = norm(e.title);
    if (!k.includes(q)) continue;
    let h = map.get(k);
    if (!h) { h = { title: e.title, amount: e.amount, account: e.account, n: 0, cat: new Map() }; map.set(k, h); }
    h.n++;
    if (e.category) h.cat.set(e.category, (h.cat.get(e.category) ?? 0) + 1);
  }
  return [...map.values()]
    .map(h => ({ title: h.title, amount: h.amount, account: h.account, n: h.n, category: [...h.cat.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] }))
    .sort((a, b) => b.n - a.n)
    .slice(0, limit);
}

/** Категорияро аз эзоҳ: аввал аз таърихи худи корбар (ҳамон калима чӣ категорияро гирифта буд), баъд аз калидвожаҳо. */
export function smartCategory(state: State, note: string): string | null {
  const words = norm(note).split(/\s+/).filter(w => w.length >= 3);
  if (words.length) {
    const score = new Map<string, number>();
    for (const e of state.expenses.filter(own)) {
      if (!e.category) continue;
      const t = norm(e.title);
      if (words.some(w => t.includes(w))) score.set(e.category, (score.get(e.category) ?? 0) + 1);
    }
    const best = [...score.entries()].sort((a, b) => b[1] - a[1])[0];
    if (best) return best[0];
  }
  return guessCategory(note, state.categories);
}

/** Охирин амалҳои ҳар хел (титул + маблағ): барои тугмаи «Аз нав ҳамон». */
export function recentExpenses(expenses: Expense[], limit = 2): Expense[] {
  const seen = new Set<string>();
  const out: Expense[] = [];
  for (const e of [...expenses].filter(own).sort((a, b) => b.id - a.id)) {
    const k = `${norm(e.title)}|${e.amount}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(e);
    if (out.length >= limit) break;
  }
  return out;
}

export function recentIncomes(incomes: Income[], limit = 2): Income[] {
  const seen = new Set<string>();
  const out: Income[] = [];
  for (const i of [...incomes].filter(x => !x.kind).sort((a, b) => b.id - a.id)) {
    const k = `${i.source ?? ''}|${i.title}|${i.amount}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(i);
    if (out.length >= limit) break;
  }
  return out;
}

const DEFAULTS: Record<string, [number, number]> = {
  TJS: [50, 500], RUB: [500, 5000], USD: [10, 100], EUR: [10, 100], KZT: [2000, 10000], UZS: [50000, 500000],
};

/** Суммаҳои тез: аввал аз ҳама зиёд такроршуда, баъд суммаҳои пешфарз вобаста ба асъор. */
export function quickAmounts(amounts: number[], currency: string, income: boolean): number[] {
  const cnt = new Map<number, number>();
  for (const a of amounts.slice(0, 80)) if (a > 0) cnt.set(a, (cnt.get(a) ?? 0) + 1);
  const frequent = [...cnt.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).map(([a]) => a);
  const [lo, hi] = DEFAULTS[currency] ?? [100, 1000];
  const def = income ? [hi, hi * 2, hi * 5, hi * 10] : [lo, lo * 2, hi, hi * 2];
  const out: number[] = [];
  for (const a of [...frequent, ...def]) if (!out.includes(a)) out.push(a);
  return out.slice(0, 4).sort((a, b) => a - b);
}
