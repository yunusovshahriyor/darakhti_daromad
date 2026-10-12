import { useEffect, useState } from 'react';
import { brand } from '../brand';
import { currentLang } from '../i18n';
import { bioOn, bioVerify, verifyPin, waitSeconds } from '../lock';
import { LOCK } from '../lockText';
import { success } from '../haptic';
import { signOutAndWipe, useSync } from '../sync';
import { wipeAllLocal } from '../storage';
import PinPad from './PinPad';

/** Экрани қулф: PIN ё ангушт/чеҳра. Тамоми барномаро мепӯшонад. */
export default function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const t = LOCK[currentLang()];
  const sync = useSync();
  const [err, setErr] = useState('');
  const [wait, setWait] = useState(waitSeconds());
  const [forgot, setForgot] = useState(false);
  const bio = bioOn();

  useEffect(() => {
    if (!wait) return;
    const i = setInterval(() => { const w = waitSeconds(); setWait(w); if (!w) setErr(''); }, 500);
    return () => clearInterval(i);
  }, [wait]);

  const done = () => { success(); onUnlock(); };
  const tryBio = async () => { if (await bioVerify()) done(); };
  useEffect(() => { if (bio) void tryBio(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onPin = async (pin: string) => {
    if (waitSeconds() > 0) { setWait(waitSeconds()); return false; }
    if (await verifyPin(pin)) { done(); return true; }
    const w = waitSeconds();
    setWait(w);
    setErr(w ? t.wait.replace('{0}', String(w)) : t.wrong);
    return false;
  };

  const clearAll = async () => {
    const signed = sync.configured && sync.status !== 'signedout' && sync.status !== 'off' && sync.email !== '';
    if (signed) { try { await signOutAndWipe(); } catch { /* ignore */ } return; }
    await wipeAllLocal();
    location.reload();
  };

  if (forgot) {
    return (
      <div className="lock">
        <div className="pp">
          <img className="lock-logo" src={brand().logo} alt="" />
          <h2>{t.forgotTitle}</h2>
          <p className="pp-hint" style={{ maxWidth: 320 }}>{t.forgotText}</p>
          <div className="lock-actions">
            <button className="btn big danger-fill" onClick={() => void clearAll()}>{t.forgotOk}</button>
            <button className="btn secondary" onClick={() => setForgot(false)}>{t.cancel}</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="lock" role="dialog" aria-modal="true" aria-label={t.title}>
      <img className="lock-logo" src={brand().logo} alt="" />
      <PinPad title={t.unlockTitle} hint={wait ? t.wait.replace('{0}', String(wait)) : undefined} error={err && !wait ? err : undefined}
        disabled={wait > 0} onDone={onPin}
        extra={bio ? <button type="button" className="pp-bio" onClick={() => void tryBio()} aria-label={t.bioUse}>
          <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden><path d="M12 11v4M8 12a4 4 0 018 0v3M5 12a7 7 0 0114 0v2M9 20c-1-2-1-4-1-6M15 20c1-2 1-4 1-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
        </button> : null} />
      <button className="ob-link" onClick={() => setForgot(true)}>{t.forgot}</button>
    </div>
  );
}
