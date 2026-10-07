import { ReactNode, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDownIcon } from './Icons';
import Sheet from './Sheet';

export interface PickerOption {
  value: string;
  label: string;
  icon?: ReactNode;
  note?: string;
  /** Сарлавҳаи гурӯҳ: вақте тағйир меёбад, сарлавҳаи нав нишон дода мешавад. */
  group?: string;
}

/** Ивазкунандаи `<select>`: тугма + варақаи поёнӣ бо рӯйхат (на диалоги стандартии браузер). */
export default function PickerField({ value, options, onChange, title }: {
  value: string;
  options: PickerOption[];
  onChange: (v: string) => void;
  title: string;
}) {
  const [open, setOpen] = useState(false);
  const cur = options.find(o => o.value === value);

  return (
    <>
      <button type="button" className="picker-btn" onClick={() => setOpen(true)}>
        {cur?.icon !== undefined && <span className="pk-ic">{cur.icon}</span>}
        <span className="pk-t">{cur?.label ?? '—'}</span>
        {cur?.note && <small>{cur.note}</small>}
        <ChevronDownIcon />
      </button>
      {open && createPortal(
        <Sheet title={title} onClose={() => setOpen(false)}>
          <div className="pk-list">
            {options.map((o, i) => (
              <div key={o.value}>
                {o.group && o.group !== options[i - 1]?.group && <div className="pk-group">{o.group}</div>}
                <button type="button" className={o.value === value ? 'pk-item on' : 'pk-item'}
                  onClick={() => { onChange(o.value); setOpen(false); }}>
                  {o.icon !== undefined && <span className="pk-ic">{o.icon}</span>}
                  <span className="pk-t">{o.label}</span>
                  {o.note && <small>{o.note}</small>}
                  {o.value === value && <span className="pk-ok">✓</span>}
                </button>
              </div>
            ))}
          </div>
        </Sheet>,
        document.body,
      )}
    </>
  );
}
