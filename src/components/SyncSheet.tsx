import { FormEvent, useState } from 'react';
import SETUP_SQL from '../../supabase/setup.sql?raw';
import { configure, disconnect, resolveConflict, signIn, signOut, signUp, syncNow, useSync } from '../sync';
import type { SyncStatus } from '../sync';
import { useConfirm } from './ConfirmSheet';
import Field from './Field';
import Sheet from './Sheet';

const minutes = (ts: number) => {
  if (!ts) return 'ҳанӯз не';
  const m = Math.floor((Date.now() - ts) / 60_000);
  if (m < 1) return 'ҳозир';
  if (m < 60) return `${m} дақиқа пеш`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h} соат пеш` : `${Math.floor(h / 24)} рӯз пеш`;
};

export const statusText = (st: SyncStatus, last: number, error: string) => {
  switch (st) {
    case 'off': return 'Хомӯш: маълумот танҳо дар ин дастгоҳ';
    case 'signedout': return 'Пайваст шуд, лекин ворид нашудаед';
    case 'syncing': return 'Синхронизатсия…';
    case 'offline': return 'Бе интернет: баъдтар худкор мефиристад';
    case 'error': return `Хато: ${error}`;
    case 'conflict': return '⚠️ Ихтилофи маълумот: интихоб лозим аст';
    default: return `Синхронизатсия шуд · ${minutes(last)}`;
  }
};

export default function SyncSheet({ onClose, onToast }: { onClose: () => void; onToast: (m: string) => void }) {
  const sync = useSync();
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [help, setHelp] = useState(false);
  const [ask, confirmDialog] = useConfirm();

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setErr('');
    try { await fn(); } catch (e) { setErr(e instanceof Error ? e.message : 'Хатои номаълум'); } finally { setBusy(false); }
  };

  const copySql = async () => {
    try { await navigator.clipboard.writeText(SETUP_SQL); onToast('SQL нусха шуд ✓'); } catch { setHelp(true); onToast('Нусха нашуд: аз зер дастӣ нусха гиред'); }
  };

  const onConfigure = (e: FormEvent) => { e.preventDefault(); void run(() => configure(url, key)); };
  const onSignIn = (e: FormEvent) => { e.preventDefault(); void run(() => signIn(email.trim(), password)); };
  const onSignUp = () => run(async () => {
    const ok = await signUp(email.trim(), password);
    if (!ok) setErr('Ҳисоб сохта шуд. Почтаи худро тасдиқ кунед ва баъд «Даромадан»-ро пахш кунед.');
  });

  const off = async () => {
    if (await ask({
      title: 'Ҷудо кардани Supabase',
      text: 'Пайвастшавӣ ба сервер нест мешавад. Маълумот дар ин дастгоҳ ва дар сервер мемонад, вале синхронизатсия қатъ мешавад.',
      ok: 'Ҷудо кардан',
      danger: true,
    })) { disconnect(); onClose(); }
  };

  const c = sync.conflict;

  return (
    <Sheet title="Синхронизатсияи абрӣ" onClose={onClose} tall>
      {!sync.configured && (
        <form onSubmit={onConfigure}>
          <p className="muted" style={{ margin: '0 2px 10px' }}>
            Маълумот дар ҳисоби шахсии шумо дар Supabase нигоҳ дошта мешавад ва дар ҳамаи дастгоҳҳо як хел аст.
            Танҳо шумо онро мебинед. Ройгон, аммо як маротиба танзим кардан лозим аст.
          </p>
          <button type="button" className="btn secondary" onClick={() => setHelp(h => !h)}>
            {help ? 'Пинҳон кардани дастур' : 'Дастури танзим (4 қадам)'}
          </button>
          {help && (
            <ol className="sync-steps">
              <li>Ба <b>supabase.com</b> ворид шавед ва лоиҳаи нав созед (New project).</li>
              <li>
                <b>SQL Editor</b> → ҷадвали навро ёбед → матнро гузоред ва <b>Run</b> кунед.{' '}
                <button type="button" className="btn-sm" onClick={copySql}>Нусхаи SQL</button>
              </li>
              <li><b>Authentication → Sign In / Providers → Email</b>: «Confirm email»-ро хомӯш кунед.</li>
              <li><b>Project Settings → API</b>: «Project URL» ва «anon public» калидро дар зер гузоред. «service_role»-ро ҳаргиз нагузоред.</li>
            </ol>
          )}
          <Field label="Project URL">
            <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://abcdxyz.supabase.co" autoCapitalize="off" autoCorrect="off" />
          </Field>
          <Field label="anon public key">
            <input value={key} onChange={e => setKey(e.target.value)} placeholder="eyJhbGciOi..." autoCapitalize="off" autoCorrect="off" />
          </Field>
          {err && <div className="alert danger">{err}</div>}
          <button className="btn big" type="submit" disabled={busy || !url.trim() || !key.trim()}>
            {busy ? 'Санҷиш…' : 'Пайваст кардан'}
          </button>
        </form>
      )}

      {sync.configured && sync.status === 'signedout' && (
        <form onSubmit={onSignIn}>
          <p className="muted" style={{ margin: '0 2px 10px' }}>
            Бо почта ва рамзи худ ворид шавед (ё ҳисоби нав созед). Дар ҳамаи дастгоҳҳо ҳамин ҳисобро истифода баред.
          </p>
          <Field label="Почтаи электронӣ">
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@gmail.com" autoComplete="email" />
          </Field>
          <Field label="Рамз (на камтар аз 6 аломат)">
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" />
          </Field>
          {err && <div className="alert danger">{err}</div>}
          <button className="btn big" type="submit" disabled={busy || !email.trim() || password.length < 6}>
            {busy ? 'Лутфан интизор шавед…' : 'Даромадан'}
          </button>
          <button type="button" className="btn secondary" style={{ marginTop: 8 }} disabled={busy || !email.trim() || password.length < 6} onClick={onSignUp}>
            Ҳисоби нав сохтан
          </button>
          <button type="button" className="btn ghost" onClick={off}>Ҷудо кардани Supabase</button>
        </form>
      )}

      {sync.configured && sync.status !== 'signedout' && (
        <>
          <div className="loan-info">
            <div><span>Ҳисоб</span><b>{sync.email}</b></div>
            <div><span>Ҳолат</span><b>{statusText(sync.status, sync.lastSyncAt, sync.error)}</b></div>
            <div><span>Охирин синхронизатсия</span><b>{minutes(sync.lastSyncAt)}</b></div>
          </div>

          {c && (
            <div className="conflict">
              <b>Дар ду ҷо тағйирот шудааст</b>
              <p>Ин дастгоҳ: {c.localCounts.incomes} даромад, {c.localCounts.expenses} хароҷот, {c.localCounts.debts} қарз, {c.localCounts.dreams} орзу.</p>
              <p>Сервер: {c.remoteCounts.incomes} даромад, {c.remoteCounts.expenses} хароҷот, {c.remoteCounts.debts} қарз, {c.remoteCounts.dreams} орзу.</p>
              <p className="muted">Яке интихоб мешавад, дигаре ҷойгузин мешавад. Нусхаи ҷойгузиншуда дар «Нусхаҳои худкор» (Профил) мемонад.</p>
              <button className="btn big" onClick={() => void resolveConflict('remote')}>Аз сервер гирифтан</button>
              <button className="btn secondary" style={{ marginTop: 8 }} onClick={() => void resolveConflict('local')}>Маълумоти ин дастгоҳро фиристодан</button>
            </div>
          )}

          {err && <div className="alert danger">{err}</div>}
          {!c && (
            <button className="btn big" disabled={sync.status === 'syncing'} onClick={() => void syncNow()}>
              {sync.status === 'syncing' ? 'Синхронизатсия…' : 'Ҳозир синхронизатсия кардан'}
            </button>
          )}
          <button className="btn secondary" style={{ marginTop: 8 }} onClick={() => { signOut(); }}>Аз ҳисоб баромадан</button>
          <button className="btn ghost" onClick={off}>Ҷудо кардани Supabase</button>
        </>
      )}
      {confirmDialog}
    </Sheet>
  );
}
