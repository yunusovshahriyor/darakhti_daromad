import { FormEvent, useState } from 'react';
import { ACCOUNTS, dayTitle, fmt, today } from '../model';
import type { Loan } from '../types';
import type { Props } from '../views/props';
import AmountEntry from './AmountEntry';
import Field from './Field';

/** Таҳрири қарздор: ном, маблағ ва сана. Хароҷоти «Қарз додам» ва баргардониҳо ҳамоҳанг мешаванд. */
export default function LoanEditForm({ loan, setState, onDone }: Pick<Props, 'setState'> & {
  loan: Loan;
  onDone: () => void;
}) {
  const [person, setPerson] = useState(loan.person);
  const [amount, setAmount] = useState(String(loan.amount));
  const [date, setDate] = useState(loan.date);

  const num = parseFloat(amount) || 0;
  const tooLow = num > 0 && num < loan.returned - 0.005;
  const ready = num > 0 && !tooLow && person.trim() !== '';

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    const name = person.trim();
    const id = loan.id;
    setState(s => ({
      ...s,
      loans: s.loans.map(l => {
        if (l.id !== id) return l;
        const { returnedAt, ...rest } = l;
        const closed = l.returned >= num - 0.005;
        return { ...rest, person: name, amount: num, date, ...(closed ? { returnedAt: returnedAt ?? today() } : {}) };
      }),
      expenses: s.expenses.map(x => (x.loanId === id ? { ...x, title: `Қарз ба ${name}`, amount: num, date } : x)),
      incomes: s.incomes.map(i => (i.kind === 'loanBack' && i.loanId === id ? { ...i, title: `Бозгашти қарз: ${name}` } : i)),
    }));
    onDone();
  };

  return (
    <form onSubmit={submit}>
      <div className="loan-info">
        <div><span>Санаи додани қарз</span><b>{dayTitle(loan.date)}</b></div>
        <div><span>Аз ҳисоби</span><b>{ACCOUNTS[loan.account] ? `${ACCOUNTS[loan.account].icon} ${ACCOUNTS[loan.account].name}` : '—'}</b></div>
        <div><span>Баргашт</span><b>{fmt(loan.returned)} аз {fmt(loan.amount)}</b></div>
        {loan.returnedAt && <div><span>Пурра баргашт</span><b>{dayTitle(loan.returnedAt)}</b></div>}
      </div>
      <AmountEntry value={amount} onChange={setAmount} date={date} onDate={setDate} sign="−" />
      <Field label="Ба кӣ қарз додед">
        <input value={person} onChange={e => setPerson(e.target.value)} placeholder="Масалан, Алӣ" />
      </Field>
      {tooLow && (
        <div className="alert danger">Маблағ аз қисми аллакай баргардонидашуда ({fmt(loan.returned)}) кам буда наметавонад.</div>
      )}
      <button className="btn big" type="submit" disabled={!ready}>Нигоҳ доштан</button>
    </form>
  );
}
