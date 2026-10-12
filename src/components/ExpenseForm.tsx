import { FormEvent, useState } from 'react';
import { addPeriod, newRecurring } from '../recurring';
import { expenseHints, quickAmounts, recentExpenses, smartCategory } from '../suggest';
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
  const [every, setEvery] = useState<'' | 'week' | 'month'>('');
  const [date, setDate] = useState(today);

  const bal = balancesOf(state);
  const recent = recentExpenses(state.expenses);
  const hints = expenseHints(state.expenses, note).filter(h => h.title.trim().toLowerCase() !== note.trim().toLowerCase());
  const quick = quickAmounts(state.expenses.filter(e => !e.debtId && !e.dreamId && !e.loanId).map(e => e.amount), state.currency ?? 'TJS', false);
  const hidden = hiddenAccounts(state);
  const apply = (title: string, amountV: number, cat: string | undefined, acc: string, fill = true) => {
    const generic = title === cat || title === ACCOUNTS[acc]?.name;
    setNote(generic ? '' : title);
    if (cat) { setCategory(cat); setManual(true); }
    if (fill) setAmount(String(amountV));
    if (ACCOUNTS[acc] && !hidden.includes(acc)) setAccount(acc);
  };
  const num = parseFloat(amount) || 0;
  const over = num > bal[account] + 0.005;

  const [ask, confirmDialog] = useConfirm();
  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (num <= 0) return;
    if (over && !(await ask({ title: 'Маблағи кофӣ нест', text: `Дар ҳисоби «${ACCOUNTS[account].name}» ҳамагӣ ${fmt(bal[account])} сомонӣ мавҷуд аст. Ба ҳар ҳол харҷ мекунед?`, ok: 'Харҷ кардан' }))) return;
    const expense = { id: uid(), account, title: note.trim() || category || ACCOUNTS[account].name, amount: num, date,
      ...(category ? { category } : {}) };
    const rec = every ? newRecurring({ title: expense.title, amount: num, account, category: category ?? undefined, every, date }) : null;
    setState(s => ({
      ...s,
      expenses: [...s.expenses, expense].sort((a, b) => b.date.localeCompare(a.date)),
      ...(rec ? { recurring: [...(s.recurring ?? []), rec] } : {}),
    }));
    onDone('Хароҷот сабт шуд ✓');
  };

  return (
    <form onSubmit={onSubmit}>
      {recent.length > 0 && (
        <div className="repeat-row">
          {recent.map(r => (
            <button key={r.id} type="button" className="rp" onClick={() => apply(r.title, r.amount, r.category, r.account)}>
              <i>↻</i><span>{r.title} <small>· {fmt(r.amount)} смн</small></span>
            </button>
          ))}
        </div>
      )}
      <AmountEntry value={amount} onChange={setAmount} date={date} onDate={setDate} sign="−" quick={quick} />
      <AccountChips label="Аз кадом ҳисоб" value={account} onChange={setAccount} bal={bal} spentBy={spent(state.expenses)}
        hidden={hiddenAccounts(state)} />
      <CategoryChips state={state} setState={setState} value={category} onChange={c => { setCategory(c); setManual(true); }} />
      <Field label="Эзоҳ (ихтиёрӣ)">
        <input value={note} placeholder="Масалан, такси ба кор"
          onChange={e => {
            setNote(e.target.value);
            if (!manual) setCategory(smartCategory(state, e.target.value));
          }} />
      </Field>
      <div className="rec-pick">
        <div className="chips-label">🔁 Такрор кардан</div>
        <div className="rec-chips">
          {([['', 'Не'], ['week', 'Ҳар ҳафта'], ['month', 'Ҳар моҳ']] as const).map(([v, n]) => (
            <button key={v} type="button" className={v === every ? 'qa on' : 'qa'} onClick={() => setEvery(v)}>{n}</button>
          ))}
        </div>
        {every && <small className="rec-note">{`Мӯҳлати навбатӣ: ${addPeriod(date, every)}. Дар ҳамон рӯз барнома ёдрас мекунад ва бо тасдиқи шумо сабт мекунад.`}</small>}
      </div>
      {hints.length > 0 && (
        <div className="hint-row">
          {hints.map(h => (
            <button key={h.title} type="button" className="hint-chip" onClick={() => apply(h.title, h.amount, h.category, h.account, !num)}>
              {h.title} <small>· {fmt(h.amount)}</small>
            </button>
          ))}
        </div>
      )}
      {over && num > 0 && (
        <div className="alert danger">⚠️ Маблағ аз тавозуни ҳисоб зиёд аст ({fmt(bal[account])}).</div>
      )}
      <button className="btn big" type="submit" disabled={num <= 0}>Сабти хароҷот</button>
      {confirmDialog}
    </form>
  );
}
