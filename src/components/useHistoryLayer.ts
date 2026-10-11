import { useEffect, useRef } from 'react';

interface Layer {
  cb: () => void;
  popped: boolean;
}

const stack: Layer[] = [];
let skip = 0;
let rootHandler: (() => void) | null = null;

/** Тугмаи «Бозгашт» вақте ягон қабат (варақа/зерсаҳифа) кушода нест: тавассути ин коркунанда идора мешавад. */
export const setRootBackHandler = (fn: (() => void) | null) => { rootHandler = fn; };

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
  } else {
    rootHandler?.();
  }
});

/**
 * Қабат (варақа, зерсаҳифа, саҳифаи ҳисоб): тугмаи «Бозгашт»-и телефон
 * онро мебандад, на тамоми барномаро. Қабатҳо метавонанд рӯи ҳам бошанд.
 */
export function useHistoryLayer(active: boolean, onBack: () => void, reuse?: { current: boolean }) {
  const cb = useRef(onBack);
  cb.current = onBack;

  useEffect(() => {
    if (!active) return;
    const layer: Layer = { cb: () => cb.current(), popped: false };
    stack.push(layer);
    let pushed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Пас аз навсозии саҳифа ҳамон сабти таърих аллакай қабат аст: дубора илова намекунем.
    const push = (tries = 0) => {
      // Агар қабати дигар ҳамин лаҳза баста шуда истодааст (history.back ҳанӯз иҷро нашуд),
      // интизор мешавем: вагарна back-и кӯҳна қабати нав (поп шудаи нав)-ро нест мекунад.
      if (skip > 0 && tries < 20) { timer = setTimeout(() => push(tries + 1), 40); return; }
      history.pushState({ layer: true }, '');
      pushed = true;
    };
    if (reuse?.current) { reuse.current = false; pushed = true; }
    else push();
    return () => {
      if (timer) clearTimeout(timer);
      const i = stack.indexOf(layer);
      if (i >= 0) stack.splice(i, 1);
      if (!layer.popped && pushed) {
        skip++;
        history.back();
      }
    };
  }, [active]);
}
