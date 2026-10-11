import { useEffect, useState } from 'react';

interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const base = import.meta.env.BASE_URL;
const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
const standalone = window.matchMedia('(display-mode: standalone)').matches
  || (navigator as unknown as { standalone?: boolean }).standalone === true;

/** Саҳифаи алоҳидаи насб: дар браузер аз Mini App кушода мешавад (`?install=1`). */
export default function InstallPage() {
  const [ev, setEv] = useState<InstallEvent | null>(null);
  const [done, setDone] = useState(standalone);
  const [help, setHelp] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => { e.preventDefault(); setEv(e as InstallEvent); };
    const onInstalled = () => setDone(true);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = async () => {
    if (!ev) { setHelp(true); return; }
    try {
      await ev.prompt();
      const c = await ev.userChoice;
      if (c.outcome === 'accepted') setDone(true);
    } catch { setHelp(true); }
    setEv(null);
  };

  return (
    <div className="inst">
      <div className="inst-phone" aria-hidden="true">
        <i className="inst-notch" />
        <div className="inst-grid">
          {Array.from({ length: 9 }, (_, i) => (
            i === 5
              ? <img key={i} className="inst-app" src={`${base}icons/icon-192.png`} alt="" />
              : <span key={i} className="inst-tile" />
          ))}
        </div>
      </div>

      {done ? (
        <>
          <h1>Тайёр! 🎉</h1>
          <p>«Дарахти даромад» дар экрани асосии телефони шумо пайдо шуд. Аз он ҷо кушоед: мисли барномаи оддӣ, бе браузер.</p>
          <a className="inst-btn" href={base}>Кушодани барнома</a>
        </>
      ) : (
        <>
          <h1>Илова кунед «Дарахти даромад» ба экрани «Асосӣ»</h1>
          <p>Барнома зуд кушода мешавад, дар экрани пурра кор мекунад ва маълумоти шумо дар аккаунт нигоҳ дошта мешавад.</p>
          <button className="inst-btn" onClick={() => void install()}>Насб кардани «Дарахти даромад»</button>
          {help && (
            <div className="inst-help" role="status">
              {ios
                ? <>Тугмаи <b>«Мубодила»</b> (↑)-ро пахш кунед → <b>«На главный экран»</b> / «Add to Home Screen».</>
                : <>Менюи браузер <b>(⋮)</b> → <b>«Установить приложение»</b> / «Install app» / «Add to Home screen».
                  Агар саҳифа дар худи Telegram кушода шуда бошад, аввал аз менюи (⋮) «Дар Chrome кушодан»-ро интихоб кунед.</>}
            </div>
          )}
          <a className="inst-skip" href={base}>Бе насб идома додан</a>
        </>
      )}
    </div>
  );
}
