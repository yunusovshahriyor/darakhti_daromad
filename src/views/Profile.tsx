import { FormEvent, useEffect, useState } from 'react';
import Field from '../components/Field';
import { ChevronIcon, PencilIcon } from '../components/Icons';
import Sheet from '../components/Sheet';
import { balancesOf, fmt, inPeriod, monthlyIncome, periodAt } from '../model';
import type { Props, Sub } from './props';

const NAME_KEY = 'darakhti:profile';

const readName = (): string => {
  try { return localStorage.getItem(NAME_KEY) ?? ''; } catch { return ''; }
};

export default function Profile({ state, open }: Props & { open: (s: Sub) => void }) {
  const [name, setName] = useState(readName);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    try { localStorage.setItem(NAME_KEY, name); } catch { /* ignore */ }
  }, [name]);

  const { incomes, expenses } = state;
  const month = periodAt('month', 0);
  const incomeMonth = incomes.filter(i => inPeriod(i.date, month)).reduce((s, i) => s + i.amount, 0);
  const spentMonth = expenses.filter(e => inPeriod(e.date, month)).reduce((s, e) => s + e.amount, 0);
  const incomeAll = incomes.reduce((s, i) => s + i.amount, 0);
  const spentAll = expenses.reduce((s, e) => s + e.amount, 0);
  const total = Object.values(balancesOf(state)).reduce((s, v) => s + v, 0);
  const months = monthlyIncome(incomes);
  const max = Math.max(...months.map(m => m.total), 1);
  const avg = months.filter(m => m.total > 0).length
    ? months.reduce((s, m) => s + m.total, 0) / months.filter(m => m.total > 0).length : 0;

  const save = (e: FormEvent) => {
    e.preventDefault();
    setName(draft.trim());
    setEditing(false);
  };

  return (
    <div className="profile-page">
      <section className="pf-hero">
        <div className="pf-avatar">{name ? name.trim().charAt(0).toUpperCase() : '👤'}</div>
        <div className="pf-who">
          <b>{name || 'Номи шумо'}</b>
          <small>Ҳамагӣ дар ҳисобҳо: {fmt(total)} смн</small>
        </div>
        <button className="icon-btn" aria-label="Таҳрири ном"
          onClick={() => { setDraft(name); setEditing(true); }}>
          <PencilIcon />
        </button>
      </section>

      <h3 className="group-title"><span>Даромад</span></h3>
      <section className="pf-income">
        <div className="pf-big">
          <small>Ин моҳ</small>
          <b>{fmt(incomeMonth)} <i>смн</i></b>
        </div>
        <div className="pf-bars">
          {months.map(m => (
            <div key={m.key} className="pf-bar">
              <span style={{ height: `${Math.max(4, (m.total / max) * 100)}%` }} className={m.total ? '' : 'zero'} />
              <small>{m.label.slice(0, 3)}</small>
            </div>
          ))}
        </div>
        <div className="pf-stats">
          <div><small>Ҳамаи вақт</small><b>{fmt(incomeAll)}</b></div>
          <div><small>Миёна дар моҳ</small><b>{fmt(Math.round(avg))}</b></div>
          <div><small>Хароҷоти моҳ</small><b>{fmt(spentMonth)}</b></div>
          <div><small>Ҳамаи хароҷот</small><b>{fmt(spentAll)}</b></div>
        </div>
      </section>

      <h3 className="group-title"><span>Бахшҳо</span></h3>
      <div className="cells">
        <button className="cell tap link" onClick={() => open('dreams')}>
          <div className="ic">✨</div>
          <div className="grow"><b>Орзуҳо</b><small>{state.dreams.length} орзу</small></div>
          <ChevronIcon />
        </button>
        <button className="cell tap link" onClick={() => open('debts')}>
          <div className="ic">💳</div>
          <div className="grow"><b>Қарзҳо</b><small>{state.debts.length + state.loans.length} сабт</small></div>
          <ChevronIcon />
        </button>
        <button className="cell tap link" onClick={() => open('settings')}>
          <div className="ic">⚙️</div>
          <div className="grow"><b>Танзимот</b><small>Фоизҳои тақсим, маълумот</small></div>
          <ChevronIcon />
        </button>
      </div>

      {editing && (
        <Sheet title="Номи шумо" onClose={() => setEditing(false)}>
          <form onSubmit={save}>
            <Field label="Ном">
              <input value={draft} autoFocus maxLength={30} onChange={e => setDraft(e.target.value)} placeholder="Масалан, Шаҳриёр" />
            </Field>
            <button className="btn big" type="submit">Нигоҳ доштан</button>
          </form>
        </Sheet>
      )}
    </div>
  );
}
