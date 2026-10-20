import { useState } from 'react';
import { fmt } from '../model';
import type { Props } from '../views/props';
import Sheet from './Sheet';

/** Рӯйхати хароҷоти такрорӣ: тағйири маблағ ва нест кардан. */
export default function RecurringSheet({ state, setState, onClose }: Props & { onClose: () => void }) {
  const list = state.recurring ?? [];
  const [vals, setVals] = useState<Record<number, string>>({});
  const save = (id: number) => {
    const v = parseFloat((vals[id] ?? '').replace(',', '.'));
    if (v > 0) setState(s => ({ ...s, recurring: (s.recurring ?? []).map(r => (r.id === id ? { ...r, amount: v } : r)) }));
  };
  return (
    <Sheet title="Хароҷоти такрорӣ" onClose={onClose}>
      {list.length === 0 ? (
        <p className="note">Ҳоло хароҷоти такрорӣ нест. Ҳангоми сабти хароҷот «🔁 Обуна»-ро интихоб кунед (масалан иҷора, интернет): барнома дар мӯҳлат ёдрас мекунад.</p>
      ) : (
        <div className="rec-list">
          {list.map(r => (
            <div className="rec-item" key={r.id}>
              <div className="rec-info"><b>{r.title}</b><small>{r.every === 'month' ? `Ҳар моҳ, рӯзи ${r.day ?? ''}` : r.every === 'day' ? 'Ҳар рӯз' : 'Ҳар ҳафта'} · навбатӣ {r.next}</small></div>
              <input inputMode="decimal" defaultValue={String(r.amount)} aria-label="Маблағ"
                onChange={e => setVals(v => ({ ...v, [r.id]: e.target.value }))} onBlur={() => save(r.id)} />
              <button className="rec-del" aria-label="Нест кардан" onClick={() => setState(s => ({ ...s, recurring: (s.recurring ?? []).filter(x => x.id !== r.id) }))}>🗑</button>
            </div>
          ))}
          <p className="note">{`Маблағ: ${fmt(list.reduce((s, r) => s + r.amount, 0))} смн дар як давра (ҷамъ).`}</p>
        </div>
      )}
    </Sheet>
  );
}
