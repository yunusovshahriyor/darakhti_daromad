import { useState } from 'react';
import DebtForm from '../components/DebtForm';
import Empty from '../components/Empty';
import Fab from '../components/Fab';
import { PencilIcon } from '../components/Icons';
import PayDebtForm from '../components/PayDebtForm';
import Sheet from '../components/Sheet';
import SwipeRow from '../components/SwipeRow';
import { fmt, remaining, sortDebts, uid } from '../model';
import type { Debt } from '../types';
import type { Props } from './props';

export default function Debts({ state, setState }: Props) {
  const [adding, setAdding] = useState(false);
  const [editFor, setEditFor] = useState<Debt | null>(null);
  const [payFor, setPayFor] = useState<Debt | null>(null);

  const debts = sortDebts(state.debts);
  const unpaid = debts.filter(d => remaining(d) > 0.005);
  const first = unpaid[0];

  const add = (v: { title: string; amount: number; priority: boolean }) => {
    setState(s => ({ ...s, debts: [...s.debts, { id: uid(), paid: 0, ...v }] }));
    setAdding(false);
  };

  const save = (v: { title: string; amount: number; priority: boolean }) => {
    if (!editFor) return;
    const id = editFor.id;
    setState(s => ({ ...s, debts: s.debts.map(d => (d.id === id ? { ...d, ...v } : d)) }));
    setEditFor(null);
  };

  const remove = (id: number) =>
    setState(s => ({ ...s, debts: s.debts.filter(d => d.id !== id) }));

  return (
    <>
      {first && (
        <div className="next-debt">
          <small>Аввал пардохт кунед</small>
          <b>{first.title}</b>
          <span>Бақия: {fmt(remaining(first))} смн{first.priority ? ' · ⭐ афзалиятнок' : ' · хурдтарин қарз'}</span>
        </div>
      )}

      {debts.length === 0 ? (
        <Empty icon="🎉" text="Қарз нест — 10%-и вақтхушӣ ба «Вақтхушӣ» меравад." />
      ) : (
        <>
          <p className="note order-note">
            Тартиб: аввал қарзҳои ⭐ афзалиятнок, баъд аз рӯи миқдор аз хурд ба калон.
          </p>
          <div className="cells">
            {debts.map(d => {
              const left = remaining(d);
              const done = left <= 0.005;
              const rank = unpaid.indexOf(d) + 1;
              const pct = Math.min(100, (d.paid / d.amount) * 100);
              return (
                <SwipeRow key={d.id} onDelete={() => remove(d.id)}>
                  <div className={done ? 'cell' : 'cell tap'} onClick={() => !done && setPayFor(d)}>
                    <div className={done ? 'rank done' : rank === 1 ? 'rank first' : 'rank'}>{done ? '✓' : rank}</div>
                    <div className="grow">
                      <div className="r1">
                        <b>{d.priority ? '⭐ ' : ''}{d.title}</b>
                        <b className={done ? 'pos' : 'neg'}>{done ? 'Пардохт шуд' : fmt(left)}</b>
                      </div>
                      <div className="progress"><i style={{ width: `${pct}%` }} /></div>
                      <small>
                        Пардохт: {fmt(d.paid)} аз {fmt(d.amount)}
                        {!done && (d.priority ? ' · афзалиятнок' : ' · аз рӯи миқдор')}
                      </small>
                    </div>
                    <button className="icon-btn sm" aria-label="Таҳрир"
                      onClick={e => { e.stopPropagation(); setEditFor(d); }}>
                      <PencilIcon />
                    </button>
                  </div>
                </SwipeRow>
              );
            })}
          </div>
        </>
      )}

      <Fab onClick={() => setAdding(true)} label="Қарзи нав" />

      {adding && (
        <Sheet title="Қарзи нав" onClose={() => setAdding(false)}>
          <DebtForm onSubmit={add} submitLabel="Илова кардан" />
        </Sheet>
      )}

      {editFor && (
        <Sheet title="Таҳрири қарз" onClose={() => setEditFor(null)}>
          <DebtForm initial={editFor} onSubmit={save} submitLabel="Нигоҳ доштан" />
        </Sheet>
      )}

      {payFor && (
        <Sheet title={`Пардохт: ${payFor.title}`} onClose={() => setPayFor(null)}>
          <PayDebtForm state={state} setState={setState} debt={payFor}
            onDone={() => setPayFor(null)} />
        </Sheet>
      )}
    </>
  );
}
