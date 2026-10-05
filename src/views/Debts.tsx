import { useState } from 'react';
import CollapsibleCells from '../components/CollapsibleCells';
import DebtForm from '../components/DebtForm';
import Empty from '../components/Empty';
import Fab from '../components/Fab';
import { PencilIcon } from '../components/Icons';
import PayDebtForm from '../components/PayDebtForm';
import SegTabs from '../components/SegTabs';
import Sheet from '../components/Sheet';
import SwipeRow from '../components/SwipeRow';
import { fmt, remaining, splitDebts, uid } from '../model';
import type { Debt } from '../types';
import type { Props } from './props';

export default function Debts({ state, setState }: Props) {
  const [adding, setAdding] = useState(false);
  const [editFor, setEditFor] = useState<Debt | null>(null);
  const [payFor, setPayFor] = useState<Debt | null>(null);
  const [tab, setTab] = useState<'now' | 'done'>('now');

  const { open, paid } = splitDebts(state.debts);
  const first = open[0];

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

      {state.debts.length === 0 && (
        <Empty icon="🎉" text="Қарз нест — 10%-и вақтхушӣ ба «Вақтхушӣ» меравад." />
      )}

      {state.debts.length > 0 && (
        <div className="tab-block">
          <SegTabs value={tab} onChange={id => setTab(id as 'now' | 'done')}
            tabs={[
              { id: 'now', label: 'Ҳозира', count: open.length },
              { id: 'done', label: 'Пардохтшуда', count: paid.length },
            ]} />

          {tab === 'now' ? (
            open.length === 0 ? (
              <div className="empty small">🎉 Ҳамаи қарзҳо пардохт шудаанд!</div>
            ) : (
              <>
                <div className="cells">
                  {open.map((d, i) => {
                    const left = remaining(d);
                    const pct = Math.min(100, (d.paid / d.amount) * 100);
                    return (
                      <SwipeRow key={d.id} onDelete={() => remove(d.id)}>
                        <div className="cell tap" onClick={() => setPayFor(d)}>
                          <div className={i === 0 ? 'rank first' : 'rank'}>{i + 1}</div>
                          <div className="grow">
                            <div className="r1">
                              <b>{d.priority ? '⭐ ' : ''}{d.title}</b>
                              <b className="neg">{fmt(left)}</b>
                            </div>
                            <div className="progress"><i style={{ width: `${pct}%` }} /></div>
                            <small>
                              Пардохт: {fmt(d.paid)} аз {fmt(d.amount)} · {d.priority ? 'афзалиятнок' : 'аз рӯи миқдор'}
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
            )
          ) : paid.length === 0 ? (
            <div className="empty small">Ҳанӯз қарзи пардохтшуда нест.</div>
          ) : (
            <CollapsibleCells>
              {paid.map(d => (
                <SwipeRow key={d.id} onDelete={() => remove(d.id)}>
                  <div className="cell">
                    <div className="rank sm done">✓</div>
                    <div className="grow">
                      <div className="r1">
                        <b>{d.priority ? '⭐ ' : ''}{d.title}</b>
                        <b className="pos">{fmt(d.amount)} смн</b>
                      </div>
                      <small>Арзиш: {fmt(d.amount)} смн · пардохт шуд{d.paidAt ? ` · ${d.paidAt}` : ''}</small>
                    </div>
                  </div>
                </SwipeRow>
              ))}
            </CollapsibleCells>
          )}
        </div>
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
