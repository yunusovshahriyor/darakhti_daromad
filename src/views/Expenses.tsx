import Empty from '../components/Empty';
import SwipeRow from '../components/SwipeRow';
import { ACCOUNTS, fmt, groupByMonth, monthTitle } from '../model';
import type { Props } from './props';

export default function Expenses({ state, setState }: Props) {
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
      {groups.length === 0 && <Empty icon="🧾" text="Ҳанӯз хароҷот нест. Тугмаи сабзи «Илова»-ро дар поён пахш кунед." />}

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

    </>
  );
}
