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

  return (
    <main className="container">
      <h1>Рӯйхати даромад</h1>

      <form className="card" onSubmit={onSubmit}>
        <input value={title} onChange={e => setTitle(e.target.value)}
          placeholder="Манбаи даромад (масалан, музд)" required />
        <input type="number" min="0" step="0.01" value={amount}
          onChange={e => setAmount(e.target.value)} placeholder="Маблағ" required />
        <input type="date" value={date} onChange={e => setDate(e.target.value)} required />
        <button type="submit">Илова кардан</button>
      </form>

      <section className="card total">
        Ҷамъи даромад: <strong>{fmt(total)}</strong> сомонӣ
      </section>

      <section className="card">
        <table>
          <thead>
            <tr><th>Сана</th><th>Манба</th><th className="num">Маблағ</th><th /></tr>
          </thead>
          <tbody>
            {items.map(it => (
              <tr key={it.id}>
                <td>{it.date}</td>
                <td>{it.title}</td>
                <td className="num">{fmt(it.amount)}</td>
                <td>
                  <button className="del" title="Нест кардан" onClick={() => remove(it.id)}>✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && <p className="empty">Ҳанӯз даромад илова нашудааст.</p>}
      </section>
    </main>
  );
}
