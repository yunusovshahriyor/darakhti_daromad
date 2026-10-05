import { FormEvent, useState } from 'react';
import Empty from '../components/Empty';
import Fab from '../components/Fab';
import Field from '../components/Field';
import Sheet from '../components/Sheet';
import SwipeRow from '../components/SwipeRow';
import { balancesOf, fmt, today, uid } from '../model';
import type { Dream } from '../types';
import type { Props } from './props';

export default function Dreams({ state, setState }: Props) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<Dream['kind']>('big');
  const [target, setTarget] = useState('');

  const bal = balancesOf(state);

  const add = (e: FormEvent) => {
    e.preventDefault();
    const t = parseFloat(target);
    if (!(t > 0)) return;
    setState(s => ({ ...s, dreams: [...s.dreams, { id: uid(), title: title.trim(), kind, target: t }] }));
    setTitle('');
    setTarget('');
    setOpen(false);
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
      <section key={k}>
        <h3 className="group-title"><span>{name}</span><span>Ҷамъшуда: {fmt(pool)}</span></h3>
        {goals.length === 0 ? (
          <div className="cells"><div className="cell muted">Орзу илова нашудааст.</div></div>
        ) : (
          <div className="cells">
            {goals.map(d => {
              const funded = Math.min(d.target, left);
              left -= funded;
              const done = funded >= d.target - 0.005;
              return (
                <SwipeRow key={d.id} onDelete={() => remove(d.id)}>
                  <div className="cell">
                    <div className="grow">
                      <div className="r1">
                        <b>{d.title}</b>
                        {done
                          ? <button className="btn-sm" onClick={() => buy(d)}>Харида шуд ✓</button>
                          : <b>{fmt(d.target)}</b>}
                      </div>
                      <div className="progress"><i style={{ width: `${(funded / d.target) * 100}%` }} /></div>
                      <small>{fmt(funded)} аз {fmt(d.target)}</small>
                    </div>
                  </div>
                </SwipeRow>
              );
            })}
          </div>
        )}
      </section>
    );
  };

  return (
    <>
      {state.dreams.length === 0 && <Empty icon="✨" text="Орзуҳои худро илова кунед: тугмаи +" />}
      {section('big', '🏠 Орзуҳои калон', bal.bigDream)}
      {section('small', '✈️ Орзуҳои хурд', bal.smallDream)}

      <Fab onClick={() => setOpen(true)} label="Орзуи нав" />

      {open && (
        <Sheet title="Орзуи нав" onClose={() => setOpen(false)}>
          <form onSubmit={add}>
            <Field label="Номи орзу">
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Масалан, мошин" required />
            </Field>
            <Field label="Навъ">
              <select value={kind} onChange={e => setKind(e.target.value as Dream['kind'])}>
                <option value="big">🏠 Калон</option>
                <option value="small">✈️ Хурд</option>
              </select>
            </Field>
            <Field label="Маблағи лозим (сомонӣ)">
              <input type="number" inputMode="decimal" min="0" step="0.01" value={target}
                onChange={e => setTarget(e.target.value)} placeholder="0.00" required />
            </Field>
            <button className="btn" type="submit">Илова кардан</button>
          </form>
        </Sheet>
      )}
    </>
  );
}
