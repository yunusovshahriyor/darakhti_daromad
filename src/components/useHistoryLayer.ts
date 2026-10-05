import { useEffect, useRef } from 'react';

interface Layer {
  cb: () => void;
  popped: boolean;
}

const stack: Layer[] = [];
let skip = 0;

// Як шунавандаи ягона: тугмаи «Бозгашт» танҳо қабати болоиро мебандад.
window.addEventListener('popstate', () => {
  if (skip > 0) {
    skip--;
    return;
  }
  const top = stack[stack.length - 1];
  if (top) {
    top.popped = true;
    top.cb();
  }
});

/**
 * Қабат (варақа, зерсаҳифа, саҳифаи ҳисоб): тугмаи «Бозгашт»-и телефон
 * онро мебандад, на тамоми барномаро. Қабатҳо метавонанд рӯи ҳам бошанд.
 */
export function useHistoryLayer(active: boolean, onBack: () => void) {
  const cb = useRef(onBack);
  cb.current = onBack;

  useEffect(() => {
    if (!active) return;
    const layer: Layer = { cb: () => cb.current(), popped: false };
    stack.push(layer);
    history.pushState({ layer: true }, '');
    return () => {
      const i = stack.indexOf(layer);
      if (i >= 0) stack.splice(i, 1);
      if (!layer.popped) {
        skip++;
        history.back();
      }
    };
  }, [active]);
}
