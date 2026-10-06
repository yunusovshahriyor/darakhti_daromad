import { FormEvent, useState } from 'react';
import { EXPENSE_CATEGORIES } from '../categories';
import type { Props } from '../views/props';
import Field from './Field';
import Sheet from './Sheet';

const ICONS = ['🛍️', '☕', '🍕', '🚗', '⛽', '✈️', '🏥', '🐾', '💇', '🧼', '🔧', '🖥️', '🎮', '🏋️', '👶', '🎓', '💐', '🕌', '💸', '📦', '🧾', '🎂', '🚌', '🍼'];

/** Категорияи нави хароҷот: ном + нишона. */
export default function AddCategorySheet({ state, setState, onClose, onAdded }: Props & {
  onClose: () => void;
  onAdded: (name: string) => void;
}) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState(ICONS[0]);

  const clean = name.trim();
  const exists = [...EXPENSE_CATEGORIES.map(c => c.name), ...(state.categories ?? []).map(c => c.name)]
    .some(n => n.toLowerCase() === clean.toLowerCase());

  const submit = (e: FormEvent) => {
    e.preventDefault();
    // Ин форма дар дохили формаи хароҷот аст: ба он нарасад
    e.stopPropagation();
    if (!clean || exists) return;
    setState(s => ({ ...s, categories: [...(s.categories ?? []), { name: clean, icon }] }));
    onAdded(clean);
    onClose();
  };

  return (
    <Sheet title="Категорияи нав" onClose={onClose}>
      <form onSubmit={submit}>
        <Field label="Ном">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Масалан, Ҳайвонот" maxLength={20} autoFocus />
        </Field>
        {exists && clean && <div className="alert danger">Чунин категория аллакай ҳаст.</div>}
        <div className="chips-label" style={{ margin: '4px 0 8px' }}>Нишона</div>
        <div className="icon-grid">
          {ICONS.map(i => (
            <button key={i} type="button" className={i === icon ? 'on' : ''} onClick={() => setIcon(i)}>{i}</button>
          ))}
        </div>
        <button className="btn big" type="submit" disabled={!clean || exists}>Илова кардан</button>
      </form>
    </Sheet>
  );
}
