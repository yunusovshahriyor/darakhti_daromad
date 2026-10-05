import { useState } from 'react';
import Empty from '../components/Empty';
import SwipeRow from '../components/SwipeRow';
import { ACCOUNTS, ACCOUNT_ORDER, fmt, groupByMonth, monthTitle } from '../model';
import type { Props } from './props';

export default function Incomes({ state, setState }: Props) {
  const [expanded, setExpanded] = useState<number | null>(null);

  const remove = (id: number) =>
    setState(s => ({ ...s, incomes: s.incomes.filter(i => i.id !== id) }));

  const groups = groupByMonth(state.incomes);

  return (
    <>
      {groups.length === 0 && <Empty icon="🪙" text="Ҳанӯз даромад нест. Тугмаи сабзи «Илова»-ро дар поён пахш кунед." />}

      {groups.map(g => (
        <section key={g.key}>
          <h3 className="group-title">
            <span>{monthTitle(g.key)}</span>
            <span>{fmt(g.items.reduce((s, i) => s + i.amount, 0))}</span>
          </h3>
          <div className="cells">
            {g.items.map(it => (
              <SwipeRow key={it.id} onDelete={() => remove(it.id)}>
                <div className="cell tap" onClick={() => setExpanded(expanded === it.id ? null : it.id)}>
                  <div className="ic">{it.title.charAt(0).toUpperCase()}</div>
                  <div className="grow">
                    <div className="r1">
                      <b>{it.title}</b>
                      <b className="pos">+{fmt(it.amount)}</b>
                    </div>
                    <small>{it.date}</small>
                    {expanded === it.id && (
                      <div className="breakdown">
                        {ACCOUNT_ORDER.filter(id => it.alloc[id] > 0).map(id => (
                          <div className="row" key={id}>
                            <span>{ACCOUNTS[id].icon} {ACCOUNTS[id].name}</span>
                            <span>{fmt(it.alloc[id])}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </SwipeRow>
            ))}
          </div>
        </section>
      ))}

    </>
  );
}
