import { ACCOUNTS, ACCOUNT_TREE, fmt, leavesOf } from '../model';
import type { AccountId, Alloc } from '../types';

/** Рӯйхати интихоби ҳисоб, гурӯҳбандӣшуда мувофиқи дарахти ҳисобҳо. */
export default function AccountSelect({ value, onChange, bal }: {
  value: AccountId;
  onChange: (id: AccountId) => void;
  bal: Alloc;
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value as AccountId)}>
      {ACCOUNT_TREE.map(g => (
        <optgroup key={g.key} label={g.title}>
          {leavesOf(g).map(id => (
            <option key={id} value={id}>{ACCOUNTS[id].icon} {ACCOUNTS[id].name} — {fmt(bal[id])}</option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
