import { FormEvent, useState } from 'react';
import { ACCOUNTS, ACCOUNT_ORDER, allocate, fmt, hasDebt, today, uid } from '../model';
import type { Props } from '../views/props';
import AmountEntry from './AmountEntry';
import Field from './Field';

const SOURCES: [string, string][] = [['Музд', '💼'], ['Кори иловагӣ', '🛠️'], ['Бозгашт', '↩️'], ['Дигар', '✨']];

export default function IncomeForm({ state, setState, onDone }: Props & { onDone: (msg: string) => void }) {
  const [source, setSource] = useState(SOURCES[0][0]);
  const [note, setNote] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today);

  const debt = hasDebt(state.debts);
  const num = parseFloat(amount) || 0;
  const preview = allocate(num, state.tree, debt);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (num <= 0) return;
    const n = note.trim();
    const income = {
      id: uid(), title: n ? `${source} · ${n}` : source, amount: num, date,
      alloc: allocate(num, state.tree, debt),
    };
    setState(s => ({
      ...s,
      incomes: [...s.incomes, income].sort((a, b) => b.date.localeCompare(a.date)),
    }));
    onDone('Даромад илова шуд ✓');
  };

  return (
    <form onSubmit={onSubmit}>
      <AmountEntry value={amount} onChange={setAmount} date={date} onDate={setDate} sign="+" />

      <div className="chips-block">
        <div className="chips-label">Манбаи даромад</div>
        <div className="chips">
          {SOURCES.map(([s, ic]) => (
            <button key={s} type="button" className={s === source ? 'chip on' : 'chip'} onClick={() => setSource(s)}>
              <span className="chip-ic soft">{ic}</span>
              <span className="chip-t"><b>{s}</b></span>
              {s === source && <span className="chip-ok">✓</span>}
            </button>
          ))}
        </div>
      </div>

      <Field label="Эзоҳ (ихтиёрӣ)">
        <input value={note} onChange={e => setNote(e.target.value)} placeholder="Масалан, лоиҳа ё музди моҳ" />
      </Field>

      {num > 0 && (
        <div className="preview">
          <b>Тақсим мешавад:</b>
          {ACCOUNT_ORDER.filter(id => preview[id] > 0).map(id => (
            <div className="row" key={id}>
              <span>{ACCOUNTS[id].icon} {ACCOUNTS[id].name}</span>
              <span>{fmt(preview[id])}</span>
            </div>
          ))}
        </div>
      )}

      <button className="btn big" type="submit" disabled={num <= 0}>Сабти даромад</button>
    </form>
  );
}
