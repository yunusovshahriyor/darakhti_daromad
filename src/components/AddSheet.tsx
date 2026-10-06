import { useState } from 'react';
import type { Props } from '../views/props';
import ExpenseForm from './ExpenseForm';
import IncomeForm from './IncomeForm';
import Sheet from './Sheet';
import SegTabs from './SegTabs';
import TransferForm from './TransferForm';

type Kind = 'income' | 'expense' | 'transfer';

const TITLES: Record<Kind, string> = {
  income: 'Илова кардани даромад',
  expense: 'Илова кардани хароҷот',
  transfer: 'Гузаронидан байни ҳисобҳо',
};

/** Варақаи якҷоя: ҷудокунак (даромад / хароҷот / гузаронидан) ва форма бо тугмачаҳои рақамӣ. */
export default function AddSheet({ state, setState, onClose, onDone }: Props & {
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const [kind, setKind] = useState<Kind>('income');
  const done = (msg: string) => {
    onDone(msg);
    onClose();
  };
  const common = { state, setState, onDone: done };

  return (
    <Sheet title={TITLES[kind]} eyebrow="Амалиёти нав" onClose={onClose} tall>
      <SegTabs className="add-tabs" value={kind} onChange={k => setKind(k as Kind)} tabs={[
        { id: 'income', label: 'Даромад' },
        { id: 'expense', label: 'Хароҷот' },
        { id: 'transfer', label: 'Гузаронидан' },
      ]} />
      {/* key: ҳангоми иваз шудани ҷудокунак форма аз нав сар мешавад */}
      {kind === 'income' && <IncomeForm key="i" {...common} />}
      {kind === 'expense' && <ExpenseForm key="e" {...common} />}
      {kind === 'transfer' && <TransferForm key="t" {...common} />}
    </Sheet>
  );
}
