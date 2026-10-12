import { useState } from 'react';
import type { Props } from '../views/props';
import ExpenseForm from './ExpenseForm';
import IncomeForm from './IncomeForm';
import { BorrowForm, LendForm, ReturnLoanForm } from './LoanForms';
import PayDebtForm from './PayDebtForm';
import Sheet from './Sheet';
import TransferForm from './TransferForm';

type Kind = 'income' | 'expense' | 'transfer' | 'debt';
type DebtKind = 'lend' | 'back' | 'take' | 'pay';

const KINDS: { id: Kind; label: string; icon: string }[] = [
  { id: 'income', label: 'Даромад', icon: 'M12 4v11m0 0-4-4m4 4 4-4M5 20h14' },
  { id: 'expense', label: 'Хароҷот', icon: 'M12 20V9m0 0-4 4m4-4 4 4M5 4h14' },
  { id: 'transfer', label: 'Гузаронидан', icon: 'M7 7h12m0 0-3-3m3 3-3 3M17 17H5m0 0 3-3m-3 3 3 3' },
  { id: 'debt', label: 'Қарз', icon: 'M3 7h18v12H3zM3 11h18M16 15h2' },
];

/** Варақаи якҷоя: ҷудокунак (даромад / хароҷот / гузаронидан / қарз) ва форма бо тугмачаҳои рақамӣ. */
export default function AddSheet({ state, setState, onClose, onDone }: Props & {
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const [kind, setKind] = useState<Kind>('expense');
  const [debtKind, setDebtKind] = useState<DebtKind>('lend');
  const done = (msg: string) => {
    onDone(msg);
    onClose();
  };
  const common = { state, setState, onDone: done };
  // Ранги тугмаи сабт: сабз барои воридот, торик барои баромад ва гузаронидан
  const tone = kind === 'income' || (kind === 'debt' && (debtKind === 'back' || debtKind === 'take')) ? 'pos' : 'neg';

  const what = (
    <div className="chips-block">
      <div className="chips-label">Чӣ шуд</div>
      <div className="chips">
        {([['lend', 'Қарз додам', '📤'], ['back', 'Қарзро баргардонданд', '📥'], ['take', 'Қарз гирифтам', '🤝'], ['pay', 'Пардохт кардам', '✅']] as [DebtKind, string, string][]).map(([id, label, ic]) => (
          <button key={id} type="button" className={id === debtKind ? 'chip on' : 'chip'} onClick={() => setDebtKind(id)}>
            <span className="chip-ic soft">{ic}</span>
            <span className="chip-t"><b>{label}</b></span>
            {id === debtKind && <span className="chip-ok">✓</span>}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <Sheet title="Амалиёти нав" onClose={onClose} tall>
      <div className={`add-body tone-${tone}`}>
      <div className="kind-tabs" role="tablist">
        {KINDS.map(k => (
          <button key={k.id} type="button" role="tab" aria-selected={k.id === kind}
            className={`kt k-${k.id}${k.id === kind ? ' on' : ''}`} onClick={() => setKind(k.id)}>
            <span className="kt-ic">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={k.icon} /></svg>
            </span>
            <span className="kt-t">{k.label}</span>
          </button>
        ))}
      </div>
      {kind === 'income' && <IncomeForm key="i" {...common} />}
      {kind === 'expense' && <ExpenseForm key="e" {...common} />}
      {kind === 'transfer' && <TransferForm key="t" {...common} />}
      {kind === 'debt' && debtKind === 'lend' && <LendForm key="dl" {...common} afterPad={what} />}
      {kind === 'debt' && debtKind === 'back' && <ReturnLoanForm key="db" {...common} afterPad={what} />}
      {kind === 'debt' && debtKind === 'take' && <BorrowForm key="dt" {...common} afterPad={what} />}
      {kind === 'debt' && debtKind === 'pay' && <PayDebtForm key="dp" {...common} afterPad={what} />}
      </div>
    </Sheet>
  );
}
