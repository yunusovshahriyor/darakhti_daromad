import { ReactNode, useState } from 'react';
import { ACCOUNTS, ALL_IDS, dayTitle, fmt } from '../model';
import type { State } from '../types';
import LoanProgress from './LoanProgress';
import Sheet from './Sheet';

export type ReceiptRef = { kind: 'income' | 'expense' | 'transfer'; id: number };

interface Line { label: string; value: ReactNode; text?: string }

/** Вақти амалиёт аз id (id = вақт × 1000 + тасодуф). */
const timeOf = (id: number) => {
  const ms = Math.floor(id / 1000);
  if (ms < 1e12 || ms > 4e12) return '';
  return new Date(ms).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
};

/** Чеки амалиёт: тарҳи чеки бонкӣ бо тафсилот ва имконияти мубодила. */
export default function ReceiptSheet({ state, refItem, onClose }: {
  state: State;
  refItem: ReceiptRef;
  onClose: () => void;
}) {
  const [note, setNote] = useState('');

  let title = '';
  let sign = '';
  let amount = 0;
  let date = '';
  let kindLabel = '';
  let icon = '🧾';
  let tone: 'pos' | 'neg' | 'swap' = 'neg';
  const lines: Line[] = [];
  let extra: ReactNode = null;
  let source = '';

  if (refItem.kind === 'income') {
    const x = state.incomes.find(i => i.id === refItem.id);
    if (!x) return null;
    amount = x.amount; date = x.date; sign = '+'; tone = 'pos'; title = x.title;
    const loan = x.kind === 'loanBack' ? state.loans.find(l => l.id === x.loanId) : undefined;
    kindLabel = x.kind === 'loanBack' ? 'Баргардонидани қарз' : x.kind === 'borrow' ? 'Қарз гирифтам' : 'Даромад';
    icon = x.kind === 'loanBack' ? '↩️' : x.kind === 'borrow' ? '🤝' : '💰';
    if (x.source) { lines.push({ label: 'Манбаъ', value: x.source }); source = x.source; }
    if (loan) lines.push({ label: 'Қарздор', value: loan.person });
    const parts = ALL_IDS.filter(id => (x.alloc[id] ?? 0) > 0);
    if (parts.length === 1) {
      lines.push({ label: 'Ба ҳисоби', value: `${ACCOUNTS[parts[0]].icon} ${ACCOUNTS[parts[0]].name}` });
    } else if (parts.length > 1) {
      extra = (
        <div className="rc-split">
          <div className="rc-h">Тақсим шуд</div>
          {parts.map(id => (
            <div className="rc-line" key={id}>
              <span>{ACCOUNTS[id].icon} {ACCOUNTS[id].name}</span>
              <b>{fmt(x.alloc[id])} <em>{Math.round((x.alloc[id] / x.amount) * 1000) / 10}%</em></b>
            </div>
          ))}
        </div>
      );
    }
    if (loan) {
      const before = state.incomes
        .filter(i => i.kind === 'loanBack' && i.loanId === loan.id && (i.date < x.date || (i.date === x.date && i.id < x.id)))
        .reduce((s, i) => s + i.amount, 0);
      extra = <>{extra}<LoanProgress loan={loan} mark={{ before, part: x.amount }} /></>;
    }
  } else if (refItem.kind === 'expense') {
    const x = state.expenses.find(e => e.id === refItem.id);
    if (!x) return null;
    amount = x.amount; date = x.date; sign = '−'; tone = 'neg'; title = x.title;
    const loan = x.loanId ? state.loans.find(l => l.id === x.loanId) : undefined;
    kindLabel = loan ? 'Қарз додам' : x.debtId ? 'Пардохти қарз' : x.dreamId ? 'Харидани орзу' : 'Хароҷот';
    icon = loan ? '📤' : x.debtId ? '✅' : x.dreamId ? '🎁' : '🧾';
    lines.push({ label: 'Аз ҳисоби', value: `${ACCOUNTS[x.account].icon} ${ACCOUNTS[x.account].name}` });
    if (x.category) lines.push({ label: 'Категория', value: x.category });
    if (loan) lines.push({ label: 'Қарздор', value: loan.person });
    if (loan) extra = <LoanProgress loan={loan} />;
  } else {
    const x = state.transfers.find(t => t.id === refItem.id);
    if (!x) return null;
    amount = x.amount; date = x.date; tone = 'swap'; icon = '🔁'; kindLabel = 'Гузаронидан';
    title = `${ACCOUNTS[x.from].name} → ${ACCOUNTS[x.to].name}`;
    lines.push({ label: 'Аз ҳисоби', value: `${ACCOUNTS[x.from].icon} ${ACCOUNTS[x.from].name}` });
    lines.push({ label: 'Ба ҳисоби', value: `${ACCOUNTS[x.to].icon} ${ACCOUNTS[x.to].name}` });
  }

  const time = timeOf(refItem.id);
  const number = String(refItem.id % 100000000).padStart(8, '0');
  const all: Line[] = [
    { label: 'Намуд', value: kindLabel },
    { label: 'Сана', value: `${dayTitle(date)}${time ? `, ${time}` : ''}` },
    ...lines,
    ...(title && title !== source && refItem.kind !== 'transfer' ? [{ label: 'Эзоҳ', value: title }] : []),
    { label: 'Рақами чек', value: `№ ${number}` },
  ];

  const text = [
    `Даромад · чеки амалиёт`,
    `${kindLabel}: ${sign}${fmt(amount)} смн`,
    ...all.filter(l => l.label !== 'Намуд').map(l => `${l.label}: ${typeof l.value === 'string' ? l.value : ''}`),
  ].join('\n');

  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: 'Чеки амалиёт', text });
      else { await navigator.clipboard.writeText(text); setNote('Чек нусхабардорӣ шуд ✓'); }
    } catch { /* бекор шуд */ }
  };

  return (
    <Sheet title="Чеки амалиёт" onClose={onClose}>
      <div className="receipt">
        <div className={`rc-top ${tone}`}>
          <span className="rc-ic">{icon}</span>
          <div className="rc-amount">{sign}{fmt(amount)} <small>смн</small></div>
          <div className="rc-ok">✓ Амалиёт анҷом ёфт</div>
        </div>
        <div className="rc-tear" />
        <div className="rc-body">
          {all.map(l => (
            <div className="rc-line" key={l.label}>
              <span>{l.label}</span>
              <b>{l.value}</b>
            </div>
          ))}
          {extra}
        </div>
        <div className="rc-foot">даромад. · содда. устувор.</div>
      </div>
      {note && <p className="note" style={{ textAlign: 'center' }}>{note}</p>}
      <button type="button" className="btn big" onClick={share}>Мубодила / нусхабардорӣ</button>
    </Sheet>
  );
}
