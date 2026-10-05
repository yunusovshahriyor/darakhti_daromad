import { useState } from 'react';
import Empty from '../components/Empty';
import SwipeRow from '../components/SwipeRow';
import { ACCOUNTS, ACCOUNT_ORDER, fmt, groupByMonth, monthTitle } from '../model';
import type { Props } from './props';

export type HistoryFilter = 'all' | 'income' | 'expense' | 'transfer';

const FILTERS: { id: HistoryFilter; label: string }[] = [
  { id: 'all', label: 'Ҳама' },
  { id: 'income', label: 'Даромад' },
  { id: 'expense', label: 'Хароҷот' },
  { id: 'transfer', label: 'Гузаронидан' },
];

type Item =
  | { kind: 'income'; id: number; date: string; sort: number }
  | { kind: 'expense'; id: number; date: string; sort: number }
  | { kind: 'transfer'; id: number; date: string; sort: number };

export default function History({ state, setState, filter, onFilter }: Props & {
  filter: HistoryFilter;
  onFilter: (f: HistoryFilter) => void;
}) {
  const [expanded, setExpanded] = useState<number | null>(null);

  const items: Item[] = [
    ...state.incomes.map(i => ({ kind: 'income' as const, id: i.id, date: i.date, sort: i.id })),
    ...state.expenses.map(e => ({ kind: 'expense' as const, id: e.id, date: e.date, sort: e.id })),
    ...state.transfers.map(t => ({ kind: 'transfer' as const, id: t.id, date: t.date, sort: t.id })),
  ]
    .filter(i => filter === 'all' || i.kind === filter)
    .sort((a, b) => b.date.localeCompare(a.date) || b.sort - a.sort);

  const groups = groupByMonth(items);

  const removeIncome = (id: number) =>
    setState(s => ({ ...s, incomes: s.incomes.filter(i => i.id !== id) }));
  const removeTransfer = (id: number) =>
    setState(s => ({ ...s, transfers: s.transfers.filter(t => t.id !== id) }));
  const removeExpense = (id: number) =>
    setState(s => {
      const e = s.expenses.find(x => x.id === id);
      return {
        ...s,
        expenses: s.expenses.filter(x => x.id !== id),
        debts: e?.debtId
          ? s.debts.map(d => {
              if (d.id !== e.debtId) return d;
              const { paidAt: _drop, ...rest } = d;
              return { ...rest, paid: Math.max(0, d.paid - e.amount) };
            })
          : s.debts,
        dreams: e?.dreamId
          ? s.dreams.map(d => {
              if (d.id !== e.dreamId) return d;
              const { boughtAt: _a, paidPrice: _b, ...rest } = d;
              return rest;
            })
          : s.dreams,
      };
    });

  const row = (it: Item) => {
    if (it.kind === 'income') {
      const x = state.incomes.find(i => i.id === it.id)!;
      return (
        <SwipeRow key={`i${it.id}`} onDelete={() => removeIncome(it.id)}>
          <div className="cell tap" onClick={() => setExpanded(expanded === it.id ? null : it.id)}>
            <div className="ic">{x.title.charAt(0).toUpperCase()}</div>
            <div className="grow">
              <div className="r1"><b>{x.title}</b><b className="pos">+{fmt(x.amount)}</b></div>
              <small>{x.date} · Даромад</small>
              {expanded === it.id && (
                <div className="breakdown">
                  {ACCOUNT_ORDER.filter(id => x.alloc[id] > 0).map(id => (
                    <div className="row" key={id}>
                      <span>{ACCOUNTS[id].icon} {ACCOUNTS[id].name}</span>
                      <span>{fmt(x.alloc[id])}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </SwipeRow>
      );
    }
    if (it.kind === 'expense') {
      const x = state.expenses.find(e => e.id === it.id)!;
      return (
        <SwipeRow key={`e${it.id}`} onDelete={() => removeExpense(it.id)}>
          <div className="cell">
            <div className="ic neg-bg">{ACCOUNTS[x.account].icon}</div>
            <div className="grow">
              <div className="r1"><b>{x.title}</b><b className="neg">−{fmt(x.amount)}</b></div>
              <small>{x.date} · {ACCOUNTS[x.account].name}</small>
            </div>
          </div>
        </SwipeRow>
      );
    }
    const x = state.transfers.find(t => t.id === it.id)!;
    return (
      <SwipeRow key={`t${it.id}`} onDelete={() => removeTransfer(it.id)}>
        <div className="cell">
          <div className="ic swap-bg">🔁</div>
          <div className="grow">
            <div className="r1"><b>{ACCOUNTS[x.from].name} → {ACCOUNTS[x.to].name}</b><b>{fmt(x.amount)}</b></div>
            <small>{x.date} · Гузаронидан</small>
          </div>
        </div>
      </SwipeRow>
    );
  };

  return (
    <>
      <div className="chips">
        {FILTERS.map(f => (
          <button key={f.id} className={f.id === filter ? 'chip on' : 'chip'} onClick={() => onFilter(f.id)}>
            {f.label}
          </button>
        ))}
      </div>

      {groups.length === 0 && (
        <Empty icon="🧾" text="Ҳанӯз амалиёт нест. Тугмаи сабзи «Илова»-ро дар поён пахш кунед." />
      )}

      {groups.map(g => (
        <section key={g.key}>
          <h3 className="group-title"><span>{monthTitle(g.key)}</span></h3>
          <div className="cells">{g.items.map(row)}</div>
        </section>
      ))}
    </>
  );
}
