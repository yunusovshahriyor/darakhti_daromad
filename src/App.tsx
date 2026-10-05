import { FormEvent, useEffect, useState } from 'react';

interface Income {
  id: number;
  title: string;
  amount: number;
  date: string;
}

const STORAGE_KEY = 'incomes';

const today = () => new Date().toISOString().slice(0, 10);

const fmt = (n: number) =>
  n.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function load(): Income[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as Income[];
  } catch {
    return [];
  }
}

export default function App() {
  const [items, setItems] = useState<Income[]>(load);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* ignore */
    }
  }, [items]);

  const total = items.reduce((sum, it) => sum + it.amount, 0);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const item: Income = { id: Date.now(), title: title.trim(), amount: parseFloat(amount), date };
    setItems(prev => [...prev, item].sort((a, b) => b.date.localeCompare(a.date)));
    setTitle('');
    setAmount('');
    setDate(today());
  };

  const remove = (id: number) => setItems(prev => prev.filter(it => it.id !== id));

  const month = today().slice(0, 7);
  const monthTotal = items
    .filter(it => it.date.startsWith(month))
    .reduce((sum, it) => sum + it.amount, 0);

  return (
    <>
      <header className="hero">
        <h1>💰 Рӯйхати даромад</h1>
        <p>Даромади худро ба осонӣ назорат кунед</p>
      </header>

      <main className="container">
        <section className="stats">
          <div className="stat main">
            <span>Ҷамъи даромад</span>
            <strong>{fmt(total)} с.</strong>
          </div>
          <div className="stat">
            <span>Ин моҳ</span>
            <strong>{fmt(monthTotal)} с.</strong>
          </div>
          <div className="stat">
            <span>Шумораи сабтҳо</span>
            <strong>{items.length}</strong>
          </div>
        </section>

        <form className="card" onSubmit={onSubmit}>
          <h2 className="wide">Илова кардани даромад</h2>
          <label className="wide">
            Манбаи даромад
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Масалан, музд" required />
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
          <button className="btn" type="submit">+ Илова кардан</button>
        </form>

        <section className="card">
          <h2>Сабтҳо</h2>
          {items.length === 0 ? (
            <p className="empty">
              <span className="icon">🪙</span>
              Ҳанӯз даромад илова нашудааст.
            </p>
          ) : (
            <ul className="list">
              {items.map(it => (
                <li className="item" key={it.id}>
                  <div className="avatar">{it.title.charAt(0).toUpperCase()}</div>
                  <div className="info">
                    <b>{it.title}</b>
                    <small>{it.date}</small>
                  </div>
                  <span className="amount">+{fmt(it.amount)}</span>
                  <button className="del" title="Нест кардан" aria-label="Нест кардан"
                    onClick={() => remove(it.id)}>✕</button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
