import type { Debt, DebtPlan } from './types';

export interface Installment {
  n: number;
  due: string;
  principal: number;
  interest: number;
  payment: number;
  /** Сана ё маблағи ин қист дастӣ иваз шудааст. */
  edited?: boolean;
}

const r2 = (v: number) => Math.round(v * 100) / 100;

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const parse = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const daysBetween = (a: string, b: string) => Math.round((parse(b).getTime() - parse(a).getTime()) / 86400000);

/** Санаи ISO + k моҳ (рӯз аз рӯи дарозии моҳ кӯтоҳ мешавад: 31 январ + 1 моҳ = 28/29 феврал). */
export function addMonths(isoDate: string, k: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const total = m - 1 + k;
  const ny = y + Math.floor(total / 12);
  const nm = ((total % 12) + 12) % 12;
  const last = new Date(ny, nm + 1, 0).getDate();
  return `${ny}-${String(nm + 1).padStart(2, '0')}-${String(Math.min(d, last)).padStart(2, '0')}`;
}

/** Санаи қисти k-ум: рӯзи муайяни моҳ; агар шанбе/якшанбе афтад, ба душанбе мегузарад. */
export function dueDate(start: string, k: number, payDay: number, shiftWeekend: boolean): string {
  const [y, m] = start.split('-').map(Number);
  const total = m - 1 + k;
  const ny = y + Math.floor(total / 12);
  const nm = ((total % 12) + 12) % 12;
  const last = new Date(ny, nm + 1, 0).getDate();
  const d = new Date(ny, nm, Math.min(payDay, last));
  if (shiftWeekend) {
    if (d.getDay() === 6) d.setDate(d.getDate() + 2);
    else if (d.getDay() === 0) d.setDate(d.getDate() + 1);
  }
  return iso(d);
}

/**
 * Ҷадвали супоридани ҳармоҳа.
 * - annuity: қисти баробар, фоиз = боқӣ × (фоиз/12).
 * - diff: қисми асосии баробар, фоиз аз боқӣ.
 * - actual: қисти собити бонк, фоиз = боқӣ × фоиз × рӯзҳои воқеӣ ÷ 365 (аз супориши қаблӣ).
 * Қисти охирин боқимондаро мепӯшонад.
 */
export function buildSchedule(plan: DebtPlan, start: string): Installment[] {
  const { principal: P, months: n, method } = plan;
  const payDay = plan.payDay ?? Number(start.split('-')[2]);
  const shift = plan.shiftWeekend ?? false;
  const r = plan.rate / 100 / 12;
  const annuity = r > 0 ? (P * r) / (1 - Math.pow(1 + r, -n)) : P / n;
  const rows: Installment[] = [];
  let bal = P;
  let prev = start;
  for (let i = 1; i <= n && bal > 0.005; i++) {
    const ov = plan.overrides?.[i];
    const due = ov?.due ?? dueDate(start, i, payDay, shift);
    const interest = method === 'actual'
      ? r2((bal * plan.rate * Math.max(0, daysBetween(prev, due))) / 100 / 365)
      : r2(bal * r);
    let payment: number;
    if (i === n) payment = r2(bal + interest);
    else if (ov?.payment !== undefined) payment = ov.payment;
    else if (method === 'actual') payment = plan.payment ?? r2(annuity);
    else if (method === 'annuity') payment = r2(annuity);
    else payment = r2(P / n + interest);
    let principal = r2(payment - interest);
    if (principal > bal || i === n) { principal = r2(bal); payment = r2(principal + interest); }
    bal = r2(bal - principal);
    rows.push({ n: i, due, principal, interest, payment, edited: ov !== undefined });
    prev = due;
  }
  return rows;
}

export const planTotals = (rows: Installment[]) => ({
  total: r2(rows.reduce((s, x) => s + x.payment, 0)),
  interest: r2(rows.reduce((s, x) => s + x.interest, 0)),
});

/** Қисти ҳамон рӯз ба охир нарасидааст: пардохти қисти маҷбурии ҳар моҳ аз фоизи ҳисобшуда кам аст. */
export const paymentCoversInterest = (plan: DebtPlan, start: string) => {
  const rows = buildSchedule(plan, start);
  return rows.length > 0 && rows[0].principal > 0;
};

/** Ҷамъи қистҳои то санаи `until` (бо ҳамон санаҳо). */
export const paidThrough = (rows: Installment[], until: string) =>
  r2(rows.filter(x => x.due <= until).reduce((s, x) => s + x.payment, 0));

export interface DueInfo {
  row: Installment;
  /** Чӣ қадар то пурра супоридани ҳамин қист мондааст. */
  toPay: number;
  overdue: boolean;
  /** Ҷамъи қистҳои гузашта (санааш расидааст), ки ҳанӯз супорида нашудаанд. */
  overdueSum: number;
}

/** Қисти навбатии супоридашуда: аввалин қисте, ки то ҳол пурра пардохт нашудааст. */
export function nextInstallment(d: Debt, today: string): DueInfo | null {
  if (!d.plan) return null;
  const rows = buildSchedule(d.plan, d.date ?? today);
  let cum = 0;
  let overdueSum = 0;
  for (const row of rows) {
    cum = r2(cum + row.payment);
    if (cum > d.paid + 0.005) {
      const toPay = r2(cum - d.paid);
      if (row.due < today) overdueSum = toPay;
      return { row, toPay, overdue: row.due < today, overdueSum };
    }
  }
  return null;
}
