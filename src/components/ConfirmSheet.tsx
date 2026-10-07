import { ReactNode, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import Sheet from './Sheet';

export interface ConfirmOptions {
  title?: string;
  text: string;
  /** Навиштаи тугмаи тасдиқ. */
  ok?: string;
  /** Амали хатарнок: тугмаи тасдиқ сурх мешавад. */
  danger?: boolean;
}

/**
 * Тасдиқи худсохт (ба ҷойи window.confirm): варақаи поёнӣ бо ду тугма.
 * `const [ask, dialog] = useConfirm();` — `dialog`-ро дар JSX гузоред, `await ask({...})` ҷавоби true/false медиҳад.
 */
export function useConfirm(): readonly [(o: ConfirmOptions) => Promise<boolean>, ReactNode] {
  const [req, setReq] = useState<{ o: ConfirmOptions; resolve: (v: boolean) => void } | null>(null);

  const ask = useCallback(
    (o: ConfirmOptions) => new Promise<boolean>(resolve => setReq({ o, resolve })),
    [],
  );

  const finish = (v: boolean) => {
    req?.resolve(v);
    setReq(null);
  };

  const node = req
    ? createPortal(
      <Sheet title={req.o.title ?? 'Тасдиқ'} onClose={() => finish(false)}>
        <p className="confirm-text">{req.o.text}</p>
        <div className="confirm-actions">
          <button type="button" className="btn secondary" onClick={() => finish(false)}>Бекор кардан</button>
          <button type="button" className={req.o.danger ? 'btn big danger-fill' : 'btn big'} onClick={() => finish(true)}>
            {req.o.ok ?? 'Идома додан'}
          </button>
        </div>
      </Sheet>,
      document.body,
    )
    : null;

  return [ask, node] as const;
}
