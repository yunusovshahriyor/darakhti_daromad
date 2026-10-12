import { useEffect, useState } from 'react';
import { CURRENCIES, convertState, defOf, fetchRate, setActiveCode } from '../currency';
import type { Rate } from '../currency';
import { currentLang } from '../i18n';
import { balancesOf, fmt } from '../model';
import { addSnapshot } from '../storage';
import type { Props } from '../views/props';
import Sheet from './Sheet';

/** Дар ин варақа «смн» бояд ҳамеша ҳамчун TJS нишон дода шавад (translator «смн»-ро ба асъори фаъол иваз мекунад). */
const lbl = (code: string) => (code === 'TJS' ? 'TJS' : defOf(code).label);

const NAME_IDX = { tg: 0, ru: 1, en: 2 } as const;

/** Интихоби асъор. Агар асъор иваз шавад: қурби имрӯза гирифта мешавад ва ҳамаи маблағҳо ба он табдил меёбанд. */
export default function CurrencySheet({ state, setState, onClose }: Props & { onClose: () => void }) {
  const cur = state.currency ?? 'TJS';
  const [target, setTarget] = useState<string | null>(null);
  const [rate, setRate] = useState<Rate | null>(null);
  const [text, setText] = useState('');
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const idx = NAME_IDX[currentLang()];

  useEffect(() => {
    if (!target) return;
    let live = true;
    setRate(null); setFailed(false); setText('');
    fetchRate(cur, target)
      .then(r => { if (live) { setRate(r); setText(String(Math.round(r.rate * 1e6) / 1e6)); } })
      .catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [target, cur]);

  const k = parseFloat(text.replace(',', '.')) || 0;
  const bal = Object.values(balancesOf(state)).reduce((s, v) => s + v, 0);
  const to = target ? defOf(target) : null;

  const apply = async () => {
    if (!target || !(k > 0)) return;
    setBusy(true);
    await addSnapshot(JSON.stringify(state)); // нусхаи захиравӣ пеш аз табдил
    setState(s => convertState(s, k, target));
    setActiveCode(target);
    setTimeout(() => location.reload(), 800);
  };

  if (!target || !to) {
    return (
      <Sheet title="Асъор" onClose={onClose}>
        <p className="note">Ҳамаи маблағҳо дар як асъор нигоҳ дошта мешаванд. Агар асъорро иваз кунед, ҳамаи маълумот бо қурби имрӯза табдил меёбад.</p>
        <div className="cells">
          {CURRENCIES.map(c => (
            <button key={c.code} className="cell tap" onClick={() => (c.code === cur ? onClose() : setTarget(c.code))}>
              <div className="ic cur-ic">{lbl(c.code)}</div>
              <div className="grow"><b>{c.name[idx]}</b><small>{c.code}</small></div>
              {c.code === cur && <span className="lang-on">✓</span>}
            </button>
          ))}
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet title="Иваз кардани асъор" onClose={onClose}>
      <div className="cur-flow">
        <span>{lbl(cur)}</span><i>→</i><span>{lbl(to.code)}</span>
      </div>
      {!rate && !failed && <p className="note">Қурби имрӯза гирифта истодааст…</p>}
      {failed && <div className="alert danger">Қурбро аз интернет гирифта нашуд. Онро дастӣ нависед ё баъдтар кӯшиш кунед.</div>}
      {(rate || failed) && (
        <>
          <label className="guide-calc">
            <span>1 {cur} = ? {target}</span>
            <input type="text" inputMode="decimal" value={text} onChange={e => setText(e.target.value)} />
          </label>
          {rate && <p className="note">{`Қурби расмӣ: ${rate.date} · ${rate.source}`}</p>}
          {k > 0 && (
            <div className="preview">
              <b>Пас аз табдил:</b>
              <div className="row"><span>Ҷамъи маблағ дар ҳисобҳо</span><span>{fmt(bal)} {lbl(cur)} → {fmt(Math.round(bal * k * 100) / 100)} {lbl(to.code)}</span></div>
            </div>
          )}
          <p className="note">Даромад, хароҷот, қарзҳо, орзуҳо ва ҳамаи ҳисобҳо бо қурби имрӯза табдил меёбанд. Пеш аз ин нусхаи захиравӣ сохта мешавад. Баъдан маблағҳо тағйир намеёбанд.</p>
          <button className="btn big" disabled={!(k > 0) || busy} onClick={() => void apply()}>
            {busy ? 'Табдил шуда истодааст…' : 'Табдил додан'}
          </button>
          <button className="btn secondary" onClick={() => setTarget(null)} disabled={busy}>Қафо</button>
        </>
      )}
    </Sheet>
  );
}
