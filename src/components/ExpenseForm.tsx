import { FormEvent, useState } from 'react';
import { ACCOUNTS, balancesOf, fmt, hiddenAccounts, today, uid } from '../model';
import type { AccountId } from '../types';
import type { Props } from '../views/props';
import AccountChips from './AccountChips';
import AmountEntry from './AmountEntry';
import Field from './Field';

export default function ExpenseForm({ state, setState, onDone, initialAccount }: Props & {
  onDone: (msg: string) => void;
  initialAccount?: AccountId;
}) {
  const [account, setAccount] = useState<AccountId>(initialAccount ?? 'living');
  const [note, setNote] = useState('');
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
    const expense = { id: uid(), account, title: note.trim() || ACCOUNTS[account].name, amount: num, date };
    setState(s => ({
      ...s,
      expenses: [...s.expenses, expense].sort((a, b) => b.date.localeCompare(a.date)),
    }));
    onDone('Хароҷот сабт шуд ✓');
  };

  return (
    <form onSubmit={onSubmit}>
      <AmountEntry value={amount} onChange={setAmount} date={date} onDate={setDate} sign="−" />
      <AccountChips label="Аз кадом ҳисоб" value={account} onChange={setAccount} bal={bal}
        hidden={hiddenAccounts(state)} />
      <Field label="Эзоҳ (ихтиёрӣ)">
        <input value={note} onChange={e => setNote(e.target.value)} placeholder="Масалан, хӯрок" />
      </Field>
      {over && num > 0 && (
        <div className="alert danger">⚠️ Маблағ аз тавозуни ҳисоб зиёд аст ({fmt(bal[account])}).</div>
      )}
      <button className="btn big" type="submit" disabled={num <= 0}>Сабти хароҷот</button>
    </form>
  );
}
