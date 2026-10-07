import { useEffect, useMemo } from 'react';

const PIECES = ['🎉', '✨', '🎊', '⭐', '💚', '🌟'];

/** Ҷашни хариди орзу: конфетти ва паёми калон. Бо пахш ё пас аз чанд сония пӯшида мешавад. */
export default function Celebrate({ title, text, onClose }: { title: string; text: string; onClose: () => void }) {
  const pieces = useMemo(() => Array.from({ length: 34 }, (_, i) => ({
    ch: PIECES[i % PIECES.length],
    left: Math.round(Math.random() * 100),
    delay: Math.round(Math.random() * 900) / 1000,
    dur: 2200 + Math.round(Math.random() * 1600),
    size: 16 + Math.round(Math.random() * 18),
  })), []);

  useEffect(() => {
    navigator.vibrate?.([40, 50, 40, 50, 80]);
    const t = setTimeout(onClose, 4200);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="celebrate" onClick={onClose} role="dialog" aria-label={title}>
      {pieces.map((p, i) => (
        <span key={i} className="confetti"
          style={{ left: `${p.left}%`, fontSize: p.size, animationDelay: `${p.delay}s`, animationDuration: `${p.dur}ms` }}>
          {p.ch}
        </span>
      ))}
      <div className="cel-card">
        <div className="cel-ic">🏆</div>
        <h2>{title}</h2>
        <p>{text}</p>
        <small>Барои пӯшидан пахш кунед</small>
      </div>
    </div>
  );
}
