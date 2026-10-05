import type { CSSProperties } from 'react';
import { EyeIcon, EyeOffIcon } from '../components/Icons';
import {
  ACCOUNTS, ACCOUNT_SECTIONS, CARD_COLORS, SAVING_IDS, balancesOf, fmt, hasDebt,
  savedThisMonth, shareOfIncome,
} from '../model';
import type { AccountId } from '../types';
import type { Props } from './props';

export interface Privacy {
  hidden: boolean;
  onToggleHidden: () => void;
}

export default function Accounts({ state, hidden, onToggleHidden, onOpenAccount }: Props & Privacy & {
  onOpenAccount: (id: AccountId) => void;
}) {
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

      {ACCOUNT_SECTIONS.map(sec => (
        <section key={sec.title}>
          <h3 className="group-title"><span>{sec.title}</span></h3>
          <div className="acct-grid">
            {sec.ids.map(id => {
              const goal = state.goals[id];
              const pct = goal ? Math.max(0, Math.min(100, (bal[id] / goal) * 100)) : 0;
              const share = shareOfIncome(id, state.settings, debt);
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
                    <small className="ac-hint">
                      {share > 0 ? `${fmt(Math.round(share * 100) / 100)}% аз ҳар даромад` : 'Мақсад гузоред'}
                    </small>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </>
  );
}
