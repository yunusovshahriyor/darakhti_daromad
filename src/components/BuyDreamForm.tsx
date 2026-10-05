import { FormEvent, useState } from 'react';
import { ACCOUNTS, balancesOf, fmt, hiddenAccounts, today, uid } from '../model';
import type { AccountId, Dream } from '../types';
import type { Props } from '../views/props';
import AccountSelect from './AccountSelect';
import Field from './Field';

/** Харидани орзу аз ҳисоби интихобшуда: хароҷот сабт мешавад ва орзу аз рӯйхат мебарояд. */
export default function BuyDreamForm({ state, setState, dream, defaultSource, onDone }: Props & {
  dream: Dream;
  defaultSource: AccountId;
  onDone: (msg: string) => void;
}) {
  const [source, setSource] = useState<AccountId>(defaultSource);
  const [price, setPrice] = useState(String(dream.target));

  const bal = balancesOf(state);
  const num = parseFloat(price) || 0;
  const over = num > bal[source] + 0.005;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!(num > 0)) return;
    if (over && !window.confirm(
      `Дар ҳисоби «${ACCOUNTS[source].name}» ҳамагӣ ${fmt(bal[source])} сомонӣ мавҷуд аст. Ба ҳар ҳол мехаред?`,
    )) return;
    const id = dream.id;
    const name = dream.title;
    setState(s => ({
      ...s,
      dreams: s.dreams.map(d => (d.id === id ? { ...d, boughtAt: today(), paidPrice: num } : d)),
      expenses: [
        { id: uid(), account: source, title: `Орзу: ${name}`, amount: num, date: today(), dreamId: id },
        ...s.expenses,
      ],
    }));
    onDone(`«${name}» харида шуд 🎉`);
  };

  return (
    <form onSubmit={submit}>
      <Field label="Аз кадом ҳисоб">
        <AccountSelect value={source} onChange={setSource} bal={bal} hidden={hiddenAccounts(state)} />
      </Field>
      <Field label="Нархи харид (сомонӣ)">
        <input type="number" inputMode="decimal" min="0" step="0.01" value={price}
          onChange={e => setPrice(e.target.value)} required />
      </Field>
      {over && num > 0 && (
        <div className="alert danger">⚠️ Маблағ аз тавозуни ҳисоб зиёд аст ({fmt(bal[source])}).</div>
      )}
      <button className="btn" type="submit">Харида шуд</button>
    </form>
  );
}
