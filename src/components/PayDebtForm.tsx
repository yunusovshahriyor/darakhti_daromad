import { FormEvent, ReactNode, useState } from 'react';
import { ACCOUNTS, balancesOf, fmt, remaining, splitDebts, today, uid } from '../model';
import type { Debt } from '../types';
import type { Props } from '../views/props';
import AmountEntry from './AmountEntry';

/**
 * Пардохти қарз. Манбаъ ҳамеша танҳо ҳисоби «Пардохти қарз» аст.
 * Агар `debt` дода нашавад, қарз аз рӯйхат интихоб мешавад.
 */
export default function PayDebtForm({ state, setState, debt, onDone, afterPad }: Props & {
  debt?: Debt;
  onDone: (msg: string) => void;
  afterPad?: ReactNode;
}) {
  const open = splitDebts(state.debts).open;
  const [pick, setPick] = useState<number | undefined>(debt?.id ?? open[0]?.id);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today);

  const current = debt ?? open.find(d => d.id === pick) ?? open[0];
  const bal = balancesOf(state).debt ?? 0;
  const left = current ? remaining(current) : 0;
  const num = Math.min(parseFloat(amount) || 0, left);
  const over = num > bal + 0.005;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!current || !(num > 0)) return;
    if (over && !window.confirm(
      `Дар ҳисоби «${ACCOUNTS.debt.name}» ҳамагӣ ${fmt(bal)} сомонӣ мавҷуд аст. Ба ҳар ҳол пардохт мекунед?`,
    )) return;
    const id = current.id;
    const name = current.title;
    setState(s => ({
      ...s,
      debts: s.debts.map(x => {
        if (x.id !== id) return x;
        const paid = x.paid + num;
        return paid >= x.amount - 0.005 ? { ...x, paid, paidAt: date } : { ...x, paid };
      }),
      expenses: [
        { id: uid(), account: 'debt', title: `Қарз: ${name}`, amount: num, date, debtId: id },
        ...s.expenses,
      ],
    }));
    onDone(num >= left - 0.005 ? `«${name}» пурра пардохт шуд 🎉` : `${fmt(num)} смн пардохт шуд ✓`);
  };

  if (!current) {
    return (
      <>
        {afterPad}
        <p className="muted" style={{ textAlign: 'center', margin: '24px 0' }}>Қарзи кушода нест.</p>
      </>
    );
  }

  return (
    <form onSubmit={submit}>
      <AmountEntry value={amount} onChange={setAmount} date={date} onDate={setDate} sign="−" />
      {afterPad}

      {!debt && open.length > 1 && (
        <div className="chips-block">
          <div className="chips-label">Кадом қарз</div>
          <div className="chips">
            {open.map(d => (
              <button key={d.id} type="button" className={d.id === current.id ? 'chip on' : 'chip'}
                onClick={() => setPick(d.id)}>
                <span className="chip-t"><b>{d.priority ? '⭐ ' : ''}{d.title}</b><small>боқӣ {fmt(remaining(d))}</small></span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="chips-block">
        <div className="chips-label">Аз ҳисоби</div>
        <div className="chips">
          <span className="chip on" aria-disabled>
            <span className="chip-ic">{ACCOUNTS.debt.icon}</span>
            <span className="chip-t"><b>{ACCOUNTS.debt.name}</b><small>{fmt(bal)}</small></span>
          </span>
          <span className="chip-note">Қарзро танҳо аз ҳамин ҳисоб пардохт мекунед</span>
        </div>
      </div>

      <p className="muted" style={{ margin: '4px 2px 0' }}>
        {current.title}: боқӣ {fmt(left)} сомонӣ{num > 0 ? ` → пас аз пардохт ${fmt(left - num)}` : ''}
      </p>
      {over && num > 0 && (
        <div className="alert danger">⚠️ Маблағ аз тавозуни ҳисоб зиёд аст ({fmt(bal)}).</div>
      )}
      <button className="btn big" type="submit" disabled={!(num > 0)}>Пардохти қарз</button>
    </form>
  );
}
