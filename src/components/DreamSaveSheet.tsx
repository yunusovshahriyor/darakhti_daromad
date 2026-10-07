import { useState } from 'react';
import { ACCOUNTS, ACCOUNT_ORDER, balancesOf, fmt, hiddenAccounts, spent, today, uid } from '../model';
import type { AccountId, Dream } from '../types';
import type { Props } from '../views/props';
import AccountChips from './AccountChips';
import AmountEntry from './AmountEntry';
import Sheet from './Sheet';

const QUICK = [50, 100, 200, 500, 1000];

/** Ҷамъкунии зуд ба ҳисоби орзуҳо: маблағ аз ҳисоби интихобшуда ба ҳисоби орзу мегузарад. */
export default function DreamSaveSheet({ state, setState, dream, onClose, onDone }: Props & {
  dream: Dream;
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const pool: AccountId = dream.kind === 'big' ? 'bigDream' : 'smallDream';
  const bal = balancesOf(state);
  const hide = [...hiddenAccounts(state), 'bigDream', 'smallDream'];
  // Ҳисоби пешфарз: он ки тавозуни бештар дорад
  const richest = ACCOUNT_ORDER.filter(id => !hide.includes(id))
    .reduce((a, b) => ((bal[b] ?? 0) > (bal[a] ?? 0) ? b : a), ACCOUNT_ORDER.find(id => !hide.includes(id)) ?? 'living');
  const [from, setFrom] = useState<AccountId>(richest);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today);

  const num = parseFloat(amount) || 0;
  const over = num > (bal[from] ?? 0) + 0.005;

  const add = (n: number) => setAmount(String(Math.round(((parseFloat(amount) || 0) + n) * 100) / 100));

  const save = () => {
    if (!(num > 0) || over) return;
    setState(s => ({ ...s, transfers: [{ id: uid(), from, to: pool, amount: num, date }, ...s.transfers] }));
    onDone(`+${fmt(num)} смн ба орзуҳо гузошта шуд 🌱`);
    onClose();
  };

  return (
    <Sheet title={`Ҷамъ кардан: ${dream.title}`} onClose={onClose} tall>
      <div className="add-body tone-pos">
        <div className="quick-amounts">
          {QUICK.map(n => <button key={n} type="button" onClick={() => add(n)}>+{fmt(n)}</button>)}
        </div>
        <AmountEntry value={amount} onChange={setAmount} date={date} onDate={setDate} sign="+" />
        <AccountChips label="Аз кадом ҳисоб" value={from} onChange={setFrom} bal={bal} hidden={hide}
          spentBy={spent(state.expenses)} />
        <p className="note" style={{ margin: '0 2px 8px' }}>
          Маблағ ба «{ACCOUNTS[pool].name}» меравад ва аз рӯи навбат байни орзуҳо тақсим мешавад.
        </p>
        {over && num > 0 && (
          <div className="alert danger">⚠️ Дар «{ACCOUNTS[from].name}» ҳамагӣ {fmt(bal[from] ?? 0)} смн ҳаст.</div>
        )}
        <button type="button" className="btn big" onClick={save} disabled={!(num > 0) || over}>Гузоштан ба орзу</button>
      </div>
    </Sheet>
  );
}
