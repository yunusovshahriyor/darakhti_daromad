import { FormEvent, useState } from 'react';
import Empty from '../components/Empty';
import Fab from '../components/Fab';
import Field from '../components/Field';
import Sheet from '../components/Sheet';
import SwipeRow from '../components/SwipeRow';
import { ACCOUNTS, ACCOUNT_ORDER, allocate, fmt, groupByMonth, hasDebt, monthTitle, today, uid } from '../model';
import type { Props } from './props';

export default function Incomes({ state, setState }: Props) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
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
    setOpen(false);
  };

  const remove = (id: number) =>
    setState(s => ({ ...s, incomes: s.incomes.filter(i => i.id !== id) }));

  const groups = groupByMonth(state.incomes);

  return (
    <>
      {groups.length === 0 && <Empty icon="🪙" text="Ҳанӯз даромад илова нашудааст. Тугмаи + -ро пахш кунед." />}

      {groups.map(g => (
        <section key={g.key}>
          <h3 className="group-title">
            <span>{monthTitle(g.key)}</span>
            <span>{fmt(g.items.reduce((s, i) => s + i.amount, 0))}</span>
          </h3>
          <div className="cells">
            {g.items.map(it => (
              <SwipeRow key={it.id} onDelete={() => remove(it.id)}>
                <div className="cell tap" onClick={() => setExpanded(expanded === it.id ? null : it.id)}>
                  <div className="ic">{it.title.charAt(0).toUpperCase()}</div>
                  <div className="grow">
                    <div className="r1">
                      <b>{it.title}</b>
                      <b className="pos">+{fmt(it.amount)}</b>
                    </div>
                    <small>{it.date}</small>
                    {expanded === it.id && (
                      <div className="breakdown">
                        {ACCOUNT_ORDER.filter(id => it.alloc[id] > 0).map(id => (
                          <div className="row" key={id}>
                            <span>{ACCOUNTS[id].icon} {ACCOUNTS[id].name}</span>
                            <span>{fmt(it.alloc[id])}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </SwipeRow>
            ))}
          </div>
        </section>
      ))}

      <Fab onClick={() => setOpen(true)} label="Илова кардани даромад" />

      {open && (
        <Sheet title="Даромади нав" onClose={() => setOpen(false)}>
          <form onSubmit={onSubmit}>
            <Field label="Манбаи даромад">
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Масалан, музд" required />
            </Field>
            <Field label="Маблағ (сомонӣ)">
              <input type="number" inputMode="decimal" min="0" step="0.01" value={amount}
                onChange={e => setAmount(e.target.value)} placeholder="0.00" required />
            </Field>
            <Field label="Сана">
              <input type="date" value={date} onChange={e => setDate(e.target.value)} required />
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

            <button className="btn" type="submit">Илова кардан</button>
          </form>
        </Sheet>
      )}
    </>
  );
}
