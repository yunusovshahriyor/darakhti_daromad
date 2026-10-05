import { CSSProperties, useEffect, useState } from 'react';
import Donut from '../components/Donut';
import AccountScopeSheet from '../components/AccountScopeSheet';
import { BackIcon, ChevronDownIcon, ChevronIcon, EyeIcon, EyeOffIcon, FilterIcon, PersonIcon } from '../components/Icons';
import PeriodSheet from '../components/PeriodSheet';
import {
  ACCOUNTS, ACCOUNT_COLORS, ACCOUNT_ORDER, CARD_COLORS, PERIOD_LABELS, balancesOf, fmt, forecast,
  hiddenAccounts, inPeriod, monthlyIncome, periodAt, periodLabel, spent,
} from '../model';
import type { PeriodKind } from '../model';
import type { AccountId } from '../types';
import type { Privacy } from './Accounts';
import type { HistoryFilter } from './History';
import type { Props, Tab } from './props';

const KINDS: PeriodKind[] = ['day', 'week', 'month', 'year'];
const PERIOD_KEY = 'darakhti:period';
const SCOPE_KEY = 'darakhti:scope';

const readScope = (): AccountId | null => {
  try {
    const v = localStorage.getItem(SCOPE_KEY) as AccountId | null;
    return v && ACCOUNT_ORDER.includes(v) ? v : null;
  } catch { return null; }
};

/** Давраи интихобшуда танҳо бо амали корбар иваз мешавад, на бо навсозии саҳифа. */
function readPeriod(): { kind: PeriodKind; offset: number } {
  try {
    const r = JSON.parse(localStorage.getItem(PERIOD_KEY) ?? 'null') as { kind?: PeriodKind; offset?: number } | null;
    if (r && r.kind && KINDS.includes(r.kind) && Number.isInteger(r.offset) && Math.abs(r.offset!) <= 20000) {
      return { kind: r.kind, offset: Math.min(0, r.offset!) };
    }
  } catch { /* ignore */ }
  return { kind: 'month', offset: 0 };
}
export default function Dashboard({ state, hidden, onToggleHidden, onNavigate, onProfile, onOpenAccount }: Props & Privacy & {
  onNavigate: (t: Tab, filter?: HistoryFilter) => void;
  onProfile: () => void;
  onOpenAccount: (id: AccountId) => void;
}) {
  const { incomes, expenses } = state;
  const [saved] = useState(readPeriod);
  const [kind, setKind] = useState<PeriodKind>(saved.kind);
  const [offset, setOffset] = useState(saved.offset);

  useEffect(() => {
    try { localStorage.setItem(PERIOD_KEY, JSON.stringify({ kind, offset })); } catch { /* ignore */ }
  }, [kind, offset]);
  const [picker, setPicker] = useState(false);
  const [scope, setScope] = useState<AccountId | null>(readScope);
  const [scopeOpen, setScopeOpen] = useState(false);

  useEffect(() => {
    try {
      if (scope) localStorage.setItem(SCOPE_KEY, scope);
      else localStorage.removeItem(SCOPE_KEY);
    } catch { /* ignore */ }
  }, [scope]);

  const mask = (v: string) => (hidden ? '••••' : v);

  // ----- Давраи интихобшуда -----
  const period = periodAt(kind, offset);
  const prevPeriod = periodAt(kind, offset - 1);

  const inRange = <T extends { date: string }>(items: T[], p = period) => items.filter(i => inPeriod(i.date, p));
  // Филтри ҳисоб: «Ҳама» ё як ҳисоб
  const scopedExpenses = scope ? expenses.filter(e => e.account === scope) : expenses;
  const incomeOf = (i: { amount: number; alloc: Record<AccountId, number> }) => (scope ? i.alloc[scope] ?? 0 : i.amount);
  const periodExpenses = inRange(scopedExpenses);
  const spentNow = periodExpenses.reduce((s, e) => s + e.amount, 0);
  const spentPrev = inRange(scopedExpenses, prevPeriod).reduce((s, e) => s + e.amount, 0);
  const incomeNow = inRange(incomes).reduce((s, i) => s + incomeOf(i), 0);
  // Боқимонда то охири давраи интихобшуда (барои давраи ҷорӣ — ҳозира)
  const transfersIn = state.transfers.filter(t => scope && t.date <= period.end);
  const balanceNow =
    incomes.filter(i => i.date <= period.end).reduce((sum, i) => sum + incomeOf(i), 0) -
    scopedExpenses.filter(e => e.date <= period.end).reduce((sum, e) => sum + e.amount, 0) +
    transfersIn.reduce((sum, t) => sum + (t.to === scope ? t.amount : 0) - (t.from === scope ? t.amount : 0), 0);
  const change = spentPrev > 0 ? ((spentNow - spentPrev) / spentPrev) * 100 : null;
  const proj = forecast(spentNow, period, kind);

  const byAccount = spent(periodExpenses);
  const segs = ACCOUNT_ORDER
    .filter(id => byAccount[id] > 0)
    .map(id => ({ id, value: byAccount[id], color: ACCOUNT_COLORS[id] }))
    .sort((a, b) => b.value - a.value);
  const top = segs[0];

  const balText = fmt(balanceNow);
  const bigSize = balText.length <= 6 ? '3.6rem' : balText.length <= 8 ? '3rem' : balText.length <= 10 ? '2.4rem' : '2rem';
  const pctSpent = incomeNow > 0 ? Math.min(100, (spentNow / incomeNow) * 100) : spentNow > 0 ? 100 : 0;

  // ----- Ҳисобҳо -----
  const bal = balancesOf(state);
  const months = monthlyIncome(incomes);
  const max = Math.max(...months.map(m => m.total), 1);

  return (
    <>
      <header className="home-head">
        <div className="brand">
          <div className="logo">даромад<i>.</i></div>
          <small>содда. устувор.</small>
        </div>
        <button className="avatar-btn" onClick={onProfile} aria-label="Танзимот"><PersonIcon /></button>
      </header>

      <div className="period-nav">
        <button className="pn-btn" onClick={() => setOffset(o => o - 1)} aria-label="Давраи пештара">
          <BackIcon />
        </button>
        <button className="pn-label" onClick={() => setPicker(true)} aria-label="Интихоби давра">
          <span>{periodLabel(kind, period)}</span>
          <span className="pn-caret"><ChevronDownIcon /></span>
        </button>
        {offset !== 0 && (
          <button className="pn-now" onClick={() => setOffset(0)}>Ҳозир</button>
        )}
        <button className="pn-btn flip" disabled={offset >= 0} onClick={() => setOffset(o => Math.min(0, o + 1))}
          aria-label="Давраи оянда">
          <BackIcon />
        </button>
      </div>

      <section className="spent">
        <div className="scope-row">
          <span className="spent-label">{scope ? ACCOUNTS[scope].name : 'Ҳама'}</span>
          <button className="filter-btn" onClick={() => setScopeOpen(true)}
            aria-label="Интихоби ҳисоб">
            <FilterIcon />
          </button>
        </div>
        <div className="spent-row">
          <div className="spent-num">
            <span style={{ fontSize: bigSize }} className={balanceNow < 0 ? 'neg' : ''}>{mask(balText)}</span>
            <small>смн</small>
          </div>
          <button className="round-btn mini" onClick={onToggleHidden}
            aria-label={hidden ? 'Нишон додани маблағ' : 'Пинҳон кардани маблағ'}>
            {hidden ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
      </section>

      <div className="income-row">
        <button className="ir-block" onClick={() => onNavigate('history', 'expense')}>
          <div className="grow">
            <small>Харҷ шуд</small>
            <b>{mask(fmt(spentNow))} смн</b>
            {change !== null && (
              <em className={change <= 0 ? 'trend-sm good' : 'trend-sm bad'}>
                {change <= 0 ? '↓' : '↑'} {Math.abs(change).toLocaleString('ru-RU', { maximumFractionDigits: 1 })}% нисбат ба {PERIOD_LABELS[kind].prev}
              </em>
            )}
          </div>
          <ChevronIcon />
        </button>

        <button className="ir-block" onClick={() => onNavigate('history', 'income')}>
          <div className="grow">
            <small>Даромад дар давра</small>
            <b>{mask(fmt(incomeNow))} смн</b>
          </div>
          <ChevronIcon />
        </button>

        <div className="line"><i style={{ width: `${pctSpent}%` }} className={pctSpent > 90 ? 'warn' : ''} /></div>
      </div>

      <div className="mini-cards">
        <div className="mini">
          <small>{PERIOD_LABELS[kind].forecast}</small>
          <b>{mask(fmt(Math.round(proj)))} смн</b>
        </div>
        <div className="mini">
          <small>Ҳисоби асосӣ</small>
          <b>{top ? `${ACCOUNTS[top.id as keyof typeof ACCOUNTS].name}` : '—'}</b>
        </div>
      </div>

      <section className="big-card">
        <div className="big-head">
          <h2>Аз рӯи ҳисобҳо</h2>
          <button className="link-btn" onClick={() => onNavigate('history', 'expense')}>Муфассал</button>
        </div>
        <Donut segs={segs} label={mask(fmt(spentNow))} sub="смн" />
        {segs.length === 0 ? (
          <p className="muted center">Дар ин давра хароҷот нест.</p>
        ) : (
          <ul className="legend">
            {segs.map(s => (
              <li key={s.id}>
                <i style={{ background: s.color }} />
                <span>{ACCOUNTS[s.id as keyof typeof ACCOUNTS].icon} {ACCOUNTS[s.id as keyof typeof ACCOUNTS].name}</span>
                <b>{mask(fmt(s.value))}</b>
                <em>{Math.round((s.value / spentNow) * 100)}%</em>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="group-title">
          <span>Ҳисобҳои ман</span>
          <button className="link-btn sm" onClick={() => onNavigate('accounts')}>Ҳама</button>
        </h3>
        <div className="strip">
          {ACCOUNT_ORDER.filter(id => !hiddenAccounts(state).includes(id)).map(id => (
            <button key={id} className="mini-acct" onClick={() => onOpenAccount(id)}
              style={{ '--c': CARD_COLORS[id] } as CSSProperties}>
              <span className="ma-ic">{ACCOUNTS[id].icon}</span>
              <small>{ACCOUNTS[id].name}</small>
              <b>{mask(fmt(bal[id]))}</b>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3 className="group-title">Афзоиши даромад · 6 моҳ</h3>
        <div className="card">
          <div className="chart">
            {months.map(m => (
              <div className="col" key={m.key}>
                <span className="val">{m.total && !hidden ? fmt(m.total) : ''}</span>
                <div className="bar" style={{ height: `${(m.total / max) * 100}%` }} />
                <span className="lbl">{m.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {scopeOpen && (
        <AccountScopeSheet state={state} value={scope} mask={mask}
          onSelect={id => { setScope(id); setScopeOpen(false); }} onClose={() => setScopeOpen(false)} />
      )}

      {picker && (
        <PeriodSheet kind={kind} offset={offset} onClose={() => setPicker(false)}
          onSelect={(k, off) => { setKind(k); setOffset(off); setPicker(false); }} />
      )}
    </>
  );
}
