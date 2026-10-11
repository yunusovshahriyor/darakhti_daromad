import { useEffect, useState } from 'react';
import { useConfirm } from '../components/ConfirmSheet';
import { AddAccountSheet, EditNodeSheet } from '../components/AccountEditor';
import { ChevronIcon, PencilIcon, PlusIcon } from '../components/Icons';
import { useHistoryLayer } from '../components/useHistoryLayer';
import { hasUnsynced, signOutAndWipe, syncNow, useSync } from '../sync';
import { ACCOUNTS, CARD_COLORS, effectiveShareNode, findAccountNode, fmt, hasDebt, isRemainderNode } from '../model';
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
  const [page, setPage] = useState<'menu' | 'accounts'>('menu');
  const sync = useSync();
  const signed = sync.configured && sync.status !== 'signedout' && sync.status !== 'off' && sync.email !== '';
  // «Бозгашт»-и телефон аз зерсаҳифаи «Ҳисобҳо ва фоизҳо» ба менюи танзимот бармегардонад
  useHistoryLayer(page === 'accounts', () => setPage('menu'));
  const root = state.tree;
  const debt = hasDebt(state.debts);

  useEffect(() => {
    try { localStorage.setItem(CLOSED_KEY, JSON.stringify(closed)); } catch { /* ignore */ }
  }, [closed]);

  const toggle = (id: string) =>
    setClosed(c => (c.includes(id) ? c.filter(k => k !== id) : [...c, id]));

  const [ask, confirmDialog] = useConfirm();

  const wipe = async () => {
    const ok = await ask({
      title: 'Нест кардани ҳамаи маълумот',
      text: 'Ҳамаи маълумот (даромад, хароҷот, қарз, орзуҳо, ҳисобҳо) нест мешавад ва онро барқарор кардан мумкин нест.',
      ok: 'Ҳаа, нест кунед',
      danger: true,
    });
    if (ok) setState(emptyState());
  };

  const logout = async () => {
    const ok = await ask({
      title: 'Баромад аз аккаунт',
      text: 'Шумо аз аккаунт мебароед ва ҳамаи маълумоти ин дастгоҳ нест мешавад. Дар сервер маълумот мемонад ва бо ворид шудан дубора пайдо мешавад.',
      ok: 'Баромадан',
      danger: true,
    });
    if (!ok) return;
    // Пеш аз пок кардан тағйироти охиринро ба сервер мефиристем
    try { await syncNow(); } catch { /* санҷиш дар поён */ }
    if (hasUnsynced()) {
      const force = await ask({
        title: 'Маълумот сабт нашудааст',
        text: 'Тағйироти охирин ба сервер нарасид (интернет нест?). Агар ҳоло бароед, он гум мешавад.',
        ok: 'Ҳамоно баромадан',
        danger: true,
      });
      if (!force) return;
    }
    try { await signOutAndWipe(); } catch { onToast('Баромад нашуд: аз нав кӯшиш кунед'); }
  };

  const n2 = (v: number) => fmt(Math.round(v * 100) / 100);

  const row = (node: DistNode, depth: number): React.ReactNode => {
    const remainder = isRemainderNode(root, node.id);
    const share = effectiveShareNode(root, node.id);
    if (node.type === 'account') {
      const def = state.accounts.find(a => a.id === node.accountId);
      if (!def || def.archived) return null;
      const isDebt = node.accountId === 'debt';
      const off = debt ? node.accountId === 'fun' : isDebt;
      const funNode = state.tree.type === 'group' ? findAccountNode(root, 'fun')?.node : undefined;
      const sub = off && !isDebt ? 'Нофаъол: аввал қарзҳоро пардохт кунед'
        : isDebt ? (debt ? `${n2(share + (funNode ? effectiveShareNode(root, funNode.id) : 0))}% аз ҳар даромад (бо «Вақтхушӣ»)` : 'Нофаъол: қарз нест, бо қарзи нав фаъол мешавад')
        : `${n2(share)}% аз ҳар даромад`;
      return (
        <button key={node.id} className={off ? 'cell tree-row off' : 'cell tap tree-row'}
          style={{ paddingLeft: 14 + depth * 16 }} disabled={off}
          onClick={() => setEditId(node.id)}>
          <span className="tr-ic" style={{ background: CARD_COLORS[node.accountId] }}>{ACCOUNTS[node.accountId]?.icon}</span>
          <span className="grow">
            <b>{def.name}</b>
            <small>{sub}</small>
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

  const accountCount = state.accounts.filter(a => !a.archived).length;

  if (page === 'menu') {
    return (
      <>
        <h3 className="group-title"><span>Танзимот</span></h3>
        <div className="cells">
          <button className="cell tap link" onClick={() => setPage('accounts')}>
            <div className="ic">🧩</div>
            <div className="grow"><b>Ҳисобҳо ва фоизҳо</b><small>{accountCount} ҳисоб · тақсими даромад</small></div>
            <ChevronIcon />
          </button>
          {signed && (
            <button className="cell tap link" onClick={logout}>
              <div className="ic">🚪</div>
              <div className="grow"><b>Баромад аз аккаунт</b><small>{sync.email}</small></div>
              <ChevronIcon />
            </button>
          )}
        </div>

        <button className="btn danger" onClick={wipe}>Нест кардани ҳамаи маълумот</button>

        {confirmDialog}
      </>
    );
  }

  return (
    <>
      <button className="set-back tap" onClick={() => setPage('menu')}>
        <span className="chev-back"><ChevronIcon /></span> Танзимот
      </button>
      <h3 className="group-title"><span>Ҳисобҳо ва фоизҳо</span></h3>
      <div className="cells tree">
        {row(root, -1)}
      </div>
      <button className="btn" onClick={() => setAdding(true)}><PlusIcon /> Ҳисоби нав</button>

      {confirmDialog}

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
