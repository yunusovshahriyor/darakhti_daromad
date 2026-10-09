import { useState } from 'react';
import CollapsibleCells from '../components/CollapsibleCells';
import DreamForm from '../components/DreamForm';
import DreamDetailSheet from '../components/DreamDetailSheet';
import type { DreamInfo } from '../components/DreamDetailSheet';
import type { DreamValues } from '../components/DreamForm';
import Fab from '../components/Fab';
import SegTabs from '../components/SegTabs';
import Sheet from '../components/Sheet';
import SwipeRow from '../components/SwipeRow';
import { badges, deadlinePlans, depositStreak, noDepositThisWeek } from '../dreams';
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

  const add = (v: DreamValues) => {
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
          funded: p.funded, ready: p.ready, rank: p.rank, need, rate, extra,
          months: rate > 0 ? need / rate : 0, faster: rate > 0 ? need / (rate + extra) : 0,
        };
      }
    }
    return { funded: 0, ready: false, rank: 1, need: 0, rate, extra, months: 0, faster: 0 };
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
                    <div className="cell tap" onClick={() => setDetailId(d.id)}
                      style={d.color ? ({ '--dc': d.color } as React.CSSProperties) : undefined}>
                      {d.image
                        ? <div className="thumb" style={{ backgroundImage: `url(${d.image})` }}><em>{rank}</em></div>
                        : <div className={ready || rank === 1 ? 'rank first' : 'rank'}
                          style={d.color ? { background: d.color } : undefined}>{rank}</div>}
                      <div className="grow">
                        <div className="r1">
                          <b>{d.priority ? '⭐ ' : ''}{d.title}</b>
                          <b className={ready ? 'pos' : ''}>{ready ? 'Тайёр ✓' : fmt(d.target)}</b>
                        </div>
                        <div className="progress dc"><i style={{ width: `${(funded / d.target) * 100}%` }} /></div>
                        <div className="dr-sub">
                          <small>Ҷамъшуда: {fmt(funded)}</small>
                          <small><b>{Math.floor((funded / d.target) * 100)}%</b></small>
                        </div>
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

  // Ҳавасмандӣ: силсила, огоҳии ҳафтаина, аз реҷа мондаҳо ва нишонҳо
  const active = state.dreams.filter(d => !d.boughtAt);
  const streak = depositStreak(state);
  const nudge = active.length > 0 && noDepositThisWeek(state);
  const behind = deadlinePlans(state, d => {
    const plan = fundDreams(state.dreams.filter(x => x.kind === d.kind), bal[d.kind === 'big' ? 'bigDream' : 'smallDream']);
    let cum = 0;
    for (const p of plan) { cum += p.dream.target; if (p.dream.id === d.id) return { funded: p.funded, need: Math.max(0, cum - bal[d.kind === 'big' ? 'bigDream' : 'smallDream']) }; }
    return { funded: 0, need: 0 };
  }).filter(p => p.behind);
  const bestPct = Math.max(0, ...['big', 'small'].flatMap(k => {
    const pool = bal[k === 'big' ? 'bigDream' : 'smallDream'];
    return fundDreams(state.dreams.filter(d => d.kind === k), pool).map(f => (f.funded / f.dream.target) * 100);
  }));
  const medals = badges(state, bestPct);

  return (
    <>
      {(streak > 0 || nudge || behind.length > 0) && (
        <section className="dr-top">
          <div className="dr-pills">
            {streak > 0 && <span className="dr-pill hot">🔥 {streak} ҳафта пай дар пай</span>}
            {nudge && <span className="dr-pill">💡 Ин ҳафта чизе нагузоштаед</span>}
            {behind.length > 0 && <span className="dr-pill warn">⚠️ {behind.length} аз реҷа мондааст</span>}
          </div>
          {behind.map(p => (
            <div className="dr-warn" key={p.dream.id}>
              <b>{p.dream.title}</b>
              <small>Ҳар моҳ {fmt(Math.ceil(p.perMonth))} лозим · ҳозир {fmt(Math.round(p.rate))}</small>
            </div>
          ))}
        </section>
      )}

      {block('big', '🏠 Орзуҳои калон', 'bigDream')}
      {block('small', '✈️ Орзуҳои хурд', 'smallDream')}

      <h3 className="group-title"><span>Нишонҳо</span><span>{medals.filter(m => m.done).length} аз {medals.length}</span></h3>
      <div className="medals">
        {medals.map(m => (
          <div key={m.id} className={m.done ? 'medal on' : 'medal'} title={m.text}>
            <span>{m.icon}</span>
            <b>{m.title}</b>
          </div>
        ))}
      </div>

      <Fab onClick={() => setAdding(true)} label="Орзуи нав" />

      {adding && (
        <Sheet title="Орзуи нав" onClose={() => setAdding(false)} tall>
          <DreamForm state={state} onSubmit={add} submitLabel="Илова кардан" />
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
