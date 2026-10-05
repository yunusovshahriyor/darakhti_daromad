import { FormEvent, useState } from 'react';
import { ACCOUNTS, ACCOUNT_ORDER, balances, fmt, today, uid } from '../model';
import type { AccountId } from '../types';
import type { Props } from './props';

export default function Expenses({ state, setState }: Props) {
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
    setTitle('');
    setAmount('');
    setDate(today());
  };

  const remove = (id: number) =>
    setState(s => {
      const e = s.expenses.find(x => x.id === id);
      return {
        ...s,
        expenses: s.expenses.filter(x => x.id !== id),
        debts: e?.debtId
          ? s.debts.map(d => (d.id === e.debtId ? { ...d, paid: Math.max(0, d.paid - e.amount) } : d))
          : s.debts,
      };
    });

  return (
    <>
      <form className="card form" onSubmit={onSubmit}>
        <h2 className="wide">Илова кардани хароҷот</h2>
        <label className="wide">
          Аз кадом ҳисоб
          <select value={account} onChange={e => setAccount(e.target.value as AccountId)}>
            {ACCOUNT_ORDER.map(id => (
              <option key={id} value={id}>
                {ACCOUNTS[id].icon} {ACCOUNTS[id].name} — {fmt(bal[id])}
              </option>
            ))}
          </select>
        </label>
        <label className="wide">
          Барои чӣ
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Масалан, хӯрок" required />
        </label>
        <label>
          Маблағ (сомонӣ)
          <input type="number" min="0" step="0.01" value={amount}
            onChange={e => setAmount(e.target.value)} placeholder="0.00" required />
        </label>
        <label>
          Сана
          <input type="date" value={date} onChange={e => setDate(e.target.value)} required />
        </label>
        {over && num > 0 && (
          <div className="wide alert danger">
            ⚠️ Маблағ аз тавозуни ҳисоб зиёд аст ({fmt(bal[account])}).
          </div>
        )}
        <button className="btn" type="submit">− Сабт кардан</button>
      </form>

      <section className="card">
        <h2>Хароҷотҳо</h2>
        {state.expenses.length === 0 ? (
          <p className="empty"><span className="icon">🧾</span>Ҳанӯз хароҷот нест.</p>
        ) : (
          <ul className="list">
            {state.expenses.map(it => (
              <li className="item" key={it.id}>
                <div className="avatar neg-bg">{ACCOUNTS[it.account].icon}</div>
                <div className="info">
                  <b>{it.title}</b>
                  <small>{it.date} · {ACCOUNTS[it.account].name}</small>
                </div>
                <span className="amount neg">−{fmt(it.amount)}</span>
                <button className="del" aria-label="Нест кардан" onClick={() => remove(it.id)}>✕</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
