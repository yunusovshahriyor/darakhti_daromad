import { FormEvent, useState } from 'react';
import { ACCOUNTS, balancesOf, fmt, hiddenAccounts, today, uid } from '../model';
import type { AccountId } from '../types';
import type { Props } from '../views/props';
import AccountChips from './AccountChips';
import AmountEntry from './AmountEntry';

interface Extra {
  from?: AccountId;
  to?: AccountId;
  onDone: (msg: string) => void;
}

export default function TransferForm({ state, setState, from: f0, to: t0, onDone }: Props & Extra) {
  const [from, setFrom] = useState<AccountId>(f0 ?? 'living');
  const [to, setTo] = useState<AccountId>(t0 ?? (f0 === 'future' ? 'living' : 'future'));
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today);

  const bal = balancesOf(state);
  const hide = hiddenAccounts(state);
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
      transfers: [{ id: uid(), from, to, amount: num, date }, ...s.transfers],
    }));
    onDone(`${fmt(num)} смн гузаронида шуд ✓`);
  };

  return (
    <form onSubmit={onSubmit}>
      <AmountEntry value={amount} onChange={setAmount} date={date} onDate={setDate} />
      <AccountChips label="Аз ҳисоби" value={from} onChange={setFrom} bal={bal} hidden={hide} />
      <AccountChips label="Ба ҳисоби" value={to} onChange={setTo} bal={bal} hidden={hide} />
      {same && <div className="alert danger">Ҳисоби фиристанда ва қабулкунанда бояд гуногун бошанд.</div>}
      {!same && over && num > 0 && (
        <div className="alert danger">⚠️ Маблағ аз тавозуни ҳисоб зиёд аст ({fmt(bal[from])}).</div>
      )}
      <button className="btn big" type="submit" disabled={same || num <= 0}>Гузаронидан</button>
    </form>
  );
}
