import { useCallback, useEffect, useRef, useState } from 'react';
import { TELEGRAM_BOT_USERNAME } from '../firebaseConfig';
import { telegramCreateCode, telegramPrefsGet, telegramPrefsSet, telegramStatus, useSync } from '../sync';
import { NOTIFY, NOTIFY_GROUPS, NOTIFY_HOURS, defaultPrefs } from '../notify';
import type { NotifyPrefs } from '../notify';
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
  const [prefs, setPrefs] = useState<NotifyPrefs | null>(null);
  const [saveErr, setSaveErr] = useState('');

  // Танзимоти огоҳиномаҳо: вақте бот пайваст аст, аз сервер мехонем (ҳамон ҳуҷҷат, ки бот низ истифода мекунад)
  useEffect(() => {
    if (!link) return;
    let alive = true;
    telegramPrefsGet().then(p => { if (alive) setPrefs(p); }).catch(() => { if (alive) setPrefs(defaultPrefs()); });
    return () => { alive = false; };
  }, [link]);

  const changePrefs = async (next: NotifyPrefs) => {
    const before = prefs;
    setPrefs(next);
    setSaveErr('');
    try { await telegramPrefsSet(next); } catch (e) {
      setPrefs(before);
      setSaveErr(e instanceof Error && e.message ? 'Сабт нашуд: аз нав кӯшиш кунед' : 'Сабт нашуд');
    }
  };

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
    <Sheet title="Telegram-бот" onClose={onClose} tall={!!link}>
      {!signed ? (
        <>
          <p className="note">Бот маълумоти шуморо аз аккаунт мехонад, бинобар ин аввал ба аккаунт ворид шавед.</p>
          <button className="btn" onClick={() => { onClose(); onOpenAuth(); }}>Ворид шудан</button>
        </>
      ) : link === undefined ? (
        <p className="note">Бор мешавад…</p>
      ) : link ? (
        <>
          <p className="note tg-ok">✅ Бот пайваст аст. Ҳамаи огоҳиҳои як рӯз дар як паём меояд.</p>
          {!prefs ? <p className="note">Бор мешавад…</p> : (
            <>
              <h3 className="group-title"><span>Соати огоҳиномаҳо</span></h3>
              <div className="tg-hours" role="group" aria-label="Соати огоҳиномаҳо">
                {NOTIFY_HOURS.map(h => (
                  <button key={h} type="button" className={h === prefs.hour ? 'on' : ''}
                    onClick={() => void changePrefs({ ...prefs, hour: h })}>{String(h).padStart(2, '0')}:00</button>
                ))}
              </div>
              <p className="note">Вақти Тоҷикистон.</p>
              {NOTIFY_GROUPS.map(g => (
                <section key={g}>
                  <h3 className="group-title"><span>{g}</span></h3>
                  <div className="cells">
                    {NOTIFY.filter(n => n.group === g).map(n => (
                      <label key={n.key} className="switch-row cell">
                        <span><b>{n.label}</b><small>{n.hint}</small></span>
                        <span className="switch">
                          <input type="checkbox" checked={!!prefs.flags[n.key]}
                            onChange={e => void changePrefs({ ...prefs, flags: { ...prefs.flags, [n.key]: e.target.checked } })} />
                          <i />
                        </span>
                      </label>
                    ))}
                  </div>
                </section>
              ))}
              <p className="note">Ҳамин танзимот дар бот ҳам дида мешавад (⚙️ Танзимот). Фармонҳо: /xulosa, /qarzho, /yodovari.</p>
              {saveErr && <p className="auth-msg err">{saveErr}</p>}
            </>
          )}
        </>
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
