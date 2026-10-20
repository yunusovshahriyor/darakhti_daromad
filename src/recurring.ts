import { uid } from './model';
import type { Recurring, State } from './types';

const iso = (d: Date) => d.toLocaleDateString('sv-SE');
const parse = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };

/** Санаи навбатӣ: рӯз +1; ҳафта +7 рӯз; моҳ — ҳамон рӯзи моҳ (агар дар моҳ набошад, охирин рӯз). */
export function addPeriod(from: string, every: Recurring['every'], day = parse(from).getDate()): string {
  const d = parse(from);
  if (every === 'day') { d.setDate(d.getDate() + 1); return iso(d); }
  if (every === 'week') { d.setDate(d.getDate() + 7); return iso(d); }
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const last = new Date(y, m + 1, 0).getDate();
  return iso(new Date(y, m, Math.min(day, last)));
}

export const dueRecurring = (s: State, today: string): Recurring[] =>
  (s.recurring ?? []).filter(r => r.next <= today).sort((a, b) => a.next.localeCompare(b.next));

const advance = (r: Recurring): Recurring => ({ ...r, next: addPeriod(r.next, r.every, r.day) });

/** Хароҷоти такрориро сабт мекунад (бо санаи мӯҳлат) ва мӯҳлати навбатиро мегузаронад. */
export function confirmRecurring(s: State, id: number): State {
  const r = (s.recurring ?? []).find(x => x.id === id);
  if (!r) return s;
  const expense = { id: uid(), account: r.account, title: r.title, amount: r.amount, date: r.next, ...(r.category ? { category: r.category } : {}) };
  return {
    ...s,
    expenses: [...s.expenses, expense].sort((a, b) => b.date.localeCompare(a.date)),
    recurring: (s.recurring ?? []).map(x => (x.id === id ? advance(x) : x)),
  };
}

/** Ин мӯҳлатро мегузаронем (сабт намекунем). */
export const skipRecurring = (s: State, id: number): State =>
  ({ ...s, recurring: (s.recurring ?? []).map(x => (x.id === id ? advance(x) : x)) });

export const newRecurring = (p: { title: string; amount: number; account: string; category?: string; every: Recurring['every']; date: string }): Recurring => ({
  id: uid(), title: p.title, amount: p.amount, account: p.account, ...(p.category ? { category: p.category } : {}),
  every: p.every, day: parse(p.date).getDate(), next: addPeriod(p.date, p.every),
});
