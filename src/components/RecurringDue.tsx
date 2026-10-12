import { fmt, today } from '../model';
import { confirmRecurring, dueRecurring, skipRecurring } from '../recurring';
import { success } from '../haptic';
import type { Props } from '../views/props';

/** Саҳифаи асосӣ: хароҷоти такрорие, ки мӯҳлаташ расидааст — сабт кардан ё гузаштан. */
export default function RecurringDue({ state, setState, onToast }: Props & { onToast: (m: string) => void }) {
  const list = dueRecurring(state, today());
  if (list.length === 0) return null;
  const shown = list.slice(0, 3);
  return (
    <section className="rec-due">
      <h3>🔁 Вақти пардохт расид</h3>
      {shown.map(r => (
        <div className="rec-row" key={r.id}>
          <div className="rec-info"><b>{r.title}</b><small>{`${fmt(r.amount)} смн · мӯҳлат ${r.next}`}</small></div>
          <button className="rec-ok" onClick={() => { setState(s => confirmRecurring(s, r.id)); success(); onToast('Хароҷот сабт шуд ✓'); }}>Сабт</button>
          <button className="rec-skip" onClick={() => setState(s => skipRecurring(s, r.id))}>Гузаштан</button>
        </div>
      ))}
      {list.length > shown.length && <small className="rec-more">{`ва боз ${list.length - shown.length} ададӣ`}</small>}
    </section>
  );
}
