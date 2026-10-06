import { useEffect, useRef } from 'react';
import { ACCOUNTS, ACCOUNT_ORDER, CARD_COLORS, fmt } from '../model';
import type { AccountId, Alloc } from '../types';

/** Интихоби ҳисоб: сатри уфуқии чипҳо бо скролл. */
export default function AccountChips({ label, value, onChange, bal, hidden = [] }: {
  label: string;
  value: AccountId;
  onChange: (id: AccountId) => void;
  bal: Alloc;
  hidden?: AccountId[];
}) {
  const row = useRef<HTMLDivElement>(null);

  // Чипи интихобшуда дар сатр намоён бошад
  useEffect(() => {
    const el = row.current?.querySelector<HTMLElement>('.chip.on');
    if (el && row.current) row.current.scrollLeft = el.offsetLeft - row.current.clientWidth / 2 + el.offsetWidth / 2;
  }, []);

  const ids = ACCOUNT_ORDER.filter(id => id === value || !hidden.includes(id));

  return (
    <div className="chips-block">
      <div className="chips-label">{label}</div>
      <div className="chips" ref={row}>
        {ids.map(id => (
          <button key={id} type="button" className={id === value ? 'chip on' : 'chip'} onClick={() => onChange(id)}>
            <span className="chip-ic" style={{ background: CARD_COLORS[id] }}>{ACCOUNTS[id].icon}</span>
            <span className="chip-t"><b>{ACCOUNTS[id].name}</b><small>{fmt(bal[id] ?? 0)}</small></span>
            {id === value && <span className="chip-ok">✓</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
