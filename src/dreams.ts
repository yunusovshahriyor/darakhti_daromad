import { balancesOf, monthlyPoolRate, today, uid } from './model';
import type { AccountId, Dream, Expense, State, Transfer } from './types';

export const POOLS: AccountId[] = ['bigDream', 'smallDream'];
export const poolOf = (d: Dream): AccountId => (d.kind === 'big' ? 'bigDream' : 'smallDream');

const iso = (d: Date) => d.toLocaleDateString('sv-SE');
const parse = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };

/** Душанбеи ҳафтаи санаи дода шуда. */
export function weekStart(date: string): string {
  const d = parse(date);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return iso(d);
}

// ---------------- Муҳлат (санаи мақсад) ----------------

/** Шумораи моҳҳои то санаи мақсад (на камтар аз 1/30). */
export function monthsUntil(deadline: string): number {
  return Math.max(0, (parse(deadline).getTime() - parse(today()).getTime()) / 86400000 / 30);
}

export interface Plan {
  dream: Dream;
  need: number;
  months: number;
  perMonth: number;
  rate: number;
  behind: boolean;
}

/** Нақшаи орзуҳое, ки санаи мақсад доранд: ҳар моҳ чӣ қадар лозим аст ва аз реҷа мондааст ё не. */
export function deadlinePlans(state: State, funded: (d: Dream) => { funded: number; need: number }): Plan[] {
  const out: Plan[] = [];
  for (const d of state.dreams) {
    if (d.boughtAt || !d.deadline) continue;
    const { need } = funded(d);
    const months = monthsUntil(d.deadline);
    const rate = monthlyPoolRate(state, poolOf(d));
    const perMonth = need <= 0 ? 0 : months <= 0.03 ? need : need / months;
    out.push({ dream: d, need, months, perMonth, rate, behind: need > 0.005 && rate < perMonth * 0.9 });
  }
  return out;
}

// ---------------- Ҷамъкунии даврӣ ----------------

/** Санаи оғози давр барои санаи `date` (ҳафта — душанбе, моҳ — рӯзи 1). */
const periodStart = (every: 'week' | 'month', date: string) =>
  every === 'week' ? weekStart(date) : `${date.slice(0, 7)}-01`;

const nextPeriod = (every: 'week' | 'month', start: string) => {
  const d = parse(start);
  if (every === 'week') d.setDate(d.getDate() + 7);
  else d.setMonth(d.getMonth() + 1);
  return iso(d);
};

export const LADDER_WEEKS = 52;

/** Маблағи дафъаи k-ум: одатан ҳамон, дар «бозии 52 ҳафта» — k маротиба. */
export const autoAmount = (a: NonNullable<Dream['autoSave']>, k: number) => (a.ladder ? a.amount * k : a.amount);

/**
 * Ҷамъкунии худкор: барои ҳар давре, ки аз охирин иҷро гузашт, гузаронидан сабт мешавад.
 * Агар дар ҳисоб маблағ кифоя набошад, ин давр гузошта мешавад (қарз намешавад).
 */
export function runAutoSaves(s: State): State {
  const now = today();
  let transfers: Transfer[] | null = null;
  let dreams: Dream[] | null = null;
  const bal = { ...balancesOf(s) };

  s.dreams.forEach((d, idx) => {
    const a = d.autoSave;
    if (!a || d.boughtAt) return;
    let cursor = a.lastRun ? nextPeriod(a.every, a.lastRun) : periodStart(a.every, a.started);
    let last = a.lastRun;
    let count = a.count;
    let guard = 0;
    while (cursor <= now && guard++ < 60) {
      if (a.ladder && count >= LADDER_WEEKS) break;
      const amount = autoAmount(a, count + 1);
      if ((bal[a.from] ?? 0) >= amount - 0.005) {
        transfers = transfers ?? [...s.transfers];
        transfers.unshift({ id: uid(), from: a.from, to: poolOf(d), amount, date: cursor > now ? now : cursor });
        bal[a.from] = (bal[a.from] ?? 0) - amount;
        bal[poolOf(d)] = (bal[poolOf(d)] ?? 0) + amount;
        count++;
      }
      last = cursor;
      cursor = nextPeriod(a.every, cursor);
    }
    if (last !== a.lastRun || count !== a.count) {
      dreams = dreams ?? [...s.dreams];
      dreams[idx] = { ...d, autoSave: { ...a, lastRun: last, count } };
    }
  });

  if (!transfers && !dreams) return s;
  return { ...s, transfers: transfers ?? s.transfers, dreams: dreams ?? s.dreams };
}

// ---------------- Силсилаи ҳафтаҳо ----------------

/** Ҳафтаҳое, ки дар онҳо ба ҳисоби орзуҳо маблағ гузошта шудааст (гузаронидан ба орзу). */
export function depositWeeks(s: State): Set<string> {
  const out = new Set<string>();
  for (const t of s.transfers) if (POOLS.includes(t.to) && !POOLS.includes(t.from)) out.add(weekStart(t.date));
  return out;
}

/** Силсилаи ҳафтаҳои пай дар пай; агар ҳафтаи ҷорӣ ҳанӯз холӣ бошад, аз ҳафтаи гузашта шумурда мешавад. */
export function depositStreak(s: State): number {
  const weeks = depositWeeks(s);
  const d = parse(weekStart(today()));
  if (!weeks.has(iso(d))) d.setDate(d.getDate() - 7);
  let n = 0;
  while (weeks.has(iso(d))) { n++; d.setDate(d.getDate() - 7); }
  return n;
}

/** Дар 7 рӯзи охир ба орзуҳо чизе гузошта нашудааст? */
export function noDepositThisWeek(s: State): boolean {
  return !depositWeeks(s).has(weekStart(today()));
}

// ---------------- Нишонҳо ----------------

export interface Badge { id: string; icon: string; title: string; text: string; done: boolean }

export function badges(s: State, bestPct: number): Badge[] {
  const bought = s.dreams.filter(d => d.boughtAt);
  const totalBought = bought.reduce((sum, d) => sum + (d.paidPrice ?? d.target), 0);
  const deposits = s.transfers.filter(t => POOLS.includes(t.to) && !POOLS.includes(t.from));
  const streak = depositStreak(s);
  return [
    { id: 'first-dream', icon: '🌟', title: 'Аввалин орзу', text: 'Орзуи аввалин илова шуд', done: s.dreams.length > 0 },
    { id: 'first-save', icon: '🌱', title: 'Аввалин ҷамъкунӣ', text: 'Аввалин маблағ ба орзу гузошта шуд', done: deposits.length > 0 },
    { id: 'half', icon: '🔥', title: 'Нисфи роҳ', text: 'Яке аз орзуҳо ба 50% расид', done: bestPct >= 50 || bought.length > 0 },
    { id: 'streak4', icon: '📅', title: 'Силсилаи 4 ҳафта', text: '4 ҳафта пай дар пай маблағ гузоштед', done: streak >= 4 },
    { id: 'bought1', icon: '🏆', title: 'Аввалин орзуи амалӣ', text: 'Аввалин орзу харида шуд', done: bought.length >= 1 },
    { id: 'bought3', icon: '👑', title: '3 орзуи амалӣ', text: 'Се орзу харида шуд', done: bought.length >= 3 },
    { id: 'sum10k', icon: '💎', title: '10 000 барои орзуҳо', text: 'Ҷамъи харидҳо ба 10 000 расид', done: totalBought >= 10000 },
  ];
}

// ---------------- «Чӣ кам кунем?» ----------------

export interface Cut { category: string; spentPerMonth: number; saves: number }

/** Категорияҳое, ки дар 90 рӯзи охир зиёд сарф шудаанд: 20% кам кардан чӣ қадар дар як моҳ медиҳад. */
export function topCuts(expenses: Expense[]): Cut[] {
  const from = new Date();
  from.setDate(from.getDate() - 90);
  const fromIso = iso(from);
  const sum = new Map<string, number>();
  for (const e of expenses) {
    if (!e.category || e.date < fromIso || e.loanId || e.debtId || e.dreamId) continue;
    sum.set(e.category, (sum.get(e.category) ?? 0) + e.amount);
  }
  return [...sum.entries()]
    .map(([category, total]) => ({ category, spentPerMonth: total / 3, saves: (total / 3) * 0.2 }))
    .filter(c => c.saves >= 1)
    .sort((a, b) => b.saves - a.saves)
    .slice(0, 3);
}
