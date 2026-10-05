import { FormEvent, useState } from 'react';
import {
  ACCOUNTS, PROTECTED_IDS, addAccountNode, balancesOf, effectiveShareNode, findAccountNode, findNode,
  fmt, groupOptions, hiddenAccounts, isRemainderNode, patchGroup, removeAccountNode, setNodePercent,
  today, treeError, uid,
} from '../model';
import type { AccountDef, DistNode } from '../types';
import type { Props } from '../views/props';
import AccountSelect from './AccountSelect';
import Field from './Field';
import Sheet from './Sheet';

const ICONS = [
  '🏦', '💼', '🎓', '🏥', '🚗', '🏠', '✈️', '🎁', '📱', '💻', '🛒', '🍽️',
  '☕', '👶', '🐾', '🎮', '🎬', '📚', '🧾', '💡', '🌍', '🤲', '🌱', '💰',
];
const COLORS = [
  '#b7791f', '#b24a6c', '#2f857b', '#7a5bb8', '#b3453b', '#1f6fa3',
  '#2f7d55', '#2f8fb5', '#46688f', '#8a5a2b', '#5b7f2a', '#a0522d',
];

const parsePercent = (v: string) => Math.max(0, Math.min(100, parseFloat(v) || 0));

function IconPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
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

function ColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="swatches colors">
      {COLORS.map(c => (
        <button type="button" key={c} className={c === value ? 'on' : ''} style={{ background: c }}
          onClick={() => onChange(c)} aria-label={c} />
      ))}
    </div>
  );
}

/** Таҳрири як гиреҳи дарахт: ҳисоб (ном, нишона, ранг, фоиз) ё гурӯҳ (ном, нишона, фоиз). */
export function EditNodeSheet({ state, setState, nodeId, onClose, onToast }: Props & {
  nodeId: string;
  onClose: () => void;
  onToast: (m: string) => void;
}) {
  const found = findNode(state.tree, nodeId);
  const node = found?.node;
  const def: AccountDef | undefined = node?.type === 'account'
    ? state.accounts.find(a => a.id === node.accountId)
    : undefined;
  const group = node?.type === 'group' ? node : null;

  const [name, setName] = useState(def?.name ?? group?.title ?? '');
  const [icon, setIcon] = useState(def?.icon ?? group?.icon ?? '💰');
  const [color, setColor] = useState(def?.color ?? '#46688f');
  const [percent, setPercent] = useState(String(node ? Math.round(node.percent * 100) / 100 : 0));
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [target, setTarget] = useState('living');

  if (!node || !found) return null;

  const remainder = isRemainderNode(state.tree, nodeId);
  const isRoot = found.parent === null;
  const siblings = found.parent && found.parent.type === 'group' ? found.parent.children.length : 0;
  const accountId = node.type === 'account' ? node.accountId : null;
  const protectedAcct = accountId !== null && PROTECTED_IDS.includes(accountId);
  const canDelete = accountId !== null && !protectedAcct && siblings > 1;
  const bal = accountId ? balancesOf(state)[accountId] ?? 0 : 0;
  const share = effectiveShareNode(state.tree, nodeId);

  const save = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    let tree = state.tree;
    if (!remainder && !isRoot) {
      tree = setNodePercent(tree, nodeId, parsePercent(percent));
      const err = treeError(tree);
      if (err) { setError(err); return; }
    }
    if (group) tree = patchGroup(tree, nodeId, { title: name.trim(), icon });
    setState(s => ({
      ...s,
      tree,
      accounts: accountId
        ? s.accounts.map(a => (a.id === accountId ? { ...a, name: name.trim(), icon, color } : a))
        : s.accounts,
    }));
    onToast('Нигоҳ дошта шуд ✓');
    onClose();
  };

  const remove = () => {
    if (!accountId) return;
    if (Math.abs(bal) > 0.005 && !target) return;
    setState(s => {
      const b = balancesOf(s)[accountId] ?? 0;
      let transfers = s.transfers;
      if (Math.abs(b) > 0.005) {
        transfers = [
          { id: uid(), from: b > 0 ? accountId : target, to: b > 0 ? target : accountId, amount: Math.abs(b), date: today() },
          ...s.transfers,
        ];
      }
      const goals = { ...s.goals };
      delete goals[accountId];
      return {
        ...s,
        goals,
        transfers,
        accounts: s.accounts.map(a => (a.id === accountId ? { ...a, archived: true } : a)),
        tree: removeAccountNode(s.tree, accountId),
      };
    });
    onToast('Ҳисоб нест шуд');
    onClose();
  };

  const title = group ? 'Таҳрири гурӯҳ' : 'Таҳрири ҳисоб';

  return (
    <Sheet title={title} onClose={onClose}>
      <form onSubmit={save}>
        <Field label={group ? 'Номи гурӯҳ' : 'Номи ҳисоб'}>
          <input value={name} onChange={e => setName(e.target.value)} required />
        </Field>

        <div className="field"><span>Нишона</span><IconPicker value={icon} onChange={setIcon} /></div>
        {accountId && <div className="field"><span>Ранг</span><ColorPicker value={color} onChange={setColor} /></div>}

        {!isRoot && (
          <Field label={`Фоиз аз «${found.parent && found.parent.type === 'group' ? found.parent.title : ''}»`}>
            <input type="number" inputMode="decimal" min="0" max="100" step="0.1" value={percent}
              disabled={remainder} onChange={e => { setPercent(e.target.value); setError(''); }} />
          </Field>
        )}
        {remainder && !isRoot && (
          <p className="note">Ин гиреҳ боқимонда аст: фоизи он худкор ҳисоб мешавад (то ҷамъ 100% шавад). Барои тағйир додан фоизи дигар ҳисобҳои гурӯҳро иваз кунед.</p>
        )}
        {accountId === 'fun' && (
          <p className="note">Агар қарз бошад, ин фоиз ба «Пардохти қарз» меравад.</p>
        )}
        <p className="note">Ҳиссаи воқеӣ: {fmt(Math.round(share * 100) / 100)}% аз ҳар даромад.</p>


        {error && <div className="alert danger">{error}</div>}
        <button className="btn" type="submit">Нигоҳ доштан</button>
      </form>

      {accountId && (
        <div className="danger-zone">
          {!canDelete ? (
            <p className="note">
              {protectedAcct
                ? 'Ин ҳисоб бо хусусиятҳои барнома пайваст аст (қарз, орзу ё вақтхушӣ) ва нест намешавад, аммо таҳрир мешавад.'
                : 'Дар гурӯҳ ҳадди аққал як ҳисоб бояд бимонад.'}
            </p>
          ) : !confirmDelete ? (
            <button className="btn danger" type="button" onClick={() => setConfirmDelete(true)}>Нест кардани ҳисоб</button>
          ) : (
            <div className="confirm-box">
              <p>Ҳисоб нест мешавад, таърихи он дар «Таърих» мемонад.</p>
              {Math.abs(bal) > 0.005 && (
                <Field label={`Боқимонда (${fmt(bal)} смн) ба кадом ҳисоб гузарад?`}>
                  <AccountSelect value={target} onChange={setTarget} bal={balancesOf(state)}
                    hidden={[...hiddenAccounts(state), accountId]} />
                </Field>
              )}
              <button className="btn danger" type="button" onClick={remove}>Ҳа, нест кун</button>
              <button className="btn secondary" type="button" onClick={() => setConfirmDelete(false)}>Бекор кардан</button>
            </div>
          )}
        </div>
      )}
    </Sheet>
  );
}

/** Ҳисоби нав: гурӯҳ, ном, нишона, ранг ва фоиз. */
export function AddAccountSheet({ state, setState, onClose, onToast }: Props & {
  onClose: () => void;
  onToast: (m: string) => void;
}) {
  const groups = groupOptions(state.tree).filter(g => g.id !== 'monthly');
  const [parent, setParent] = useState(groups.find(g => g.id === 'root')?.id ?? groups[0].id);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('💰');
  const [color, setColor] = useState(COLORS[5]);
  const [percent, setPercent] = useState('5');
  const [error, setError] = useState('');

  const save = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const id = `a${uid()}`;
    const tree = addAccountNode(state.tree, parent, id, parsePercent(percent));
    const err = treeError(tree);
    if (err) { setError(err); return; }
    setState(s => ({
      ...s,
      tree,
      accounts: [...s.accounts, { id, name: name.trim(), icon, color }],
    }));
    onToast('Ҳисоби нав илова шуд ✓');
    onClose();
  };

  const parentNode = findNode(state.tree, parent)?.node;
  const parentTitle = parentNode?.type === 'group' ? parentNode.title : '';

  return (
    <Sheet title="Ҳисоби нав" onClose={onClose}>
      <form onSubmit={save}>
        <Field label="Дар кадом гурӯҳ">
          <select value={parent} onChange={e => { setParent(e.target.value); setError(''); }}>
            {groups.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
          </select>
        </Field>
        <Field label="Номи ҳисоб">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Масалан, Таҳсил" required />
        </Field>
        <div className="field"><span>Нишона</span><IconPicker value={icon} onChange={setIcon} /></div>
        <div className="field"><span>Ранг</span><ColorPicker value={color} onChange={setColor} /></div>
        <Field label={`Фоиз аз «${parentTitle}»`}>
          <input type="number" inputMode="decimal" min="0" max="100" step="0.1" value={percent}
            onChange={e => { setPercent(e.target.value); setError(''); }} />
        </Field>
        <p className="note">Ин фоиз аз боқимондаи гурӯҳ кам мешавад (охирин ҳисоби гурӯҳ — боқимонда).</p>
        {error && <div className="alert danger">{error}</div>}
        <button className="btn" type="submit">Илова кардан</button>
      </form>
    </Sheet>
  );
}

export const accountName = (id: string) => ACCOUNTS[id]?.name ?? id;

export type { DistNode };
