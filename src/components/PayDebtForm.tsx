import { FormEvent, useState } from 'react';
import { ACCOUNTS, balancesOf, fmt, hiddenAccounts, remaining, today, uid } from '../model';
import type { AccountId, Debt } from '../types';
import type { Props } from '../views/props';
import AccountSelect from './AccountSelect';
import Field from './Field';

/** Пардохти қарз аз ҳисоби интихобшуда (ба таърихи хароҷот сабт мешавад). */
export default function PayDebtForm({ state, setState, debt, defaultSource = 'debt', onDone }: Props & {
  debt: Debt;
  defaultSource?: AccountId;
  onDone: (msg: string) => void;
}) {
  const [source, setSource] = useState<AccountId>(defaultSource);
  const [amount, setAmount] = useState('');

  const bal = balancesOf(state);
  const left = remaining(debt);
  const num = Math.min(parseFloat(amount) || 0, left);
  const over = num > bal[source] + 0.005;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!(num > 0)) return;
    if (over && !window.confirm(
      `Дар ҳисоби «${ACCOUNTS[source].name}» ҳамагӣ ${fmt(bal[source])} сомонӣ мавҷуд аст. Ба ҳар ҳол пардохт мекунед?`,
    )) return;
    const id = debt.id;
    const name = debt.title;
    setState(s => ({
      ...s,
      debts: s.debts.map(x => (x.id === id ? { ...x, paid: x.paid + num } : x)),
      expenses: [
        { id: uid(), account: source, title: `Қарз: ${name}`, amount: num, date: today(), debtId: id },
        ...s.expenses,
      ],
    }));
    onDone(`${fmt(num)} смн пардохт шуд ✓`);
  };

  return (
    <form onSubmit={submit}>
      <p className="muted">Бақия: {fmt(left)} сомонӣ</p>
      <Field label="Аз кадом ҳисоб">
        <AccountSelect value={source} onChange={setSource} bal={bal} hidden={hiddenAccounts(state)} />
      </Field>
      <Field label="Маблағи пардохт">
        <input type="number" inputMode="decimal" min="0" step="0.01" value={amount}
          onChange={e => setAmount(e.target.value)} placeholder="0.00" required />
      </Field>
      {over && num > 0 && (
        <div className="alert danger">⚠️ Маблағ аз тавозуни ҳисоб зиёд аст ({fmt(bal[source])}).</div>
      )}
      <button className="btn" type="submit">Пардохт кардан</button>
    </form>
  );
}
