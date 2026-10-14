import { FormEvent, useState } from 'react';
import { ACCOUNTS, CARD_COLORS, SYSTEM_IDS, balancesOf, fmt, uid } from '../model';
import type { Props } from '../views/props';
import { COLORS, ColorPicker, IconPicker } from './AccountEditor';
import Field from './Field';
import { ChevronIcon, PlusIcon } from './Icons';
import Sheet from './Sheet';

/** Ҳолати озод: ҳисоби нав ё таҳрири ҳисоби мавҷуда (ном, нишона, ранг). */
function FreeAccountSheet({ state, setState, id, onClose, onToast }: Props & {
  id: string | null;
  onClose: () => void;
  onToast: (m: string) => void;
}) {
  const def = id ? state.accounts.find(a => a.id === id) : undefined;
  const [name, setName] = useState(def?.name ?? '');
  const [icon, setIcon] = useState(def?.icon ?? '💰');
  const [color, setColor] = useState(def?.color ?? COLORS[5]);
  const [error, setError] = useState('');
  const bal = id ? (balancesOf(state)[id] ?? 0) : 0;

  const save = (e: FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    if (id) setState(s => ({ ...s, accounts: s.accounts.map(a => (a.id === id ? { ...a, name: n, icon, color } : a)) }));
    else setState(s => ({ ...s, accounts: [...s.accounts, { id: `a${uid()}`, name: n, icon, color }] }));
    onToast(id ? 'Ҳисоб нав шуд ✓' : 'Ҳисоби нав илова шуд ✓');
    onClose();
  };

  const archive = () => {
    if (!id) return;
    if (Math.abs(bal) > 0.005) { setError(`Дар ҳисоб ${fmt(bal)} сомонӣ ҳаст: аввал онро ба ҳисоби дигар гузаронед`); return; }
    setState(s => ({ ...s, accounts: s.accounts.map(a => (a.id === id ? { ...a, archived: true } : a)) }));
    onToast('Ҳисоб нест шуд');
    onClose();
  };

  return (
    <Sheet title={id ? 'Таҳрири ҳисоб' : 'Ҳисоби нав'} onClose={onClose}>
      <form onSubmit={save}>
        <Field label="Номи ҳисоб">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Масалан, Нақд ё Корти бонк" required />
        </Field>
        <div className="field"><span>Нишона</span><IconPicker value={icon} onChange={setIcon} /></div>
        <div className="field"><span>Ранг</span><ColorPicker value={color} onChange={setColor} /></div>
        {error && <div className="alert danger">{error}</div>}
        <button className="btn" type="submit">{id ? 'Захира кардан' : 'Илова кардан'}</button>
        {id && <button className="btn danger" type="button" onClick={archive}>Нест кардани ин ҳисоб</button>}
      </form>
    </Sheet>
  );
}

/** Ҳолати озод: рӯйхати ҳисобҳои корбар бе фоиз. */
export default function FreeAccounts({ state, setState, onToast }: Props & { onToast: (m: string) => void }) {
  const [editId, setEditId] = useState<string | null | undefined>(undefined); // undefined — баста, null — ҳисоби нав
  const bal = balancesOf(state);
  const list = state.accounts.filter(a => !a.archived && !SYSTEM_IDS.includes(a.id));
  return (
    <>
      <h3 className="group-title"><span>Ҳисобҳо</span></h3>
      <div className="cells">
        {list.map(a => (
          <button key={a.id} className="cell tap link" onClick={() => setEditId(a.id)}>
            <div className="ic" style={{ background: CARD_COLORS[a.id] ?? a.color }}>{ACCOUNTS[a.id]?.icon ?? a.icon}</div>
            <div className="grow"><b>{a.name}</b><small>{fmt(bal[a.id] ?? 0)} смн</small></div>
            <ChevronIcon />
          </button>
        ))}
      </div>
      <button className="btn btn-add" onClick={() => setEditId(null)}><i><PlusIcon /></i><span>Ҳисоби нав</span></button>
      {editId !== undefined && (
        <FreeAccountSheet state={state} setState={setState} id={editId} onClose={() => setEditId(undefined)} onToast={onToast} />
      )}
    </>
  );
}
