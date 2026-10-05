import { FormEvent, useState } from 'react';
import Empty from '../components/Empty';
import Fab from '../components/Fab';
import Field from '../components/Field';
import Sheet from '../components/Sheet';
import SwipeRow from '../components/SwipeRow';
import { ACCOUNTS, ACCOUNT_ORDER, balances, fmt, groupByMonth, monthTitle, today, uid } from '../model';
import type { AccountId } from '../types';
import type { Props } from './props';

export default function Expenses({ state, setState }: Props) {
  const [open, setOpen] = useState(false);
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
    setOpen(false);
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

  const groups = groupByMonth(state.expenses);

  return (
    <>
      {groups.length === 0 && <Empty icon="🧾" text="Ҳанӯз хароҷот нест. Тугмаи + -ро пахш кунед." />}

      {groups.map(g => (
        <section key={g.key}>
          <h3 className="group-title">
            <span>{monthTitle(g.key)}</span>
            <span>−{fmt(g.items.reduce((s, i) => s + i.amount, 0))}</span>
          </h3>
          <div className="cells">
            {g.items.map(it => (
              <SwipeRow key={it.id} onDelete={() => remove(it.id)}>
                <div className="cell">
                  <div className="ic neg-bg">{ACCOUNTS[it.account].icon}</div>
                  <div className="grow">
                    <div className="r1">
                      <b>{it.title}</b>
                      <b className="neg">−{fmt(it.amount)}</b>
                    </div>
                    <small>{it.date} · {ACCOUNTS[it.account].name}</small>
                  </div>
                </div>
              </SwipeRow>
            ))}
          </div>
        </section>
      ))}

      <Fab onClick={() => setOpen(true)} label="Илова кардани хароҷот" />

      {open && (
        <Sheet title="Хароҷоти нав" onClose={() => setOpen(false)}>
          <form onSubmit={onSubmit}>
            <Field label="Аз кадом ҳисоб">
              <select value={account} onChange={e => setAccount(e.target.value as AccountId)}>
                {ACCOUNT_ORDER.map(id => (
                  <option key={id} value={id}>
                    {ACCOUNTS[id].icon} {ACCOUNTS[id].name} — {fmt(bal[id])}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Барои чӣ">
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Масалан, хӯрок" required />
            </Field>
            <Field label="Маблағ (сомонӣ)">
              <input type="number" inputMode="decimal" min="0" step="0.01" value={amount}
                onChange={e => setAmount(e.target.value)} placeholder="0.00" required />
            </Field>
            <Field label="Сана">
              <input type="date" value={date} onChange={e => setDate(e.target.value)} required />
            </Field>
            {over && num > 0 && (
              <div className="alert danger">⚠️ Маблағ аз тавозуни ҳисоб зиёд аст ({fmt(bal[account])}).</div>
            )}
            <button className="btn" type="submit">Сабт кардан</button>
          </form>
        </Sheet>
      )}
    </>
  );
}
