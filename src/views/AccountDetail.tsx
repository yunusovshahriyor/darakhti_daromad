import { CSSProperties, ReactNode, useState } from 'react';
import BuyDreamForm from '../components/BuyDreamForm';
import CollapsibleCells from '../components/CollapsibleCells';
import DreamForm from '../components/DreamForm';
import ExpenseForm from '../components/ExpenseForm';
import GoalForm from '../components/GoalForm';
import { EyeIcon, EyeOffIcon, MinusIcon, PlusIcon, SwapIcon, TargetIcon } from '../components/Icons';
import PayDebtForm from '../components/PayDebtForm';
import SegTabs from '../components/SegTabs';
import Sheet from '../components/Sheet';
import TransferForm from '../components/TransferForm';
import {
  ACCOUNTS, CARD_COLORS, balancesOf, boughtDreams, fmt, fundDreams, groupByMonth, hasDebt, ledger, monthTitle,
  remaining, shareOfIncome, splitDebts, subtitleOf, today, uid,
} from '../model';
import type { AccountId, Debt, Dream } from '../types';
import type { Privacy } from './Accounts';
import type { Props } from './props';

type Modal = 'transfer' | 'expense' | 'goal' | 'pay' | 'buy' | 'addDream' | null;

const MILESTONES = [25, 50, 75, 100];

/** Як сатр дар рӯйхати «Навбат»: қарз барои пардохт ё орзу барои харид. */
interface PlanRow {
  key: number;
  title: string;
  priority: boolean;
  total: number;
  done: number;
  finished: boolean;
  ready: boolean;
  rank: number;
  open: () => void;
}

export default function AccountDetail({ state, setState, id, hidden, onToggleHidden, onToast, onManage }: Props & Privacy & {
  id: AccountId;
  onToast: (msg: string) => void;
  onManage: (page: 'debts' | 'dreams') => void;
}) {
  const [modal, setModal] = useState<Modal>(null);
  const [payFor, setPayFor] = useState<Debt | null>(null);
  const [buyFor, setBuyFor] = useState<Dream | null>(null);
  const [planTab, setPlanTab] = useState<'now' | 'done'>('now');

  const isDebtAccount = id === 'debt';
  const isDreamAccount = id === 'bigDream' || id === 'smallDream';
  const kind: Dream['kind'] = id === 'bigDream' ? 'big' : 'small';
  const bal = balancesOf(state)[id];
  const debt = hasDebt(state.debts);
  const mask = (v: string) => (hidden ? '••••' : v);

  // ----- Навбат: қарзҳо барои пардохт ё орзуҳо барои харид (як мантиқ) -----
  const { open: unpaid, paid: paidDebts } = splitDebts(state.debts);
  const boughtList = boughtDreams(state.dreams).filter(d => d.kind === kind);
  const dreamPlan = fundDreams(state.dreams.filter(d => d.kind === kind), bal);

  const rows: PlanRow[] = isDebtAccount
    ? unpaid.map((d, i) => {
        const left = remaining(d);
        return {
          key: d.id, title: d.title, priority: !!d.priority, total: d.amount, done: d.paid,
          finished: false, ready: bal >= left - 0.005, rank: i + 1,
          open: () => { setPayFor(d); setModal('pay'); },
        };
      })
    : isDreamAccount
      ? dreamPlan.map(f => ({
          key: f.dream.id, title: f.dream.title, priority: !!f.dream.priority, total: f.dream.target,
          done: f.funded, finished: false, ready: f.ready, rank: f.rank,
          open: () => { setBuyFor(f.dream); setModal('buy'); },
        }))
      : [];
  const doneList = isDebtAccount
    ? paidDebts.map(d => ({ key: d.id, title: d.title, priority: !!d.priority, amount: d.amount, planned: d.amount, date: d.paidAt }))
    : boughtList.map(d => ({ key: d.id, title: d.title, priority: !!d.priority, amount: d.paidPrice ?? d.target, planned: d.target, date: d.boughtAt }));
  const first = rows.find(r => !r.finished);
  const firstPct = first ? Math.min(100, (first.done / first.total) * 100) : 0;

  const goal = state.goals[id];
  const goalPct = goal ? Math.max(0, Math.min(100, (bal / goal) * 100)) : 0;
  const reached = !!goal && bal >= goal;
  const share = shareOfIncome(id, state.tree, debt);

  const entries = ledger(state, id);
  const month = today().slice(0, 7);
  const monthIn = entries.filter(e => e.date.startsWith(month) && e.amount > 0).reduce((s, e) => s + e.amount, 0);
  const monthOut = entries.filter(e => e.date.startsWith(month) && e.amount < 0).reduce((s, e) => s - e.amount, 0);
  const net = monthIn - monthOut;
  const inShare = monthIn + monthOut > 0 ? (monthIn / (monthIn + monthOut)) * 100 : 0;
  const groups = groupByMonth(entries);

  const done = (msg: string) => {
    onToast(msg);
    setModal(null);
    setPayFor(null);
    setBuyFor(null);
  };
  const close = () => {
    setModal(null);
    setPayFor(null);
    setBuyFor(null);
  };
  const common = { state, setState };

  const addDream = (v: { title: string; target: number; kind: Dream['kind']; priority: boolean }) => {
    setState(s => ({ ...s, dreams: [...s.dreams, { id: uid(), ...v }] }));
    done('Орзу илова шуд ✨');
  };

  const bar = (pct: number, left: string, right: string): ReactNode => (
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

  const planLabels = isDebtAccount
    ? { next: 'Аввал пардохт кунед', ready: '✓ Тавозуни ҳисоб барои пардохти пурра кифоя аст', title: 'Навбати қарзҳо', page: 'debts' as const }
    : { next: 'Аввал харида шавад', ready: '✓ Маблағ барои харид кифоя аст', title: 'Навбати харид', page: 'dreams' as const };

  return (
    <>
      <section className="acct-hero" style={{ '--c': CARD_COLORS[id] } as CSSProperties}>
        <div className="ah-top">
          <span className="ah-ic">{ACCOUNTS[id].icon}</span>
          <span className="ah-name">
            {ACCOUNTS[id].name}
            <small>{subtitleOf(id, debt)}</small>
          </span>
          <button className="round-btn glass sm" onClick={onToggleHidden}
            aria-label={hidden ? 'Нишон додан' : 'Пинҳон кардан'}>
            {hidden ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
        <div className="ah-bal">{mask(fmt(bal))} <small>смн</small></div>

        {isDebtAccount || isDreamAccount ? (
          first ? (
            <div className="ah-goal">
              <div className="ah-sub">
                <span>{planLabels.next}</span>
                <b>{first.priority ? '⭐ ' : ''}{first.title}</b>
              </div>
              {bar(
                firstPct,
                `${Math.floor(firstPct)}% аз ${mask(fmt(first.total))}`,
                `Боқӣ ${mask(fmt(Math.max(0, first.total - first.done)))}`,
              )}
              {first.ready && <div className="ah-ready">{planLabels.ready}</div>}
            </div>
          ) : (
            <div className="ah-ready">
              {isDebtAccount
                ? '🎉 Ҳамаи қарзҳо пардохт шуданд. Боқимондаро ба ҳисоби дигар гузаронед.'
                : '✨ Ҳанӯз орзу нест. Орзуи нав илова кунед, ва маблағ барои он ҷамъ мешавад.'}
            </div>
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
        {isDebtAccount && (
          <button disabled={!first} onClick={() => first?.open()}>
            <span className="act-ic"><MinusIcon /></span>Пардохт
          </button>
        )}
        {isDreamAccount && (
          <>
            <button disabled={!first} onClick={() => first?.open()}>
              <span className="act-ic"><MinusIcon /></span>Харид
            </button>
            <button onClick={() => setModal('addDream')}>
              <span className="act-ic"><PlusIcon /></span>Орзуи нав
            </button>
          </>
        )}
        {!isDebtAccount && !isDreamAccount && (
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

      {(isDebtAccount || isDreamAccount) && (
        <section>
          <h3 className="group-title">
            <span>{planLabels.title}</span>
            <span className="gt-actions">
              <button className="link-btn sm" onClick={() => onManage(planLabels.page)}>Идора</button>
            </span>
          </h3>
          <div className="tab-block">
            <SegTabs value={planTab} onChange={id => setPlanTab(id as 'now' | 'done')}
              tabs={[
                { id: 'now', label: 'Ҳозира', count: rows.length },
                { id: 'done', label: isDebtAccount ? 'Пардохтшуда' : 'Харидшуда', count: doneList.length },
              ]} />

            {planTab === 'now' ? (
              rows.length === 0 ? (
                <div className="empty small">{isDebtAccount ? 'Қарзи кушода нест.' : 'Орзуи кушода нест.'}</div>
              ) : (
                <CollapsibleCells>
                  {rows.map(r => {
                    const pct = Math.min(100, (r.done / r.total) * 100);
                    const left = Math.max(0, r.total - r.done);
                    return (
                      <div key={r.key} className="cell tap" onClick={() => r.open()}>
                        <div className={r.rank === 1 ? 'rank sm first' : 'rank sm'}>{r.rank}</div>
                        <div className="grow">
                          <div className="r1">
                            <b>{r.priority ? '⭐ ' : ''}{r.title}</b>
                            {isDebtAccount
                              ? <b className="neg">{mask(fmt(left))}</b>
                              : <b className={r.ready ? 'pos' : ''}>{r.ready ? 'Тайёр ✓' : mask(fmt(r.total))}</b>}
                          </div>
                          <div className="mini-line">
                            <span className="progress thin"><i style={{ width: `${pct}%` }} /></span>
                            <small>{isDebtAccount ? 'аз' : `${mask(fmt(r.done))} аз`} {mask(fmt(r.total))}</small>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CollapsibleCells>
              )
            ) : doneList.length === 0 ? (
              <div className="empty small">{isDebtAccount ? 'Ҳанӯз қарзи пардохтшуда нест.' : 'Ҳанӯз орзуи харидашуда нест.'}</div>
            ) : (
              <CollapsibleCells>
                {doneList.map(d => (
                  <div className="cell" key={d.key}>
                    <div className="rank sm done">✓</div>
                    <div className="grow">
                      <div className="r1">
                        <b>{d.priority ? '⭐ ' : ''}{d.title}</b>
                        <b className="pos">{mask(fmt(d.amount))} смн</b>
                      </div>
                      <small>
                        Арзиш: {mask(fmt(d.amount))} смн
                        {Math.abs(d.amount - d.planned) > 0.005 ? ` (нақша ${mask(fmt(d.planned))})` : ''}
                        {isDebtAccount ? ' · пардохт шуд' : ' · харида шуд'}{d.date ? ` · ${d.date}` : ''}
                      </small>
                    </div>
                  </div>
                ))}
              </CollapsibleCells>
            )}
          </div>
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
        <Sheet title="Гузаронидан" onClose={close}>
          <TransferForm {...common} from={id} onDone={done} />
        </Sheet>
      )}
      {modal === 'expense' && (
        <Sheet title="Хароҷот" onClose={close}>
          <ExpenseForm {...common} initialAccount={id} onDone={done} />
        </Sheet>
      )}
      {modal === 'goal' && (
        <Sheet title="Мақсад" onClose={close}>
          <GoalForm {...common} id={id} onDone={done} />
        </Sheet>
      )}
      {modal === 'pay' && payFor && (
        <Sheet title={`Пардохт: ${payFor.title}`} onClose={close}>
          <PayDebtForm {...common} debt={payFor} defaultSource="debt" onDone={done} />
        </Sheet>
      )}
      {modal === 'buy' && buyFor && (
        <Sheet title={`Харид: ${buyFor.title}`} onClose={close}>
          <BuyDreamForm {...common} dream={buyFor} defaultSource={id} onDone={done} />
        </Sheet>
      )}
      {modal === 'addDream' && (
        <Sheet title="Орзуи нав" onClose={close}>
          <DreamForm initialKind={kind} onSubmit={addDream} submitLabel="Илова кардан" />
        </Sheet>
      )}
    </>
  );
}
