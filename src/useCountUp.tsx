import { useEffect, useRef, useState } from 'react';
import { fmt } from './model';

const reduced = () => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } };
const ease = (t: number) => 1 - Math.pow(1 - t, 4); // тез оғоз, нарм анҷом: мисли ҳисобкунаки молиявӣ

/**
 * Маблағ бо аниматсия «мешуморад»: дафъаи аввал аз 0 (баъди splash), баъд аз қимати пештара ба нав.
 * Ҳангоми шумориш рақами бутун нишон дода мешавад, дар охир қимати дақиқ (бо копейка).
 */
export function useCountUp(target: number, duration = 900): number {
  const [v, setV] = useState(() => (reduced() ? target : 0));
  const cur = useRef(reduced() ? target : 0);
  const first = useRef(true);

  useEffect(() => {
    if (reduced()) { cur.current = target; setV(target); return; }
    const from = cur.current;
    const delay = first.current && document.documentElement.classList.contains('boot') ? 340 : 0;
    first.current = false;
    if (from === target) { setV(target); return; }
    let raf = 0;
    let start = 0;
    const dur = from === 0 ? duration : Math.min(duration, 650);
    const tick = (now: number) => {
      if (!start) start = now;
      const t = Math.min(1, (now - start) / dur);
      const x = t >= 1 ? target : Math.round(from + (target - from) * ease(t));
      cur.current = x;
      setV(x);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    const timer = setTimeout(() => { raf = requestAnimationFrame(tick); }, delay);
    return () => { clearTimeout(timer); cancelAnimationFrame(raf); };
  }, [target, duration]);

  return v;
}

/** Маълумоти аниматсияшаванда: `<Count value={x} hidden={…} />`. */
export function Count({ value, hidden = false }: { value: number; hidden?: boolean }) {
  const v = useCountUp(value);
  return hidden ? <span className="amt-blur" aria-label="•••">8 888</span> : <>{fmt(v)}</>;
}
