import { useEffect, useState } from 'react';
import { BOT_API } from '../firebaseConfig';
import { loadTelegram } from '../tg';

type Phase = 'work' | 'done' | 'fail';

/**
 * Саҳифаи миёнравӣ дар Mini App: воридшавиро (бо код аз сайт) анҷом медиҳад ва сайтро худкор мекушояд.
 * Ҷараён: сайт «Бо Telegram» → Telegram ин Mini App-ро фавран мекушояд → Worker код ва initData-ро месанҷад →
 * сайт дар замина ворид мешавад → дар ин ҷо сайтро дар браузер мекушоем ва Mini App-ро мепӯшем.
 */
export default function TelegramLoginComplete({ code }: { code: string }) {
  const [phase, setPhase] = useState<Phase>('work');
  const site = `${location.origin}${location.pathname}`;

  useEffect(() => {
    let alive = true;
    void (async () => {
      const w = await loadTelegram();
      if (!w) { if (alive) setPhase('fail'); return; }
      w.ready();
      w.expand();
      try {
        const r = await fetch(`${BOT_API}/auth/complete`, {
          method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ initData: w.initData, code }),
        });
        const j = (await r.json()) as { status?: string };
        if (!alive) return;
        if (!r.ok || j.status !== 'ok') { setPhase('fail'); return; }
        setPhase('done');
        // Худкор: сайтро дар браузер мекушоем, баъд Mini App-ро мепӯшем
        w.openLink(site, { try_browser: 'chrome' });
        setTimeout(() => { try { w.close(); } catch { /* ignore */ } }, 900);
      } catch {
        if (alive) setPhase('fail');
      }
    })();
    return () => { alive = false; };
  }, [code, site]);

  const open = () => { void loadTelegram().then(w => { if (w) w.openLink(site, { try_browser: 'chrome' }); else location.href = site; }); };

  return (
    <div className="inst">
      <div className="inst-phone" aria-hidden="true" style={{ aspectRatio: '300 / 160' }}>
        <i className="inst-notch" />
        <div className="inst-grid"><span className="inst-tile" /><img className="inst-app" src={`${import.meta.env.BASE_URL}icons/icon-192.png`} alt="" /><span className="inst-tile" /></div>
      </div>
      {phase === 'work' && <><h1>Воридшавӣ…</h1><p>Лаҳзае интизор шавед.</p></>}
      {phase === 'done' && <>
        <h1>Тайёр! 🎉</h1>
        <p>Сайт дар браузер кушода мешавад. Агар нашуд, тугмаро пахш кунед.</p>
        <button className="inst-btn" onClick={open}>Кушодани барнома</button>
      </>}
      {phase === 'fail' && <>
        <h1>Воридшавӣ нашуд</h1>
        <p>Дархост кӯҳна шудааст. Ба сайт баргашта «Бо Telegram идома додан»-ро аз нав пахш кунед.</p>
        <button className="inst-btn" onClick={open}>Кушодани барнома</button>
      </>}
    </div>
  );
}
