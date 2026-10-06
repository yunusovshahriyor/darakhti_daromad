import { useEffect, useRef, useState } from 'react';
import { orderedCategories } from '../categories';
import type { Props } from '../views/props';
import AddCategorySheet from './AddCategorySheet';

/**
 * Категорияи хароҷот: сатри уфуқӣ бо скролл. Категорияи бештар сарфшуда дар тарафи чап меистад.
 * Бори дигар пахш кунед — интихоб бекор мешавад. «+ Илова» — категорияи нав.
 */
export default function CategoryChips({ state, setState, value, onChange }: Props & {
  value: string | null;
  onChange: (name: string | null) => void;
}) {
  const [adding, setAdding] = useState(false);
  const row = useRef<HTMLDivElement>(null);
  const list = orderedCategories(state.categories ?? [], state.expenses);

  // Категорияи интихобшуда (масалан, навигирифта) дар сатр намоён бошад
  useEffect(() => {
    const box = row.current;
    const el = box?.querySelector<HTMLElement>('.chip.on');
    if (!box || !el) return;
    if (el.offsetLeft < box.scrollLeft || el.offsetLeft + el.offsetWidth > box.scrollLeft + box.clientWidth) {
      box.scrollTo({ left: Math.max(0, el.offsetLeft - 16), behavior: 'smooth' });
    }
  }, [value, list.length]);

  return (
    <div className="chips-block">
      <div className="chips-head">
        <div className="chips-label">Категория</div>
        <button type="button" className="chips-add" onClick={() => setAdding(true)}>+ Илова</button>
      </div>
      <div className="chips" ref={row}>
        {list.map(c => (
          <button key={c.name} type="button" className={c.name === value ? 'chip on' : 'chip'}
            onClick={() => onChange(c.name === value ? null : c.name)}>
            <span className="chip-ic soft">{c.icon}</span>
            <span className="chip-t"><b>{c.name}</b></span>
          </button>
        ))}
      </div>
      {adding && (
        <AddCategorySheet state={state} setState={setState} onClose={() => setAdding(false)}
          onAdded={name => onChange(name)} />
      )}
    </div>
  );
}
