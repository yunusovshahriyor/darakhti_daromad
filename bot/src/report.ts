import { fmt, balancesOf, inPeriod, periodAt, remaining, openLoans, loanLeft } from '../../src/model';
import { nextInstallment } from '../../src/loanPlan';
import type { State } from '../../src/types';
import type { TFn } from './i18n';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const money = (t: TFn, n: number) => `<b>${fmt(n)}</b> ${t("смн")}`;

const parse = (s: string) => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); };
export const daysBetween = (a: string, b: string) => Math.round((parse(b) - parse(a)) / 86400000);

export const dateOf = (tz: string, d = new Date()) => new Intl.DateTimeFormat('sv-SE', { timeZone: tz }).format(d);
const fmtDate = (iso: string) => iso.split('-').reverse().join('.');

export interface Due { title: string; due: string; toPay: number; days: number }

/** Пардохтҳои навбатии қарзҳои бонкӣ (аз гузашта то `within` рӯз ба пеш). */
export function dues(s: State, today: string, within = 3650): Due[] {
  const out: Due[] = [];
  for (const d of s.debts) {
    if (remaining(d) <= 0.005) continue;
    const n = nextInstallment(d, today);
    if (!n) continue;
    const days = daysBetween(today, n.row.due);
    if (days <= within) out.push({ title: d.title, due: n.row.due, toPay: n.overdue ? n.overdueSum : n.toPay, days });
  }
  return out.sort((a, b) => a.due.localeCompare(b.due));
}

const when = (t: TFn, days: number) =>
  days < 0 ? t("⚠️ <b>{0} рӯз гузашт</b>", -days) : days === 0 ? t("🔔 <b>имрӯз</b>") : days === 1 ? t("🔔 <b>пагоҳ</b>") : t("🗓 пас аз {0} рӯз", days);

const dueLine = (t: TFn, x: Due) => `• ${esc(x.title)} — ${money(t, x.toPay)}\n  ${when(t, x.days)} (${fmtDate(x.due)})`;

/** Ёдоварии пардохтҳо: `pay` — имрӯз, пагоҳ, пас аз 3 рӯз; `overdue` — гузаштаҳо. `null` — чизе нест. */
export function reminderText(t: TFn, s: State, today: string, o: { pay?: boolean; overdue?: boolean } = { pay: true, overdue: true }): string | null {
  const list = dues(s, today, 3).filter(x => (o.overdue && x.days < 0) || (o.pay && (x.days === 0 || x.days === 1 || x.days === 3)));
  if (!list.length) return null;
  const head = o.overdue && !o.pay ? t("⚠️ <b>Пардохти дер шуда</b>") : t("⏰ <b>Ёдоварии пардохтҳо</b>");
  return `${head}\n\n${list.map(x => dueLine(t, x)).join('\n')}`;
}

export function debtsText(t: TFn, s: State, today: string): string {
  const open = s.debts.filter(d => remaining(d) > 0.005);
  const loans = openLoans(s.loans);
  if (!open.length && !loans.length) return t("🎉 Қарз надоред.");
  const parts: string[] = [];
  if (open.length) {
    const total = open.reduce((a, d) => a + remaining(d), 0);
    parts.push(t("💳 <b>Шумо қарздоред:</b> {0}\n{1}", money(t, total), open.map(d => `• ${esc(d.title)} — ${money(t, remaining(d))}`).join('\n')));
  }
  const ds = dues(s, today);
  if (ds.length) parts.push(t("📅 <b>Пардохтҳои навбатӣ</b>\n{0}", ds.map(x => dueLine(t, x)).join('\n')));
  if (loans.length) {
    const total = loans.reduce((a, l) => a + loanLeft(l), 0);
    parts.push(t("🤝 <b>Ба шумо қарздоранд:</b> {0}\n{1}", money(t, total), loans.map(l => `• ${esc(l.person)} — ${money(t, loanLeft(l))}`).join('\n')));
  }
  return parts.join('\n\n');
}

/** Хулосаи моҳи ҷорӣ. */
export function summaryText(t: TFn, s: State, today: string): string {
  const now = new Date(`${today}T12:00:00`);
  const p = periodAt('month', 0, now);
  const inc = s.incomes.filter(i => inPeriod(i.date, p) && !i.kind);
  const exp = s.expenses.filter(e => inPeriod(e.date, p));
  const incSum = inc.reduce((a, i) => a + i.amount, 0);
  const expSum = exp.reduce((a, e) => a + e.amount, 0);
  const total = Object.values(balancesOf(s)).reduce((a, v) => a + v, 0);

  const cats = new Map<string, number>();
  for (const e of exp) cats.set(e.category || t("Дигар"), (cats.get(e.category || t("Дигар")) ?? 0) + e.amount);
  const top = [...cats.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);

  const lines = [
    t("📊 <b>Хулосаи моҳ</b> ({0})", esc(t(p.big))),
    '',
    t("💰 Бақияи умумӣ: {0}", money(t, total)),
    t("📈 Даромад: {0}", money(t, incSum)),
    t("📉 Хароҷот: {0}", money(t, expSum)),
  ];
  if (top.length) lines.push('', t("🏷 <b>Хароҷоти асосӣ</b>"), ...top.map(([c, v]) => `• ${esc(t(c))} — ${money(t, v)}`));
  const open = s.debts.filter(d => remaining(d) > 0.005);
  if (open.length) lines.push('', t("💳 Қарз: {0}", money(t, open.reduce((a, d) => a + remaining(d), 0))));
  const soon = dues(s, today, 7);
  if (soon.length) lines.push('', t("⏰ <b>Пардохтҳои наздик</b>"), ...soon.map(x => dueLine(t, x)));
  return lines.join('\n');
}
