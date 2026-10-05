import { CSSProperties, useEffect, useState } from 'react';
import Donut from '../components/Donut';
import { BackIcon, ChevronDownIcon, ChevronIcon, EyeIcon, EyeOffIcon, PersonIcon } from '../components/Icons';
import SegTabs from '../components/SegTabs';
import Sheet from '../components/Sheet';
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

/** Давраи интихобшуда танҳо бо амали корбар иваз мешавад, на бо навсозии саҳифа. */
function readPeriod(): { kind: PeriodKind; offset: number } {
  try {
    const r = JSON.parse(localStorage.getItem(PERIOD_KEY) ?? 'null') as { kind?: PeriodKind; offset?: number } | null;
    if (r && r.kind && KINDS.includes(r.kind) && Number.isInteger(r.offset) && r.offset! >= -120 && r.offset! <= 24) {
      return { kind: r.kind, offset: r.offset! };
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

  const mask = (v: string) => (hidden ? '••••' : v);

  // ----- Давраи интихобшуда -----
  const period = periodAt(kind, offset);
  const prevPeriod = periodAt(kind, offset - 1);
  const pickList = [1, 0, -1, -2, -3, -4, -5, -6].map(o => ({ off: o, label: periodLabel(kind, periodAt(kind, o)) }));

  const inRange = <T extends { date: string }>(items: T[], p = period) => items.filter(i => inPeriod(i.date, p));
  const periodExpenses = inRange(expenses);
  const spentNow = periodExpenses.reduce((s, e) => s + e.amount, 0);
  const spentPrev = inRange(expenses, prevPeriod).reduce((s, e) => s + e.amount, 0);
  const incomeNow = inRange(incomes).reduce((s, i) => s + i.amount, 0);
  const left = incomeNow - spentNow;
  const change = spentPrev > 0 ? ((spentNow - spentPrev) / spentPrev) * 100 : null;
  const proj = forecast(spentNow, period, kind);

  const byAccount = spent(periodExpenses);
  const segs = ACCOUNT_ORDER
    .filter(id => byAccount[id] > 0)
    .map(id => ({ id, value: byAccount[id], color: ACCOUNT_COLORS[id] }))
    .sort((a, b) => b.value - a.value);
  const top = segs[0];

  const spentText = fmt(spentNow);
  const bigSize = spentText.length <= 6 ? '3.6rem' : spentText.length <= 8 ? '3rem' : spentText.length <= 10 ? '2.4rem' : '2rem';
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
        <button className="pn-btn flip" onClick={() => setOffset(o => o + 1)} aria-label="Давраи оянда">
          <BackIcon />
        </button>
      </div>

      <section className="spent">
        <span className="spent-label">Харҷ шуд</span>
        <div className="spent-row">
          <div className="spent-num">
            <span style={{ fontSize: bigSize }}>{mask(spentText)}</span>
            <small>смн</small>
          </div>
          <button className="round-btn" onClick={onToggleHidden}
            aria-label={hidden ? 'Нишон додани маблағ' : 'Пинҳон кардани маблағ'}>
            {hidden ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
        {change !== null && (
          <div className={change <= 0 ? 'trend good' : 'trend bad'}>
            {change <= 0 ? '↓' : '↑'} {Math.abs(change).toLocaleString('ru-RU', { maximumFractionDigits: 1 })}% нисбат ба {PERIOD_LABELS[kind].prev}
          </div>
        )}
      </section>

      <button className="income-row" onClick={() => onNavigate('history', 'income')}>
        <div className="grow">
          <small>Даромад дар давра</small>
          <b>{mask(fmt(incomeNow))} смн</b>
          <small className={left < 0 ? 'neg' : ''}>Бақия {mask(fmt(left))} смн</small>
        </div>
        <ChevronIcon />
        <div className="line"><i style={{ width: `${pctSpent}%` }} className={pctSpent > 90 ? 'warn' : ''} /></div>
      </button>

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

      {picker && (
        <Sheet title="Давраи ҳисобот" onClose={() => setPicker(false)}>
          <SegTabs value={kind}
            onChange={id => { setKind(id as PeriodKind); setOffset(0); }}
            tabs={KINDS.map(k => ({ id: k, label: PERIOD_LABELS[k].name }))} />
          <div className="period-list">
            {pickList.map(it => (
              <button key={it.off} className={it.off === offset ? 'on' : ''}
                onClick={() => { setOffset(it.off); setPicker(false); }}>
                <span>{it.label}</span>
                {it.off === 0 && <em>Ҳозир</em>}
                {it.off > 0 && <em className="soon">Оянда</em>}
              </button>
            ))}
          </div>
        </Sheet>
      )}
    </>
  );
}
