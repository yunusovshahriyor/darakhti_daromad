import { useState } from 'react';
import { today } from '../model';
import DatePickerSheet from './DatePickerSheet';

const MONTHS = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

const addDays = (iso: string, n: number) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d + n).toLocaleDateString('sv-SE');
};

function dateText(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  const short = `${d} ${MONTHS[m - 1]}.`;
  const t = today();
  if (iso === t) return `Имрӯз, ${short}`;
  if (iso === addDays(t, -1)) return `Дирӯз, ${short}`;
  return y === Number(t.slice(0, 4)) ? short : `${short} ${y}`;
}

/** Рақами калон: «1 250,5 смн». */
function shown(value: string) {
  const [i = '', f] = value.split('.');
  const int = (i || '0').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return f === undefined ? int : `${int},${f}`;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', 'back'];

/** Маблағ бо тугмачаҳои рақамӣ + сана: тарҳи барномаи мобилӣ. */
export default function AmountEntry({ value, onChange, date, onDate, sign, locked = false }: {
  /** Маблағ тағйир намеёбад (амалиёти вобаста ба қарз/орзу): тугмачаҳои рақамӣ нест. */
  locked?: boolean;
  /** «+» барои воридот, «−» барои баромад: ранг ва аломат дар маблағи калон. */
  sign?: '+' | '−';
  value: string;
  onChange: (v: string) => void;
  date: string;
  onDate: (d: string) => void;
}) {
  const [picking, setPicking] = useState(false);

  const press = (k: string) => {
    navigator.vibrate?.(5);
    if (k === 'back') return onChange(value.slice(0, -1));
    if (k === ',') return onChange(value.includes('.') ? value : `${value || '0'}.`);
    const [i, f] = value.split('.');
    if (f !== undefined && f.length >= 2) return;
    if (f === undefined && i.length >= 10) return;
    onChange(value === '0' ? k : value + k);
  };

  return (
    <>
      <div className={`amount-big${value ? '' : ' empty'}${sign === '+' ? ' pos' : sign === '−' ? ' neg' : ''}`}>
        {sign && value ? <span className="sg">{sign}</span> : null}{shown(value)} <small>смн</small>
      </div>

      {!locked && (
      <div className="keypad">
        {KEYS.map(k => (
          <button key={k} type="button" className="key" onClick={() => press(k)}
            aria-label={k === 'back' ? 'Нест кардани рақам' : undefined}>
            {k === 'back' ? (
              <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M21 5H9l-6 7 6 7h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1Z" /><path d="m13 9.5 5 5m0-5-5 5" />
              </svg>
            ) : k}
          </button>
        ))}
      </div>
      )}

      <button type="button" className="date-row" onClick={() => setPicking(true)}>
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8"
          strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="3.5" y="5" width="17" height="15.5" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4" />
        </svg>
        <span className="dr-label">Санаи амалиёт</span>
        <b>{dateText(date)}</b>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {picking && <DatePickerSheet value={date} onSelect={onDate} onClose={() => setPicking(false)} />}
    </>
  );
}
