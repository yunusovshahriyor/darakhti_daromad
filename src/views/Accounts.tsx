import { CSSProperties, useEffect, useState } from 'react';
import { ChevronIcon, EyeIcon, EyeOffIcon } from '../components/Icons';
import {
  ACCOUNTS, ACCOUNT_TREE, CARD_COLORS, SAVING_IDS, balancesOf, fmt, groupNote, groupSum,
  hasDebt, leafHint, savedThisMonth,
} from '../model';
import type { AccountGroup } from '../model';
import type { AccountId } from '../types';
import type { Props } from './props';

export interface Privacy {
  hidden: boolean;
  onToggleHidden: () => void;
}

const CLOSED_KEY = 'darakhti:closed';

const readClosed = (): string[] => {
  try { return JSON.parse(localStorage.getItem(CLOSED_KEY) ?? '[]') as string[]; } catch { return []; }
};

export default function Accounts({ state, hidden, onToggleHidden, onOpenAccount }: Props & Privacy & {
  onOpenAccount: (id: AccountId) => void;
}) {
  const [closed, setClosed] = useState(readClosed);

  useEffect(() => {
    try { localStorage.setItem(CLOSED_KEY, JSON.stringify(closed)); } catch { /* ignore */ }
  }, [closed]);

  const toggle = (key: string) =>
    setClosed(c => (c.includes(key) ? c.filter(k => k !== key) : [...c, key]));

  const bal = balancesOf(state);
  const total = Object.values(bal).reduce((s, v) => s + v, 0);
  const savings = SAVING_IDS.reduce((s, id) => s + bal[id], 0);
  const saved = savedThisMonth(state);
  const debt = hasDebt(state.debts);
  const mask = (v: string) => (hidden ? '••••' : v);

  const message =
    state.incomes.length === 0 ? 'Аввалин даромадро илова кунед, барнома худаш ба ҳисобҳо тақсим мекунад 🌱'
    : saved > 0 ? `Офарин! Ин моҳ ${mask(fmt(saved))} смн ба оянда ҷамъ кардед 💪`
    : 'Ин моҳ ҳанӯз чизе ҷамъ нашудааст. Аз ҳисоби хароҷот ба «Сармоя» гузаронед 🎯';

  const card = (id: AccountId) => {
    const goal = state.goals[id];
    const pct = goal ? Math.max(0, Math.min(100, (bal[id] / goal) * 100)) : 0;
    return (
      <button key={id} className="acct-card" onClick={() => onOpenAccount(id)}
        style={{ '--c': CARD_COLORS[id] } as CSSProperties}>
        <span className="ac-ic">{ACCOUNTS[id].icon}</span>
        <span className="ac-name">{ACCOUNTS[id].name}</span>
        <b className="ac-bal">{mask(fmt(bal[id]))}</b>
        {goal ? (
          <span className="ac-goal">
            <span className="bar"><i style={{ width: `${pct}%` }} /></span>
            <small>{pct >= 100 ? '🎉 Мақсад расид' : `${Math.floor(pct)}% аз ${mask(fmt(goal))}`}</small>
          </span>
        ) : (
          <small className="ac-hint">{leafHint(id, state.settings, debt)}</small>
        )}
      </button>
    );
  };

  const group = (g: AccountGroup, sub = false) => {
    const open = !closed.includes(g.key);
    const leaves = g.items.filter((i): i is AccountId => typeof i === 'string');
    const subs = g.items.filter((i): i is AccountGroup => typeof i !== 'string');
    return (
      <div className={sub ? 'grp sub' : 'grp'} key={g.key}>
        <button className="grp-head" onClick={() => toggle(g.key)} aria-expanded={open}>
          <span className="grp-ic">{g.icon}</span>
          <span className="grp-t">
            <b>{g.title}</b>
            <small>{groupNote(g.key, state.settings)}</small>
          </span>
          <span className="grp-sum">
            <b>{mask(fmt(groupSum(g, bal)))}</b>
            <span className={open ? 'chev open' : 'chev'}><ChevronIcon /></span>
          </span>
        </button>
        {open && (
          <div className="grp-body">
            {leaves.length > 0 && <div className="acct-grid">{leaves.map(card)}</div>}
            {subs.map(s => group(s, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <section className="bank-hero">
        <div className="bh-top">
          <span>Ҷамъи маблағ дар ҳисобҳо</span>
          <button className="round-btn glass" onClick={onToggleHidden}
            aria-label={hidden ? 'Нишон додан' : 'Пинҳон кардан'}>
            {hidden ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
        <div className="bh-total">{mask(fmt(total))} <small>смн</small></div>
        <div className="bh-chips">
          <div><small>Дар ҷамъшавӣ</small><b>{mask(fmt(savings))}</b></div>
          <div><small>Ин моҳ ҷамъ шуд</small><b>{saved >= 0 ? '+' : ''}{mask(fmt(saved))}</b></div>
        </div>
        <p className="bh-msg">{message}</p>
      </section>

      <div className="groups">{ACCOUNT_TREE.map(g => group(g))}</div>
    </>
  );
}
