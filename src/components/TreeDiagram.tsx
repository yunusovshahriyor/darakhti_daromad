import type { ReactNode } from 'react';
import { CARD_COLORS, ACCOUNTS, effectiveShareNode, fmt, isRemainderNode } from '../model';
import type { AccountDef, DistNode } from '../types';

const n2 = (v: number) => fmt(Math.round(v * 100) / 100);

/** Диаграммаи дарахтӣ аз чап ба рост: реша → гурӯҳҳо → ҳисобҳо. Пахши қуттӣ — таҳрир. */
export default function TreeDiagram({ root, accounts, isOff, onEdit }: {
  root: DistNode;
  accounts: AccountDef[];
  isOff: (accountId: string) => boolean;
  onEdit: (id: string) => void;
}) {
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
    return (
      <div className="td-node">
        <button type="button" className={cls} disabled={off} onClick={() => onEdit(n.id)}>
          <i style={bg ? { background: bg } : undefined}>{icon}</i>
          <span><b>{name}</b><small>{isRoot ? '100%' : `${n2(n.percent)}%`}{!isRoot && isRemainderNode(root, n.id) && <> · <span>боқимонда</span></>}</small></span>
          {!isRoot && <em>{n2(share)}%</em>}
        </button>
        {kids.length > 0 && (
          <div className="td-kids">
            {kids.map((k, i) => <div className="td-kid" key={i}>{k}</div>)}
          </div>
        )}
      </div>
    );
  };
  return <div className="td-scroll"><div className="td">{node(root)}</div></div>;
}
