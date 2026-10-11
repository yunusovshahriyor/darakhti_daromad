import { fmt, balancesOf, inPeriod, periodAt, remaining, openLoans, loanLeft } from '../../src/model';
import { nextInstallment } from '../../src/loanPlan';
import type { State } from '../../src/types';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const CUR = 'смн';
const money = (n: number) => `<b>${fmt(n)}</b> ${CUR}`;

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

const when = (days: number) =>
  days < 0 ? `⚠️ <b>${-days} рӯз гузашт</b>` : days === 0 ? '🔔 <b>имрӯз</b>' : days === 1 ? '🔔 <b>пагоҳ</b>' : `🗓 пас аз ${days} рӯз`;

const dueLine = (x: Due) => `• ${esc(x.title)} — ${money(x.toPay)}\n  ${when(x.days)} (${fmtDate(x.due)})`;

/** Ёдоварии ҳаррӯза: имрӯз, пагоҳ, пас аз 3 рӯз ва гузаштаҳо. `null` — чизе нест. */
export function reminderText(s: State, today: string): string | null {
  const list = dues(s, today, 3).filter(x => x.days <= 1 || x.days === 3);
  if (!list.length) return null;
  return `⏰ <b>Ёдоварии пардохтҳо</b>\n\n${list.map(dueLine).join('\n')}`;
}

export function debtsText(s: State, today: string): string {
  const open = s.debts.filter(d => remaining(d) > 0.005);
  const loans = openLoans(s.loans);
  if (!open.length && !loans.length) return '🎉 Қарз надоред.';
  const parts: string[] = [];
  if (open.length) {
    const total = open.reduce((a, d) => a + remaining(d), 0);
    parts.push(`💳 <b>Шумо қарздоред:</b> ${money(total)}\n${open.map(d => `• ${esc(d.title)} — ${money(remaining(d))}`).join('\n')}`);
  }
  const ds = dues(s, today);
  if (ds.length) parts.push(`📅 <b>Пардохтҳои навбатӣ</b>\n${ds.map(dueLine).join('\n')}`);
  if (loans.length) {
    const total = loans.reduce((a, l) => a + loanLeft(l), 0);
    parts.push(`🤝 <b>Ба шумо қарздоранд:</b> ${money(total)}\n${loans.map(l => `• ${esc(l.person)} — ${money(loanLeft(l))}`).join('\n')}`);
  }
  return parts.join('\n\n');
}

/** Хулосаи моҳи ҷорӣ. */
export function summaryText(s: State, today: string): string {
  const now = new Date(`${today}T12:00:00`);
  const p = periodAt('month', 0, now);
  const inc = s.incomes.filter(i => inPeriod(i.date, p) && !i.kind);
  const exp = s.expenses.filter(e => inPeriod(e.date, p));
  const incSum = inc.reduce((a, i) => a + i.amount, 0);
  const expSum = exp.reduce((a, e) => a + e.amount, 0);
  const total = Object.values(balancesOf(s)).reduce((a, v) => a + v, 0);

  const cats = new Map<string, number>();
  for (const e of exp) cats.set(e.category || 'Дигар', (cats.get(e.category || 'Дигар') ?? 0) + e.amount);
  const top = [...cats.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);

  const lines = [
    `📊 <b>Хулосаи моҳ</b> (${esc(p.big)})`,
    '',
    `💰 Бақияи умумӣ: ${money(total)}`,
    `📈 Даромад: ${money(incSum)}`,
    `📉 Хароҷот: ${money(expSum)}`,
  ];
  if (top.length) lines.push('', '🏷 <b>Хароҷоти асосӣ</b>', ...top.map(([c, v]) => `• ${esc(c)} — ${money(v)}`));
  const open = s.debts.filter(d => remaining(d) > 0.005);
  if (open.length) lines.push('', `💳 Қарз: ${money(open.reduce((a, d) => a + remaining(d), 0))}`);
  const soon = dues(s, today, 7);
  if (soon.length) lines.push('', '⏰ <b>Пардохтҳои наздик</b>', ...soon.map(dueLine));
  return lines.join('\n');
}
