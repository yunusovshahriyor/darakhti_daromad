import { FormEvent, useState } from 'react';
import { ACCOUNTS, ACCOUNT_ORDER, allocate, fmt, hasDebt, today, uid } from '../model';
import type { Props } from '../views/props';
import Field from './Field';

export default function IncomeForm({ state, setState, onDone }: Props & { onDone: (msg: string) => void }) {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today);

  const debt = hasDebt(state.debts);
  const num = parseFloat(amount) || 0;
  const preview = allocate(num, state.settings, debt);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (num <= 0) return;
    const income = {
      id: uid(), title: title.trim(), amount: num, date,
      alloc: allocate(num, state.settings, debt),
    };
    setState(s => ({
      ...s,
      incomes: [...s.incomes, income].sort((a, b) => b.date.localeCompare(a.date)),
    }));
    onDone('Даромад илова шуд ✓');
  };

  return (
    <form onSubmit={onSubmit}>
      <Field label="Манбаи даромад">
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Масалан, музд" required />
      </Field>
      <Field label="Маблағ (сомонӣ)">
        <input type="number" inputMode="decimal" min="0" step="0.01" value={amount}
          onChange={e => setAmount(e.target.value)} placeholder="0.00" required />
      </Field>
      <Field label="Сана">
        <input type="date" value={date} onChange={e => setDate(e.target.value)} required />
      </Field>

      {num > 0 && (
        <div className="preview">
          <b>Тақсим мешавад:</b>
          {ACCOUNT_ORDER.filter(id => preview[id] > 0).map(id => (
            <div className="row" key={id}>
              <span>{ACCOUNTS[id].icon} {ACCOUNTS[id].name}</span>
              <span>{fmt(preview[id])}</span>
            </div>
          ))}
        </div>
      )}

      <button className="btn" type="submit">Илова кардан</button>
    </form>
  );
}
