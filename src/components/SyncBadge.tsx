import { useSync } from '../sync';

/** Иконкаи абр бо нишони ҳолат (ActionBar): ✕ — синхронизатсия нашудааст, ✓ — синхронизатсия шуд. */
export default function SyncBadge({ onClick }: { onClick: () => void }) {
  const sync = useSync();
  const signed = sync.configured && sync.status !== 'signedout' && sync.status !== 'off' && sync.email !== '';
  const kind = !signed ? 'x' : sync.status === 'syncing' ? 'sync' : sync.status === 'offline' || sync.status === 'error' ? 'warn' : 'ok';
  const label = {
    x: 'Синхронизатсия нашудааст',
    sync: 'Синхронизатсия мешавад',
    warn: 'Синхронизатсия: мушкилӣ',
    ok: 'Синхронизатсия шуд',
  }[kind];

  return (
    <button className="sync-btn" onClick={onClick} aria-label={label} title={label}>
      <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M7 18.5h9.5a4 4 0 0 0 .7-7.94A5.5 5.5 0 0 0 6.6 9.2 4.7 4.7 0 0 0 7 18.5Z" />
      </svg>
      <span className={`sb sb-${kind}`} aria-hidden>
        {kind === 'x' && <svg viewBox="0 0 12 12" width="9" height="9"><path d="M2.5 2.5l7 7M9.5 2.5l-7 7" stroke="#fff" strokeWidth="2" strokeLinecap="round" /></svg>}
        {kind === 'ok' && <svg viewBox="0 0 12 12" width="9" height="9"><path d="M2.4 6.3 5 8.8l4.6-5.2" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>}
        {kind === 'sync' && <svg viewBox="0 0 12 12" width="10" height="10" className="sb-rot"><path d="M6 1.8a4.2 4.2 0 1 0 4.2 4.2" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" fill="none" /></svg>}
        {kind === 'warn' && <svg viewBox="0 0 12 12" width="9" height="9"><path d="M6 2.5v4.2M6 9.2v.1" stroke="#fff" strokeWidth="2" strokeLinecap="round" /></svg>}
      </span>
    </button>
  );
}
