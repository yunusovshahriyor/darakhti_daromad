import { FormEvent, useState } from 'react';
import { ACCOUNTS, ACCOUNT_ORDER, balances, fmt, today, uid } from '../model';
import type { AccountId } from '../types';
import type { Props } from '../views/props';
import Field from './Field';

export default function ExpenseForm({ state, setState, onDone }: Props & { onDone: (msg: string) => void }) {
  const [account, setAccount] = useState<AccountId>('living');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today);

  const bal = balances(state.incomes, state.expenses);
  const num = parseFloat(amount) || 0;
  const over = num > bal[account] + 0.005;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (num <= 0) return;
    if (over && !window.confirm(
      `Дар ҳисоби «${ACCOUNTS[account].name}» ҳамагӣ ${fmt(bal[account])} сомонӣ мавҷуд аст. Ба ҳар ҳол харҷ мекунед?`,
    )) return;
    const expense = { id: uid(), account, title: title.trim(), amount: num, date };
    setState(s => ({
      ...s,
      expenses: [...s.expenses, expense].sort((a, b) => b.date.localeCompare(a.date)),
    }));
    onDone('Хароҷот сабт шуд ✓');
  };

  return (
    <form onSubmit={onSubmit}>
      <Field label="Аз кадом ҳисоб">
        <select value={account} onChange={e => setAccount(e.target.value as AccountId)}>
          {ACCOUNT_ORDER.map(id => (
            <option key={id} value={id}>
              {ACCOUNTS[id].icon} {ACCOUNTS[id].name} — {fmt(bal[id])}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Барои чӣ">
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Масалан, хӯрок" required />
      </Field>
      <Field label="Маблағ (сомонӣ)">
        <input type="number" inputMode="decimal" min="0" step="0.01" value={amount}
          onChange={e => setAmount(e.target.value)} placeholder="0.00" required />
      </Field>
      <Field label="Сана">
        <input type="date" value={date} onChange={e => setDate(e.target.value)} required />
      </Field>
      {over && num > 0 && (
        <div className="alert danger">⚠️ Маблағ аз тавозуни ҳисоб зиёд аст ({fmt(bal[account])}).</div>
      )}
      <button className="btn" type="submit">Сабт кардан</button>
    </form>
  );
}
