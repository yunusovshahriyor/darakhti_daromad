import { fmt } from '../model';
import type { Loan } from '../types';

/**
 * Прогресс-бари баргардонидани қарзи додашуда.
 * `mark`: ҳиссаи ҳамин баргардонӣ (равшан) нисбат ба баргардониҳои пештара (хира).
 */
export default function LoanProgress({ loan, mark }: { loan: Loan; mark?: { before: number; part: number } }) {
  const before = mark ? mark.before : loan.returned;
  const part = mark ? mark.part : 0;
  const total = Math.min(loan.amount, before + part);
  const pct = (v: number) => (loan.amount > 0 ? Math.min(100, (v / loan.amount) * 100) : 0);
  const left = Math.max(0, loan.amount - total);
  return (
    <div className="loan-prog">
      <div className="lbar">
        <i className={part > 0 ? 'prev' : 'now'} style={{ left: 0, width: `${pct(before)}%` }} />
        {part > 0 && <i className="now" style={{ left: `${pct(before)}%`, width: `${pct(part)}%` }} />}
      </div>
      <small>
        {left <= 0.005
          ? `✓ Пурра баргашт · ${fmt(loan.amount)} смн`
          : <>Баргашт <b>{fmt(total)}</b> аз {fmt(loan.amount)} · боқӣ <b>{fmt(left)}</b> · {Math.floor(pct(total))}%</>}
      </small>
    </div>
  );
}
