import { FormEvent, useState } from 'react';
import {
  ACCOUNTS, PROTECTED_IDS, addAccountNode, balancesOf, effectiveShareNode, findAccountNode, findNode,
  fmt, groupOptions, hiddenAccounts, isRemainderNode, patchGroup, removeAccountNode, setNodePercent,
  today, treeError, uid,
} from '../model';
import { tr } from '../i18n';
import type { AccountDef, DistNode } from '../types';
import type { Props } from '../views/props';
import AccountSelect from './AccountSelect';
import PickerField from './PickerField';
import Field from './Field';
import Sheet from './Sheet';

const ICONS = [
  '🏦', '💼', '🎓', '🏥', '🚗', '🏠', '✈️', '🎁', '📱', '💻', '🛒', '🍽️',
  '☕', '👶', '🐾', '🎮', '🎬', '📚', '🧾', '💡', '🌍', '🤲', '🌱', '💰',
];
export const COLORS = [
  '#b7791f', '#b24a6c', '#2f857b', '#7a5bb8', '#b3453b', '#1f6fa3',
  '#2f7d55', '#2f8fb5', '#46688f', '#8a5a2b', '#5b7f2a', '#a0522d',
];

const r2 = (n: number) => Math.round(n * 100) / 100;

const nodeLabel = (n: DistNode, accounts: AccountDef[]) =>
  n.type === 'group' ? n.title : accounts.find(a => a.id === n.accountId)?.name ?? n.accountId;

const parsePercent = (v: string) => Math.max(0, Math.min(100, parseFloat(v) || 0));

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
  const sibs = found?.parent && found.parent.type === 'group' ? found.parent.children.filter(c => c.id !== nodeId) : [];
  const [swap, setSwap] = useState(sibs[0]?.id ?? '');

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
    if (!isRoot && !remainder) {
      tree = setNodePercent(tree, nodeId, parsePercent(percent));
      const err = treeError(tree);
      if (err) { setError(err); return; }
    } else if (!isRoot && remainder) {
      const d = parsePercent(percent) - node.percent;
      const sib = sibs.find(c => c.id === swap);
      if (Math.abs(d) > 0.0001) {
        if (!sib) { setError('Ҳисоби дигар дар гурӯҳ нест.'); return; }
        if (sib.percent - d < -0.0001) { setError('Дар ҳисоби интихобшуда фоизи кофӣ нест.'); return; }
        tree = setNodePercent(tree, sib.id, Math.max(0, sib.percent - d));
        const err = treeError(tree);
        if (err) { setError(err); return; }
      }
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
              onChange={e => { setPercent(e.target.value); setError(''); }} />
          </Field>
        )}
        {remainder && !isRoot && sibs.length > 0 && (
          <>
            <Field label="Фарқи фоизро бо кадом ҳисоб мубодила кунем?">
              <PickerField value={swap} title="Бо кадом ҳисоб" onChange={setSwap}
                options={sibs.map(c => ({ value: c.id, label: nodeLabel(c, state.accounts), note: `${r2(c.percent)}%` }))} />
            </Field>
            <p className="note">Ин боқимонда аст. Агар фоизро иваз кунед, фарқ ба ҳисоби интихобшуда меравад ё аз он гирифта мешавад.</p>
          </>
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
            <button className="btn danger" type="button" onClick={() => setConfirmDelete(true)}>Нест кардани ин ҳисоб</button>
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
  const groups = groupOptions(state.tree);
  const rootNode = state.tree.type === 'group' ? state.tree : null;
  const [source, setSource] = useState(rootNode?.children[rootNode.children.length - 1]?.id ?? '');
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('💰');
  const [color, setColor] = useState(COLORS[5]);
  const [percent, setPercent] = useState('5');
  const [error, setError] = useState('');

  // Гурӯҳ ва ҳисоб як ҷо: ҳисоби интихобшуда — манбаи фоиз; ҳисоби нав ба гурӯҳи ҳамон ҳисоб меравад.
  const sourceFound = findNode(state.tree, source);
  const parent = sourceFound?.parent?.id ?? 'root';
  const pg = findNode(state.tree, parent)?.node;
  const kids = pg && pg.type === 'group' ? pg.children : [];
  const donorId = source;
  const sourceOptions = groups.flatMap(g => {
    const gn = findNode(state.tree, g.id)?.node;
    if (!gn || gn.type !== 'group') return [];
    const head = g.label.split(' › ').map(x => tr(x)).join(' › ');
    return gn.children.map((c, i) => ({
      value: c.id, label: nodeLabel(c, state.accounts), icon: c.type === 'group' ? c.icon ?? '📁' : state.accounts.find(a => a.id === c.accountId)?.icon ?? '💰',
      note: `${r2(c.percent)}%${i === gn.children.length - 1 ? ' · боқимонда' : ''}`, group: head,
    }));
  });

  const save = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const id = `a${uid()}`;
    const p = parsePercent(percent);
    let tree = addAccountNode(state.tree, parent, id, p);
    const last = kids[kids.length - 1];
    if (last && donorId && donorId !== last.id) {
      const d = kids.find(c => c.id === donorId);
      if (!d || d.percent - p < -0.0001) { setError('Дар ҳисоби интихобшуда фоизи кофӣ нест.'); return; }
      tree = setNodePercent(tree, donorId, Math.max(0, d.percent - p));
      tree = setNodePercent(tree, `n_${id}`, p);
    }
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
        <div className="field">
          <span>Ҳисоби нав аз кадом ҳисоб фоиз мегирад?</span>
          <PickerField value={source} title="Гурӯҳ ва ҳисоб" onChange={v => { setSource(v); setError(''); }} options={sourceOptions} />
          <p className="note grp-hint">Ҳисоби нав ба ҳамон гурӯҳе меравад, ки ҳисоби интихобшуда дар он аст.</p>
        </div>
        <Field label="Номи ҳисоб">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Масалан, Таҳсил" required />
        </Field>
        <div className="field"><span>Нишона</span><IconPicker value={icon} onChange={setIcon} /></div>
        <div className="field"><span>Ранг</span><ColorPicker value={color} onChange={setColor} /></div>
        <Field label={`Фоиз аз «${parentTitle}»`}>
          <input type="number" inputMode="decimal" min="0" max="100" step="0.1" value={percent}
            onChange={e => { setPercent(e.target.value); setError(''); }} />
        </Field>
        <p className="note">{`Аз ҳар 100 дар «${parentTitle}» ба ин ҳисоб ${parsePercent(percent)} мерасад`}</p>
        <p className="note">Фоизи ҳисоби нав аз ҳисоби интихобшуда кам мешавад.</p>
        {error && <div className="alert danger">{error}</div>}
        <button className="btn" type="submit">Илова кардан</button>
      </form>
    </Sheet>
  );
}

export const accountName = (id: string) => ACCOUNTS[id]?.name ?? id;

export type { DistNode };
