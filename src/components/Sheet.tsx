import { ReactNode, useEffect } from 'react';
import { CloseIcon } from './Icons';
import { useHistoryLayer } from './useHistoryLayer';

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/** Варақаи поёнӣ (bottom sheet) мисли барномаҳои мобилӣ. */
export default function Sheet({ title, onClose, children }: Props) {
  useHistoryLayer(true, onClose);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label={title} onClick={e => e.stopPropagation()}>
        <div className="grabber" />
        <div className="sheet-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Пӯшидан"><CloseIcon /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
