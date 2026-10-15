import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { CARD_COLORS, ACCOUNTS, effectiveShareNode, fmt, isRemainderNode } from '../model';
import type { AccountDef, DistNode } from '../types';

const n2 = (v: number) => fmt(Math.round(v * 100) / 100);

/** Диаграммаи дарахтӣ аз чап ба рост: реша → гурӯҳҳо → ҳисобҳо. Пахши қуттӣ — таҳрир. */
export default function TreeDiagram({ root, accounts, isOff, onPick, balances, hidden }: {
  root: DistNode;
  accounts: AccountDef[];
  isOff: (accountId: string) => boolean;
  onPick?: (n: DistNode) => void;
  /** Агар дода шавад, ба ҷои ҳиссаи фоизӣ боқимондаи ҳисобҳо нишон дода мешавад. */
  balances?: Record<string, number>;
  hidden?: boolean;
}) {
  const box = useRef<HTMLDivElement>(null);
  // Реша дар поён аст: ҳангоми кушодан скролл ба поён ва ба миёна (ба реша) мешавад
  useEffect(() => { const e = box.current; if (e) { e.scrollTop = e.scrollHeight; e.scrollLeft = (e.scrollWidth - e.clientWidth) / 2; e.scrollIntoView({ block: 'nearest' }); } }, []);
  const sum = (n: DistNode): number => (n.type === 'group' ? n.children.reduce((t, c) => t + sum(c), 0) : balances?.[n.accountId] ?? 0);
  const money = (v: number) => (hidden ? '••••' : fmt(Math.round(v)));
  const node = (n: DistNode): ReactNode => {
    const isRoot = n.id === root.id;
    let name: string; let icon: ReactNode; let bg: string | undefined; let off = false;
    if (n.type === 'group') { name = n.title; icon = n.icon; } else {
      const def = accounts.find(a => a.id === n.accountId);
      if (!def || def.archived) return null;
      name = def.name; icon = ACCOUNTS[n.accountId]?.icon ?? def.icon; bg = CARD_COLORS[n.accountId]; off = isOff(n.accountId);
    }
    const kids = n.type === 'group' ? n.children.map(node).filter(Boolean) : [];
    const share = effectiveShareNode(root, n.id);
    const cls = `td-box${isRoot ? ' root' : n.type === 'group' ? ' grp' : ''}${off ? ' off' : ''}`;
    const clickable = !!onPick && !off && !(balances && n.type === 'group');
    return (
      <div className="td-node">
        <button type="button" className={cls} disabled={!clickable} onClick={() => onPick?.(n)}>
          <i style={bg ? { background: bg } : undefined}>{icon}</i>
          <span><b>{name}</b><small>{isRoot && balances ? '' : isRoot ? '100%' : `${n2(n.percent)}%`}</small></span>
          {balances ? <em className="bal">{money(sum(n))}</em> : !isRoot && <em>{n2(share)}%</em>}
        </button>
        {kids.length > 0 && (
          <div className="td-kids">
            {kids.map((k, i) => <div className="td-kid" key={i}>{k}</div>)}
          </div>
        )}
      </div>
    );
  };
  return <div className="td-scroll" ref={box}><div className="td">{node(root)}</div></div>;
}
