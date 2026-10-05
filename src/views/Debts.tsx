import { FormEvent, useState } from 'react';
import Empty from '../components/Empty';
import Fab from '../components/Fab';
import Field from '../components/Field';
import Sheet from '../components/Sheet';
import SwipeRow from '../components/SwipeRow';
import { ACCOUNTS, ACCOUNT_ORDER, balances, fmt, remaining, today, uid } from '../model';
import type { AccountId, Debt } from '../types';
import type { Props } from './props';

export default function Debts({ state, setState }: Props) {
  const [open, setOpen] = useState(false);
  const [payFor, setPayFor] = useState<Debt | null>(null);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [source, setSource] = useState<AccountId>('debt');

  const bal = balances(state.incomes, state.expenses);

  const add = (e: FormEvent) => {
    e.preventDefault();
    const a = parseFloat(amount);
    if (!(a > 0)) return;
    setState(s => ({ ...s, debts: [...s.debts, { id: uid(), title: title.trim(), amount: a, paid: 0 }] }));
    setTitle('');
    setAmount('');
    setOpen(false);
  };

  const pay = (e: FormEvent) => {
    e.preventDefault();
    if (!payFor) return;
    const a = Math.min(parseFloat(payAmount) || 0, remaining(payFor));
    if (!(a > 0)) return;
    const id = payFor.id;
    const name = payFor.title;
    setState(s => ({
      ...s,
      debts: s.debts.map(x => (x.id === id ? { ...x, paid: x.paid + a } : x)),
      expenses: [
        { id: uid(), account: source, title: `Қарз: ${name}`, amount: a, date: today(), debtId: id },
        ...s.expenses,
      ],
    }));
    setPayAmount('');
    setPayFor(null);
  };

  const remove = (id: number) =>
    setState(s => ({ ...s, debts: s.debts.filter(d => d.id !== id) }));

  return (
    <>
      {state.debts.length === 0 ? (
        <Empty icon="🎉" text="Қарз нест — 10%-и вақтхушӣ ба «Вақтхушӣ» меравад." />
      ) : (
        <div className="cells">
          {state.debts.map(d => {
            const left = remaining(d);
            const pct = Math.min(100, (d.paid / d.amount) * 100);
            return (
              <SwipeRow key={d.id} onDelete={() => remove(d.id)}>
                <div className={left > 0 ? 'cell tap' : 'cell'} onClick={() => left > 0 && setPayFor(d)}>
                  <div className="grow">
                    <div className="r1">
                      <b>{d.title}</b>
                      <b className={left > 0 ? 'neg' : 'pos'}>{left > 0 ? fmt(left) : 'Пардохт шуд ✓'}</b>
                    </div>
                    <div className="progress"><i style={{ width: `${pct}%` }} /></div>
                    <small>Пардохт: {fmt(d.paid)} аз {fmt(d.amount)}{left > 0 ? ' · барои пардохт пахш кунед' : ''}</small>
                  </div>
                </div>
              </SwipeRow>
            );
          })}
        </div>
      )}

      <Fab onClick={() => setOpen(true)} label="Қарзи нав" />

      {open && (
        <Sheet title="Қарзи нав" onClose={() => setOpen(false)}>
          <form onSubmit={add}>
            <Field label="Ба кӣ / барои чӣ">
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Масалан, қарз ба Алӣ" required />
            </Field>
            <Field label="Маблағ (сомонӣ)">
              <input type="number" inputMode="decimal" min="0" step="0.01" value={amount}
                onChange={e => setAmount(e.target.value)} placeholder="0.00" required />
            </Field>
            <button className="btn" type="submit">Илова кардан</button>
          </form>
        </Sheet>
      )}

      {payFor && (
        <Sheet title={`Пардохт: ${payFor.title}`} onClose={() => setPayFor(null)}>
          <form onSubmit={pay}>
            <p className="muted">Бақия: {fmt(remaining(payFor))} сомонӣ</p>
            <Field label="Аз кадом ҳисоб">
              <select value={source} onChange={e => setSource(e.target.value as AccountId)}>
                {ACCOUNT_ORDER.map(id => (
                  <option key={id} value={id}>{ACCOUNTS[id].icon} {ACCOUNTS[id].name} — {fmt(bal[id])}</option>
                ))}
              </select>
            </Field>
            <Field label="Маблағи пардохт">
              <input type="number" inputMode="decimal" min="0" step="0.01" value={payAmount}
                onChange={e => setPayAmount(e.target.value)} placeholder="0.00" required />
            </Field>
            <button className="btn" type="submit">Пардохт кардан</button>
          </form>
        </Sheet>
      )}
    </>
  );
}
