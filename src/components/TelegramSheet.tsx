import { useCallback, useEffect, useState } from 'react';
import { TELEGRAM_BOT_USERNAME } from '../firebaseConfig';
import { telegramCreateCode, telegramStatus, telegramUnlink, useSync } from '../sync';
import type { TelegramLink } from '../sync';
import Sheet from './Sheet';

export default function TelegramSheet({ onClose, onOpenAuth }: { onClose: () => void; onOpenAuth: () => void }) {
  const sync = useSync();
  const signed = sync.email !== '' && sync.status !== 'signedout' && sync.status !== 'off';
  const [link, setLink] = useState<TelegramLink | null | undefined>(undefined);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(async () => {
    try { setLink(await telegramStatus()); } catch { setLink(null); }
  }, []);

  useEffect(() => { if (signed) void refresh(); }, [signed, refresh]);

  // Вақте код гирифта шуд, ҳар 3 сония мебинем, ки бот пайваст шуд ё не
  useEffect(() => {
    if (!code || link) return;
    const t = setInterval(() => { void refresh(); }, 3000);
    return () => clearInterval(t);
  }, [code, link, refresh]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setErr('');
    try { await fn(); } catch (e) { setErr(e instanceof Error ? e.message : 'Хатои номаълум'); } finally { setBusy(false); }
  };

  const url = code && TELEGRAM_BOT_USERNAME ? `https://t.me/${TELEGRAM_BOT_USERNAME}?start=${code}` : '';

  return (
    <Sheet title="Telegram-бот" onClose={onClose}>
      {!signed ? (
        <>
          <p className="note">Бот маълумоти шуморо аз аккаунт мехонад, бинобар ин аввал ба аккаунт ворид шавед.</p>
          <button className="btn" onClick={() => { onClose(); onOpenAuth(); }}>Ворид шудан</button>
        </>
      ) : link === undefined ? (
        <p className="note">Бор мешавад…</p>
      ) : link ? (
        <>
          <p className="note">✅ Бот пайваст аст. Ҳар рӯз соати 09:00 дар бораи пардохтҳои қарз ёдрас мекунад, рӯзи душанбе хулоса мефиристад.
            Фармонҳо: /xulosa, /qarzho, /yodovari.</p>
          <button className="btn danger" disabled={busy}
            onClick={() => run(async () => { await telegramUnlink(); setCode(''); await refresh(); })}>
            Ҷудо кардани бот
          </button>
        </>
      ) : (
        <>
          <p className="note">Бот ёдоварии пардохтҳои қарз ва хулосаи молиявиро ба Telegram мефиристад.</p>
          {!code ? (
            <button className="btn" disabled={busy}
              onClick={() => run(async () => setCode(await telegramCreateCode()))}>
              Гирифтани код
            </button>
          ) : (
            <>
              <div className="tg-code">{code}</div>
              <p className="note">Кодро ба бот фиристед (15 дақиқа эътибор дорад).</p>
              {url && <a className="btn tg-open" href={url} target="_blank" rel="noreferrer">Кушодани бот</a>}
              <button className="btn secondary" onClick={async () => {
                try { await navigator.clipboard.writeText(code); setCopied(true); } catch { /* ignore */ }
              }}>{copied ? 'Нусха шуд ✓' : 'Нусха кардани код'}</button>
            </>
          )}
        </>
      )}
      {err && <p className="auth-msg err">{err}</p>}
    </Sheet>
  );
}
