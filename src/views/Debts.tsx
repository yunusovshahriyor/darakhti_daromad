import { FormEvent, useState } from 'react';
import { ACCOUNTS, ACCOUNT_ORDER, balances, fmt, remaining, today, uid } from '../model';
import type { AccountId } from '../types';
import type { Props } from './props';

export default function Debts({ state, setState }: Props) {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [pay, setPay] = useState<Record<number, string>>({});
  const [source, setSource] = useState<AccountId>('debt');
  const bal = balances(state.incomes, state.expenses);

  const add = (e: FormEvent) => {
    e.preventDefault();
    const a = parseFloat(amount);
    if (!(a > 0)) return;
    setState(s => ({ ...s, debts: [...s.debts, { id: uid(), title: title.trim(), amount: a, paid: 0 }] }));
    setTitle('');
    setAmount('');
  };

  const pays = (id: number) => {
    const d = state.debts.find(x => x.id === id);
    const a = Math.min(parseFloat(pay[id]) || 0, d ? remaining(d) : 0);
    if (!d || !(a > 0)) return;
    setState(s => ({
      ...s,
      debts: s.debts.map(x => (x.id === id ? { ...x, paid: x.paid + a } : x)),
      expenses: [
        { id: uid(), account: source, title: `Қарз: ${d.title}`, amount: a, date: today(), debtId: id },
        ...s.expenses,
      ],
    }));
    setPay(p => ({ ...p, [id]: '' }));
  };

  const remove = (id: number) =>
    setState(s => ({ ...s, debts: s.debts.filter(d => d.id !== id) }));

  return (
    <>
      <form className="card form" onSubmit={add}>
        <h2 className="wide">Илова кардани қарз</h2>
        <label>
          Ба кӣ / барои чӣ
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Масалан, қарз ба Алӣ" required />
        </label>
        <label>
          Маблағ (сомонӣ)
          <input type="number" min="0" step="0.01" value={amount}
            onChange={e => setAmount(e.target.value)} placeholder="0.00" required />
        </label>
        <button className="btn" type="submit">+ Илова кардан</button>
      </form>

      <section className="card">
        <h2>Қарзҳо</h2>
        {state.debts.length === 0 ? (
          <p className="empty"><span className="icon">🎉</span>Қарз нест — 10%-и вақтхушӣ ба «Вақтхушӣ» меравад.</p>
        ) : (
          <ul className="list">
            {state.debts.map(d => {
              const left = remaining(d);
              const pct = Math.min(100, (d.paid / d.amount) * 100);
              return (
                <li className="item col-item" key={d.id}>
                  <div className="line">
                    <div className="info">
                      <b>{d.title}</b>
                      <small>Бақия: {fmt(left)} аз {fmt(d.amount)}</small>
                    </div>
                    <span className={left > 0 ? 'amount neg' : 'amount'}>{left > 0 ? 'Қарз' : 'Пардохт шуд ✓'}</span>
                    <button className="del" aria-label="Нест кардан" onClick={() => remove(d.id)}>✕</button>
                  </div>
                  <div className="progress"><i style={{ width: `${pct}%` }} /></div>
                  {left > 0 && (
                    <div className="inline">
                      <select value={source} onChange={e => setSource(e.target.value as AccountId)}>
                        {ACCOUNT_ORDER.map(id => (
                          <option key={id} value={id}>{ACCOUNTS[id].icon} {ACCOUNTS[id].name} — {fmt(bal[id])}</option>
                        ))}
                      </select>
                      <input type="number" min="0" step="0.01" placeholder="Маблағи пардохт"
                        value={pay[d.id] ?? ''} onChange={e => setPay(p => ({ ...p, [d.id]: e.target.value }))} />
                      <button className="btn-sm" onClick={() => pays(d.id)}>Пардохт</button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
