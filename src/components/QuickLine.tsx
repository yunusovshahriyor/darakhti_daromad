import { FormEvent, useState } from 'react';
import { categoryIcon } from '../categories';
import { ACCOUNTS, balancesOf, fmt, today } from '../model';
import { applyDraft, draftFrom } from '../quickAdd';
import type { Props } from '../views/props';

/** Сатри зуд дар саҳифаи асосӣ: «такси 21» → маълумот худкор фаҳмида мешавад ва бо як пахш сабт мешавад. */
export default function QuickLine({ state, setState, onSaved, className = '' }: Props & { onSaved: (msg: string) => void; className?: string }) {
  const [text, setText] = useState('');
  const res = text.trim() ? draftFrom(state, text, today()) : null;
  const d = res && 'draft' in res ? res.draft : null;
  const exp = d?.kind === 'expense';
  const over = !!d && exp && d.amount > (balancesOf(state)[d.account] ?? 0) + 0.005;
  const save = (e: FormEvent) => {
    e.preventDefault();
    if (!d) return;
    setState(s => applyDraft(s, d).state);
    onSaved(`${exp ? 'Хароҷот сабт шуд' : 'Даромад илова шуд'} ✓ · ${fmt(d.amount)}`);
    setText('');
  };
  return (
    <form className={`quick-line ${className}`} onSubmit={save}>
      <div className="ql-row">
        <input value={text} onChange={e => setText(e.target.value)} enterKeyHint="done"
          placeholder="Зуд: «такси 21» ё «маош 3000»" aria-label="Сабти зуд" />
        <button type="submit" className="ql-go" disabled={!d} aria-label="Сабт">↵</button>
      </div>
      {d && (
        <div className="ql-prev">
          <b>{exp ? '−' : '+'}{fmt(d.amount)}</b>
          {exp
            ? <><span>{categoryIcon(d.category ?? undefined, state.categories ?? []) ?? ''} {d.category ?? '—'}</span><span>{ACCOUNTS[d.account]?.icon} {ACCOUNTS[d.account]?.name}</span></>
            : <span>{d.source}</span>}
          {d.note && <span className="ql-note">{d.note}</span>}
          {over && <span className="ql-warn">⚠️</span>}
        </div>
      )}
      {res && 'error' in res && res.error === 'debt' && <div className="ql-prev"><span>Қарзро аз бахши «Қарз» сабт кунед</span></div>}
    </form>
  );
}
