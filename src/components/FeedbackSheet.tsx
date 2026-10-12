import { useState } from 'react';
import { lastErrors } from '../errorLog';
import { FEEDBACK } from '../feedbackText';
import { currentLang } from '../i18n';
import { inTelegram } from '../tg';
import { sendFeedback, useSync } from '../sync';
import type { Props } from '../views/props';
import Sheet from './Sheet';

const MAX = 1000;
const LAST_KEY = 'darakhti:feedback-ts';

/** Хабар дар бораи хато / пешниҳод / савол: матн, тамос (ихтиёрӣ) ва маълумоти техникии бехатар. */
export default function FeedbackSheet({ state, onClose }: Pick<Props, 'state'> & { onClose: () => void }) {
  const lang = currentLang();
  const t = FEEDBACK[lang];
  const sync = useSync();
  const [kind, setKind] = useState(0);
  const [text, setText] = useState('');
  const [contact, setContact] = useState(sync.email && sync.email !== 'Telegram' ? sync.email : '');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const info = () => ({
    lang, mode: state.mode ?? 'system', currency: state.currency ?? 'TJS',
    screen: `${window.innerWidth}x${window.innerHeight}`,
    standalone: window.matchMedia('(display-mode: standalone)').matches,
    telegram: inTelegram(), online: navigator.onLine,
    ua: navigator.userAgent, page: location.pathname,
    errors: lastErrors(),
  });

  const ok = text.trim().length >= 10;
  const submit = async () => {
    if (!ok || busy) return;
    const last = Number(sessionStorage.getItem(LAST_KEY) ?? 0);
    if (Date.now() - last < 20_000) { setError(t.wait); return; }
    setBusy(true); setError('');
    try {
      await sendFeedback({ type: ['bug', 'idea', 'question'][kind], text: text.trim().slice(0, MAX), contact: contact.trim().slice(0, 120), lang, tech: info() });
      try { sessionStorage.setItem(LAST_KEY, String(Date.now())); } catch { /* ignore */ }
      setDone(true);
    } catch (e) {
      setError(e instanceof Error && e.message === 'nobot' ? t.noServer : t.err);
    }
    setBusy(false);
  };

  if (done) {
    return (
      <Sheet title={t.title} onClose={onClose}>
        <div className="fb-done">
          <div className="fb-check"><svg viewBox="0 0 24 24" width="40" height="40" aria-hidden><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
          <h3>{t.okTitle}</h3>
          <p>{t.okText}</p>
          <button className="btn big" onClick={onClose}>{t.close}</button>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet title={t.title} onClose={onClose} tall>
      <div className="fb">
        <p className="fb-lead">{t.lead}</p>

        <div className="fb-types" role="group">
          {t.types.map((n, i) => (
            <button key={n} className={i === kind ? 'fb-type on' : 'fb-type'} onClick={() => setKind(i)} aria-pressed={i === kind}>
              <span>{t.typeIcons[i]}</span><b>{n}</b>
            </button>
          ))}
        </div>

        <label className="fb-field">
          <span>{t.msgLabel}</span>
          <textarea rows={5} value={text} maxLength={MAX} placeholder={t.ph[kind]} onChange={e => setText(e.target.value)} />
          <small className={ok ? 'fb-count' : 'fb-count warn'}>{ok ? '' : `${t.minHint} · `}{text.length}/{MAX}</small>
        </label>

        <label className="fb-field">
          <span>{t.contactLabel}</span>
          <input value={contact} placeholder={t.contactPh} onChange={e => setContact(e.target.value)} autoComplete="email" />
        </label>

        {error && <div className="alert danger">{error}</div>}
        <button className="btn big" disabled={!ok || busy} onClick={() => void submit()}>
          {busy ? <><span className="spin" /> {t.sending}</> : t.send}
        </button>
        <p className="fb-note">{t.techNote}</p>
      </div>
    </Sheet>
  );
}
