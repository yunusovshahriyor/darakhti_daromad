import { useState } from 'react';
import { withNewDebt } from '../model';
import type { Props } from '../views/props';
import DebtForm from './DebtForm';
import ExpenseForm from './ExpenseForm';
import IncomeForm from './IncomeForm';
import PayDebtForm from './PayDebtForm';
import SegTabs from './SegTabs';
import Sheet from './Sheet';
import TransferForm from './TransferForm';

type Kind = 'income' | 'expense' | 'transfer' | 'debt';
type DebtKind = 'take' | 'pay';

const TITLES: Record<Kind, string> = {
  income: 'Илова кардани даромад',
  expense: 'Илова кардани хароҷот',
  transfer: 'Гузаронидан байни ҳисобҳо',
  debt: 'Илова кардани қарз',
};

/** Варақаи якҷоя: ҷудокунак (даромад / хароҷот / гузаронидан / қарз) ва форма бо тугмачаҳои рақамӣ. */
export default function AddSheet({ state, setState, onClose, onDone }: Props & {
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const [kind, setKind] = useState<Kind>('income');
  const [debtKind, setDebtKind] = useState<DebtKind>('take');
  const done = (msg: string) => {
    onDone(msg);
    onClose();
  };
  const common = { state, setState, onDone: done };

  const what = (
    <div className="chips-block">
      <div className="chips-label">Чӣ шуд</div>
      <div className="chips">
        {([['take', 'Қарз гирифтам'], ['pay', 'Қарз пардохт кардам']] as [DebtKind, string][]).map(([id, label]) => (
          <button key={id} type="button" className={id === debtKind ? 'chip on' : 'chip'} onClick={() => setDebtKind(id)}>
            <span className="chip-t"><b>{label}</b></span>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <Sheet title={kind === 'debt' && debtKind === 'pay' ? 'Пардохти қарз' : TITLES[kind]} eyebrow="Амалиёти нав"
      onClose={onClose} tall>
      <SegTabs className="add-tabs" value={kind} onChange={k => setKind(k as Kind)} tabs={[
        { id: 'income', label: 'Даромад' },
        { id: 'expense', label: 'Хароҷот' },
        { id: 'transfer', label: 'Гузаронидан' },
        { id: 'debt', label: 'Қарз' },
      ]} />
      {kind === 'income' && <IncomeForm key="i" {...common} />}
      {kind === 'expense' && <ExpenseForm key="e" {...common} />}
      {kind === 'transfer' && <TransferForm key="t" {...common} />}
      {kind === 'debt' && debtKind === 'take' && (
        <DebtForm key="dt" submitLabel="Сабти қарз" afterPad={what}
          onSubmit={v => { setState(s => withNewDebt(s, v)); done('Қарз илова шуд ✓'); }} />
      )}
      {kind === 'debt' && debtKind === 'pay' && <PayDebtForm key="dp" {...common} afterPad={what} />}
    </Sheet>
  );
}
