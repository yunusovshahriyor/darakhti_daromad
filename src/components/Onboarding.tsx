import { TouchEvent, useRef, useState } from 'react';
import { GUIDE } from '../guideText';
import { LANGS, currentLang, setLang } from '../i18n';
import { brand } from '../brand';
import { ONBOARD } from '../onboardText';

type Mode = 'system' | 'free';

/** Муқаддимаи кӯтоҳ (4 экран): хуш омадед, чӣ тавр кор мекунад, интихоби услуб, оғоз. */
export default function Onboarding({ mode, onPick, onClose, onGuide, onAddIncome, onTelegram }: {
  mode: Mode | undefined;
  onPick: (m: Mode) => void;
  onClose: () => void;
  onGuide: () => void;
  onAddIncome: () => void;
  onTelegram: () => void;
}) {
  const lang = currentLang();
  const t = ONBOARD[lang];
  const g = GUIDE[lang];
  const [i, setI] = useState(0);
  const touch = useRef<number | null>(null);
  const last = 3;
  const chosen = mode !== undefined;
  // Дар экрани 3 бояд услуб интихоб шавад (пешфарз — системаи Давлатов, агар корбар ҳеҷ чиз нагирад)
  const go = (n: number) => setI(Math.max(0, Math.min(last, n)));
  const next = () => { if (i === 2 && !chosen) onPick('system'); go(i + 1); };
  const skip = () => { if (i < 2) go(2); else { if (!chosen) onPick('system'); onClose(); } };
  const finish = (after?: () => void) => { if (!chosen) onPick('system'); onClose(); after?.(); };

  const onStart = (e: TouchEvent) => { touch.current = e.touches[0].clientX; };
  const onEnd = (e: TouchEvent) => {
    if (touch.current === null) return;
    const dx = e.changedTouches[0].clientX - touch.current;
    touch.current = null;
    if (Math.abs(dx) > 50) { if (dx < 0) next(); else go(i - 1); }
  };

  return (
    <div className="ob" role="dialog" aria-modal="true" onTouchStart={onStart} onTouchEnd={onEnd}>
      <div className="ob-top">
        {i > 0 ? <button className="ob-link" onClick={() => go(i - 1)}>‹ {t.back}</button> : <span />}
        {i < last && <button className="ob-link" onClick={skip}>{t.skip}</button>}
      </div>

      <div className="ob-track" style={{ transform: `translateX(-${i * 100}%)` }}>
        <section className="ob-slide">
          <img className="ob-logo" src={brand().logo} alt={brand().name} />
          <h1>{t.s1[0]}</h1>
          <p>{t.s1[1]}</p>
          <div className="ob-langs" role="group" aria-label={t.lang}>
            {LANGS.map(l => (
              <button key={l.id} className={l.id === lang ? 'on' : ''} onClick={() => l.id !== lang && setLang(l.id)}>{l.name}</button>
            ))}
          </div>
        </section>

        <section className="ob-slide">
          <h1>{t.s2[0]}</h1>
          <p>{t.s2[1]}</p>
          <div className="ob-flow">
            <div className="ob-income">{t.flowIncome}</div>
            <div className="ob-arrow" aria-hidden>↓</div>
            <div className="ob-accts">
              {t.flowAccounts.map(([ic, n]) => (
                <span key={n}><i>{ic}</i>{n}</span>
              ))}
            </div>
          </div>
          <p className="ob-sub">{t.s2b}</p>
        </section>

        <section className="ob-slide">
          <h1>{t.s3[0]}</h1>
          <p>{t.s3[1]}</p>
          <div className="ob-modes">
            {g.cards.map((c, k) => {
              const m: Mode = k === 0 ? 'system' : 'free';
              return (
                <button key={m} className={mode === m ? 'ob-mode on' : 'ob-mode'} onClick={() => onPick(m)} aria-pressed={mode === m}>
                  <span className="ob-mi">{c.icon}</span>
                  <b>{c.title}</b>
                  <small>{c.text}</small>
                  <span className="ob-check">{mode === m ? '✓' : ''}</span>
                </button>
              );
            })}
          </div>
          <button className="ob-link center" onClick={() => { onClose(); onGuide(); }}>{t.s3more} ›</button>
        </section>

        <section className="ob-slide">
          <div className="ob-done">🌳</div>
          <h1>{t.s4[0]}</h1>
          <p>{t.s4[1]}</p>
          <ul className="ob-tips">
            {t.tips.map(([ic, tx]) => <li key={tx}><i>{ic}</i>{tx}</li>)}
          </ul>
          <div className="ob-actions">
            <button className="btn big" onClick={() => finish(onAddIncome)}>{t.addIncome}</button>
            <button className="btn secondary" onClick={() => finish(onTelegram)}>{t.connectTg}</button>
            <button className="ob-link center" onClick={() => finish()}>{t.open}</button>
          </div>
        </section>
      </div>

      <div className="ob-bottom">
        <div className="ob-dots" aria-hidden>
          {[0, 1, 2, 3].map(k => <i key={k} className={k === i ? 'on' : ''} />)}
        </div>
        {i < last && <button className="btn big" onClick={next} disabled={i === 2 && !chosen}>{t.next}</button>}
      </div>
    </div>
  );
}
