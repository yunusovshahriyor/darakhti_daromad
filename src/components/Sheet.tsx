import { ReactNode, TouchEvent, useEffect, useRef, useState } from 'react';
import { CloseIcon } from './Icons';
import { useHistoryLayer } from './useHistoryLayer';

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Нимкушода кушода мешавад; бо кашидан ба боло пурра мешавад, бо кашидан ба поён кӯтоҳ ё баста мешавад. */
  detents?: boolean;
  /** Зерном: сатри хурд дар зери сарлавҳа. */
  eyebrow?: string;
  /** Варақаи баланд (92%). */
  tall?: boolean;
}

/** Варақаи поёнӣ (bottom sheet) мисли барномаҳои мобилӣ. */
export default function Sheet({ title, onClose, children, detents = false, eyebrow, tall = false }: Props) {
  useHistoryLayer(true, onClose);
  const [full, setFull] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const touch = useRef<{ y: number; atTop: boolean; handled: boolean } | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const onTouchStart = (e: TouchEvent) => {
    if (!detents) return;
    touch.current = {
      y: e.touches[0].clientY,
      atTop: (scrollRef.current?.scrollTop ?? 0) <= 0,
      handled: false,
    };
  };

  const onTouchMove = (e: TouchEvent) => {
    const t = touch.current;
    if (!t || t.handled) return;
    const dy = e.touches[0].clientY - t.y;
    if (!full && dy < -12) {
      setFull(true);           // ба боло кашидан → пурра
      t.handled = true;
    } else if (full && t.atTop && dy > 12) {
      setFull(false);          // дар боло ба поён кашидан → нимкушода
      t.handled = true;
    } else if (!full && dy > 70) {
      onClose();               // дар ҳолати нимкушода ба поён кашидан → пӯшидан
      t.handled = true;
    }
  };

  const onTouchEnd = () => { touch.current = null; };

  const cls = `sheet${detents ? ' detent' : ''}${full ? ' full' : ''}${tall ? ' tall' : ''}`;

  return (
    <div className="backdrop" onClick={onClose}>
      <div className={cls} role="dialog" aria-label={title} onClick={e => e.stopPropagation()}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} onTouchCancel={onTouchEnd}>
        <div className="grabber" onClick={detents ? () => setFull(f => !f) : undefined} />
        <div className="sheet-head">
          <div><h2>{title}</h2>{eyebrow && <small className="eyebrow">{eyebrow}</small>}</div>
          <button className="icon-btn" onClick={onClose} aria-label="Пӯшидан"><CloseIcon /></button>
        </div>
        {detents ? <div className="sheet-scroll" ref={scrollRef}>{children}</div> : children}
      </div>
    </div>
  );
}
