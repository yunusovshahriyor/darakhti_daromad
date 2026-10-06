import { useState } from 'react';
import { today } from '../model';
import Sheet from './Sheet';

const MONTHS = [
  'Январ', 'Феврал', 'Март', 'Апрел', 'Май', 'Июн',
  'Июл', 'Август', 'Сентябр', 'Октябр', 'Ноябр', 'Декабр',
];
const WEEK = ['Дш', 'Сш', 'Чш', 'Пш', 'Ҷм', 'Шн', 'Яш'];

const iso = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

/** Тақвими худсохт барои интихоби сана (рӯзҳои оянда баста ҳастанд). */
export default function DatePickerSheet({ value, onSelect, onClose }: {
  value: string;
  onSelect: (date: string) => void;
  onClose: () => void;
}) {
  const t = today();
  const [ty, tm] = t.split('-').map(Number).map((n, i) => (i === 1 ? n - 1 : n));
  const [vy, vm] = value.split('-').map(Number);
  const [view, setView] = useState({ y: vy, m: vm - 1 });

  const total = view.y * 12 + view.m;
  const maxTotal = ty * 12 + tm;
  const go = (delta: number) => {
    const n = Math.min(maxTotal, Math.max(2000 * 12, total + delta));
    setView({ y: Math.floor(n / 12), m: n % 12 });
  };

  const first = (new Date(view.y, view.m, 1).getDay() + 6) % 7;
  const days = new Date(view.y, view.m + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const y = yesterday.toLocaleDateString('sv-SE');

  const pick = (d: string) => { onSelect(d); onClose(); };

  return (
    <Sheet title="Санаи амалиёт" onClose={onClose}>
      <div className="dp-quick">
        <button type="button" className={value === t ? 'on' : ''} onClick={() => pick(t)}>Имрӯз</button>
        <button type="button" className={value === y ? 'on' : ''} onClick={() => pick(y)}>Дирӯз</button>
      </div>

      <div className="dp-nav">
        <button type="button" onClick={() => go(-12)} aria-label="Соли пеш">«</button>
        <button type="button" onClick={() => go(-1)} aria-label="Моҳи пеш">‹</button>
        <b>{MONTHS[view.m]} {view.y}</b>
        <button type="button" onClick={() => go(1)} disabled={total >= maxTotal} aria-label="Моҳи баъд">›</button>
        <button type="button" onClick={() => go(12)} disabled={total >= maxTotal}
          aria-label="Соли баъд">»</button>
      </div>

      <div className="dp-grid">
        {WEEK.map(w => <span key={w} className="dp-wd">{w}</span>)}
        {cells.map((d, i) => {
          if (d === null) return <span key={`b${i}`} />;
          const date = iso(view.y, view.m, d);
          const future = date > t;
          const cls = `dp-day${date === value ? ' sel' : ''}${date === t ? ' today' : ''}`;
          return (
            <button key={date} type="button" className={cls} disabled={future} onClick={() => pick(date)}>{d}</button>
          );
        })}
      </div>
    </Sheet>
  );
}
