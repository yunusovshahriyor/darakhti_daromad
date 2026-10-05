import { CSSProperties, useState } from 'react';
import ExpenseForm from '../components/ExpenseForm';
import GoalForm from '../components/GoalForm';
import { EyeIcon, EyeOffIcon, MinusIcon, SwapIcon, TargetIcon } from '../components/Icons';
import Sheet from '../components/Sheet';
import TransferForm from '../components/TransferForm';
import {
  ACCOUNTS, CARD_COLORS, balancesOf, fmt, groupByMonth, hasDebt, ledger, monthTitle,
  shareOfIncome, subtitleOf, today,
} from '../model';
import type { AccountId } from '../types';
import type { Privacy } from './Accounts';
import type { Props } from './props';

type Modal = 'transfer' | 'expense' | 'goal' | null;

export default function AccountDetail({ state, setState, id, hidden, onToggleHidden, onToast }: Props & Privacy & {
  id: AccountId;
  onToast: (msg: string) => void;
}) {
  const [modal, setModal] = useState<Modal>(null);
  const bal = balancesOf(state)[id];
  const goal = state.goals[id];
  const pct = goal ? Math.max(0, Math.min(100, (bal / goal) * 100)) : 0;
  const reached = !!goal && bal >= goal;
  const share = shareOfIncome(id, state.settings, hasDebt(state.debts));
  const mask = (v: string) => (hidden ? '••••' : v);

  const entries = ledger(state, id);
  const month = today().slice(0, 7);
  const monthIn = entries.filter(e => e.date.startsWith(month) && e.amount > 0).reduce((s, e) => s + e.amount, 0);
  const monthOut = entries.filter(e => e.date.startsWith(month) && e.amount < 0).reduce((s, e) => s - e.amount, 0);
  const groups = groupByMonth(entries);

  const done = (msg: string) => {
    onToast(msg);
    setModal(null);
  };
  const common = { state, setState };

  return (
    <>
      <section className="acct-hero" style={{ '--c': CARD_COLORS[id] } as CSSProperties}>
        <div className="ah-top">
          <span className="ah-ic">{ACCOUNTS[id].icon}</span>
          <span className="ah-name">
            {ACCOUNTS[id].name}
            <small>{subtitleOf(id, state.settings, hasDebt(state.debts))}</small>
          </span>
          <button className="round-btn glass sm" onClick={onToggleHidden}
            aria-label={hidden ? 'Нишон додан' : 'Пинҳон кардан'}>
            {hidden ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
        <div className="ah-bal">{mask(fmt(bal))} <small>смн</small></div>

        {goal ? (
          <div className="ah-goal">
            <div className="bar"><i style={{ width: `${pct}%` }} /></div>
            <div className="row">
              <span>{Math.floor(pct)}% аз {mask(fmt(goal))}</span>
              <span>{reached ? '🎉 Мақсад расид!' : `Боқӣ ${mask(fmt(goal - bal))}`}</span>
            </div>
            <div className="miles">
              {[25, 50, 75, 100].map(m => (
                <span key={m} className={pct >= m ? 'on' : ''}>{pct >= m ? '✓ ' : ''}{m}%</span>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <div className="actions">
        <button onClick={() => setModal('transfer')}>
          <span className="act-ic"><SwapIcon /></span>Гузаронидан
        </button>
        <button onClick={() => setModal('expense')}>
          <span className="act-ic"><MinusIcon /></span>Харҷ
        </button>
        <button onClick={() => setModal('goal')}>
          <span className="act-ic"><TargetIcon /></span>Мақсад
        </button>
      </div>

      <div className="info-card">
        <div className="row">
          <span>Ин моҳ омад</span><b className="pos">+{mask(fmt(monthIn))}</b>
        </div>
        <div className="row">
          <span>Ин моҳ рафт</span><b className="neg">−{mask(fmt(monthOut))}</b>
        </div>
        <p className="note">
          {share > 0
            ? `Ҳар даромад ${fmt(Math.round(share * 100) / 100)}% ба ин ҳисоб худкор меравад.`
            : 'Ин ҳисоб ҳоло худкор пур намешавад. Маблағро бо «Гузаронидан» илова кунед.'}
        </p>
      </div>

      {groups.length === 0 ? (
        <div className="empty small">Ҳанӯз амалиёт нест.</div>
      ) : groups.map(g => (
        <section key={g.key}>
          <h3 className="group-title"><span>{monthTitle(g.key)}</span></h3>
          <div className="cells">
            {g.items.map(e => (
              <div className="cell" key={e.key}>
                <div className="grow">
                  <div className="r1">
                    <b>{e.title}</b>
                    <b className={e.amount > 0 ? 'pos' : 'neg'}>{e.amount > 0 ? '+' : '−'}{mask(fmt(Math.abs(e.amount)))}</b>
                  </div>
                  <small>{e.date}</small>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      {modal === 'transfer' && (
        <Sheet title="Гузаронидан" onClose={() => setModal(null)}>
          <TransferForm {...common} from={id} onDone={done} />
        </Sheet>
      )}
      {modal === 'expense' && (
        <Sheet title="Хароҷот" onClose={() => setModal(null)}>
          <ExpenseForm {...common} initialAccount={id} onDone={done} />
        </Sheet>
      )}
      {modal === 'goal' && (
        <Sheet title="Мақсад" onClose={() => setModal(null)}>
          <GoalForm {...common} id={id} onDone={done} />
        </Sheet>
      )}
    </>
  );
}
