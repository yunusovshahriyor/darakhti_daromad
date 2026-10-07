import { useState } from 'react';
import BuyDreamForm from '../components/BuyDreamForm';
import CollapsibleCells from '../components/CollapsibleCells';
import DreamForm from '../components/DreamForm';
import DreamSaveSheet from '../components/DreamSaveSheet';
import Fab from '../components/Fab';
import { PencilIcon } from '../components/Icons';
import SegTabs from '../components/SegTabs';
import Sheet from '../components/Sheet';
import SwipeRow from '../components/SwipeRow';
import { balancesOf, boughtDreams, fmt, formatEta, fundDreams, monthlyPoolRate, uid } from '../model';
import type { AccountId, Dream } from '../types';
import type { Props } from './props';

type Kind = Dream['kind'];
type Tab = 'now' | 'done';

export default function Dreams({ state, setState, onToast }: Props & { onToast: (m: string) => void }) {
  const [adding, setAdding] = useState(false);
  const [editFor, setEditFor] = useState<Dream | null>(null);
  const [buyFor, setBuyFor] = useState<Dream | null>(null);
  const [saveFor, setSaveFor] = useState<Dream | null>(null);
  const [tabs, setTabs] = useState<Record<Kind, Tab>>({ big: 'now', small: 'now' });

  const bal = balancesOf(state);
  const bought = boughtDreams(state.dreams);

  const add = (v: { title: string; target: number; kind: Kind; priority: boolean }) => {
    setState(s => ({ ...s, dreams: [...s.dreams, { id: uid(), ...v }] }));
    setAdding(false);
  };

  const save = (v: { title: string; target: number; kind: Kind; priority: boolean }) => {
    if (!editFor) return;
    const id = editFor.id;
    setState(s => ({ ...s, dreams: s.dreams.map(d => (d.id === id ? { ...d, ...v } : d)) }));
    setEditFor(null);
  };

  const remove = (id: number) =>
    setState(s => ({ ...s, dreams: s.dreams.filter(d => d.id !== id) }));

  /** Ҳар навъ (калон / хурд) блоки алоҳида бо табҳои худ дорад. */
  const block = (k: Kind, name: string, account: AccountId) => {
    const pool = bal[account];
    const plan = fundDreams(state.dreams.filter(d => d.kind === k), pool);
    const rate = monthlyPoolRate(state, account);
    const extra = Math.max(50, Math.round((rate * 0.25) / 50) * 50);
    let cum = 0;
    const done = bought.filter(d => d.kind === k);
    const tab = tabs[k];

    return (
      <section key={k}>
        <h3 className="group-title"><span>{name}</span><span>Ҷамъшуда: {fmt(pool)}</span></h3>
        <div className="tab-block">
          <SegTabs value={tab} onChange={id => setTabs(t => ({ ...t, [k]: id as Tab }))}
            tabs={[
              { id: 'now', label: 'Ҳозира', count: plan.length },
              { id: 'done', label: 'Харидшуда', count: done.length },
            ]} />

          {tab === 'now' ? (
            plan.length === 0 ? (
              <div className="empty small">Орзуи фаъол нест.</div>
            ) : (
              <div className="cells">
                {plan.map(({ dream: d, funded, ready, rank }) => {
                  cum += d.target;
                  const need = Math.max(0, cum - pool);
                  const months = rate > 0 ? need / rate : 0;
                  const faster = rate > 0 ? need / (rate + extra) : 0;
                  return (
                  <SwipeRow key={d.id} onDelete={() => remove(d.id)}>
                    <div className="cell tap" onClick={() => setBuyFor(d)}>
                      <div className={ready || rank === 1 ? 'rank first' : 'rank'}>{rank}</div>
                      <div className="grow">
                        <div className="r1">
                          <b>{d.priority ? '⭐ ' : ''}{d.title}</b>
                          <b className={ready ? 'pos' : ''}>{ready ? 'Тайёр ✓' : fmt(d.target)}</b>
                        </div>
                        <div className="progress"><i style={{ width: `${(funded / d.target) * 100}%` }} /></div>
                        <small>
                          {fmt(funded)} аз {fmt(d.target)} · {d.priority ? 'афзалиятнок' : 'аз рӯи нарх'}
                        </small>
                        {!ready && (
                          <small className="eta">
                            {rate > 0
                              ? `⏳ ${formatEta(months)}${months - faster >= 1 ? ` · бо +${fmt(extra)} дар моҳ: ${formatEta(faster)}` : ''}`
                              : '⏳ Муддат пас аз аввалин ҷамъкунӣ ҳисоб мешавад'}
                          </small>
                        )}
                      </div>
                      <div className="row-actions">
                        <button className="save-btn" aria-label="Ҷамъ кардан"
                          onClick={e => { e.stopPropagation(); setSaveFor(d); }}>+</button>
                        <button className="icon-btn sm" aria-label="Таҳрир"
                          onClick={e => { e.stopPropagation(); setEditFor(d); }}>
                          <PencilIcon />
                        </button>
                      </div>
                    </div>
                  </SwipeRow>
                  );
                })}
              </div>
            )
          ) : done.length === 0 ? (
            <div className="empty small">Ҳанӯз орзуи харидашуда нест.</div>
          ) : (
            <CollapsibleCells>
              {done.map(d => (
                <SwipeRow key={d.id} onDelete={() => remove(d.id)}>
                  <div className="cell">
                    <div className="rank sm done">✓</div>
                    <div className="grow">
                      <div className="r1">
                        <b>{d.priority ? '⭐ ' : ''}{d.title}</b>
                        <b className="pos">{fmt(d.paidPrice ?? d.target)} смн</b>
                      </div>
                      <small>
                        Арзиш: {fmt(d.paidPrice ?? d.target)} смн
                        {d.paidPrice !== undefined && Math.abs(d.paidPrice - d.target) > 0.005 ? ` (нақша ${fmt(d.target)})` : ''}
                        {' · харида шуд'}{d.boughtAt ? ` · ${d.boughtAt}` : ''}
                      </small>
                    </div>
                  </div>
                </SwipeRow>
              ))}
            </CollapsibleCells>
          )}
        </div>
      </section>
    );
  };

  return (
    <>
      {block('big', '🏠 Орзуҳои калон', 'bigDream')}
      {block('small', '✈️ Орзуҳои хурд', 'smallDream')}

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

      {saveFor && (
        <DreamSaveSheet state={state} setState={setState} dream={saveFor}
          onClose={() => setSaveFor(null)} onDone={onToast} />
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
