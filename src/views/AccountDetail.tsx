import { CSSProperties, useState } from 'react';
import ExpenseForm from '../components/ExpenseForm';
import GoalForm from '../components/GoalForm';
import { EyeIcon, EyeOffIcon, MinusIcon, SwapIcon, TargetIcon } from '../components/Icons';
import PayDebtForm from '../components/PayDebtForm';
import Sheet from '../components/Sheet';
import TransferForm from '../components/TransferForm';
import {
  ACCOUNTS, CARD_COLORS, DEBT_ORDER_LABEL, balancesOf, fmt, groupByMonth, hasDebt, ledger, monthTitle,
  remaining, shareOfIncome, sortDebts, subtitleOf, today,
} from '../model';
import type { AccountId, Debt } from '../types';
import type { Privacy } from './Accounts';
import type { Props } from './props';

type Modal = 'transfer' | 'expense' | 'goal' | 'pay' | null;

const MILESTONES = [25, 50, 75, 100];

export default function AccountDetail({ state, setState, id, hidden, onToggleHidden, onToast, onOpenDebts }: Props & Privacy & {
  id: AccountId;
  onToast: (msg: string) => void;
  onOpenDebts: () => void;
}) {
  const [modal, setModal] = useState<Modal>(null);
  const [payFor, setPayFor] = useState<Debt | null>(null);

  const isDebtAccount = id === 'debt';
  const bal = balancesOf(state)[id];
  const debt = hasDebt(state.debts);
  const mask = (v: string) => (hidden ? '••••' : v);

  // Мақсади ҳисоб: барои «Пардохти қарз» — қарзи аввалин, барои дигарон — мақсади худи корбар
  const debts = sortDebts(state.debts, state.debtOrder);
  const unpaid = debts.filter(d => remaining(d) > 0.005);
  const first = unpaid[0];
  const goal = state.goals[id];
  const goalPct = goal ? Math.max(0, Math.min(100, (bal / goal) * 100)) : 0;
  const reached = !!goal && bal >= goal;
  const firstPct = first ? Math.min(100, (first.paid / first.amount) * 100) : 0;

  const share = shareOfIncome(id, state.settings, debt);

  const entries = ledger(state, id);
  const month = today().slice(0, 7);
  const monthIn = entries.filter(e => e.date.startsWith(month) && e.amount > 0).reduce((s, e) => s + e.amount, 0);
  const monthOut = entries.filter(e => e.date.startsWith(month) && e.amount < 0).reduce((s, e) => s - e.amount, 0);
  const net = monthIn - monthOut;
  const inShare = monthIn + monthOut > 0 ? (monthIn / (monthIn + monthOut)) * 100 : 0;
  const groups = groupByMonth(entries);

  const toggleOrder = () =>
    setState(s => ({ ...s, debtOrder: s.debtOrder === 'big' ? 'small' : 'big' }));

  const done = (msg: string) => {
    onToast(msg);
    setModal(null);
    setPayFor(null);
  };
  const common = { state, setState };

  const bar = (pct: number, left: string, right: string) => (
    <>
      <div className="bar"><i style={{ width: `${pct}%` }} /></div>
      <div className="row"><span>{left}</span><span>{right}</span></div>
      <div className="miles">
        {MILESTONES.map(m => (
          <span key={m} className={pct >= m ? 'on' : ''}>{pct >= m ? '✓ ' : ''}{m}%</span>
        ))}
      </div>
    </>
  );

  return (
    <>
      <section className="acct-hero" style={{ '--c': CARD_COLORS[id] } as CSSProperties}>
        <div className="ah-top">
          <span className="ah-ic">{ACCOUNTS[id].icon}</span>
          <span className="ah-name">
            {ACCOUNTS[id].name}
            <small>{subtitleOf(id, state.settings, debt)}</small>
          </span>
          <button className="round-btn glass sm" onClick={onToggleHidden}
            aria-label={hidden ? 'Нишон додан' : 'Пинҳон кардан'}>
            {hidden ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
        <div className="ah-bal">{mask(fmt(bal))} <small>смн</small></div>

        {isDebtAccount ? (
          first ? (
            <div className="ah-goal">
              <div className="ah-sub">
                <span>Аввал пардохт кунед</span>
                <b>{first.priority ? '⭐ ' : ''}{first.title}</b>
              </div>
              {bar(
                firstPct,
                `${Math.floor(firstPct)}% аз ${mask(fmt(first.amount))}`,
                `Боқӣ ${mask(fmt(remaining(first)))}`,
              )}
              {bal >= remaining(first) - 0.005 && (
                <div className="ah-ready">✓ Тавозуни ҳисоб барои пардохти пурра кифоя аст</div>
              )}
            </div>
          ) : (
            <div className="ah-ready">🎉 Ҳамаи қарзҳо пардохт шуданд. Боқимондаро ба ҳисоби дигар гузаронед.</div>
          )
        ) : goal ? (
          <div className="ah-goal">
            {bar(
              goalPct,
              `${Math.floor(goalPct)}% аз ${mask(fmt(goal))}`,
              reached ? '🎉 Мақсад расид!' : `Боқӣ ${mask(fmt(goal - bal))}`,
            )}
          </div>
        ) : null}
      </section>

      <div className={isDebtAccount ? 'actions two' : 'actions'}>
        <button onClick={() => setModal('transfer')}>
          <span className="act-ic"><SwapIcon /></span>Гузаронидан
        </button>
        {isDebtAccount ? (
          <button disabled={!first} onClick={() => { if (first) { setPayFor(first); setModal('pay'); } }}>
            <span className="act-ic"><MinusIcon /></span>Пардохт
          </button>
        ) : (
          <>
            <button onClick={() => setModal('expense')}>
              <span className="act-ic"><MinusIcon /></span>Харҷ
            </button>
            <button onClick={() => setModal('goal')}>
              <span className="act-ic"><TargetIcon /></span>Мақсад
            </button>
          </>
        )}
      </div>

      <section className="month-card">
        <div className="mc-head">
          <b>Ин моҳ</b>
          <small>{monthTitle(month)}</small>
          <span className={net >= 0 ? 'mc-net pos' : 'mc-net neg'}>{net >= 0 ? '+' : '−'}{mask(fmt(Math.abs(net)))}</span>
        </div>
        <div className="mc-tiles">
          <div className="mc-tile in">
            <span className="mc-ic">↓</span>
            <small>Омад</small>
            <b>+{mask(fmt(monthIn))}</b>
          </div>
          <div className="mc-tile out">
            <span className="mc-ic">↑</span>
            <small>Рафт</small>
            <b>−{mask(fmt(monthOut))}</b>
          </div>
        </div>
        <div className={monthIn + monthOut > 0 ? 'mc-split' : 'mc-split empty'}>
          <i style={{ width: `${inShare}%` }} />
        </div>
        <p className="note">
          {share > 0
            ? `Ҳар даромад ${fmt(Math.round(share * 100) / 100)}% ба ин ҳисоб худкор меравад.`
            : 'Ин ҳисоб ҳоло худкор пур намешавад. Маблағро бо «Гузаронидан» илова кунед.'}
        </p>
      </section>

      {isDebtAccount && (
        <section>
          <h3 className="group-title">
            <span>Навбати қарзҳо</span>
            <span className="gt-actions">
              <button className="link-btn sm" onClick={toggleOrder}>{DEBT_ORDER_LABEL[state.debtOrder]}</button>
              <button className="link-btn sm" onClick={onOpenDebts}>Идора</button>
            </span>
          </h3>
          {debts.length === 0 ? (
            <div className="empty small">Қарз нест.</div>
          ) : (
            <div className="cells compact">
              {debts.map(d => {
                const left = remaining(d);
                const paidOff = left <= 0.005;
                const rank = unpaid.indexOf(d) + 1;
                const pct = Math.min(100, (d.paid / d.amount) * 100);
                return (
                  <div key={d.id} className={paidOff ? 'cell' : 'cell tap'}
                    onClick={() => { if (!paidOff) { setPayFor(d); setModal('pay'); } }}>
                    <div className={paidOff ? 'rank sm done' : rank === 1 ? 'rank sm first' : 'rank sm'}>{paidOff ? '✓' : rank}</div>
                    <div className="grow">
                      <div className="r1">
                        <b>{d.priority ? '⭐ ' : ''}{d.title}</b>
                        <b className={paidOff ? 'pos' : 'neg'}>{paidOff ? 'Пардохт шуд' : mask(fmt(left))}</b>
                      </div>
                      <div className="mini-line">
                        <span className="progress thin"><i style={{ width: `${pct}%` }} /></span>
                        <small>аз {mask(fmt(d.amount))}</small>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

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
      {modal === 'pay' && payFor && (
        <Sheet title={`Пардохт: ${payFor.title}`} onClose={() => { setModal(null); setPayFor(null); }}>
          <PayDebtForm {...common} debt={payFor} defaultSource="debt" onDone={done} />
        </Sheet>
      )}
    </>
  );
}
