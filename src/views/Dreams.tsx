import { FormEvent, useState } from 'react';
import { balances, fmt, today, uid } from '../model';
import type { Dream } from '../types';
import type { Props } from './props';

export default function Dreams({ state, setState }: Props) {
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<Dream['kind']>('big');
  const [target, setTarget] = useState('');

  const bal = balances(state.incomes, state.expenses);

  const add = (e: FormEvent) => {
    e.preventDefault();
    const t = parseFloat(target);
    if (!(t > 0)) return;
    setState(s => ({ ...s, dreams: [...s.dreams, { id: uid(), title: title.trim(), kind, target: t }] }));
    setTitle('');
    setTarget('');
  };

  const buy = (d: Dream) =>
    setState(s => ({
      ...s,
      dreams: s.dreams.filter(x => x.id !== d.id),
      expenses: [
        {
          id: uid(), title: `Орзу: ${d.title}`, amount: d.target, date: today(),
          account: d.kind === 'big' ? 'bigDream' : 'smallDream',
        },
        ...s.expenses,
      ],
    }));

  const remove = (id: number) =>
    setState(s => ({ ...s, dreams: s.dreams.filter(d => d.id !== id) }));

  /** Маблағи ҷамъшуда ба орзуҳо аз навбат тақсим мешавад. */
  const section = (k: Dream['kind'], name: string, pool: number) => {
    let left = Math.max(0, pool);
    const goals = state.dreams.filter(d => d.kind === k);
    return (
      <section className="card" key={k}>
        <h2>{name} <small className="muted">· ҷамъшуда: {fmt(pool)}</small></h2>
        {goals.length === 0 ? (
          <p className="empty">Орзу илова нашудааст.</p>
        ) : (
          <ul className="list">
            {goals.map(d => {
              const funded = Math.min(d.target, left);
              left -= funded;
              const done = funded >= d.target - 0.005;
              return (
                <li className="item col-item" key={d.id}>
                  <div className="line">
                    <div className="info">
                      <b>{d.title}</b>
                      <small>{fmt(funded)} аз {fmt(d.target)}</small>
                    </div>
                    {done && <button className="btn-sm" onClick={() => buy(d)}>Харида шуд ✓</button>}
                    <button className="del" aria-label="Нест кардан" onClick={() => remove(d.id)}>✕</button>
                  </div>
                  <div className="progress"><i style={{ width: `${(funded / d.target) * 100}%` }} /></div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    );
  };

  return (
    <>
      <form className="card form" onSubmit={add}>
        <h2 className="wide">Орзуи нав</h2>
        <label className="wide">
          Номи орзу
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Масалан, мошин" required />
        </label>
        <label>
          Навъ
          <select value={kind} onChange={e => setKind(e.target.value as Dream['kind'])}>
            <option value="big">🏠 Калон</option>
            <option value="small">✈️ Хурд</option>
          </select>
        </label>
        <label>
          Маблағи лозим
          <input type="number" min="0" step="0.01" value={target}
            onChange={e => setTarget(e.target.value)} placeholder="0.00" required />
        </label>
        <button className="btn" type="submit">+ Илова кардан</button>
      </form>
      {section('big', '🏠 Орзуҳои калон', bal.bigDream)}
      {section('small', '✈️ Орзуҳои хурд', bal.smallDream)}
    </>
  );
}
