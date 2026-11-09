import { FormEvent, useState } from 'react';
import { categoryIcon } from '../categories';
import { ACCOUNTS, balancesOf, fmt, today } from '../model';
import { applyDrafts, draftsFrom } from '../quickAdd';
import { voiceSupported } from '../voice';
import VoiceOverlay from './VoiceOverlay';
import type { Props } from '../views/props';

/** Сатри зуд дар саҳифаи асосӣ: «такси 21» → маълумот худкор фаҳмида мешавад ва бо як пахш сабт мешавад. */
export default function QuickLine({ state, setState, onSaved, className = '' }: Props & { onSaved: (msg: string) => void; className?: string }) {
  const [text, setText] = useState('');
  const [mic, setMic] = useState(false);
  const res = text.trim() ? draftsFrom(state, text, today()) : null;
  const ds = res && 'drafts' in res ? res.drafts : [];
  const over = ds.some(d => d.kind === 'expense' && d.amount > (balancesOf(state)[d.account] ?? 0) + 0.005);
  const save = (e: FormEvent) => {
    e.preventDefault();
    if (!ds.length) return;
    setState(s => applyDrafts(s, ds).state);
    const n = ds.length;
    onSaved(n > 1 ? `Сабт шуд: ${n} амалиёт ✓` : `${ds[0].kind === 'expense' ? 'Хароҷот сабт шуд' : 'Даромад илова шуд'} ✓ · ${fmt(ds[0].amount)}`);
    setText('');
  };
  return (
    <form className={`quick-line ${className}`} onSubmit={save}>
      <div className="ql-row">
        {voiceSupported() && <button type="button" className="ql-mic" aria-label="Сабти овозӣ" onClick={() => setMic(true)}>🎤</button>}
        <input value={text} onChange={e => setText(e.target.value)} enterKeyHint="done"
          placeholder="Зуд: «такси 21» ё «нон 15, чой 8»" aria-label="Сабти зуд" />
        <button type="submit" className="ql-go" disabled={!ds.length} aria-label="Сабт">↵</button>
      </div>
      {ds.map((d, i) => (
        <div className="ql-prev" key={i}>
          <b>{d.kind === 'expense' ? '−' : '+'}{fmt(d.amount)}</b>
          {d.kind === 'expense'
            ? <><span>{categoryIcon(d.category ?? undefined, state.categories ?? []) ?? ''} {d.category ?? '—'}</span><span>{ACCOUNTS[d.account]?.icon} {ACCOUNTS[d.account]?.name}</span></>
            : <span>{d.source}</span>}
          {d.note && <span className="ql-note">{d.note}</span>}
        </div>
      ))}
      {over && <div className="ql-prev"><span className="ql-warn">⚠️ Маблағ аз тавозуни ҳисоб зиёд аст</span></div>}
      {res && 'error' in res && res.error === 'debt' && <div className="ql-prev"><span>Қарзро аз бахши «Қарз» сабт кунед</span></div>}
      {mic && <VoiceOverlay onText={t => setText(t)} onClose={() => setMic(false)} />}
    </form>
  );
}
