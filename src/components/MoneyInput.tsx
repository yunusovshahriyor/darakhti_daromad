import { useLayoutEffect, useRef } from 'react';

/** «1000000.5» → «1 000 000,5» (барои намоиш). */
function show(raw: string) {
  const [i = '', f] = raw.split('.');
  const int = i.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return f === undefined ? int : `${int},${f}`;
}

/** Танҳо рақам ва як нуқтаи даҳӣ (то 2 рақам). */
function clean(text: string) {
  const t = text.replace(/[\s ]/g, '').replace(',', '.').replace(/[^\d.]/g, '');
  const [i, ...rest] = t.split('.');
  const f = rest.join('').slice(0, 2);
  const int = i.replace(/^0+(?=\d)/, '').slice(0, 12);
  return rest.length ? `${int || '0'}.${f}` : int;
}

/**
 * Майдони маблағ: рақами калон бо фосила ҷудо мешавад (1 000 000). Қимат ҳамчун сатри оддӣ («1000000») нигоҳ дошта мешавад.
 */
export default function MoneyInput({ value, onChange, placeholder = '0', required }: {
  value: string;
  onChange: (raw: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const caret = useRef<number | null>(null);

  // Курсорро баъд аз форматкунӣ ба ҷои худаш (аз рӯи шумораи рақамҳо) бармегардонем
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || caret.current === null) return;
    let digits = caret.current;
    const text = el.value;
    let pos = 0;
    while (pos < text.length && digits > 0) {
      if (/[\d,]/.test(text[pos])) digits--;
      pos++;
    }
    el.setSelectionRange(pos, pos);
    caret.current = null;
  });

  return (
    <input ref={ref} type="text" inputMode="decimal" value={show(value)} placeholder={placeholder} required={required}
      onChange={e => {
        const el = e.target;
        const before = el.value.slice(0, el.selectionStart ?? el.value.length);
        caret.current = before.replace(/[^\d,.]/g, '').length;
        onChange(clean(el.value));
      }} />
  );
}
