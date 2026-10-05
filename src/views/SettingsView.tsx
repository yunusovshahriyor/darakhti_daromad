import { useState } from 'react';
import { AddAccountSheet, EditNodeSheet } from '../components/AccountEditor';
import { ChevronIcon, PlusIcon } from '../components/Icons';
import { ACCOUNTS, CARD_COLORS, effectiveShareNode, fmt, isRemainderNode } from '../model';
import { emptyState } from '../storage';
import type { DistNode } from '../types';
import type { Props } from './props';

export default function SettingsView({ state, setState, onToast }: Props & { onToast: (m: string) => void }) {
  const [editId, setEditId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const root = state.tree;

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
      return (
        <button key={node.id} className="cell tap tree-row" style={{ paddingLeft: 14 + depth * 16 }}
          onClick={() => setEditId(node.id)}>
          <span className="tr-ic" style={{ background: CARD_COLORS[node.accountId] }}>{ACCOUNTS[node.accountId]?.icon}</span>
          <span className="grow">
            <b>{def.name}</b>
            <small>{n2(share)}% аз ҳар даромад</small>
          </span>
          <span className="tr-pct">{n2(node.percent)}%{remainder && <em>боқимонда</em>}</span>
          <ChevronIcon />
        </button>
      );
    }
    const rows = node.children.map(c => row(c, depth + 1));
    const isRoot = node.id === 'root';
    return (
      <div key={node.id}>
        {!isRoot && (
          <button className="cell tap tree-row group" style={{ paddingLeft: 14 + depth * 16 }}
            onClick={() => setEditId(node.id)}>
            <span className="tr-ic soft">{node.icon}</span>
            <span className="grow">
              <b>{node.title}</b>
              <small>{n2(share)}% аз ҳар даромад</small>
            </span>
            <span className="tr-pct">{n2(node.percent)}%{remainder && <em>боқимонда</em>}</span>
            <ChevronIcon />
          </button>
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
        <div className="cell tree-row static" style={{ paddingLeft: 14 }}>
          <span className="tr-ic" style={{ background: CARD_COLORS.debt }}>{ACCOUNTS.debt?.icon}</span>
          <span className="grow">
            <b>{ACCOUNTS.debt?.name}</b>
            <small>Ҳангоми қарз фоизи «Вақтхушӣ» ба ин ҳисоб меравад</small>
          </span>
        </div>
      </div>
      <p className="note">
        Фоиз нисбат ба гурӯҳи волид аст. Охирин ҳисоби ҳар гурӯҳ — боқимонда: фоизи он худкор ҳисоб мешавад, то ҷамъ 100% бошад.
        Тағйирот танҳо ба даромадҳои нав таъсир мекунад.
      </p>
      <button className="btn" onClick={() => setAdding(true)}><PlusIcon /> Ҳисоби нав</button>

      <h3 className="group-title"><span>Маълумот</span></h3>
      <div className="cells">
        <div className="cell"><div className="grow muted">Маълумот танҳо дар ин дастгоҳ нигоҳ дошта мешавад.</div></div>
      </div>
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
