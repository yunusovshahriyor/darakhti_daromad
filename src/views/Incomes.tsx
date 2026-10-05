import { FormEvent, useState } from 'react';
import { ACCOUNTS, ACCOUNT_ORDER, allocate, fmt, hasDebt, today, uid } from '../model';
import type { Props } from './props';

export default function Incomes({ state, setState }: Props) {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today);

  const debt = hasDebt(state.debts);
  const num = parseFloat(amount) || 0;
  const preview = allocate(num, state.settings, debt);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (num <= 0) return;
    const income = {
      id: uid(), title: title.trim(), amount: num, date,
      alloc: allocate(num, state.settings, debt),
    };
    setState(s => ({
      ...s,
      incomes: [...s.incomes, income].sort((a, b) => b.date.localeCompare(a.date)),
    }));
    setTitle('');
    setAmount('');
    setDate(today());
  };

  const remove = (id: number) =>
    setState(s => ({ ...s, incomes: s.incomes.filter(i => i.id !== id) }));

  return (
    <>
      <form className="card form" onSubmit={onSubmit}>
        <h2 className="wide">Илова кардани даромад</h2>
        <label className="wide">
          Манбаи даромад
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Масалан, музд" required />
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

        {num > 0 && (
          <div className="wide preview">
            <b>Тақсим мешавад:</b>
            {ACCOUNT_ORDER.filter(id => preview[id] > 0).map(id => (
              <div className="row" key={id}>
                <span>{ACCOUNTS[id].icon} {ACCOUNTS[id].name}</span>
                <span>{fmt(preview[id])}</span>
              </div>
            ))}
          </div>
        )}

        <button className="btn" type="submit">+ Илова кардан</button>
      </form>

      <section className="card">
        <h2>Даромадҳо</h2>
        {state.incomes.length === 0 ? (
          <p className="empty"><span className="icon">🪙</span>Ҳанӯз даромад илова нашудааст.</p>
        ) : (
          <ul className="list">
            {state.incomes.map(it => (
              <li className="item col-item" key={it.id}>
                <div className="line">
                  <div className="avatar">{it.title.charAt(0).toUpperCase()}</div>
                  <div className="info"><b>{it.title}</b><small>{it.date}</small></div>
                  <span className="amount">+{fmt(it.amount)}</span>
                  <button className="del" aria-label="Нест кардан" onClick={() => remove(it.id)}>✕</button>
                </div>
                <details>
                  <summary>Тақсим</summary>
                  {ACCOUNT_ORDER.filter(id => it.alloc[id] > 0).map(id => (
                    <div className="row" key={id}>
                      <span>{ACCOUNTS[id].icon} {ACCOUNTS[id].name}</span>
                      <span>{fmt(it.alloc[id])}</span>
                    </div>
                  ))}
                </details>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
