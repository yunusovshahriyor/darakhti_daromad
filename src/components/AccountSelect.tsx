import { ACCOUNTS, ACCOUNT_TREE, fmt, leavesOf } from '../model';
import type { AccountId, Alloc } from '../types';
import PickerField from './PickerField';
import type { PickerOption } from './PickerField';

/** Интихоби ҳисоб (гурӯҳбандӣшуда мувофиқи дарахти ҳисобҳо) бо варақаи поёнӣ. */
export default function AccountSelect({ value, onChange, bal, hidden = [] }: {
  value: AccountId;
  onChange: (id: AccountId) => void;
  bal: Alloc;
  hidden?: AccountId[];
}) {
  const options: PickerOption[] = ACCOUNT_TREE.flatMap(g =>
    leavesOf(g).filter(id => id === value || !hidden.includes(id)).map(id => ({
      value: id, label: ACCOUNTS[id].name, icon: ACCOUNTS[id].icon, note: fmt(bal[id] ?? 0), group: g.title,
    })));
  return <PickerField value={value} options={options} onChange={onChange} title="Интихоби ҳисоб" />;
}
