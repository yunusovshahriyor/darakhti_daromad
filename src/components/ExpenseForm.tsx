import { FormEvent, useState } from 'react';
import { guessCategory } from '../categories';
import { ACCOUNTS, balancesOf, spent, fmt, hiddenAccounts, today, uid } from '../model';
import type { AccountId } from '../types';
import type { Props } from '../views/props';
import AccountChips from './AccountChips';
import AmountEntry from './AmountEntry';
import CategoryChips from './CategoryChips';
import Field from './Field';
import { useConfirm } from './ConfirmSheet';

export default function ExpenseForm({ state, setState, onDone, initialAccount }: Props & {
  onDone: (msg: string) => void;
  initialAccount?: AccountId;
}) {
  const [account, setAccount] = useState<AccountId>(initialAccount ?? 'living');
  const [note, setNote] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  // Агар категория дастӣ интихоб нашуда бошад, аз эзоҳ худкор пешниҳод мешавад
  const [manual, setManual] = useState(false);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today);

  const bal = balancesOf(state);
  const num = parseFloat(amount) || 0;
  const over = num > bal[account] + 0.005;

  const [ask, confirmDialog] = useConfirm();
  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (num <= 0) return;
    if (over && !(await ask({ title: 'Маблағи кофӣ нест', text: `Дар ҳисоби «${ACCOUNTS[account].name}» ҳамагӣ ${fmt(bal[account])} сомонӣ мавҷуд аст. Ба ҳар ҳол харҷ мекунед?`, ok: 'Харҷ кардан' }))) return;
    const expense = { id: uid(), account, title: note.trim() || category || ACCOUNTS[account].name, amount: num, date,
      ...(category ? { category } : {}) };
    setState(s => ({
      ...s,
      expenses: [...s.expenses, expense].sort((a, b) => b.date.localeCompare(a.date)),
    }));
    onDone('Хароҷот сабт шуд ✓');
  };

  return (
    <form onSubmit={onSubmit}>
      <AmountEntry value={amount} onChange={setAmount} date={date} onDate={setDate} sign="−" />
      <AccountChips label="Аз кадом ҳисоб" value={account} onChange={setAccount} bal={bal} spentBy={spent(state.expenses)}
        hidden={hiddenAccounts(state)} />
      <CategoryChips state={state} setState={setState} value={category} onChange={c => { setCategory(c); setManual(true); }} />
      <Field label="Эзоҳ (ихтиёрӣ)">
        <input value={note} placeholder="Масалан, такси ба кор"
          onChange={e => {
            setNote(e.target.value);
            if (!manual) setCategory(guessCategory(e.target.value, state.categories));
          }} />
      </Field>
      {over && num > 0 && (
        <div className="alert danger">⚠️ Маблағ аз тавозуни ҳисоб зиёд аст ({fmt(bal[account])}).</div>
      )}
      <button className="btn big" type="submit" disabled={num <= 0}>Сабти хароҷот</button>
      {confirmDialog}
    </form>
  );
}
