import { ACCOUNTS, ACCOUNT_TREE, fmt, leavesOf } from '../model';
import type { AccountId, Alloc } from '../types';

/** Рӯйхати интихоби ҳисоб, гурӯҳбандӣшуда мувофиқи дарахти ҳисобҳо. */
export default function AccountSelect({ value, onChange, bal, hidden = [] }: {
  value: AccountId;
  onChange: (id: AccountId) => void;
  bal: Alloc;
  hidden?: AccountId[];
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value as AccountId)}>
      {ACCOUNT_TREE.map(g => (
        <optgroup key={g.key} label={g.title}>
          {leavesOf(g).filter(id => id === value || !hidden.includes(id)).map(id => (
            <option key={id} value={id}>{ACCOUNTS[id].icon} {ACCOUNTS[id].name} — {fmt(bal[id])}</option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
