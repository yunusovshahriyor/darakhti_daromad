import { PointerEvent, ReactNode, useRef, useState } from 'react';

const W = 88;

/** Сатр, ки бо суфтан ба чап тугмаи «Нест» нишон медиҳад (мисли барномаҳои мобилӣ). */
export default function SwipeRow({ children, onDelete }: { children: ReactNode; onDelete: () => void }) {
  const [x, setX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ x: number; base: number } | null>(null);
  const moved = useRef(false);

  const down = (e: PointerEvent<HTMLDivElement>) => {
    start.current = { x: e.clientX, base: x };
    moved.current = false;
  };

  const move = (e: PointerEvent<HTMLDivElement>) => {
    const s = start.current;
    if (!s) return;
    const dx = e.clientX - s.x;
    if (!moved.current && Math.abs(dx) > 8) {
      moved.current = true;
      setDragging(true);
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    if (moved.current) setX(Math.max(-W, Math.min(0, s.base + dx)));
  };

  const up = () => {
    if (!start.current) return;
    start.current = null;
    setDragging(false);
    if (moved.current) setX(x < -W / 2 ? -W : 0);
  };

  // Пас аз суфтан ё ҳангоми кушода будан, зеро клик ҳисоб нашавад
  const clickCapture = (e: React.MouseEvent) => {
    if (moved.current) {
      moved.current = false;
      e.stopPropagation();
    } else if (x < 0) {
      setX(0);
      e.stopPropagation();
    }
  };

  return (
    <div className="swipe">
      <button className="swipe-del" onClick={onDelete} tabIndex={x < 0 ? 0 : -1}>Нест</button>
      <div
        className="swipe-body"
        style={{ transform: `translateX(${x}px)`, transition: dragging ? 'none' : 'transform .2s ease' }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onClickCapture={clickCapture}
      >
        {children}
      </div>
    </div>
  );
}
