import { balancesOf, fmt, fundDreams, loanLeft, openLoans, remaining } from '../../src/model';
import type { State } from '../../src/types';
import { daysBetween } from './report';

/** Калидҳои огоҳиномаҳо ва пешфарз (true — фаъол). */
export const NOTIFY: { key: string; label: string; group: string; def: boolean }[] = [
  { key: 'pay', label: '💳 Ёдоварии пардохтҳо', group: 'Ҳатмӣ', def: true },
  { key: 'overdue', label: '⚠️ Пардохти дер шуда', group: 'Ҳатмӣ', def: true },
  { key: 'weekly', label: '📊 Хулосаи ҳафтаина', group: 'Ҳатмӣ', def: true },
  { key: 'monthly', label: '🗓 Хулосаи моҳ', group: 'Ҳатмӣ', def: true },
  { key: 'noentry', label: '✍️ «Сабт накардед»', group: 'Тавсияшаванда', def: true },
  { key: 'dreams', label: '✨ Орзуҳо (ҳадаф ва муҳлат)', group: 'Тавсияшаванда', def: true },
  { key: 'debtpaid', label: '🎉 Қарз пардохт шуд', group: 'Тавсияшаванда', def: true },
  { key: 'autosave', label: '🐷 Ҷамъкунии даврӣ', group: 'Тавсияшаванда', def: true },
  { key: 'goals', label: '🎯 Ҳадафи ҳисоб', group: 'Тавсияшаванда', def: true },
  { key: 'loans', label: '🤝 Қарздорон', group: 'Тавсияшаванда', def: true },
  { key: 'bigexp', label: '💸 Хароҷоти калон', group: 'Ихтиёрӣ', def: false },
  { key: 'catover', label: '📈 Категорияи аз миёна зиёд', group: 'Ихтиёрӣ', def: false },
  { key: 'evening', label: '🌙 Хулосаи рӯз', group: 'Ихтиёрӣ', def: false },
  { key: 'tips', label: '💡 Маслиҳат (ҳафтае)', group: 'Ихтиёрӣ', def: false },
];

export type Flags = Record<string, boolean>;

/** Ёддошти «чӣ аллакай гуфта шуд»: то огоҳӣ такрор нашавад. */
export interface Seen {
  debtsPaid: number[];
  dreamsReady: number[];
  dl: Record<string, number[]>;
  auto: Record<string, number>;
  goals: Record<string, number>;
  loanNudge: Record<string, string>;
  noEntry: string;
  big: number[];
  cat: Record<string, string>;
}

export const emptySeen = (): Seen => ({ debtsPaid: [], dreamsReady: [], dl: {}, auto: {}, goals: {}, loanNudge: {}, noEntry: '', big: [], cat: {} });

const TIPS = [
  'Ҳар даромадро фавран тақсим кунед: бе тақсим пул «гум» мешавад.',
  'Аввал қарзи хурдтаринро пардохт кунед: ҳар қарзи пӯшидашуда рӯҳ медиҳад.',
  'Барои орзуҳо ҷамъкунии даврӣ (ҳафтаина) гузоред: маблағи хурд, вале мунтазам.',
  'Хароҷотро дар ҳамон рӯз сабт кунед: пас аз ҳафта фаромӯш мешавад.',
  'Пеш аз харидҳои калон 24 соат интизор шавед.',
  'Ҳадди хароҷоти моҳро ба ҳисоби «Вақтхушӣ» пешакӣ ҷудо кунед.',
  'Ҳар моҳ дар хулоса бубинед, кадом категория аз ҳама зиёд аст.',
  'Қарзҳои бонкиро бо санаи пардохт нигоҳ доред, то ҷарима нашавад.',
];

const money = (n: number) => `<b>${fmt(n)}</b> смн`;
const esc = (x: string) => x.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

/**
 * Огоҳиномаҳои ҳаррӯза (ба ғайр аз ёдоварии пардохтҳо ва хулосаҳо).
 * `prev === null` — аввалин дафъа: танҳо ҳолати ҷорӣ ёд мешавад, огоҳӣ намеояд (то ки гузаштаи кӯҳна «фурӯ нарезад»).
 */
export function buildDigest(s: State, prev: Seen | null, f: Flags, today: string): { lines: string[]; seen: Seen } {
  const p = prev ?? emptySeen();
  const next: Seen = { ...emptySeen(), ...p, dl: { ...p.dl }, auto: { ...p.auto }, goals: { ...p.goals }, loanNudge: { ...p.loanNudge }, cat: { ...p.cat }, big: [...p.big] };
  const lines: string[] = [];
  const bal = balancesOf(s);
  const accName = (id: string) => s.accounts.find(a => a.id === id)?.name ?? id;

  // Қарзи пардохтшуда
  const paid = s.debts.filter(d => d.amount > 0 && remaining(d) <= 0.005);
  if (f.debtpaid) for (const d of paid) if (!p.debtsPaid.includes(d.id)) lines.push(`🎉 Қарзи «${esc(d.title)}» пурра пардохт шуд! Табрик!`);
  next.debtsPaid = paid.map(d => d.id);

  // Орзуҳо: ҳадаф расид + муҳлат наздик
  const ready: number[] = [];
  const pct = new Map<number, number>();
  for (const kind of ['big', 'small'] as const) {
    const pool = bal[kind === 'big' ? 'bigDream' : 'smallDream'] ?? 0;
    for (const x of fundDreams(s.dreams.filter(d => d.kind === kind), pool)) {
      pct.set(x.dream.id, x.dream.target > 0 ? Math.min(100, Math.round((x.funded / x.dream.target) * 100)) : 0);
      if (x.ready) ready.push(x.dream.id);
    }
  }
  if (f.dreams) {
    for (const id of ready) if (!p.dreamsReady.includes(id)) {
      const d = s.dreams.find(x => x.id === id);
      if (d) lines.push(`✨ Барои «${esc(d.title)}» маблағи кофӣ ҷамъ шуд! Метавонед харидорӣ кунед.`);
    }
    for (const d of s.dreams) {
      if (d.boughtAt || !d.deadline) continue;
      const days = daysBetween(today, d.deadline);
      const sent = next.dl[d.id] ?? [];
      for (const m of [30, 7, 1]) {
        if (days === m && !sent.includes(m) && !ready.includes(d.id)) {
          lines.push(`⏳ Барои «${esc(d.title)}» ${m} рӯз то муҳлат монд, ҷамъ шудааст ${pct.get(d.id) ?? 0}%.`);
          next.dl[d.id] = [...sent, m];
        }
      }
    }
  }
  next.dreamsReady = ready;

  // Ҷамъкунии даврӣ
  for (const d of s.dreams) {
    if (!d.autoSave) continue;
    const c = d.autoSave.count;
    const before = p.auto[d.id];
    if (f.autosave && before !== undefined && c > before) lines.push(`🐷 Ба «${esc(d.title)}» ҷамъкунии даврӣ иҷро шуд (ҳамагӣ ${c} маротиба).`);
    next.auto[d.id] = c;
  }

  // Ҳадафи ҳисоб
  for (const [id, target] of Object.entries(s.goals)) {
    if (!target || target <= 0) continue;
    const r = (bal[id] ?? 0) / target;
    const stage = r >= 1 ? 100 : r >= 0.9 ? 90 : 0;
    const before = p.goals[id] ?? 0;
    if (f.goals && stage > before) lines.push(stage === 100 ? `🎯 Ба ҳадафи ҳисоби «${esc(accName(id))}» расидед!` : `🎯 Ба ҳадафи ҳисоби «${esc(accName(id))}» қариб расидед (90%).`);
    next.goals[id] = stage;
  }

  // Қарздорон (ба шумо қарздоранд)
  for (const l of openLoans(s.loans)) {
    const last = p.loanNudge[l.id] ?? l.date;
    if (daysBetween(l.date, today) >= 30 && daysBetween(last, today) >= 30) {
      if (f.loans) lines.push(`🤝 ${esc(l.person)} ${daysBetween(l.date, today)} рӯз аст, ки ${money(loanLeft(l))}-ро барнагардондааст.`);
      next.loanNudge[l.id] = today;
    }
  }

  // «Сабт накардед»
  const dates = [...s.incomes.map(i => i.date), ...s.expenses.map(e => e.date)];
  if (dates.length) {
    const gap = daysBetween(dates.reduce((a, b) => (a > b ? a : b)), today);
    if (gap >= 3 && daysBetween(p.noEntry || '1970-01-01', today) >= 3) {
      if (f.noentry) lines.push(`✍️ ${gap} рӯз аст, ки даромад ё хароҷот сабт нашудааст. Андаке вақт ҷудо кунед.`);
      next.noEntry = today;
    }
  }

  // Хароҷоти калон: ≥ 3 маротиба аз миёнаи 90 рӯзи охир (на камтар аз 100)
  if (f.bigexp) {
    const recent = s.expenses.filter(e => daysBetween(e.date, today) <= 90 && daysBetween(e.date, today) >= 0);
    const avg = recent.length ? sum(recent.map(e => e.amount)) / recent.length : 0;
    const limit = Math.max(100, avg * 3);
    for (const e of s.expenses) {
      const age = daysBetween(e.date, today);
      if (age >= 0 && age <= 1 && e.amount >= limit && !p.big.includes(e.id)) {
        lines.push(`💸 Хароҷоти калон: «${esc(e.title || e.category || 'хароҷот')}», ${money(e.amount)}.`);
        next.big.push(e.id);
      }
    }
    next.big = next.big.slice(-60);
  }

  // Категория аз миёнаи 3 моҳи пеш 40% зиёд
  if (f.catover) {
    const month = today.slice(0, 7);
    const monthsBack = (k: number) => {
      const [y, m] = month.split('-').map(Number);
      const d = new Date(Date.UTC(y, m - 1 - k, 1));
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    };
    const prevMonths = [1, 2, 3].map(monthsBack);
    const cur = new Map<string, number>();
    const old = new Map<string, number>();
    for (const e of s.expenses) {
      const c = e.category || 'Дигар';
      if (e.date.startsWith(month)) cur.set(c, (cur.get(c) ?? 0) + e.amount);
      else if (prevMonths.some(m => e.date.startsWith(m))) old.set(c, (old.get(c) ?? 0) + e.amount);
    }
    for (const [c, v] of cur) {
      const avg = (old.get(c) ?? 0) / 3;
      if (avg > 0 && v >= avg * 1.4 && v >= 200 && next.cat[c] !== month) {
        lines.push(`📈 Ин моҳ барои «${esc(c)}» ${money(v)} сарф шуд: аз миёнаи моҳҳои пеш ${Math.round((v / avg - 1) * 100)}% зиёд.`);
        next.cat[c] = month;
      }
    }
  }

  // Хулосаи рӯз
  if (f.evening) {
    const inc = sum(s.incomes.filter(i => i.date === today && !i.kind).map(i => i.amount));
    const exp = sum(s.expenses.filter(e => e.date === today).map(e => e.amount));
    if (inc || exp) lines.push(`🌙 <b>Имрӯз:</b> даромад ${money(inc)}, хароҷот ${money(exp)}. Бақияи умумӣ: ${money(sum(Object.values(bal)))}.`);
  }

  // Маслиҳат (шанбе)
  if (f.tips && new Date(`${today}T12:00:00Z`).getUTCDay() === 6) {
    lines.push(`💡 ${TIPS[Math.floor(Date.parse(today) / (7 * 86400000)) % TIPS.length]}`);
  }

  return { lines: prev === null ? [] : lines, seen: next };
}
