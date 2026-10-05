import { Children, ReactNode, useState } from 'react';
import { ChevronDownIcon } from './Icons';

/**
 * Рӯйхати фишурда: агар аз 4 зиёд бошад, танҳо 4-тои аввал нишон дода мешавад
 * ва тугмаи «Ҳамаро нишон додан / Пӯшидан» пайдо мешавад.
 */
export default function CollapsibleCells({ children, limit = 4 }: { children: ReactNode; limit?: number }) {
  const [open, setOpen] = useState(false);
  const items = Children.toArray(children);
  const long = items.length > limit;
  const shown = long && !open ? items.slice(0, limit) : items;

  return (
    <div className="cells compact">
      {shown}
      {long && (
        <button className="more-row" onClick={() => setOpen(o => !o)} aria-expanded={open}>
          {open ? 'Пӯшидан' : `Ҳамаро нишон додан (${items.length})`}
          <span className={open ? 'chev up' : 'chev'}><ChevronDownIcon /></span>
        </button>
      )}
    </div>
  );
}
