import { ACCOUNTS, GROUPS, balances, fmt, monthlyIncome, spent } from '../model';
import type { Props } from './props';

export default function Dashboard({ state }: Props) {
  const { incomes, expenses, settings } = state;
  const bal = balances(incomes, expenses);
  const out = spent(expenses);

  const totalIncome = incomes.reduce((s, i) => s + i.amount, 0);
  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);
  const months = monthlyIncome(incomes);
  const cur = months[months.length - 1].total;
  const prev = months[months.length - 2].total;
  const growth = prev > 0 ? ((cur - prev) / prev) * 100 : null;
  const max = Math.max(...months.map(m => m.total), 1);

  const groupTitle = (title: string) =>
    title === 'Ҳисоби ширкат' ? `${title} · ${settings.company}%`
    : title === 'Ҳисоби шахсӣ' ? `${title} · ${100 - settings.company}%`
    : title;

  return (
    <>
      <section className="hero-card">
        <span>Ҷамъи даромад</span>
        <strong>{fmt(totalIncome)} <small>сомонӣ</small></strong>
        <div className="hero-stats">
          <div>
            <small>Ин моҳ</small>
            <b>{fmt(cur)}</b>
            {growth !== null && (
              <em className={growth >= 0 ? 'up' : 'down'}>
                {growth >= 0 ? '▲' : '▼'} {Math.abs(growth).toFixed(0)}%
              </em>
            )}
          </div>
          <div>
            <small>Харҷ шуд</small>
            <b>{fmt(totalSpent)}</b>
          </div>
        </div>
      </section>

      {GROUPS.map(g => (
        <section key={g.title}>
          <h3 className="group-title">{groupTitle(g.title)}</h3>
          <div className="cells">
            {g.ids.map(id => {
              const total = bal[id] + out[id];
              const pct = total > 0 ? Math.min(100, (out[id] / total) * 100) : 0;
              return (
                <div className="cell" key={id}>
                  <div className="ic">{ACCOUNTS[id].icon}</div>
                  <div className="grow">
                    <div className="r1">
                      <b>{ACCOUNTS[id].name}</b>
                      <b className={bal[id] < -0.005 ? 'neg' : ''}>{fmt(bal[id])}</b>
                    </div>
                    <div className="progress"><i style={{ width: `${pct}%` }} className={pct > 80 ? 'warn' : ''} /></div>
                    <small>Харҷ: {fmt(out[id])} / {fmt(total)}</small>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <section>
        <h3 className="group-title">Афзоиши даромад · 6 моҳ</h3>
        <div className="card">
          <div className="chart">
            {months.map(m => (
              <div className="col" key={m.key}>
                <span className="val">{m.total ? fmt(m.total) : ''}</span>
                <div className="bar" style={{ height: `${(m.total / max) * 100}%` }} />
                <span className="lbl">{m.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
