import type { ReactNode } from 'react';

export interface Seg {
  id: string;
  value: number;
  color: string;
}

const R = 44;
const C = 2 * Math.PI * R;

export default function Donut({ segs, label, sub }: { segs: Seg[]; label: ReactNode; sub: string }) {
  const total = segs.reduce((s, x) => s + x.value, 0);
  let acc = 0;
  return (
    <svg viewBox="0 0 120 120" className="donut" role="img" aria-label="Диаграмма">
      <circle cx="60" cy="60" r={R} fill="none" stroke="var(--border)" strokeWidth="16" />
      {total > 0 && segs.map(s => {
        const len = (s.value / total) * C;
        const gap = segs.length > 1 ? 1.5 : 0;
        const el = (
          <circle key={s.id} cx="60" cy="60" r={R} fill="none" stroke={s.color} strokeWidth="16"
            strokeDasharray={`${Math.max(0, len - gap)} ${C}`} strokeDashoffset={-acc}
            transform="rotate(-90 60 60)" />
        );
        acc += len;
        return el;
      })}
      <text x="60" y="58" textAnchor="middle" className="donut-val">{label}</text>
      <text x="60" y="74" textAnchor="middle" className="donut-sub">{sub}</text>
    </svg>
  );
}
