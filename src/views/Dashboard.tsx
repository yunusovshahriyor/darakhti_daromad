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
    title === 'Ҳисоби ширкат' ? `${title} (${settings.company}%)`
    : title === 'Ҳисоби шахсӣ' ? `${title} (${100 - settings.company}%)`
    : title;

  return (
    <>
      <section className="stats">
        <div className="stat main">
          <span>Ҷамъи даромад</span>
          <strong>{fmt(totalIncome)} с.</strong>
        </div>
        <div className="stat">
          <span>Ин моҳ</span>
          <strong>{fmt(cur)} с.</strong>
          {growth !== null && (
            <small className={growth >= 0 ? 'up' : 'down'}>
              {growth >= 0 ? '▲' : '▼'} {Math.abs(growth).toFixed(0)}% аз моҳи гузашта
            </small>
          )}
        </div>
        <div className="stat">
          <span>Харҷ шуд</span>
          <strong>{fmt(totalSpent)} с.</strong>
        </div>
      </section>

      {GROUPS.map(g => (
        <section className="card" key={g.title}>
          <h2>{groupTitle(g.title)}</h2>
          <div className="grid">
            {g.ids.map(id => {
              const total = bal[id] + out[id];
              const pct = total > 0 ? Math.min(100, (out[id] / total) * 100) : 0;
              return (
                <div className="acct" key={id}>
                  <div className="acct-head">
                    <span className="icon">{ACCOUNTS[id].icon}</span>
                    <span>{ACCOUNTS[id].name}</span>
                  </div>
                  <strong className={bal[id] < -0.005 ? 'neg' : ''}>{fmt(bal[id])}</strong>
                  <div className="progress"><i style={{ width: `${pct}%` }} className={pct > 80 ? 'warn' : ''} /></div>
                  <small>Харҷ: {fmt(out[id])} / {fmt(total)}</small>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <section className="card">
        <h2>Афзоиши даромад (6 моҳ)</h2>
        <div className="chart">
          {months.map(m => (
            <div className="col" key={m.key}>
              <span className="val">{m.total ? fmt(m.total) : ''}</span>
              <div className="bar" style={{ height: `${(m.total / max) * 100}%` }} />
              <span className="lbl">{m.label}</span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
