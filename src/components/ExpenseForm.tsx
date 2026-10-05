import { FormEvent, useState } from 'react';
import { ACCOUNTS, balancesOf, fmt, hiddenAccounts, today, uid } from '../model';
import type { AccountId } from '../types';
import type { Props } from '../views/props';
import AccountSelect from './AccountSelect';
import Field from './Field';

export default function ExpenseForm({ state, setState, onDone, initialAccount }: Props & {
  onDone: (msg: string) => void;
  initialAccount?: AccountId;
}) {
  const [account, setAccount] = useState<AccountId>(initialAccount ?? 'living');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today);

  const bal = balancesOf(state);
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
        <AccountSelect value={account} onChange={setAccount} bal={bal} hidden={hiddenAccounts(state)} />
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
