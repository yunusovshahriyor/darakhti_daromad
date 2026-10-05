interface Tab {
  id: string;
  label: string;
  count?: number;
}

/** Ду таб дар як блок: «Ҳозира» ва «Пардохтшуда / Харидшуда». */
export default function SegTabs({ tabs, value, onChange }: {
  tabs: Tab[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="seg-tabs" role="tablist">
      {tabs.map(t => (
        <button key={t.id} role="tab" aria-selected={t.id === value}
          className={t.id === value ? 'on' : ''} onClick={() => onChange(t.id)}>
          {t.label}{t.count !== undefined ? <em>{t.count}</em> : null}
        </button>
      ))}
    </div>
  );
}
