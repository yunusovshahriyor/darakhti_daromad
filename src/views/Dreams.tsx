import { useState } from 'react';
import CollapsibleCells from '../components/CollapsibleCells';
import DreamForm from '../components/DreamForm';
import DreamDetailSheet from '../components/DreamDetailSheet';
import type { DreamInfo } from '../components/DreamDetailSheet';
import Fab from '../components/Fab';
import SegTabs from '../components/SegTabs';
import Sheet from '../components/Sheet';
import SwipeRow from '../components/SwipeRow';
import { balancesOf, boughtDreams, fmt, fundDreams, monthlyPoolRate, uid } from '../model';
import type { AccountId, Dream } from '../types';
import type { Props } from './props';

type Kind = Dream['kind'];
type Tab = 'now' | 'done';

export default function Dreams({ state, setState, onToast }: Props & { onToast: (m: string) => void }) {
  const [adding, setAdding] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [tabs, setTabs] = useState<Record<Kind, Tab>>({ big: 'now', small: 'now' });

  const bal = balancesOf(state);
  const bought = boughtDreams(state.dreams);

  const add = (v: { title: string; target: number; kind: Kind; priority: boolean }) => {
    setState(s => ({ ...s, dreams: [...s.dreams, { id: uid(), ...v }] }));
    setAdding(false);
  };

  const remove = (id: number) =>
    setState(s => ({ ...s, dreams: s.dreams.filter(d => d.id !== id) }));

  /** Маълумоти як орзу барои саҳифаи он: ҷамъшуда, навбат, муддати расидан. */
  const infoFor = (d: Dream): DreamInfo => {
    const account: AccountId = d.kind === 'big' ? 'bigDream' : 'smallDream';
    const pool = bal[account];
    const plan = fundDreams(state.dreams.filter(x => x.kind === d.kind), pool);
    const rate = monthlyPoolRate(state, account);
    const extra = Math.max(50, Math.round((rate * 0.25) / 50) * 50);
    let cum = 0;
    for (const p of plan) {
      cum += p.dream.target;
      if (p.dream.id === d.id) {
        const need = Math.max(0, cum - pool);
        return {
          funded: p.funded, ready: p.ready, rank: p.rank, rate, extra,
          months: rate > 0 ? need / rate : 0, faster: rate > 0 ? need / (rate + extra) : 0,
        };
      }
    }
    return { funded: 0, ready: false, rank: 1, rate, extra, months: 0, faster: 0 };
  };

  /** Ҳар навъ (калон / хурд) блоки алоҳида бо табҳои худ дорад. */
  const block = (k: Kind, name: string, account: AccountId) => {
    const pool = bal[account];
    const plan = fundDreams(state.dreams.filter(d => d.kind === k), pool);
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
                {plan.map(({ dream: d, funded, ready, rank }) => (
                  <SwipeRow key={d.id} onDelete={() => remove(d.id)}>
                    <div className="cell tap" onClick={() => setDetailId(d.id)}>
                      <div className={ready || rank === 1 ? 'rank first' : 'rank'}>{rank}</div>
                      <div className="grow">
                        <div className="r1">
                          <b>{d.priority ? '⭐ ' : ''}{d.title}</b>
                          <b className={ready ? 'pos' : ''}>{ready ? 'Тайёр ✓' : fmt(d.target)}</b>
                        </div>
                        <div className="progress"><i style={{ width: `${(funded / d.target) * 100}%` }} /></div>
                      </div>
                    </div>
                  </SwipeRow>
                ))}
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

      {detailId !== null && (() => {
        const d = state.dreams.find(x => x.id === detailId && !x.boughtAt);
        return d ? (
          <DreamDetailSheet state={state} setState={setState} dream={d} info={infoFor(d)}
            onClose={() => setDetailId(null)} onToast={onToast} />
        ) : null;
      })()}
    </>
  );
}
