import { useState } from 'react';
import { ACCOUNTS, ACCOUNT_ORDER, CARD_COLORS, fmt } from '../model';
import type { AccountId, Alloc } from '../types';

/** Интихоби ҳисоб бо чипҳо: 4 тои аввал, боқӣ бо «Ҳамаи ҳисобҳо». */
export default function AccountChips({ label, value, onChange, bal, hidden = [] }: {
  label: string;
  value: AccountId;
  onChange: (id: AccountId) => void;
  bal: Alloc;
  hidden?: AccountId[];
}) {
  const [all, setAll] = useState(false);
  const ids = ACCOUNT_ORDER.filter(id => id === value || !hidden.includes(id));
  const first = ids.slice(0, 4);
  const list = all ? ids : first.includes(value) ? first : [...first.slice(0, 3), value];

  return (
    <div className="chips-block">
      <div className="chips-label">{label}</div>
      <div className="chips">
        {list.map(id => (
          <button key={id} type="button" className={id === value ? 'chip on' : 'chip'} onClick={() => onChange(id)}>
            <span className="chip-ic" style={{ background: CARD_COLORS[id] }}>{ACCOUNTS[id].icon}</span>
            <span className="chip-t"><b>{ACCOUNTS[id].name}</b><small>{fmt(bal[id] ?? 0)}</small></span>
            {id === value && <span className="chip-ok">✓</span>}
          </button>
        ))}
      </div>
      {ids.length > 4 && (
        <button type="button" className="chips-more" onClick={() => setAll(a => !a)}>
          {all ? 'Пӯшидан' : `Ҳамаи ҳисобҳо (${ids.length})`}
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden
            style={{ transform: all ? 'rotate(-90deg)' : undefined }}><path d="m9 6 6 6-6 6" /></svg>
        </button>
      )}
    </div>
  );
}
