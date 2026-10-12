import { ReactNode, useState } from 'react';
import { tap, warn } from '../haptic';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

/** Вуруди PIN: 4 нуқта + тугмачаҳои рақамӣ. `onDone` → true (дуруст) ё false (нодуруст: ларзиш ва тозакунӣ). */
export default function PinPad({ title, hint, error, extra, onDone, disabled = false }: {
  title: string; hint?: string; error?: string; extra?: ReactNode; disabled?: boolean;
  onDone: (pin: string) => Promise<boolean | void> | boolean | void;
}) {
  const [pin, setPin] = useState('');
  const [shake, setShake] = useState(false);
  const [busy, setBusy] = useState(false);

  const press = async (k: string) => {
    if (busy || disabled) return;
    tap();
    if (k === 'back') { setPin(p => p.slice(0, -1)); return; }
    const next = (pin + k).slice(0, 4);
    setPin(next);
    if (next.length < 4) return;
    setBusy(true);
    const ok = await onDone(next);
    if (ok === false) {
      warn();
      setShake(true);
      setTimeout(() => { setShake(false); setPin(''); setBusy(false); }, 420);
    } else { setPin(''); setBusy(false); }
  };

  return (
    <div className="pp">
      <h2>{title}</h2>
      <p className={error ? 'pp-hint err' : 'pp-hint'}>{error || hint || ' '}</p>
      <div className={shake ? 'pp-dots shake' : 'pp-dots'} aria-label={`${pin.length}/4`}>
        {[0, 1, 2, 3].map(i => <i key={i} className={i < pin.length ? 'on' : ''} />)}
      </div>
      <div className="pp-keys">
        {KEYS.map(k => <button key={k} type="button" onClick={() => void press(k)} disabled={disabled}>{k}</button>)}
        <span className="pp-extra">{extra}</span>
        <button type="button" onClick={() => void press('0')} disabled={disabled}>0</button>
        <button type="button" className="pp-back" onClick={() => void press('back')} aria-label="⌫" disabled={disabled}>
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden><path d="M21 5H9l-6 7 6 7h12V5zM15 9l-4 6M11 9l4 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>
    </div>
  );
}
