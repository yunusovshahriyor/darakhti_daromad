import type { AccountDef, AccountId, Alloc, Debt, DistNode, Loan, Dream, Expense, Income, Settings, State, Transfer } from './types';

export const uid = () => Date.now() * 1000 + Math.floor(Math.random() * 1000);

export const today = () => new Date().toLocaleDateString('sv-SE');

export const fmt = (n: number) =>
  n.toLocaleString('ru-RU', { maximumFractionDigits: 2 });

export const emptyAlloc = (): Alloc =>
  Object.fromEntries(ALL_IDS.map(id => [id, 0])) as Alloc;

export const remaining = (d: Debt) => Math.max(0, d.amount - d.paid);

/**
 * Тартиби пардохти қарзҳо: аввал қарзҳои афзалиятнок, баъд боқимонда;
 * дар ҳар гурӯҳ аз рӯи бақия аз хурд ба калон (қарзи хурд аввал).
 * Қарзҳои пурра пардохтшуда дар охир.
 */
export function sortDebts(debts: Debt[]): Debt[] {
  return [...debts].sort((a, b) => {
    const pa = remaining(a) > 0.005 ? 0 : 1;
    const pb = remaining(b) > 0.005 ? 0 : 1;
    if (pa !== pb) return pa - pb;
    const fa = a.priority ? 0 : 1;
    const fb = b.priority ? 0 : 1;
    if (fa !== fb) return fa - fb;
    return remaining(a) - remaining(b) || a.id - b.id;
  });
}

/** Қарзҳо ба кушода ва пардохтшуда ҷудо мешаванд; пардохтшудаҳо аз нав ба кӯҳна. */
export function splitDebts(debts: Debt[]) {
  const open = sortDebts(debts.filter(d => remaining(d) > 0.005));
  const paid = debts
    .filter(d => remaining(d) <= 0.005)
    .sort((a, b) => (b.paidAt ?? '').localeCompare(a.paidAt ?? '') || b.id - a.id);
  return { open, paid };
}

/** Орзуҳо: фаъол (ҳанӯз харида нашудааст) ва харидашуда (аз нав ба кӯҳна). */
export const activeDreams = (dreams: Dream[]) => dreams.filter(d => !d.boughtAt);
export const boughtDreams = (dreams: Dream[]) =>
  dreams.filter(d => d.boughtAt).sort((a, b) => (b.boughtAt ?? '').localeCompare(a.boughtAt ?? '') || b.id - a.id);

/** Тартиби харидани орзуҳо: ҳамон қоида — аввал афзалиятнок, баъд арзонтарин. */
export function sortDreams(dreams: Dream[]): Dream[] {
  return [...dreams].sort((a, b) => {
    const fa = a.priority ? 0 : 1;
    const fb = b.priority ? 0 : 1;
    if (fa !== fb) return fa - fb;
    return a.target - b.target || a.id - b.id;
  });
}

export interface FundedDream {
  dream: Dream;
  funded: number;
  ready: boolean;
  rank: number;
}

/** Маблағи ҷамъшуда (тавозуни ҳисоб) ба орзуҳо аз навбат тақсим мешавад. */
export function fundDreams(dreams: Dream[], pool: number): FundedDream[] {
  let left = Math.max(0, pool);
  return sortDreams(activeDreams(dreams)).map((dream, i) => {
    const funded = Math.min(dream.target, left);
    left -= funded;
    return { dream, funded, ready: funded >= dream.target - 0.005, rank: i + 1 };
  });
}

/** Қарзи нав: агар аввалин қарз бошад, боқимондаи «Вақтхушӣ» худкор ба «Пардохти қарз» мегузарад. */
export function withNewDebt(s: State, v: { title: string; amount: number; priority: boolean; date?: string }): State {
  const next: State = { ...s, debts: [...s.debts, { id: uid(), paid: 0, ...v }] };
  const fun = balancesOf(s).fun ?? 0;
  if (!hasDebt(s.debts) && fun > 0.005) {
    next.transfers = [...s.transfers, { id: uid(), from: 'fun', to: 'debt', amount: fun, date: v.date ?? today() }];
  }
  return next;
}

export const loanLeft = (l: Loan) => Math.max(0, l.amount - l.returned);
export const openLoans = (loans: Loan[]) => loans.filter(l => loanLeft(l) > 0.005);

export const hasDebt = (debts: Debt[]) => debts.some(d => remaining(d) > 0.005);

/**
 * Тақсими даромад аз рӯи дарахт: ҳар гурӯҳ маблағро байни фарзандонаш аз рӯи фоиз тақсим мекунад.
 * Агар қарз бошад, ҳиссаи «Вақтхушӣ» ба «Пардохти қарз» меравад.
 */
export function allocate(amount: number, tree: DistNode, debt: boolean): Alloc {
  const out = emptyAlloc();
  const walk = (n: DistNode, value: number) => {
    if (n.type === 'account') {
      const target = debt && n.accountId === 'fun' ? 'debt' : n.accountId;
      out[target] = (out[target] ?? 0) + value;
      return;
    }
    // Бе қарз ҳиссаи «Пардохти қарз» ба боқимонда (охирин фарзанд) мегузарад
    const w = n.children.map(c => (!debt && c.type === 'account' && c.accountId === 'debt' ? 0 : c.percent));
    if (!debt) {
      const skipped = n.children.reduce((t, c, i) => t + c.percent - w[i], 0);
      if (skipped > 0) w[w.length - 1] += skipped;
    }
    const sum = w.reduce((t, x) => t + x, 0);
    if (sum <= 0) return;
    n.children.forEach((c, i) => walk(c, (value * w[i]) / sum));
  };
  walk(tree, amount);
  return out;
}

export function balances(incomes: Income[], expenses: Expense[], transfers: Transfer[] = []): Alloc {
  const b = emptyAlloc();
  for (const i of incomes) for (const [id, v] of Object.entries(i.alloc)) b[id] = (b[id] ?? 0) + v;
  for (const e of expenses) b[e.account] = (b[e.account] ?? 0) - e.amount;
  for (const t of transfers) {
    b[t.from] = (b[t.from] ?? 0) - t.amount;
    b[t.to] = (b[t.to] ?? 0) + t.amount;
  }
  return b;
}

export const balancesOf = (s: State) => balances(s.incomes, s.expenses, s.transfers);

/**
 * Ҳисобҳое, ки пинҳон мешаванд: «Пардохти қарз» вақте қарз нест
 * (агар дар он боқимонда бошад, пинҳон намешавад, то пул аз назар нагузарад)
 * ва «Вақтхушӣ» вақте қарз ҳаст (ҳиссааш ба «Пардохти қарз» меравад).
 */
export const hiddenAccounts = (s: State): AccountId[] => {
  if (hasDebt(s.debts)) return ['fun'];
  return Math.abs(balancesOf(s).debt) < 0.005 ? ['debt'] : [];
};

export function spent(expenses: Expense[]): Alloc {
  const b = emptyAlloc();
  for (const e of expenses) b[e.account] = (b[e.account] ?? 0) + e.amount;
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

// ---------- Ҳисобҳо мисли барномаи бонкӣ ----------

export interface AccountGroup {
  key: string;
  title: string;
  icon: string;
  items: (AccountId | AccountGroup)[];
}

export const leavesOf = (g: AccountGroup): AccountId[] =>
  g.items.flatMap(i => (typeof i === 'string' ? [i] : leavesOf(i)));

export const groupSum = (g: AccountGroup, bal: Alloc) =>
  leavesOf(g).reduce((s, id) => s + bal[id], 0);

/** Роҳи ҳисоб дар дарахт, масалан: Ҳисоби ширкат › Орзу. */
export function pathOf(id: AccountId, groups: AccountGroup[] = ACCOUNT_TREE): string[] {
  for (const g of groups) {
    if (g.items.includes(id)) return [g.title];
    const sub = pathOf(id, g.items.filter((i): i is AccountGroup => typeof i !== 'string'));
    if (sub.length) return [g.title, ...sub];
  }
  return [];
}

/** Тавзеҳи гурӯҳ: чанд фоиз аз кадом база (аз дарахт ҳисоб мешавад). */
export const groupNote = (key: string): string => GROUP_NOTES[key] ?? '';

/**
 * Зерном: аз куҷо ва чанд фоиз. Агар тавзеҳ худи гурӯҳро аллакай дарбар гирад,
 * номи гурӯҳ такрор намешавад («10% аз даромади умумӣ»), вагарна роҳ илова мешавад.
 */
export function subtitleOf(id: AccountId, debt: boolean): string {
  const hint = leafHint(id, debt);
  const path = pathOf(id);
  if (path.length && hint.toLowerCase().includes(path[path.length - 1].toLowerCase())) path.pop();
  return [...path, hint].join(' · ');
}

/** Тавзеҳи ҳисоб нисбат ба гурӯҳи худаш: «80% аз ҳисоби ширкат». */
export function leafHint(id: AccountId, debt: boolean): string {
  const info = LEAF_INFO[id];
  const n = (v: number) => fmt(Math.round(v * 100) / 100);
  if (id === 'fun' && debt) return 'Ҳангоми қарз пур намешавад';
  if (id === 'debt') {
    const f = LEAF_INFO.fun;
    return debt && f && info ? `${n(info.percent + f.percent)}% аз ${info.parent}` : 'Ҳангоми қарз пур мешавад';
  }
  return info ? `${n(info.percent)}% аз ${info.parent}` : 'Бе фоизи худкор';
}

/** Ҳиссаи ҳисоб аз ҳар 100 сомонии даромад (бо дарахти ҳозира). */
export const shareOfIncome = (id: AccountId, tree: DistNode, debt: boolean) =>
  allocate(100, tree, debt)[id] ?? 0;

export interface LedgerEntry {
  key: string;
  date: string;
  title: string;
  amount: number;
}

/** Таърихи амалиёти як ҳисоб: даромад, хароҷот ва гузаронидан. */
export function ledger(s: State, id: AccountId): LedgerEntry[] {
  const out: LedgerEntry[] = [];
  for (const i of s.incomes) {
    const a = i.alloc[id] ?? 0;
    if (a > 0) out.push({ key: `i${i.id}`, date: i.date, title: `Даромад: ${i.title}`, amount: a });
  }
  for (const e of s.expenses) {
    if (e.account === id) out.push({ key: `e${e.id}`, date: e.date, title: e.title, amount: -e.amount });
  }
  for (const t of s.transfers) {
    if (t.from === id) out.push({ key: `t${t.id}o`, date: t.date, title: `Ба «${ACCOUNTS[t.to].name}»`, amount: -t.amount });
    if (t.to === id) out.push({ key: `t${t.id}i`, date: t.date, title: `Аз «${ACCOUNTS[t.from].name}»`, amount: t.amount });
  }
  return out.sort((a, b) => b.date.localeCompare(a.date) || b.key.localeCompare(a.key));
}


/** Номи давра барои сатри интихоб: «Октябр 2026», «5–11 Окт», «2026», «5 Окт 2026». */
export function periodLabel(kind: PeriodKind, p: Period): string {
  const [y1, m1, d1] = p.start.split('-').map(Number);
  const [, m2, d2] = p.end.split('-').map(Number);
  if (kind === 'month') return monthTitle(p.start.slice(0, 7));
  if (kind === 'year') return String(y1);
  if (kind === 'day') return `${d1} ${MONTHS[m1 - 1]} ${y1}`;
  return m1 === m2
    ? `${d1}–${d2} ${MONTHS[m1 - 1]} ${y1}`
    : `${d1} ${MONTHS[m1 - 1]} – ${d2} ${MONTHS[m2 - 1]}`;
}

// ---------- Рӯйхати пурраи давраҳо барои варақаи интихоб ----------

export const MIN_YEAR = 2000;

export interface PickItem {
  off: number;
  start: string;
  label: string;
  now: boolean;
  future: boolean;
}

const utcDay = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
const DAY_MS = 86400000;
const mondayOf = (d: Date) => addDays(d, -((d.getDay() + 6) % 7));

/**
 * Рӯйхати давраҳо барои варақаи интихоб (навтарин боло):
 * дар боло танҳо ЯК давраи оянда (хира), баъд давраи ҷорӣ (ҷои дуюм), баъд гузаштаҳо.
 * Сол — 2000…; моҳ — моҳҳои соли anchorYear; ҳафта — ҳафтаҳои моҳи anchorMonth;
 * рӯз — рӯзҳои моҳи anchorMonth. Барои соли/моҳи гузашта танҳо гузаштаҳо нишон дода мешаванд.
 */
export function pickItems(kind: PeriodKind, anchorYear: number, anchorMonth: number, now = new Date()): PickItem[] {
  const ny = now.getFullYear();
  const nm = now.getMonth();
  const today = iso(now);
  const make = (off: number, label: string): PickItem => {
    const p = periodAt(kind, off, now);
    return { off, start: p.start, label, now: off === 0, future: p.start > today };
  };

  let all: PickItem[];
  if (kind === 'year') {
    all = [];
    for (let y = ny; y >= MIN_YEAR; y--) all.push(make(y - ny, String(y)));
  } else if (kind === 'month') {
    all = Array.from({ length: 12 }, (_, m) =>
      make((anchorYear - ny) * 12 + (m - nm), `${MONTH_NAMES[m]} ${anchorYear}`)).reverse();
  } else if (kind === 'week') {
    all = [];
    const nowMonday = utcDay(mondayOf(now));
    const end = new Date(anchorYear, anchorMonth + 1, 0);
    for (let s = mondayOf(new Date(anchorYear, anchorMonth, 1)); s <= end; s = addDays(s, 7)) {
      const off = Math.round((utcDay(s) - nowMonday) / (7 * DAY_MS));
      all.push(make(off, periodLabel('week', periodAt('week', off, now))));
    }
    all.reverse();
  } else {
    const days = new Date(anchorYear, anchorMonth + 1, 0).getDate();
    all = Array.from({ length: days }, (_, i) => {
      const d = new Date(anchorYear, anchorMonth, i + 1);
      const off = Math.round((utcDay(d) - utcDay(now)) / DAY_MS);
      return make(off, `${i + 1} ${MONTHS[anchorMonth]} · ${WEEKDAYS[d.getDay()]}`);
    }).reverse();
  }

  const past = all.filter(i => !i.future);
  const inCurrent =
    kind === 'year' || (kind === 'month' ? anchorYear === ny : anchorYear === ny && anchorMonth === nm);
  if (!inCurrent) return past;

  // Танҳо як давраи оянда (хира) дар боло, то ҳозира дар ҷои дуюм бошад
  const next = periodAt(kind, 1, now);
  const [ny1, nm1, nd1] = next.start.split('-').map(Number);
  const nextLabel =
    kind === 'year' ? String(ny1)
    : kind === 'day' ? `${nd1} ${MONTHS[nm1 - 1]} · ${WEEKDAYS[new Date(ny1, nm1 - 1, nd1).getDay()]}`
    : periodLabel(kind, next);
  return [make(1, nextLabel), ...past];
}

// ======================= Ҳисобҳо ва дарахти тақсим =======================

/** Ҳисобҳои пешфарз. */
export const DEFAULT_ACCOUNTS: AccountDef[] = [
  { id: 'charity', name: 'Садақа', icon: '🤲', color: '#b7791f' },
  { id: 'parents', name: 'Волидон', icon: '👨‍👩‍👧', color: '#b24a6c' },
  { id: 'future', name: 'Барои оянда', icon: '🌱', color: '#2f857b' },
  { id: 'fun', name: 'Вақтхушӣ', icon: '🎉', color: '#7a5bb8' },
  { id: 'debt', name: 'Пардохти қарз', icon: '💳', color: '#b3453b' },
  { id: 'capital', name: 'Сармоя', icon: '📈', color: '#1f6fa3' },
  { id: 'bigDream', name: 'Орзуи калон', icon: '🏠', color: '#2f7d55' },
  { id: 'smallDream', name: 'Орзуи хурд', icon: '✈️', color: '#2f8fb5' },
  { id: 'living', name: 'Хароҷоти зиндагӣ', icon: '🛒', color: '#46688f' },
];

/** Ҳисобҳое, ки бо хусусиятҳои барнома пайваст аст ва нест намешаванд (таҳрир мешаванд). */
export const PROTECTED_IDS: AccountId[] = ['debt', 'bigDream', 'smallDream', 'fun'];

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const round4 = (v: number) => Math.round(v * 10000) / 10000;

/** Фоизи охирини ҳар гурӯҳ — боқимонда: ҷамъ ҳамеша 100% мешавад. */
export function normalizeTree(root: DistNode): DistNode {
  const t = clone(root);
  const walk = (n: DistNode) => {
    if (n.type !== 'group' || n.children.length === 0) return;
    const last = n.children.length - 1;
    let sum = 0;
    for (let i = 0; i < last; i++) sum += n.children[i].percent;
    n.children[last].percent = round4(100 - sum);
    n.children.forEach(walk);
  };
  walk(t);
  return t;
}

/** Хато, агар ҷамъи фоизҳо дар ягон гурӯҳ аз 100% зиёд шавад. */
export function treeError(root: DistNode): string | null {
  let err: string | null = null;
  const walk = (n: DistNode) => {
    if (n.type !== 'group' || err) return;
    const last = n.children[n.children.length - 1];
    if (last && last.percent < -0.0001) err = `Ҷамъи фоизҳо дар «${n.title}» аз 100% зиёд мешавад.`;
    n.children.forEach(walk);
  };
  walk(root);
  return err;
}

export function findNode(root: DistNode, id: string): { node: DistNode; parent: DistNode | null } | null {
  const walk = (n: DistNode, parent: DistNode | null): { node: DistNode; parent: DistNode | null } | null => {
    if (n.id === id) return { node: n, parent };
    if (n.type === 'group') {
      for (const c of n.children) {
        const r = walk(c, n);
        if (r) return r;
      }
    }
    return null;
  };
  return walk(root, null);
}

export function findAccountNode(root: DistNode, accountId: AccountId) {
  const walk = (n: DistNode, parent: DistNode | null): { node: DistNode; parent: DistNode | null } | null => {
    if (n.type === 'account' && n.accountId === accountId) return { node: n, parent };
    if (n.type === 'group') {
      for (const c of n.children) {
        const r = walk(c, n);
        if (r) return r;
      }
    }
    return null;
  };
  return walk(root, null);
}

/** Охирин фарзанди гурӯҳ — боқимонда аст ва фоизи он худкор ҳисоб мешавад. */
export const isRemainderNode = (root: DistNode, id: string) => {
  const f = findNode(root, id);
  if (!f?.parent || f.parent.type !== 'group') return false;
  return f.parent.children[f.parent.children.length - 1].id === id;
};

export function setNodePercent(root: DistNode, id: string, percent: number): DistNode {
  const t = clone(root);
  const f = findNode(t, id);
  if (f) f.node.percent = percent;
  return normalizeTree(t);
}

export function patchGroup(root: DistNode, id: string, patch: { title?: string; icon?: string }): DistNode {
  const t = clone(root);
  const f = findNode(t, id);
  if (f && f.node.type === 'group') {
    if (patch.title !== undefined) f.node.title = patch.title;
    if (patch.icon !== undefined) f.node.icon = patch.icon;
  }
  return t;
}

/** Ҳисоби нав пеш аз боқимонда (охирин) илова мешавад. */
export function addAccountNode(root: DistNode, parentId: string, accountId: AccountId, percent: number): DistNode {
  const t = clone(root);
  const f = findNode(t, parentId);
  if (f && f.node.type === 'group') {
    const node: DistNode = { id: `n_${accountId}`, type: 'account', accountId, percent };
    const at = Math.max(0, f.node.children.length - 1);
    f.node.children.splice(at, 0, node);
  }
  return normalizeTree(t);
}

export function removeAccountNode(root: DistNode, accountId: AccountId): DistNode {
  const t = clone(root);
  const f = findAccountNode(t, accountId);
  if (f?.parent && f.parent.type === 'group') {
    f.parent.children = f.parent.children.filter(c => c.id !== f.node.id);
  }
  return normalizeTree(t);
}

/** Ҳиссаи воқеии гиреҳ аз ҳар 100 сомони даромад. */
export function effectiveShareNode(root: DistNode, id: string): number {
  let result = 0;
  const walk = (n: DistNode, share: number): boolean => {
    if (n.id === id) { result = share; return true; }
    if (n.type === 'group') {
      for (const c of n.children) if (walk(c, (share * c.percent) / 100)) return true;
    }
    return false;
  };
  walk(root, 100);
  return result;
}

/** Рӯйхати гурӯҳҳо барои интихоби «волид» ҳангоми иловаи ҳисоб. */
export function groupOptions(root: DistNode): { id: string; label: string }[] {
  const out: { id: string; label: string }[] = [];
  const walk = (n: DistNode, trail: string[]) => {
    if (n.type !== 'group') return;
    const t = [...trail, n.title];
    out.push({ id: n.id, label: t.join(' › ') });
    n.children.forEach(c => walk(c, t));
  };
  walk(root, []);
  return out;
}

/** Дарахти пешфарз (аз фоизҳои версияи кӯҳна, агар бошанд). */
export function defaultTree(s: Settings = DEFAULT_SETTINGS): DistNode {
  const acct = (id: AccountId, percent: number): DistNode => ({ id: `n_${id}`, type: 'account', accountId: id, percent });
  const grp = (id: string, title: string, icon: string, percent: number, children: DistNode[]): DistNode =>
    ({ id, type: 'group', title, icon, percent, children });
  return normalizeTree(
    grp('root', 'Даромади умумӣ', '🧾', 100, [
      acct('charity', s.charity),
      acct('parents', s.parents),
      acct('future', s.future),
      acct('debt', s.debt ?? 10),
      acct('fun', s.fun),
      grp('monthly', 'Даромади моҳона', '🗓️', 0, [
        grp('company', 'Ҳисоби ширкат', '🏢', s.company, [
          acct('capital', s.capital),
          grp('dream', 'Орзу', '✨', 0, [acct('bigDream', s.bigDream), acct('smallDream', 0)]),
        ]),
        grp('personal', 'Ҳисоби шахсӣ', '👤', 0, [acct('living', 100)]),
      ]),
    ]),
  );
}

export const DEFAULT_SETTINGS: Settings = {
  charity: 2.5,
  parents: 10,
  future: 10,
  fun: 10,
  debt: 10,
  company: 55,
  capital: 80,
  bigDream: 50,
};

// ----- Рӯйхатҳои зинда (аз ҳолати барнома пур мешаванд) -----

export const ACCOUNTS: Record<AccountId, { name: string; icon: string }> = {};
export const CARD_COLORS: Record<AccountId, string> = {};
export const ACCOUNT_ORDER: AccountId[] = [];
export const ALL_IDS: AccountId[] = [];
export const ACCOUNT_TREE: AccountGroup[] = [];
const GROUP_NOTES: Record<string, string> = {};
const LEAF_INFO: Record<AccountId, { percent: number; parent: string }> = {};

/** Рӯйхатҳои зиндаро аз ҳолати ҷорӣ нав мекунад (дар болои render-и барнома даъват мешавад). */
export function syncCatalog(s: Pick<State, 'accounts' | 'tree'>) {
  for (const o of [ACCOUNTS, CARD_COLORS, GROUP_NOTES, LEAF_INFO] as Record<string, unknown>[]) {
    for (const k of Object.keys(o)) delete o[k];
  }
  ACCOUNT_ORDER.length = 0;
  ALL_IDS.length = 0;
  ACCOUNT_TREE.length = 0;

  for (const a of s.accounts) {
    ACCOUNTS[a.id] = { name: a.name, icon: a.icon };
    CARD_COLORS[a.id] = a.color;
    ALL_IDS.push(a.id);
  }
  const active = (id: AccountId) => s.accounts.some(a => a.id === id && !a.archived);
  const n2 = (v: number) => fmt(Math.round(v * 100) / 100);

  const convert = (g: Extract<DistNode, { type: 'group' }>): AccountGroup => ({
    key: g.id,
    title: g.title,
    icon: g.icon,
    items: g.children.flatMap((c): (AccountId | AccountGroup)[] =>
      c.type === 'account' ? (active(c.accountId) ? [c.accountId] : []) : [convert(c)]),
  });

  const noteWalk = (g: Extract<DistNode, { type: 'group' }>, parentTitle: string) => {
    GROUP_NOTES[g.id] = `${n2(g.percent)}% аз ${parentTitle}`;
    for (const c of g.children) {
      if (c.type === 'group') noteWalk(c, g.title.toLowerCase());
      else LEAF_INFO[c.accountId] = { percent: c.percent, parent: g.title.toLowerCase() };
    }
  };

  const root = s.tree;
  if (root.type === 'group') {
    const general: AccountGroup['items'] = [];
    const groups: AccountGroup[] = [];
    let generalSum = 0;
    for (const c of root.children) {
      if (c.type === 'account') {
        generalSum += c.percent;
        LEAF_INFO[c.accountId] = { percent: c.percent, parent: root.title.toLowerCase() };
        if (active(c.accountId)) general.push(c.accountId);
      } else if (c.id === 'monthly') {
        GROUP_NOTES[c.id] = `${n2(c.percent)}% аз ${root.title.toLowerCase()}`;
        for (const g of c.children) {
          if (g.type === 'group') {
            noteWalk(g, c.title.toLowerCase());
            groups.push(convert(g));
          } else {
            LEAF_INFO[g.accountId] = { percent: g.percent, parent: c.title.toLowerCase() };
            if (active(g.accountId)) general.push(g.accountId);
          }
        }
      } else {
        noteWalk(c, root.title.toLowerCase());
        groups.push(convert(c));
      }
    }
    if (active('debt') && !general.includes('debt')) general.push('debt');
    GROUP_NOTES.general = `${n2(generalSum)}% аз ${root.title.toLowerCase()}`;
    ACCOUNT_TREE.push({ key: 'general', title: 'Аз даромади умумӣ', icon: '🧾', items: general }, ...groups);
  }

  for (const g of ACCOUNT_TREE) for (const id of leavesOf(g)) if (!ACCOUNT_ORDER.includes(id)) ACCOUNT_ORDER.push(id);
}

syncCatalog({ accounts: DEFAULT_ACCOUNTS, tree: defaultTree() });
