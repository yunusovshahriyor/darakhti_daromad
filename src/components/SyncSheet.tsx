import { FormEvent, useEffect, useState } from 'react';
import {
  clearConfig, deleteAccount, preload, saveConfig, signOut, syncNow, useSync,
} from '../sync';
import type { SyncStatus } from '../sync';
import rules from '../../firestore.rules?raw';
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
    case 'signedout': return 'Ворид нашудаед';
    case 'syncing': return 'Синхронизатсия…';
    case 'offline': return 'Бе интернет: баъдтар худкор мефиристад';
    case 'error': return `Хато: ${error}`;
    default: return `Синхронизатсия шуд · ${minutes(last)}`;
  }
};

export default function SyncSheet({ onClose, onToast, onOpenAuth }: { onClose: () => void; onToast: (m: string) => void; onOpenAuth: () => void }) {
  const sync = useSync();
  const [cfgText, setCfgText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [help, setHelp] = useState(false);
  const [ask, confirmDialog] = useConfirm();

  useEffect(() => { preload(); }, []);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setErr('');
    try { await fn(); } catch (e) { setErr(e instanceof Error ? e.message : 'Хатои номаълум'); } finally { setBusy(false); }
  };

  const copy = async (text: string, msg: string) => {
    try { await navigator.clipboard.writeText(text); onToast(msg); } catch { onToast('Нусха нашуд'); }
  };

  const onConfig = (e: FormEvent) => { e.preventDefault(); void run(async () => saveConfig(cfgText)); };

  const off = async () => {
    if (await ask({
      title: 'Ҷудо кардани Firebase',
      text: 'Танзимот ва воридшавӣ дар ин дастгоҳ нест мешавад. Маълумот дар ин дастгоҳ ва дар сервер мемонад, вале синхронизатсия қатъ мешавад.',
      ok: 'Ҷудо кардан',
      danger: true,
    })) { clearConfig(); onClose(); }
  };

  const del = async () => {
    if (!(await ask({
      title: 'Нест кардани ҳисоб',
      text: 'Ҳисоби шумо ва тамоми маълумоти он дар сервер ҳамеша нест мешавад. Маълумот дар ин дастгоҳ мемонад. Ин амалро бекор кардан мумкин нест.',
      ok: 'Ҳа, нест кунед',
      danger: true,
    }))) return;
    await run(async () => { await deleteAccount(); onToast('Ҳисоб нест шуд'); onClose(); });
  };

  return (
    <Sheet title="Синхронизатсияи абрӣ" onClose={onClose} tall>
      {!sync.configured && (
        <form onSubmit={onConfig}>
          <p className="muted" style={{ margin: '0 2px 10px' }}>
            Маълумот дар ҳисоби шахсии шумо дар Firebase нигоҳ дошта мешавад ва дар ҳамаи дастгоҳҳо як хел аст.
            Дар лоиҳаи Firebase-и худ танзим кунед ва танзимотро (firebaseConfig) дар зер гузоред.
          </p>
          <button type="button" className="btn secondary" onClick={() => setHelp(h => !h)}>
            {help ? 'Пинҳон кардани дастур' : 'Дастури танзим'}
          </button>
          {help && (
            <ol className="sync-steps">
              <li>Дар <b>console.firebase.google.com</b> лоиҳа созед ва «Web app» илова кунед.</li>
              <li><b>Authentication → Sign-in method</b>: <b>Email/Password</b> ва <b>Google</b>-ро фаъол кунед.</li>
              <li><b>Authentication → Settings → Authorized domains</b>: <b>yunusovshahriyor.github.io</b>-ро илова кунед.</li>
              <li><b>Firestore Database</b> созед, <b>Rules</b> ро кушоед, қоидаҳоро гузоред ва <b>Publish</b> кунед.{' '}
                <button type="button" className="btn-sm" onClick={() => void copy(rules, 'Қоидаҳо нусха шуданд ✓')}>Нусхаи қоидаҳо</button></li>
              <li><b>Project settings → Your apps</b>: объекти <b>firebaseConfig</b>-ро нусха карда, дар зер гузоред.</li>
            </ol>
          )}
          <Field label="firebaseConfig">
            <textarea rows={7} value={cfgText} onChange={e => setCfgText(e.target.value)}
              placeholder={'{ apiKey: "…", authDomain: "…", projectId: "…", appId: "…" }'}
              autoCapitalize="off" autoCorrect="off" spellCheck={false} />
          </Field>
          {err && <div className="alert danger">{err}</div>}
          <button className="btn big" type="submit" disabled={busy || !cfgText.trim()}>Нигоҳ доштан</button>
        </form>
      )}

      {sync.configured && sync.status === 'signedout' && (
        <>
          <p className="muted" style={{ margin: '0 2px 12px' }}>
            Ворид шавед, то маълумот дар ҳамаи дастгоҳҳои шумо як хел бошад ва нусхаи автоматӣ дошта бошад.
          </p>
          <button className="btn big" onClick={onOpenAuth}>Ворид шудан ё сабти ном</button>
          {!sync.embedded && <button type="button" className="btn ghost" onClick={off}>Ҷудо кардани Firebase</button>}
        </>
      )}

      {sync.configured && sync.status !== 'signedout' && (
        <>
          <div className="loan-info">
            <div><span>Ҳисоб</span><b>{sync.email}</b></div>
            <div><span>Ҳолат</span><b>{statusText(sync.status, sync.lastSyncAt, sync.error)}</b></div>
            <div><span>Охирин синхронизатсия</span><b>{minutes(sync.lastSyncAt)}</b></div>
          </div>

          {err && <div className="alert danger">{err}</div>}
          <button className="btn big" disabled={sync.status === 'syncing'} onClick={() => void syncNow()}>
            {sync.status === 'syncing' ? 'Синхронизатсия…' : 'Ҳозир синхронизатсия кардан'}
          </button>
          <button className="btn secondary" style={{ marginTop: 8 }} onClick={() => void signOut()}>Аз ҳисоб баромадан</button>
          <button className="btn ghost" disabled={busy} onClick={() => void del()}>Нест кардани ҳисоб ва маълумоти сервер</button>
          {!sync.embedded && <button className="btn ghost" onClick={off}>Ҷудо кардани Firebase</button>}
        </>
      )}
      {confirmDialog}
    </Sheet>
  );
}
