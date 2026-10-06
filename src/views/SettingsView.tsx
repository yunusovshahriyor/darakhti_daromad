import { useEffect, useState } from 'react';
import { AddAccountSheet, EditNodeSheet } from '../components/AccountEditor';
import { ChevronIcon, PencilIcon, PlusIcon } from '../components/Icons';
import { ACCOUNTS, CARD_COLORS, effectiveShareNode, fmt, hasDebt, isRemainderNode } from '../model';
import { emptyState } from '../storage';
import type { DistNode } from '../types';
import type { Props } from './props';

const CLOSED_KEY = 'darakhti:setclosed';

const readClosed = (): string[] => {
  try { return JSON.parse(localStorage.getItem(CLOSED_KEY) ?? '[]') as string[]; } catch { return []; }
};

export default function SettingsView({ state, setState, onToast }: Props & { onToast: (m: string) => void }) {
  const [editId, setEditId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [closed, setClosed] = useState(readClosed);
  const root = state.tree;
  const debt = hasDebt(state.debts);

  useEffect(() => {
    try { localStorage.setItem(CLOSED_KEY, JSON.stringify(closed)); } catch { /* ignore */ }
  }, [closed]);

  const toggle = (id: string) =>
    setClosed(c => (c.includes(id) ? c.filter(k => k !== id) : [...c, id]));

  const wipe = () => {
    if (window.confirm('Ҳамаи маълумот (даромад, хароҷот, қарз, орзуҳо, ҳисобҳо) нест мешавад. Идома медиҳед?')) {
      setState(emptyState());
    }
  };

  const n2 = (v: number) => fmt(Math.round(v * 100) / 100);

  const row = (node: DistNode, depth: number): React.ReactNode => {
    const remainder = isRemainderNode(root, node.id);
    const share = effectiveShareNode(root, node.id);
    if (node.type === 'account') {
      const def = state.accounts.find(a => a.id === node.accountId);
      if (!def || def.archived) return null;
      const off = debt && node.accountId === 'fun';
      return (
        <button key={node.id} className={off ? 'cell tree-row off' : 'cell tap tree-row'}
          style={{ paddingLeft: 14 + depth * 16 }} disabled={off}
          onClick={() => setEditId(node.id)}>
          <span className="tr-ic" style={{ background: CARD_COLORS[node.accountId] }}>{ACCOUNTS[node.accountId]?.icon}</span>
          <span className="grow">
            <b>{def.name}</b>
            <small>{off ? 'Нофаъол: аввал қарзҳоро пардохт кунед' : `${n2(share)}% аз ҳар даромад`}</small>
          </span>
          <span className="tr-pct">{n2(node.percent)}%{remainder && <em>боқимонда</em>}</span>
          {!off && <ChevronIcon />}
        </button>
      );
    }
    const isRoot = node.id === 'root';
    const open = isRoot || !closed.includes(node.id);
    const rows = open ? node.children.map(c => row(c, depth + 1)) : null;
    return (
      <div key={node.id}>
        {!isRoot && (
          <div className="cell tree-row group" style={{ paddingLeft: 14 + depth * 16 }}>
            <button className="tr-main tap" onClick={() => toggle(node.id)} aria-expanded={open}>
              <span className={open ? 'chev open' : 'chev'}><ChevronIcon /></span>
              <span className="tr-ic soft">{node.icon}</span>
              <span className="grow">
                <b>{node.title}</b>
                <small>{n2(share)}% аз ҳар даромад</small>
              </span>
              <span className="tr-pct">{n2(node.percent)}%{remainder && <em>боқимонда</em>}</span>
            </button>
            <button className="icon-btn tr-edit" onClick={() => setEditId(node.id)} aria-label="Таҳрир">
              <PencilIcon />
            </button>
          </div>
        )}
        {rows}
      </div>
    );
  };

  return (
    <>
      <h3 className="group-title"><span>Ҳисобҳо ва фоизҳо</span></h3>
      <div className="cells tree">
        {row(root, -1)}
        {debt && (
          <div className="cell tree-row static" style={{ paddingLeft: 14 }}>
            <span className="tr-ic" style={{ background: CARD_COLORS.debt }}>{ACCOUNTS.debt?.icon}</span>
            <span className="grow">
              <b>{ACCOUNTS.debt?.name}</b>
              <small>Ҳиссаи «Вақтхушӣ» ба ин ҳисоб меравад</small>
            </span>
          </div>
        )}
      </div>
      <button className="btn" onClick={() => setAdding(true)}><PlusIcon /> Ҳисоби нав</button>

      <button className="btn danger" onClick={wipe}>Нест кардани ҳамаи маълумот</button>

      {editId && (
        <EditNodeSheet state={state} setState={setState} nodeId={editId}
          onClose={() => setEditId(null)} onToast={onToast} />
      )}
      {adding && (
        <AddAccountSheet state={state} setState={setState} onClose={() => setAdding(false)} onToast={onToast} />
      )}
    </>
  );
}
