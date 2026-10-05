import { useState } from 'react';
import BuyDreamForm from '../components/BuyDreamForm';
import CollapsibleCells from '../components/CollapsibleCells';
import DreamForm from '../components/DreamForm';
import Empty from '../components/Empty';
import Fab from '../components/Fab';
import { PencilIcon } from '../components/Icons';
import SegTabs from '../components/SegTabs';
import Sheet from '../components/Sheet';
import SwipeRow from '../components/SwipeRow';
import { activeDreams, balancesOf, boughtDreams, fmt, fundDreams, uid } from '../model';
import type { AccountId, Dream } from '../types';
import type { Props } from './props';

export default function Dreams({ state, setState }: Props) {
  const [adding, setAdding] = useState(false);
  const [editFor, setEditFor] = useState<Dream | null>(null);
  const [buyFor, setBuyFor] = useState<Dream | null>(null);
  const [tab, setTab] = useState<'now' | 'done'>('now');

  const bal = balancesOf(state);
  const bought = boughtDreams(state.dreams);

  const add = (v: { title: string; target: number; kind: Dream['kind']; priority: boolean }) => {
    setState(s => ({ ...s, dreams: [...s.dreams, { id: uid(), ...v }] }));
    setAdding(false);
  };

  const save = (v: { title: string; target: number; kind: Dream['kind']; priority: boolean }) => {
    if (!editFor) return;
    const id = editFor.id;
    setState(s => ({ ...s, dreams: s.dreams.map(d => (d.id === id ? { ...d, ...v } : d)) }));
    setEditFor(null);
  };

  const remove = (id: number) =>
    setState(s => ({ ...s, dreams: s.dreams.filter(d => d.id !== id) }));

  const section = (k: Dream['kind'], name: string, account: AccountId) => {
    const pool = bal[account];
    const plan = fundDreams(state.dreams.filter(d => d.kind === k), pool);
    return (
      <div key={k}>
        <h3 className="group-title"><span>{name}</span><span>Ҷамъшуда: {fmt(pool)}</span></h3>
        {plan.length === 0 ? (
          <div className="cells"><div className="cell muted">Орзу илова нашудааст.</div></div>
        ) : (
          <div className="cells">
            {plan.map(({ dream: d, funded, ready, rank }) => (
              <SwipeRow key={d.id} onDelete={() => remove(d.id)}>
                <div className="cell tap" onClick={() => setBuyFor(d)}>
                  <div className={ready ? 'rank first' : rank === 1 ? 'rank first' : 'rank'}>{rank}</div>
                  <div className="grow">
                    <div className="r1">
                      <b>{d.priority ? '⭐ ' : ''}{d.title}</b>
                      <b className={ready ? 'pos' : ''}>{ready ? 'Тайёр ✓' : fmt(d.target)}</b>
                    </div>
                    <div className="progress"><i style={{ width: `${(funded / d.target) * 100}%` }} /></div>
                    <small>
                      {fmt(funded)} аз {fmt(d.target)} · {d.priority ? 'афзалиятнок' : 'аз рӯи нарх'}
                    </small>
                  </div>
                  <button className="icon-btn sm" aria-label="Таҳрир"
                    onClick={e => { e.stopPropagation(); setEditFor(d); }}>
                    <PencilIcon />
                  </button>
                </div>
              </SwipeRow>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {state.dreams.length === 0 && <Empty icon="✨" text="Орзуҳои худро илова кунед: тугмаи +" />}

      {state.dreams.length > 0 && (
        <div className="tab-block">
          <SegTabs value={tab} onChange={id => setTab(id as 'now' | 'done')}
            tabs={[
              { id: 'now', label: 'Ҳозира', count: activeDreams(state.dreams).length },
              { id: 'done', label: 'Харидшуда', count: bought.length },
            ]} />

          {tab === 'now' ? (
            <>
              <p className="note order-note">
                Тартиб: аввал орзуҳои ⭐ афзалиятнок, баъд аз рӯи нарх аз арзон ба қимат. Барои харидан орзуро пахш кунед.
              </p>
              {section('big', '🏠 Орзуҳои калон', 'bigDream')}
              {section('small', '✈️ Орзуҳои хурд', 'smallDream')}
            </>
          ) : bought.length === 0 ? (
            <div className="empty small">Ҳанӯз орзуи харидашуда нест.</div>
          ) : (
            <CollapsibleCells>
              {bought.map(d => (
                <SwipeRow key={d.id} onDelete={() => remove(d.id)}>
                  <div className="cell">
                    <div className="rank sm done">✓</div>
                    <div className="grow">
                      <div className="r1">
                        <b>{d.priority ? '⭐ ' : ''}{d.title}</b>
                        <b className="pos">{fmt(d.paidPrice ?? d.target)}</b>
                      </div>
                      <small>{d.kind === 'big' ? '🏠 Калон' : '✈️ Хурд'} · харида шуд{d.boughtAt ? ` · ${d.boughtAt}` : ''}</small>
                    </div>
                  </div>
                </SwipeRow>
              ))}
            </CollapsibleCells>
          )}
        </div>
      )}

      <Fab onClick={() => setAdding(true)} label="Орзуи нав" />

      {adding && (
        <Sheet title="Орзуи нав" onClose={() => setAdding(false)}>
          <DreamForm onSubmit={add} submitLabel="Илова кардан" />
        </Sheet>
      )}

      {editFor && (
        <Sheet title="Таҳрири орзу" onClose={() => setEditFor(null)}>
          <DreamForm initial={editFor} onSubmit={save} submitLabel="Нигоҳ доштан" />
        </Sheet>
      )}

      {buyFor && (
        <Sheet title={`Харид: ${buyFor.title}`} onClose={() => setBuyFor(null)}>
          <BuyDreamForm state={state} setState={setState} dream={buyFor}
            defaultSource={buyFor.kind === 'big' ? 'bigDream' : 'smallDream'}
            onDone={() => setBuyFor(null)} />
        </Sheet>
      )}
    </>
  );
}
