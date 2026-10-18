import { useState } from 'react';
import { tap } from '../haptic';
import Sheet from './Sheet';

const OPS = ['+', '−', '×', '÷'];

/** Ҳисоби ифода бе eval: аввал × ва ÷, баъд + ва −. */
function calc(expr: string): number | null {
  const tokens = expr.match(/\d+(?:\.\d*)?|\.\d+|[+−×÷]/g);
  if (!tokens || tokens.join('') !== expr) return null;
  const nums: number[] = [];
  const ops: string[] = [];
  let i = 0;
  if (tokens[0] === '−') { tokens.shift(); tokens[0] = `-${tokens[0] ?? ''}`; }
  for (; i < tokens.length; i++) {
    if (i % 2 === 0) {
      const n = Number(tokens[i]);
      if (!Number.isFinite(n) || OPS.includes(tokens[i])) return null;
      nums.push(n);
    } else if (OPS.includes(tokens[i])) ops.push(tokens[i]);
    else return null;
  }
  if (nums.length !== ops.length + 1) return null;
  const n2: number[] = [nums[0]];
  const o2: string[] = [];
  ops.forEach((op, k) => {
    const b = nums[k + 1];
    if (op === '×') n2[n2.length - 1] *= b;
    else if (op === '÷') n2[n2.length - 1] = b === 0 ? NaN : n2[n2.length - 1] / b;
    else { o2.push(op); n2.push(b); }
  });
  let r = n2[0];
  o2.forEach((op, k) => { r = op === '+' ? r + n2[k + 1] : r - n2[k + 1]; });
  return Number.isFinite(r) ? Math.round(r * 100) / 100 : null;
}

const show = (s: string) => s.replace(/\./g, ',') || '0';
const fmtRes = (n: number) => String(n).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

const KEYS = ['C', 'back', '÷', '×', '7', '8', '9', '−', '4', '5', '6', '+', '1', '2', '3', '=', '0', ',', '00'];

/** Калкулятор: натиҷаро ба майдони маблағ мегузорад. */
export default function CalcSheet({ initial, onApply, onClose }: {
  initial: string;
  onApply: (v: string) => void;
  onClose: () => void;
}) {
  const [expr, setExpr] = useState(initial);
  const res = calc(expr);
  const hasOp = /[+−×÷]/.test(expr.replace(/^−/, ''));

  const press = (k: string) => {
    tap();
    if (k === 'C') return setExpr('');
    if (k === 'back') return setExpr(expr.slice(0, -1));
    if (k === '=') return res !== null && setExpr(String(res));
    if (OPS.includes(k)) {
      if (!expr) return k === '−' ? setExpr('−') : undefined;
      const last = expr.slice(-1);
      if (OPS.includes(last)) return setExpr(expr.length > 1 ? expr.slice(0, -1) + k : expr);
      return setExpr(expr + k);
    }
    const cur = expr.split(/[+−×÷]/).pop() ?? '';
    if (k === ',') return cur.includes('.') ? undefined : setExpr(expr + (cur ? '.' : '0.'));
    if (cur.length >= 12) return;
    if (k === '00') return cur && cur !== '0' ? setExpr(expr + '00') : undefined;
    setExpr(cur === '0' ? expr.slice(0, -1) + k : expr + k);
  };

  const apply = () => {
    if (res === null || res <= 0) return;
    onApply(String(res));
    onClose();
  };

  return (
    <Sheet title="Калкулятор" onClose={onClose}>
      <div className="calc-disp">
        <div className="calc-expr">{show(expr)}</div>
        <div className="calc-res">{res !== null && hasOp ? `= ${fmtRes(res)}` : ' '}</div>
      </div>
      <div className="calc-pad">
        {KEYS.map(k => (
          <button key={k} type="button"
            className={`key calc-k${OPS.includes(k) || k === '=' ? ' op' : ''}${k === '0' ? ' z' : ''}`}
            onClick={() => press(k)} aria-label={k === 'back' ? 'Нест кардани рақам' : undefined}>
            {k === 'back' ? '⌫' : k}
          </button>
        ))}
      </div>
      <button type="button" className="btn" disabled={res === null || res <= 0} onClick={apply}>
        Гузоштани натиҷа
      </button>
    </Sheet>
  );
}
