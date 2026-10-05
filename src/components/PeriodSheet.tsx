import { useEffect, useRef, useState } from 'react';
import { BackIcon } from './Icons';
import SegTabs from './SegTabs';
import Sheet from './Sheet';
import { MIN_YEAR, PERIOD_LABELS, periodAt, pickItems } from '../model';
import type { PeriodKind } from '../model';

const KINDS: PeriodKind[] = ['day', 'week', 'month', 'year'];
const MONTH_FULL = [
  'Январ', 'Феврал', 'Март', 'Апрел', 'Май', 'Июн',
  'Июл', 'Август', 'Сентябр', 'Октябр', 'Ноябр', 'Декабр',
];

/** Варақаи интихоби давра бо рӯйхати пурра: сол 2000…, 12 моҳ, ҳамаи ҳафтаҳо, ҳамаи рӯзҳо. */
export default function PeriodSheet({ kind, offset, onSelect, onClose }: {
  kind: PeriodKind;
  offset: number;
  onSelect: (kind: PeriodKind, offset: number) => void;
  onClose: () => void;
}) {
  const sel = periodAt(kind, offset);
  const [k, setK] = useState<PeriodKind>(kind);
  const [anchor, setAnchor] = useState(() => {
    const [y, m] = sel.start.split('-').map(Number);
    return { y, m: m - 1 };
  });
  const selRef = useRef<HTMLButtonElement | null>(null);

  const today = new Date();
  const maxYear = today.getFullYear();
  const maxTotal = today.getFullYear() * 12 + today.getMonth();
  const items = pickItems(k, anchor.y, anchor.m);

  // Ба ҷойи интихобшуда гузаштан (дар дохили варақа, на дар тамоми саҳифа)
  useEffect(() => {
    const t = setTimeout(() => {
      const el = selRef.current;
      const box = el?.closest('.sheet') as HTMLElement | null;
      if (!el || !box) return;
      const e = el.getBoundingClientRect();
      const b = box.getBoundingClientRect();
      box.scrollTop += (e.top - b.top) - (b.height / 2 - e.height / 2);
    }, 320);
    return () => clearTimeout(t);
  }, [k, anchor.y, anchor.m]);

  const stepYear = (d: number) =>
    setAnchor(a => ({ ...a, y: Math.min(maxYear, Math.max(MIN_YEAR, a.y + d)) }));

  const stepMonth = (d: number) =>
    setAnchor(a => {
      const total = a.y * 12 + a.m + d;
      const y = Math.floor(total / 12);
      if (y < MIN_YEAR || total > maxTotal) return a;
      return { y, m: total - y * 12 };
    });

  const showStepper = k !== 'year';
  const stepLabel = k === 'day' ? `${MONTH_FULL[anchor.m]} ${anchor.y}` : String(anchor.y);
  const step = (d: number) => (k === 'day' ? stepMonth(d) : stepYear(d));

  return (
    <Sheet title="Давраи ҳисобот" onClose={onClose}>
      <SegTabs value={k} onChange={id => setK(id as PeriodKind)}
        tabs={KINDS.map(x => ({ id: x, label: PERIOD_LABELS[x].name }))} />

      {showStepper && (
        <div className="anchor-nav">
          <button className="pn-btn sm" onClick={() => step(-1)} aria-label="Қафо"><BackIcon /></button>
          <b>{stepLabel}</b>
          <button className="pn-btn sm flip" onClick={() => step(1)} aria-label="Пеш"
            disabled={k === 'day' ? anchor.y * 12 + anchor.m >= maxTotal : anchor.y >= maxYear}>
            <BackIcon />
          </button>
        </div>
      )}

      <div className="period-list">
        {items.map(it => {
          const on = k === kind && it.start === sel.start;
          return (
            <button key={it.start} ref={on ? selRef : undefined} className={on ? 'on' : ''}
              disabled={it.future} onClick={() => onSelect(k, it.off)}>
              <span>{it.label}</span>
              {it.now && <em>Ҳозир</em>}
              {!it.now && it.future && <em className="soon">Оянда</em>}
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}
