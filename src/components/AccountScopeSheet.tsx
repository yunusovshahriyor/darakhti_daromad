import { CheckIcon } from './Icons';
import Sheet from './Sheet';
import { ACCOUNTS, ACCOUNT_TREE, balancesOf, fmt, hiddenAccounts, leavesOf } from '../model';
import type { AccountId } from '../types';
import type { Props } from '../views/props';

/** Интихоби ҳисоб барои саҳифаи асосӣ: «Ҳама» ё як ҳисоб. */
export default function AccountScopeSheet({ state, value, mask, onSelect, onClose }: Pick<Props, 'state'> & {
  value: AccountId | null;
  mask: (v: string) => string;
  onSelect: (id: AccountId | null) => void;
  onClose: () => void;
}) {
  const bal = balancesOf(state);
  const total = Object.values(bal).reduce((s, v) => s + v, 0);
  const hide = hiddenAccounts(state);

  return (
    <Sheet title="Интихоби ҳисоб" onClose={onClose}>
      <div className="scope-list">
        <button className={value === null ? 'on' : ''} onClick={() => onSelect(null)}>
          <span className="sl-name">🧮 Ҳама</span>
          <b>{mask(fmt(total))}</b>
          {value === null && <CheckIcon />}
        </button>

        {ACCOUNT_TREE.map(g => (
          <div key={g.key}>
            <h3 className="group-title"><span>{g.title}</span></h3>
            {leavesOf(g).filter(id => id === value || !hide.includes(id)).map(id => (
              <button key={id} className={value === id ? 'on' : ''} onClick={() => onSelect(id)}>
                <span className="sl-name">{ACCOUNTS[id].icon} {ACCOUNTS[id].name}</span>
                <b className={bal[id] < -0.005 ? 'neg' : ''}>{mask(fmt(bal[id]))}</b>
                {value === id && <CheckIcon />}
              </button>
            ))}
          </div>
        ))}
      </div>
    </Sheet>
  );
}
