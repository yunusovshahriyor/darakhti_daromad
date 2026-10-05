import type { AccountId, Alloc, Debt, Expense, Income, Settings } from './types';

export const DEFAULT_SETTINGS: Settings = {
  charity: 2.5,
  parents: 10,
  future: 10,
  fun: 10,
  company: 55,
  capital: 80,
  bigDream: 50,
};

export const ACCOUNT_ORDER: AccountId[] = [
  'charity', 'parents', 'future', 'fun', 'debt',
  'capital', 'bigDream', 'smallDream', 'living',
];

export const ACCOUNTS: Record<AccountId, { name: string; icon: string }> = {
  charity: { name: 'Садақа', icon: '🤲' },
  parents: { name: 'Волидон', icon: '👨‍👩‍👧' },
  future: { name: 'Барои оянда', icon: '🌱' },
  fun: { name: 'Вақтхушӣ', icon: '🎉' },
  debt: { name: 'Пардохти қарз', icon: '💳' },
  capital: { name: 'Сармоя', icon: '📈' },
  bigDream: { name: 'Орзуи калон', icon: '🏠' },
  smallDream: { name: 'Орзуи хурд', icon: '✈️' },
  living: { name: 'Хароҷоти зиндагӣ', icon: '🛒' },
};

export const GROUPS: { title: string; ids: AccountId[] }[] = [
  { title: 'Аз даромади умумӣ', ids: ['charity', 'parents', 'future', 'fun', 'debt'] },
  { title: 'Ҳисоби ширкат', ids: ['capital', 'bigDream', 'smallDream'] },
  { title: 'Ҳисоби шахсӣ', ids: ['living'] },
];

export const uid = () => Date.now() * 1000 + Math.floor(Math.random() * 1000);

export const today = () => new Date().toLocaleDateString('sv-SE');

export const fmt = (n: number) =>
  n.toLocaleString('ru-RU', { maximumFractionDigits: 2 });

export const emptyAlloc = (): Alloc =>
  Object.fromEntries(ACCOUNT_ORDER.map(id => [id, 0])) as Alloc;

export const remaining = (d: Debt) => Math.max(0, d.amount - d.paid);

export const hasDebt = (debts: Debt[]) => debts.some(d => remaining(d) > 0.005);

/**
 * Тақсими даромад:
 * 1. Аз даромади умумӣ: садақа, волидон, оянда, вақтхушӣ (агар қарз бошад — ба пардохти қарз).
 * 2. Бақия — даромади моҳона (100%): ширкат / шахсӣ.
 * 3. Ширкат: сармоя / орзу; орзу: калон / хурд.
 */
export function allocate(amount: number, s: Settings, debt: boolean): Alloc {
  const p = (x: number) => (amount * x) / 100;
  const charity = p(s.charity);
  const parents = p(s.parents);
  const future = p(s.future);
  const funShare = p(s.fun);

  const monthly = Math.max(0, amount - charity - parents - future - funShare);
  const company = (monthly * s.company) / 100;
  const living = monthly - company;
  const capital = (company * s.capital) / 100;
  const dream = company - capital;
  const bigDream = (dream * s.bigDream) / 100;

  return {
    charity,
    parents,
    future,
    fun: debt ? 0 : funShare,
    debt: debt ? funShare : 0,
    capital,
    bigDream,
    smallDream: dream - bigDream,
    living,
  };
}

export function balances(incomes: Income[], expenses: Expense[]): Alloc {
  const b = emptyAlloc();
  for (const i of incomes) for (const id of ACCOUNT_ORDER) b[id] += i.alloc[id] ?? 0;
  for (const e of expenses) b[e.account] -= e.amount;
  return b;
}

export function spent(expenses: Expense[]): Alloc {
  const b = emptyAlloc();
  for (const e of expenses) b[e.account] += e.amount;
  return b;
}

const MONTHS = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

export function monthlyIncome(incomes: Income[], n = 6) {
  const now = new Date();
  const out: { key: string; label: string; total: number }[] = [];
  for (let k = n - 1; k >= 0; k--) {
    const d = new Date(now.getFullYear(), now.getMonth() - k, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const total = incomes.filter(i => i.date.startsWith(key)).reduce((s, i) => s + i.amount, 0);
    out.push({ key, label: MONTHS[d.getMonth()], total });
  }
  return out;
}

const MONTH_NAMES = [
  'Январ', 'Феврал', 'Март', 'Апрел', 'Май', 'Июн',
  'Июл', 'Август', 'Сентябр', 'Октябр', 'Ноябр', 'Декабр',
];

export const monthTitle = (key: string) => {
  const [y, m] = key.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
};

/** Гурӯҳбандии рӯйхат аз рӯи моҳ (рӯйхат бояд аз нав ба кӯҳна тартиб шуда бошад). */
export function groupByMonth<T extends { date: string }>(items: T[]) {
  const groups: { key: string; items: T[] }[] = [];
  for (const it of items) {
    const key = it.date.slice(0, 7);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(it);
    else groups.push({ key, items: [it] });
  }
  return groups;
}

// ---------- Давраҳо (рӯз / ҳафта / моҳ / сол) ----------

export type PeriodKind = 'day' | 'week' | 'month' | 'year';

export interface Period {
  start: string;
  end: string;
  top: string;
  big: string;
  bottom: string;
}

const WEEKDAYS = ['Яқш', 'Душ', 'Сеш', 'Чор', 'Пан', 'Ҷум', 'Шан'];
const iso = (d: Date) => d.toLocaleDateString('sv-SE');
const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

export function periodAt(kind: PeriodKind, offset: number, now = new Date()): Period {
  const cur = offset === 0;
  if (kind === 'day') {
    const d = addDays(now, offset);
    return { start: iso(d), end: iso(d), top: MONTHS[d.getMonth()], big: String(d.getDate()), bottom: cur ? 'Ҳозир' : WEEKDAYS[d.getDay()] };
  }
  if (kind === 'week') {
    const base = addDays(now, offset * 7);
    const s = addDays(base, -((base.getDay() + 6) % 7));
    const e = addDays(s, 6);
    return { start: iso(s), end: iso(e), top: MONTHS[s.getMonth()], big: `${s.getDate()}–${e.getDate()}`, bottom: cur ? 'Ҳозир' : 'Ҳафта' };
  }
  if (kind === 'month') {
    const s = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const e = new Date(s.getFullYear(), s.getMonth() + 1, 0);
    return { start: iso(s), end: iso(e), top: String(s.getFullYear()), big: MONTHS[s.getMonth()], bottom: cur ? 'Ҳозир' : 'Моҳ' };
  }
  const y = now.getFullYear() + offset;
  return { start: `${y}-01-01`, end: `${y}-12-31`, top: 'Сол', big: String(y), bottom: cur ? 'Ҳозир' : ' ' };
}

export const inPeriod = (date: string, p: Period) => date >= p.start && date <= p.end;

/** Пешгӯии хароҷот то охири давра аз рӯи суръати ҳозира. */
export function forecast(spentSoFar: number, p: Period, kind: PeriodKind, now = new Date()) {
  const today = iso(now);
  if (today < p.start) return 0;
  if (today > p.end || kind === 'day') return spentSoFar;
  const days = (a: string, b: string) =>
    Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000) + 1;
  return (spentSoFar / days(p.start, today)) * days(p.start, p.end);
}

export const PERIOD_LABELS: Record<PeriodKind, { name: string; prev: string; forecast: string }> = {
  day: { name: 'Рӯз', prev: 'рӯзи гузашта', forecast: 'Пешгӯӣ барои рӯз' },
  week: { name: 'Ҳафта', prev: 'ҳафтаи гузашта', forecast: 'Пешгӯӣ барои ҳафта' },
  month: { name: 'Моҳ', prev: 'моҳи гузашта', forecast: 'Пешгӯӣ барои моҳ' },
  year: { name: 'Сол', prev: 'соли гузашта', forecast: 'Пешгӯӣ барои сол' },
};

export const ACCOUNT_COLORS: Record<AccountId, string> = {
  charity: '#e0a43a',
  parents: '#d7728f',
  future: '#4fa89d',
  fun: '#9b7bd4',
  debt: '#d9594c',
  capital: '#2f7fb5',
  bigDream: '#3f9b6b',
  smallDream: '#7cc4e8',
  living: '#5b83ac',
};
