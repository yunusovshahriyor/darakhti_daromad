import { useState } from 'react';
import type { Props } from '../views/props';
import ExpenseForm from './ExpenseForm';
import IncomeForm from './IncomeForm';
import TransferForm from './TransferForm';
import Sheet from './Sheet';

type Step = 'choose' | 'income' | 'expense' | 'transfer';

const TITLES: Record<Step, string> = {
  choose: 'Илова кардан',
  income: 'Даромади нав',
  expense: 'Хароҷоти нав',
  transfer: 'Гузаронидан',
};

/** Варақаи якҷоя: аввал интихоб (даромад / хароҷот), баъд форма. */
export default function AddSheet({ state, setState, onClose, onDone }: Props & {
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const [step, setStep] = useState<Step>('choose');
  const done = (msg: string) => {
    onDone(msg);
    onClose();
  };

  return (
    <Sheet title={TITLES[step]} onClose={onClose}>
      {step === 'choose' && (
        <div className="choose">
          <button className="choice" onClick={() => setStep('income')}>
            <span className="ic">💰</span>
            <span><b>Даромад</b><small>Ба ҳисобҳо худкор тақсим мешавад</small></span>
          </button>
          <button className="choice" onClick={() => setStep('expense')}>
            <span className="ic neg-bg">🧾</span>
            <span><b>Хароҷот</b><small>Аз ҳисоби интихобшуда кам мешавад</small></span>
          </button>
          <button className="choice" onClick={() => setStep('transfer')}>
            <span className="ic">🔁</span>
            <span><b>Гузаронидан</b><small>Маблағро аз як ҳисоб ба ҳисоби дигар</small></span>
          </button>
        </div>
      )}
      {step === 'income' && <IncomeForm state={state} setState={setState} onDone={done} />}
      {step === 'expense' && <ExpenseForm state={state} setState={setState} onDone={done} />}
      {step === 'transfer' && <TransferForm state={state} setState={setState} onDone={done} />}
    </Sheet>
  );
}
