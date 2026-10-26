import { FormEvent, useState } from 'react';
import { ACCOUNTS, CARD_COLORS, SYSTEM_IDS, balancesOf, fmt, hasShares, mainAccountOf, shareRule, shareSource, sharesOf, uid } from '../model';
import type { Props } from '../views/props';
import { COLORS, ColorPicker, IconPicker } from './AccountEditor';
import Field from './Field';
import PickerField from './PickerField';
import { ChevronIcon, PlusIcon } from './Icons';
import Sheet from './Sheet';

/** Оё `acc` дар занҷири манбаъҳои `target` меояд (барои пешгирии давр)? */
function chainHas(state: Props['state'], acc: string, target: string | null): boolean {
  if (!target) return false;
  let cur: string | undefined = acc;
  for (let n = 0; cur && n < 12; n++) {
    if (cur === target) return true;
    cur = state.accounts.find(a => a.id === cur)?.shareFrom;
  }
  return false;
}

/** Ҳисоби нав ё таҳрири ҳисоби мавҷуда: ном, нишона, ранг, фоизи ҳар даромад, ҳисоби асосӣ. */
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
  const main = mainAccountOf(state);
  const isMain = id === main;
  const [share, setShare] = useState(def?.share ? String(def.share).replace('.', ',') : '');
  const [from, setFrom] = useState<string>(def?.shareFrom ?? '');
  // Манбаъҳои имконпазир: ҳисобҳои дигар (бе давр: ҳисобе, ки худаш аз ин ҳисоб ҷудо мешавад, манбаъ шуда наметавонад)
  const mine = state.accounts.filter(a => !a.archived && !SYSTEM_IDS.includes(a.id));
  const sources = mine.filter(a => a.id !== id && !chainHas(state, a.id, id));
  const fromId = sources.some(a => a.id === from) ? from : '';
  // Фоизҳои дигар аз ҳамон манбаъ (ҳисоби асосӣ дар «аз ҳар даромад» боқимонда мегирад)
  const others = state.accounts
    .filter(a => !a.archived && a.id !== id && a.id !== 'debt' && (shareSource(state, a) ?? '') === fromId)
    .reduce((t, a) => t + (a.share ?? 0), 0);
  const pct = isMain ? 0 : Math.max(0, parseFloat(share.replace(',', '.')) || 0);

  const save = (e: FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    if (pct > 100) { setError('Фоиз аз 100 зиёд буда наметавонад'); return; }
    if (others + pct > 100.0001) { setError(`Ҷамъи фоизҳо аз 100 зиёд мешавад: барои ин ҳисоб ҳадди аксар ${fmt(Math.max(0, Math.round((100 - others) * 100) / 100))}%`); return; }
    const sh = pct > 0 ? { share: pct, ...(fromId ? { shareFrom: fromId } : {}) } : {};
    if (id) setState(s => ({ ...s, accounts: s.accounts.map(a => (a.id === id ? { ...a, name: n, icon, color, share: undefined, shareFrom: undefined, ...sh } : a)) }));
    else setState(s => ({ ...s, accounts: [...s.accounts, { id: `a${uid()}`, name: n, icon, color, ...sh }] }));
    onToast(id ? 'Ҳисоб нав шуд ✓' : 'Ҳисоби нав илова шуд ✓');
    onClose();
  };

  const archive = () => {
    if (!id) return;
    if (isMain) { setError('Ин ҳисоби асосӣ аст. Аввал ҳисоби асосии дигарро интихоб кунед'); return; }
    if (Math.abs(bal) > 0.005) { setError(`Дар ҳисоб ${fmt(bal)} сомонӣ ҳаст: аввал онро ба ҳисоби дигар гузаронед`); return; }
    setState(s => ({ ...s, accounts: s.accounts.map(a => (a.id === id ? { ...a, archived: true, share: undefined, shareFrom: undefined } : a.shareFrom === id ? { ...a, shareFrom: undefined } : a)) }));
    onToast('Ҳисоб нест шуд');
    onClose();
  };

  return (
    <Sheet title={id ? 'Таҳрири ҳисоб' : 'Ҳисоби нав'} onClose={onClose}>
      <form onSubmit={save}>
        <Field label="Номи ҳисоб">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Масалан, Нақд ё Корти бонк" required />
        </Field>
        {isMain ? (
          <p className="note">⭐ Ин ҳисоби асосӣ аст: аз ҳар даромад фоизҳои ҳисобҳои дигар ҷудо мешавад ва боқимонда ба ин ҷо меравад.</p>
        ) : (
          <>
            <Field label="Чанд фоиз ҷудо шавад (%)">
              <input value={share} inputMode="decimal" placeholder="0 — ҷудо намешавад"
                onChange={e => setShare(e.target.value.replace(/[^\d.,]/g, ''))} />
            </Field>
            <PickerField value={fromId} onChange={setFrom} title="Аз куҷо ҷудо шавад"
              options={[{ value: '', label: 'Аз ҳар даромад', icon: '💰' },
                ...sources.map(a => ({ value: a.id, label: `Аз ҳисоби «${a.name}»`, icon: ACCOUNTS[a.id]?.icon ?? a.icon }))]} />
            <small className="note">{fromId ? 'Фоиз аз маблағе ҷудо мешавад, ки аз ҳар даромад ба ҳисоби интихобшуда мерасад.' : 'Масалан, 10 — аз ҳар даромад 10% ба ин ҳисоб меравад.'}</small>
          </>
        )}
        <div className="field"><span>Нишона</span><IconPicker value={icon} onChange={setIcon} /></div>
        <div className="field"><span>Ранг</span><ColorPicker value={color} onChange={setColor} /></div>
        {error && <div className="alert danger">{error}</div>}
        <button className="btn" type="submit">{id ? 'Захира кардан' : 'Илова кардан'}</button>
        {id && !isMain && (
          <button className="btn secondary" type="button" onClick={() => { setState(s => ({ ...s, mainAccount: id, accounts: s.accounts.map(a => (a.id === id ? { ...a, share: undefined, shareFrom: undefined } : a)) })); onToast('Ҳисоби асосӣ иваз шуд ✓'); onClose(); }}>
            ⭐ Ҳисоби асосӣ кардан
          </button>
        )}
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
  const main = mainAccountOf(state);
  const sh = sharesOf(state);
  const hint = (id: string) => {
    if (id === main) return hasShares(state) ? `⭐ Ҳисоби асосӣ · боқимонда ${fmt(sh[id] ?? 100)}%` : '⭐ Ҳисоби асосӣ';
    const r = shareRule(state, id);
    return r ? (r.from ? `${fmt(r.pct)}% аз ҳисоби «${r.from}»` : `${fmt(r.pct)}% аз ҳар даромад`) : '';
  };
  return (
    <>
      <p className="note">Ҳисобҳои худро созед ва барои ҳар кадом фоизи муайянро аз ҳар даромад ҷудо кунед. Боқимонда ба ҳисоби асосӣ (⭐) меравад.</p>
      <h3 className="group-title"><span>Ҳисобҳо</span></h3>
      <div className="cells">
        {list.map(a => (
          <button key={a.id} className="cell tap link" onClick={() => setEditId(a.id)}>
            <div className="ic" style={{ background: CARD_COLORS[a.id] ?? a.color }}>{ACCOUNTS[a.id]?.icon ?? a.icon}</div>
            <div className="grow"><b>{a.name}</b><small>{`${fmt(bal[a.id] ?? 0)} смн`}{hint(a.id) ? <> · <span>{hint(a.id)}</span></> : null}</small></div>
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
