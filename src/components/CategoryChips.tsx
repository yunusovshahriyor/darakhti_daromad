import { EXPENSE_CATEGORIES } from '../categories';

/** Категорияи хароҷот: сатри уфуқӣ бо скролл. Бори дигар пахш кунед — интихоб бекор мешавад. */
export default function CategoryChips({ value, onChange }: {
  value: string | null;
  onChange: (name: string | null) => void;
}) {
  return (
    <div className="chips-block">
      <div className="chips-label">Категория</div>
      <div className="chips">
        {EXPENSE_CATEGORIES.map(c => (
          <button key={c.name} type="button" className={c.name === value ? 'chip on' : 'chip'}
            onClick={() => onChange(c.name === value ? null : c.name)}>
            <span className="chip-ic soft">{c.icon}</span>
            <span className="chip-t"><b>{c.name}</b></span>
          </button>
        ))}
      </div>
    </div>
  );
}
