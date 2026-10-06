import { useState } from 'react';
import LoanProgress from '../components/LoanProgress';
import ReceiptSheet from '../components/ReceiptSheet';
import type { ReceiptRef } from '../components/ReceiptSheet';
import Empty from '../components/Empty';
import SwipeRow from '../components/SwipeRow';
import { ACCOUNTS, ALL_IDS, fmt, dayTitle, groupByDay } from '../model';
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
  const [receipt, setReceipt] = useState<ReceiptRef | null>(null);

  const items: Item[] = [
    ...state.incomes.map(i => ({ kind: 'income' as const, id: i.id, date: i.date, sort: i.id })),
    ...state.expenses.map(e => ({ kind: 'expense' as const, id: e.id, date: e.date, sort: e.id })),
    ...state.transfers.map(t => ({ kind: 'transfer' as const, id: t.id, date: t.date, sort: t.id })),
  ]
    .filter(i => filter === 'all' || i.kind === filter)
    .sort((a, b) => b.date.localeCompare(a.date) || b.sort - a.sort);

  const groups = groupByDay(items);

  const removeIncome = (id: number) =>
    setState(s => {
      const inc = s.incomes.find(i => i.id === id);
      return {
        ...s,
        incomes: s.incomes.filter(i => i.id !== id),
        // Баргардонидани қарзи додашуда бекор шуд: қарз боз кушода мешавад
        loans: inc?.kind === 'loanBack' && inc.loanId
          ? s.loans.map(l => {
              if (l.id !== inc.loanId) return l;
              const { returnedAt: _drop, ...rest } = l;
              return { ...rest, returned: Math.max(0, l.returned - inc.amount) };
            })
          : s.loans,
        // Қарзи гирифташуда нест шуд: худи қарз низ нест мешавад
        debts: inc?.kind === 'borrow' && inc.debtId ? s.debts.filter(d => d.id !== inc.debtId) : s.debts,
      };
    });
  const removeTransfer = (id: number) =>
    setState(s => ({ ...s, transfers: s.transfers.filter(t => t.id !== id) }));
  const removeExpense = (id: number) =>
    setState(s => {
      const e = s.expenses.find(x => x.id === id);
      return {
        ...s,
        expenses: s.expenses.filter(x => x.id !== id),
        // Қарз додан бекор шуд: қарздор ва баргардониданҳои он низ нест мешаванд
        loans: e?.loanId ? s.loans.filter(l => l.id !== e.loanId) : s.loans,
        incomes: e?.loanId ? s.incomes.filter(i => i.loanId !== e.loanId) : s.incomes,
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

  const loanOf = (id?: number) => state.loans.find(l => l.id === id);

  const row = (it: Item) => {
    if (it.kind === 'income') {
      const x = state.incomes.find(i => i.id === it.id)!;
      const loan = x.kind === 'loanBack' ? loanOf(x.loanId) : undefined;
      if (loan) {
        // Баргардониҳои пештара (аз рӯи сана ва тартиб) то ҳамин баргардонӣ
        const before = state.incomes
          .filter(i => i.kind === 'loanBack' && i.loanId === loan.id
            && (i.date < x.date || (i.date === x.date && i.id < x.id)))
          .reduce((sum, i) => sum + i.amount, 0);
        const target = x.alloc ? ALL_IDS.find(id => x.alloc[id] > 0) : undefined;
        return (
          <SwipeRow key={`i${it.id}`} onDelete={() => removeIncome(it.id)}>
            <div className="cell tap" onClick={() => setReceipt({ kind: 'income', id: it.id })}>
              <div className="ic">↩️</div>
              <div className="grow">
                <div className="r1"><b>Бозгашт · {loan.person}</b><b className="pos">+{fmt(x.amount)}</b></div>
                <small>Қарз баргашт{target ? ` · ба «${ACCOUNTS[target].name}»` : ''}</small>
                <LoanProgress loan={loan} mark={{ before, part: x.amount }} />
              </div>
            </div>
          </SwipeRow>
        );
      }
      return (
        <SwipeRow key={`i${it.id}`} onDelete={() => removeIncome(it.id)}>
          <div className="cell tap" onClick={() => setReceipt({ kind: 'income', id: it.id })}>
            <div className="ic">{x.title.charAt(0).toUpperCase()}</div>
            <div className="grow">
              <div className="r1"><b>{x.title}</b><b className="pos">+{fmt(x.amount)}</b></div>
              <small>{x.kind === 'borrow' ? 'Қарз гирифтам' : 'Даромад'}</small>
            </div>
          </div>
        </SwipeRow>
      );
    }
    if (it.kind === 'expense') {
      const x = state.expenses.find(e => e.id === it.id)!;
      return (
        <SwipeRow key={`e${it.id}`} onDelete={() => removeExpense(it.id)}>
          <div className="cell tap" onClick={() => setReceipt({ kind: 'expense', id: it.id })}>
            <div className="ic neg-bg">{ACCOUNTS[x.account].icon}</div>
            <div className="grow">
              <div className="r1"><b>{x.title}</b><b className="neg">−{fmt(x.amount)}</b></div>
              <small>{x.loanId ? 'Қарз додам · ' : ''}{x.category ? `${x.category} · ` : ''}{ACCOUNTS[x.account].name}</small>
              {x.loanId && loanOf(x.loanId) && <LoanProgress loan={loanOf(x.loanId)!} />}
            </div>
          </div>
        </SwipeRow>
      );
    }
    const x = state.transfers.find(t => t.id === it.id)!;
    return (
      <SwipeRow key={`t${it.id}`} onDelete={() => removeTransfer(it.id)}>
        <div className="cell tap" onClick={() => setReceipt({ kind: 'transfer', id: it.id })}>
          <div className="ic swap-bg">🔁</div>
          <div className="grow">
            <div className="r1"><b>{ACCOUNTS[x.from].name} → {ACCOUNTS[x.to].name}</b><b>{fmt(x.amount)}</b></div>
            <small>Гузаронидан</small>
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
          <h3 className="group-title"><span>{dayTitle(g.key)}</span></h3>
          <div className="cells">{g.items.map(row)}</div>
        </section>
      ))}
      {receipt && <ReceiptSheet state={state} refItem={receipt} onClose={() => setReceipt(null)} />}
    </>
  );
}
