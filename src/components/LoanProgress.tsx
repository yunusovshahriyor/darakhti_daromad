import { fmt } from '../model';
import type { Loan } from '../types';

/** Прогресс-бари баргардонидани қарзи додашуда: «Баргашт 50 аз 100 · боқӣ 50 · 50%». */
export default function LoanProgress({ loan, extra = 0 }: { loan: Loan; extra?: number }) {
  const returned = Math.min(loan.amount, loan.returned + extra);
  const pct = loan.amount > 0 ? (returned / loan.amount) * 100 : 0;
  const left = Math.max(0, loan.amount - returned);
  return (
    <div className="loan-prog">
      <div className="progress"><i style={{ width: `${pct}%` }} /></div>
      <small>
        {left <= 0.005
          ? `✓ Пурра баргашт · ${fmt(loan.amount)} смн`
          : <>Баргашт <b>{fmt(returned)}</b> аз {fmt(loan.amount)} · боқӣ <b>{fmt(left)}</b> · {Math.floor(pct)}%</>}
      </small>
    </div>
  );
}

