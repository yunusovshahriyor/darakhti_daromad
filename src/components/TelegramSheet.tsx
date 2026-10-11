import { useCallback, useEffect, useRef, useState } from 'react';
import { TELEGRAM_BOT_USERNAME } from '../firebaseConfig';
import { telegramCreateCode, telegramStatus, useSync } from '../sync';
import type { TelegramLink } from '../sync';
import { openTelegramLink } from '../tg';
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

  // Баргашт аз Telegram: ҳолати пайвастшавиро фавран нав мекунем
  useEffect(() => {
    const on = () => { if (document.visibilityState === 'visible' && signed) void refresh(); };
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, [signed, refresh]);

  // Худкор: агар бот пайваст набошад, рамз месозем ва пайванди t.me/<бот>?start=<рамз> кушода мешавад
  const auto = useRef(false);
  useEffect(() => {
    if (!signed || link !== null || auto.current) return;
    auto.current = true;
    void (async () => {
      setBusy(true);
      setErr('');
      try {
        const c = await telegramCreateCode();
        setCode(c);
        if (TELEGRAM_BOT_USERNAME) openTelegramLink(`https://t.me/${TELEGRAM_BOT_USERNAME}?start=${c}`);
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Хатои номаълум');
      } finally {
        setBusy(false);
      }
    })();
  }, [signed, link]);

  // Вақте код гирифта шуд, ҳар 3 сония мебинем, ки бот пайваст шуд ё не
  useEffect(() => {
    if (!code || link) return;
    const t = setInterval(() => { void refresh(); }, 3000);
    return () => clearInterval(t);
  }, [code, link, refresh]);

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
        <p className="note">✅ Бот пайваст аст. Ҳар рӯз соати 09:00 дар бораи пардохтҳои қарз ёдрас мекунад, рӯзи душанбе хулоса мефиристад.
          Фармонҳо: /xulosa, /qarzho, /yodovari.</p>
      ) : (
        <>
          <p className="note">Бот ёдоварии пардохтҳои қарз ва хулосаи молиявиро ба Telegram мефиристад.</p>
          {!code ? (
            <p className="note">{busy ? 'Telegram кушода мешавад…' : ''}</p>
          ) : (
            <>
              <p className="note">Агар Telegram худкор кушода нашуд, тугмаро пахш кунед: бот худаш пайваст мешавад.</p>
              {url && <a className="btn tg-open" href={url} onClick={e => { e.preventDefault(); openTelegramLink(url); }}>Кушодани бот</a>}
              <p className="note">Ё кодро дастӣ ба бот фиристед (15 дақиқа эътибор дорад):</p>
              <div className="tg-code">{code}</div>
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
