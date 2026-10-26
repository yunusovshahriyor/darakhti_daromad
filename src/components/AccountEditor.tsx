/** Интихобкунакҳои нишона ва ранги ҳисоб. */
const ICONS = [
  '🏦', '💼', '🎓', '🏥', '🚗', '🏠', '✈️', '🎁', '📱', '💻', '🛒', '🍽️',
  '☕', '👶', '🐾', '🎮', '🎬', '📚', '🧾', '💡', '🌍', '🤲', '🌱', '💰',
];
export const COLORS = [
  '#b7791f', '#b24a6c', '#2f857b', '#7a5bb8', '#b3453b', '#1f6fa3',
  '#2f7d55', '#2f8fb5', '#46688f', '#8a5a2b', '#5b7f2a', '#a0522d',
];

export function IconPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="picker">
      <div className="swatches icons">
        {ICONS.map(i => (
          <button type="button" key={i} className={i === value ? 'on' : ''} onClick={() => onChange(i)}>{i}</button>
        ))}
      </div>
    </div>
  );
}

export function ColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="swatches colors">
      {COLORS.map(c => (
        <button type="button" key={c} className={c === value ? 'on' : ''} style={{ background: c }}
          onClick={() => onChange(c)} aria-label={c} />
      ))}
    </div>
  );
}
