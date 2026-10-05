import { useEffect, useRef } from 'react';

/**
 * Тугмаи «Бозгашт»-и телефон қабатро (варақа, зерсаҳифа) мебандад,
 * на тамоми барномаро.
 */
export function useHistoryLayer(active: boolean, onBack: () => void) {
  const cb = useRef(onBack);
  cb.current = onBack;

  useEffect(() => {
    if (!active) return;
    history.pushState({ layer: true }, '');
    const handler = () => cb.current();
    window.addEventListener('popstate', handler);
    return () => {
      window.removeEventListener('popstate', handler);
      if (history.state?.layer) history.back();
    };
  }, [active]);
}
