import { useState } from 'react';
import { createPortal } from 'react-dom';
import { EXPENSE_CATEGORIES, INCOME_SOURCES } from '../categories';
import type { Props } from '../views/props';
import Field from './Field';
import Sheet from './Sheet';

const ICONS = ['🛍️', '☕', '🍕', '🚗', '⛽', '✈️', '🏥', '🐾', '💇', '🧼', '🔧', '🖥️', '🎮', '🏋️', '👶', '🎓', '💐', '🕌', '💸', '📦', '🧾', '🎂', '🚌', '🍼'];

/** Категорияи нави хароҷот: ном + нишона. */
export default function AddCategorySheet({ state, setState, onClose, onAdded, kind = 'expense' }: Props & {
  /** «expense» — категорияи хароҷот, «income» — манбаи даромад. */
  kind?: 'expense' | 'income';
  onClose: () => void;
  onAdded: (name: string) => void;
}) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState(ICONS[0]);

  const clean = name.trim();
  const income = kind === 'income';
  const custom = (income ? state.incomeSources : state.categories) ?? [];
  const exists = [...(income ? INCOME_SOURCES : EXPENSE_CATEGORIES).map(c => c.name), ...custom.map(c => c.name)]
    .some(n => n.toLowerCase() === clean.toLowerCase());

  const submit = () => {
    if (!clean || exists) return;
    setState(s => income
      ? { ...s, incomeSources: [...(s.incomeSources ?? []), { name: clean, icon }] }
      : { ...s, categories: [...(s.categories ?? []), { name: clean, icon }] });
    onAdded(clean);
    onClose();
  };

  // Портал: ин варақа дар дохили формаи хароҷот кушода мешавад, формаи дохили форма ҷоиз нест
  return createPortal(
    <Sheet title={income ? 'Манбаи нави даромад' : 'Категорияи нав'} onClose={onClose}>
      <div onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), submit())}>
        <Field label="Ном">
          <input value={name} onChange={e => setName(e.target.value)} placeholder={income ? 'Масалан, Фурӯши мол' : 'Масалан, Ҳайвонот'} maxLength={20} autoFocus />
        </Field>
        {exists && clean && <div className="alert danger">Чунин ном аллакай ҳаст.</div>}
        <div className="chips-label" style={{ margin: '4px 0 8px' }}>Нишона</div>
        <div className="icon-grid">
          {ICONS.map(i => (
            <button key={i} type="button" className={i === icon ? 'on' : ''} onClick={() => setIcon(i)}>{i}</button>
          ))}
        </div>
        <button className="btn big" type="button" onClick={submit} disabled={!clean || exists}>Илова кардан</button>
      </div>
    </Sheet>,
    document.body,
  );
}
