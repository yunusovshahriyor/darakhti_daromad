import { balancesOf, fmt, fundDreams, loanLeft, openLoans, remaining } from '../../src/model';
import type { State } from '../../src/types';
import { daysBetween } from './report';
import { NOTIFY } from '../../src/notify';
import type { TFn } from './i18n';

export { NOTIFY };

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

const tips = (t: TFn) => [
  t("Ҳар даромадро фавран тақсим кунед: бе тақсим пул «гум» мешавад."),
  t("Аввал қарзи хурдтаринро пардохт кунед: ҳар қарзи пӯшидашуда рӯҳ медиҳад."),
  t("Барои орзуҳо ҷамъкунии даврӣ (ҳафтаина) гузоред: маблағи хурд, вале мунтазам."),
  t("Хароҷотро дар ҳамон рӯз сабт кунед: пас аз ҳафта фаромӯш мешавад."),
  t("Пеш аз харидҳои калон 24 соат интизор шавед."),
  t("Ҳадди хароҷоти моҳро ба ҳисоби «Вақтхушӣ» пешакӣ ҷудо кунед."),
  t("Ҳар моҳ дар хулоса бубинед, кадом категория аз ҳама зиёд аст."),
  t("Қарзҳои бонкиро бо санаи пардохт нигоҳ доред, то ҷарима нашавад."),
];

const money = (t: TFn, n: number) => t("<b>{0}</b> смн", fmt(n));
const esc = (x: string) => x.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

/**
 * Огоҳиномаҳои ҳаррӯза (ба ғайр аз ёдоварии пардохтҳо ва хулосаҳо).
 * `prev === null` — аввалин дафъа: танҳо ҳолати ҷорӣ ёд мешавад, огоҳӣ намеояд (то ки гузаштаи кӯҳна «фурӯ нарезад»).
 */
export function buildDigest(t: TFn, s: State, prev: Seen | null, f: Flags, today: string): { lines: string[]; seen: Seen } {
  const p = prev ?? emptySeen();
  const next: Seen = { ...emptySeen(), ...p, dl: { ...p.dl }, auto: { ...p.auto }, goals: { ...p.goals }, loanNudge: { ...p.loanNudge }, cat: { ...p.cat }, big: [...p.big] };
  const lines: string[] = [];
  const bal = balancesOf(s);
  const accName = (id: string) => t(s.accounts.find(a => a.id === id)?.name ?? id);

  // Қарзи пардохтшуда
  const paid = s.debts.filter(d => d.amount > 0 && remaining(d) <= 0.005);
  if (f.debtpaid) for (const d of paid) if (!p.debtsPaid.includes(d.id)) lines.push(t("🎉 Қарзи «{0}» пурра пардохт шуд! Табрик!", esc(d.title)));
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
      if (d) lines.push(t("✨ Барои «{0}» маблағи кофӣ ҷамъ шуд! Метавонед харидорӣ кунед.", esc(d.title)));
    }
    for (const d of s.dreams) {
      if (d.boughtAt || !d.deadline) continue;
      const days = daysBetween(today, d.deadline);
      const sent = next.dl[d.id] ?? [];
      for (const m of [30, 7, 1]) {
        if (days === m && !sent.includes(m) && !ready.includes(d.id)) {
          lines.push(t("⏳ Барои «{0}» {1} рӯз то муҳлат монд, ҷамъ шудааст {2}%.", esc(d.title), m, pct.get(d.id) ?? 0));
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
    if (f.autosave && before !== undefined && c > before) lines.push(t("🐷 Ба «{0}» ҷамъкунии даврӣ иҷро шуд (ҳамагӣ {1} маротиба).", esc(d.title), c));
    next.auto[d.id] = c;
  }

  // Ҳадафи ҳисоб
  for (const [id, target] of Object.entries(s.goals)) {
    if (!target || target <= 0) continue;
    const r = (bal[id] ?? 0) / target;
    const stage = r >= 1 ? 100 : r >= 0.9 ? 90 : 0;
    const before = p.goals[id] ?? 0;
    if (f.goals && stage > before) lines.push(stage === 100 ? t("🎯 Ба ҳадафи ҳисоби «{0}» расидед!", esc(accName(id))) : t("🎯 Ба ҳадафи ҳисоби «{0}» қариб расидед (90%).", esc(accName(id))));
    next.goals[id] = stage;
  }

  // Қарздорон (ба шумо қарздоранд)
  for (const l of openLoans(s.loans)) {
    const last = p.loanNudge[l.id] ?? l.date;
    if (daysBetween(l.date, today) >= 30 && daysBetween(last, today) >= 30) {
      if (f.loans) lines.push(t("🤝 {0} {1} рӯз аст, ки {2}-ро барнагардондааст.", esc(l.person), daysBetween(l.date, today), money(t, loanLeft(l))));
      next.loanNudge[l.id] = today;
    }
  }

  // «Сабт накардед»
  const dates = [...s.incomes.map(i => i.date), ...s.expenses.map(e => e.date)];
  if (dates.length) {
    const gap = daysBetween(dates.reduce((a, b) => (a > b ? a : b)), today);
    if (gap >= 3 && daysBetween(p.noEntry || '1970-01-01', today) >= 3) {
      if (f.noentry) lines.push(t("✍️ {0} рӯз аст, ки даромад ё хароҷот сабт нашудааст. Андаке вақт ҷудо кунед.", gap));
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
        lines.push(t("💸 Хароҷоти калон: «{0}», {1}.", esc(e.title || e.category || t('хароҷот')), money(t, e.amount)));
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
      const c = e.category || t("Дигар");
      if (e.date.startsWith(month)) cur.set(c, (cur.get(c) ?? 0) + e.amount);
      else if (prevMonths.some(m => e.date.startsWith(m))) old.set(c, (old.get(c) ?? 0) + e.amount);
    }
    for (const [c, v] of cur) {
      const avg = (old.get(c) ?? 0) / 3;
      if (avg > 0 && v >= avg * 1.4 && v >= 200 && next.cat[c] !== month) {
        lines.push(t("📈 Ин моҳ барои «{0}» {1} сарф шуд: аз миёнаи моҳҳои пеш {2}% зиёд.", esc(t(c)), money(t, v), Math.round((v / avg - 1) * 100)));
        next.cat[c] = month;
      }
    }
  }

  // Хулосаи рӯз
  if (f.evening) {
    const inc = sum(s.incomes.filter(i => i.date === today && !i.kind).map(i => i.amount));
    const exp = sum(s.expenses.filter(e => e.date === today).map(e => e.amount));
    if (inc || exp) lines.push(t("🌙 <b>Имрӯз:</b> даромад {0}, хароҷот {1}. Бақияи умумӣ: {2}.", money(t, inc), money(t, exp), money(t, sum(Object.values(bal)))));
  }

  // Маслиҳат (шанбе)
  if (f.tips && new Date(`${today}T12:00:00Z`).getUTCDay() === 6) {
    lines.push(`💡 ${tips(t)[Math.floor(Date.parse(today) / (7 * 86400000)) % tips(t).length]}`);
  }

  return { lines: prev === null ? [] : lines, seen: next };
}
