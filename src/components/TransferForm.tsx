import { FormEvent, useState } from 'react';
import { ACCOUNTS, balancesOf, fmt, today, uid } from '../model';
import type { AccountId } from '../types';
import type { Props } from '../views/props';
import AccountSelect from './AccountSelect';
import Field from './Field';

interface Extra {
  from?: AccountId;
  to?: AccountId;
  onDone: (msg: string) => void;
}

export default function TransferForm({ state, setState, from: f0, to: t0, onDone }: Props & Extra) {
  const [from, setFrom] = useState<AccountId>(f0 ?? 'living');
  const [to, setTo] = useState<AccountId>(t0 ?? (f0 === 'future' ? 'living' : 'future'));
  const [amount, setAmount] = useState('');

  const bal = balancesOf(state);
  const num = parseFloat(amount) || 0;
  const same = from === to;
  const over = num > bal[from] + 0.005;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (num <= 0 || same) return;
    if (over && !window.confirm(
      `Дар ҳисоби «${ACCOUNTS[from].name}» ҳамагӣ ${fmt(bal[from])} сомонӣ мавҷуд аст. Ба ҳар ҳол мегузаронед?`,
    )) return;
    setState(s => ({
      ...s,
      transfers: [{ id: uid(), from, to, amount: num, date: today() }, ...s.transfers],
    }));
    onDone(`${fmt(num)} смн гузаронида шуд ✓`);
  };

  return (
    <form onSubmit={onSubmit}>
      <Field label="Аз ҳисоби">
        <AccountSelect value={from} onChange={setFrom} bal={bal} />
      </Field>
      <Field label="Ба ҳисоби">
        <AccountSelect value={to} onChange={setTo} bal={bal} />
      </Field>
      <Field label="Маблағ (сомонӣ)">
        <input type="number" inputMode="decimal" min="0" step="0.01" value={amount}
          onChange={e => setAmount(e.target.value)} placeholder="0.00" required />
      </Field>
      {same && <div className="alert danger">Ҳисоби фиристанда ва қабулкунанда бояд гуногун бошанд.</div>}
      {!same && over && num > 0 && (
        <div className="alert danger">⚠️ Маблағ аз тавозуни ҳисоб зиёд аст ({fmt(bal[from])}).</div>
      )}
      <button className="btn" type="submit" disabled={same}>Гузаронидан</button>
    </form>
  );
}
