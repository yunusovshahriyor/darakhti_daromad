import { FormEvent, useEffect, useRef, useState } from 'react';
import { resetPassword, signIn, signInGoogle, signUp, useSync } from '../sync';
import { useHistoryLayer } from './useHistoryLayer';

type Mode = 'in' | 'up';

const GoogleG = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
    <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.57-5.17 3.57-8.81Z" />
    <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.92l-3.88-3c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.28v3.1A12 12 0 0 0 12 24Z" />
    <path fill="#FBBC05" d="M5.29 14.28a7.2 7.2 0 0 1 0-4.56v-3.1H1.28a12 12 0 0 0 0 10.76l4.01-3.1Z" />
    <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.61 4.58 1.8l3.43-3.43C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.28 6.62l4.01 3.1C6.23 6.88 8.88 4.77 12 4.77Z" />
  </svg>
);

const MailIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="3" y="5" width="18" height="14" rx="3" /><path d="m4 7 8 6 8-6" />
  </svg>
);
const LockIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="4.5" y="10.5" width="15" height="10" rx="3" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
  </svg>
);
const EyeBtn = ({ on }: { on: boolean }) => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />
    {!on && <path d="M4 4l16 16" />}
  </svg>
);

/** Қувваи рамз: 0–4 (дарозӣ, ҳарфи хурд/калон, рақам, аломат). */
const strength = (p: string) => {
  let s = 0;
  if (p.length >= 6) s++;
  if (p.length >= 10) s++;
  if (/[a-zа-я]/.test(p) && /[A-ZА-Я]/.test(p)) s++;
  if (/\d/.test(p) && /[^\w\s]|[a-zа-я]/i.test(p)) s++;
  return Math.min(4, s);
};
const STRENGTH_LABEL = ['Хеле кӯтоҳ', 'Заиф', 'Миёна', 'Хуб', 'Қавӣ'];

export default function AuthPage({ onClose, onToast }: { onClose: () => void; onToast: (m: string) => void }) {
  const sync = useSync();
  const [mode, setMode] = useState<Mode>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState<'' | 'form' | 'google' | 'reset'>('');
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const closing = useRef(false);

  useHistoryLayer(true, onClose);

  // Воридшавӣ муваффақ шуд: саҳифаро мепӯшем
  useEffect(() => {
    if (sync.email && sync.status !== 'signedout' && sync.status !== 'off' && !closing.current) {
      closing.current = true;
      onToast(`Хуш омадед${sync.name ? `, ${sync.name.split(' ')[0]}` : ''} 👋`);
      onClose();
    }
  }, [sync.email, sync.status, sync.name]);

  const run = async (kind: 'form' | 'google' | 'reset', fn: () => Promise<void>) => {
    setBusy(kind);
    setErr('');
    setInfo('');
    try { await fn(); } catch (e) { setErr(e instanceof Error ? e.message : 'Хатои номаълум'); } finally { setBusy(''); }
  };

  const valid = /^\S+@\S+\.\S+$/.test(email.trim()) && password.length >= 6;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    void run('form', () => (mode === 'in' ? signIn(email.trim(), password) : signUp(email.trim(), password)));
  };
  const forgot = () => void run('reset', async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) throw new Error('Аввал почтаи худро ворид кунед');
    await resetPassword(email.trim());
    setInfo('Паёми баркашидани рамз ба почтаи шумо фиристода шуд. Папкаи «Спам»-ро низ санҷед.');
  });

  const st = strength(password);

  return (
    <div className="auth-page" role="dialog" aria-label="Воридшавӣ">
      <div className="auth-bg" aria-hidden><i /><i /><i /></div>
      <button className="auth-close" onClick={onClose} aria-label="Пӯшидан">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6 6 18" /></svg>
      </button>

      <div className="auth-inner">
        <div className="auth-brand">
          <div className="auth-logo">даромад<i>.</i></div>
          <h1>{mode === 'in' ? 'Хуш омадед' : 'Ҳисоби нав созед'}</h1>
          <p>{mode === 'in'
            ? 'Ворид шавед ва маълумоти худро дар ҳар дастгоҳ бубинед.'
            : 'Маълумоти шумо захира мешавад ва дар ҳамаи дастгоҳҳо як хел мемонад.'}</p>
        </div>

        <div className="auth-card">
          <div className="auth-tabs" role="tablist">
            <button role="tab" aria-selected={mode === 'in'} className={mode === 'in' ? 'on' : ''} onClick={() => { setMode('in'); setErr(''); setInfo(''); }}>Даромадан</button>
            <button role="tab" aria-selected={mode === 'up'} className={mode === 'up' ? 'on' : ''} onClick={() => { setMode('up'); setErr(''); setInfo(''); }}>Сабти ном</button>
          </div>


          <form onSubmit={submit} noValidate>
            <label className="auth-field">
              <span className="af-ic"><MailIcon /></span>
              <input type="email" inputMode="email" autoComplete="email" autoCapitalize="off" autoCorrect="off"
                value={email} onChange={e => setEmail(e.target.value)} placeholder=" " />
              <em>Почтаи электронӣ</em>
            </label>
            <label className="auth-field">
              <span className="af-ic"><LockIcon /></span>
              <input type={show ? 'text' : 'password'} autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
                value={password} onChange={e => setPassword(e.target.value)} placeholder=" " />
              <em>Рамз</em>
              <button type="button" className="af-eye" onClick={() => setShow(v => !v)} aria-label={show ? 'Пинҳон кардан' : 'Нишон додан'}>
                <EyeBtn on={show} />
              </button>
            </label>

            {mode === 'up' && (
              <div className="auth-strength" aria-live="polite">
                <div className={`bars s${password ? st : 0}`}><i /><i /><i /><i /></div>
                <small>{password ? STRENGTH_LABEL[st] : 'На камтар аз 6 аломат'}</small>
              </div>
            )}
            {mode === 'in' && (
              <button type="button" className="auth-link" disabled={busy !== ''} onClick={forgot}>
                {busy === 'reset' ? 'Фиристода истодааст…' : 'Рамзро фаромӯш кардед?'}
              </button>
            )}

            {err && <div className="auth-msg err" role="alert">{err}</div>}
            {info && <div className="auth-msg ok" role="status">{info}</div>}

            <button className="auth-submit" type="submit" disabled={!valid || busy !== ''}>
              {busy === 'form' ? <span className="spin" /> : mode === 'in' ? 'Даромадан' : 'Ҳисоб сохтан'}
            </button>
          </form>

          <div className="auth-or"><span>ё</span></div>

          <button type="button" className="auth-google" disabled={busy !== ''} onClick={() => void run('google', signInGoogle)}>
            {busy === 'google' ? <span className="spin" /> : <GoogleG />}
            <span>Бо Google идома додан</span>
          </button>
        </div>

        <ul className="auth-perks">
          <li><span>☁️</span>Нусхаи автоматӣ</li>
          <li><span>🔄</span>Дар ҳамаи дастгоҳҳо</li>
          <li><span>🔒</span>Танҳо шумо мебинед</li>
        </ul>

        <button className="auth-guest" onClick={onClose}>Бе ворид шудан идома додан</button>
        <p className="auth-legal">Бо идома додан, шумо розӣ ҳастед, ки маълумоти шумо дар ҳисоби шахсии шумо нигоҳ дошта шавад.</p>
      </div>
    </div>
  );
}
