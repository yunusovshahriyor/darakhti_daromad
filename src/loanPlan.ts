import type { Debt, DebtPlan } from './types';

export interface Installment {
  n: number;
  due: string;
  principal: number;
  interest: number;
  payment: number;
}

const r2 = (v: number) => Math.round(v * 100) / 100;

/** Санаи ISO + k моҳ (рӯз аз рӯи дарозии моҳ кӯтоҳ мешавад: 31 январ + 1 моҳ = 28/29 феврал). */
export function addMonths(iso: string, k: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const total = m - 1 + k;
  const ny = y + Math.floor(total / 12);
  const nm = ((total % 12) + 12) % 12;
  const last = new Date(ny, nm + 1, 0).getDate();
  return `${ny}-${String(nm + 1).padStart(2, '0')}-${String(Math.min(d, last)).padStart(2, '0')}`;
}

/** Ҷадвали супоридани ҳармоҳа: аннуитетӣ (қисти баробар) ё дифференсиалӣ (қисми асосии баробар). */
export function buildSchedule(plan: DebtPlan, start: string): Installment[] {
  const { principal: P, months: n, method } = plan;
  const r = plan.rate / 100 / 12;
  const rows: Installment[] = [];
  let bal = P;
  const annuity = r > 0 ? (P * r) / (1 - Math.pow(1 + r, -n)) : P / n;
  for (let i = 1; i <= n; i++) {
    const interest = r2(bal * r);
    let principal = method === 'annuity' ? r2(annuity - interest) : r2(P / n);
    if (i === n) principal = r2(bal); // боқимонда дар қисти охирин
    bal = r2(bal - principal);
    rows.push({ n: i, due: addMonths(start, i), principal, interest, payment: r2(principal + interest) });
  }
  return rows;
}

export const planTotals = (rows: Installment[]) => ({
  total: r2(rows.reduce((s, x) => s + x.payment, 0)),
  interest: r2(rows.reduce((s, x) => s + x.interest, 0)),
});

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
