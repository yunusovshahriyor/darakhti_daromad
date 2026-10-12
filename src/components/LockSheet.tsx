import { useEffect, useState } from 'react';
import { currentLang } from '../i18n';
import { autoHide, bioAvailable, bioOff, bioOn, bioRegister, clearLock, getLock, isLockOn, setAutoHide, setLockAfter, setPin, verifyPin, waitSeconds } from '../lock';
import { LOCK } from '../lockText';
import { success } from '../haptic';
import PinPad from './PinPad';
import Sheet from './Sheet';

type Step = 'view' | 'new1' | 'new2' | 'verify-change' | 'verify-off';
const AFTER = [0, 30, 60, 300];

/** Танзимоти қулф: фаъол/хомӯш, PIN, ангушт/чеҳра, вақти қулф, пинҳон кардани маблағ ҳангоми кушодан. */
export default function LockSheet({ onClose, onChange }: { onClose: () => void; onChange: () => void }) {
  const t = LOCK[currentLang()];
  const [on, setOn] = useState(isLockOn());
  const [step, setStep] = useState<Step>('view');
  const [first, setFirst] = useState('');
  const [err, setErr] = useState('');
  const [after, setAfter] = useState(getLock()?.after ?? 0);
  const [bio, setBio] = useState(bioOn());
  const [bioOk, setBioOk] = useState(false);
  const [bioErr, setBioErr] = useState('');
  const [hide, setHide] = useState(autoHide());
  useEffect(() => { void bioAvailable().then(setBioOk); }, []);

  const sync = () => { setOn(isLockOn()); onChange(); };

  if (step === 'new1' || step === 'new2') {
    return (
      <Sheet title={t.title} onClose={onClose}>
        <PinPad key={step} title={step === 'new1' ? t.newPin : t.repeatPin} error={err}
          onDone={async pin => {
            if (step === 'new1') { setFirst(pin); setErr(''); setStep('new2'); return true; }
            if (pin !== first) { setErr(t.mismatch); setStep('new1'); return false; }
            await setPin(pin); success(); setErr(''); setStep('view'); sync(); return true;
          }} />
      </Sheet>
    );
  }
  if (step === 'verify-change' || step === 'verify-off') {
    return (
      <Sheet title={t.title} onClose={onClose}>
        <PinPad title={step === 'verify-off' ? t.disableConfirm : t.enterPin} error={err}
          onDone={async pin => {
            if (waitSeconds() > 0) { setErr(t.wait.replace('{0}', String(waitSeconds()))); return false; }
            if (!(await verifyPin(pin))) { setErr(t.wrong); return false; }
            setErr('');
            if (step === 'verify-off') { clearLock(); setBio(false); setStep('view'); sync(); } else setStep('new1');
            return true;
          }} />
      </Sheet>
    );
  }

  return (
    <Sheet title={t.title} onClose={onClose}>
      <div className="fb">
        <p className="fb-lead">{t.lead}</p>
        <div className="lock-status">
          <span className={on ? 'dot on' : 'dot'} /> {on ? t.on : t.off}
        </div>
        {!on ? (
          <button className="btn big" onClick={() => { setErr(''); setStep('new1'); }}>{t.enable}</button>
        ) : (
          <>
            {bioOk && (
              <label className="fb-switch look-haptic">
                <span className="grow"><b>{t.bio}</b><small>{bioErr || t.bioNote}</small></span>
                <input type="checkbox" checked={bio} onChange={async e => {
                  if (!e.target.checked) { bioOff(); setBio(false); setBioErr(''); return; }
                  const ok = await bioRegister();
                  setBio(ok); setBioErr(ok ? '' : t.bioFail); if (ok) success();
                }} />
                <i aria-hidden />
              </label>
            )}
            <div className="fb-field">
              <span>{t.after}</span>
              <div className="lock-chips">
                {AFTER.map((s, i) => (
                  <button key={s} className={after === s ? 'chip on' : 'chip'} onClick={() => { setAfter(s); setLockAfter(s); }}>{t.afters[i]}</button>
                ))}
              </div>
            </div>
            <button className="btn secondary" onClick={() => { setErr(''); setStep('verify-change'); }}>{t.change}</button>
            <button className="btn danger" onClick={() => { setErr(''); setStep('verify-off'); }}>{t.disable}</button>
          </>
        )}
        <label className="fb-switch look-haptic">
          <span className="grow"><b>{t.autoHide}</b><small>{t.autoHideNote}</small></span>
          <input type="checkbox" checked={hide} onChange={e => { setHide(e.target.checked); setAutoHide(e.target.checked); }} />
          <i aria-hidden />
        </label>
      </div>
    </Sheet>
  );
}
