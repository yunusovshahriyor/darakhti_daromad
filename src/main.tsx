import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import InstallPage from './components/InstallPage';
import { initStorage } from './storage';
import { initSync } from './sync';
import { initTelegram, loginCodeFromLaunch } from './tg';
import TelegramLoginComplete from './components/TelegramLoginComplete';
import { initI18n } from './i18n';
import { brand } from './brand';
import './style.css';

const installMode = new URLSearchParams(location.search).get('install') === '1';

/** Экрани оғозин (splash): баъди нахустин рендер бо оҳистагӣ пинҳон мешавад. */
const hideSplash = () => {
  const el = document.getElementById('splash');
  if (!el) return;
  setTimeout(() => { el.classList.add('off'); setTimeout(() => el.remove(), 450); }, 350);
};

const boot = () => {
  document.title = brand().name;
  const root = document.getElementById('root')!;
  const loginCode = loginCodeFromLaunch();
  if (loginCode) {
    createRoot(root).render(<StrictMode><TelegramLoginComplete code={loginCode} /></StrictMode>);
    hideSplash();
  } else if (installMode) {
    createRoot(root).render(<StrictMode><InstallPage /></StrictMode>);
    hideSplash();
  } else {
    // Аввал маълумотро аз IndexedDB мехонем, баъд барномаро мекушем
    initStorage().finally(() => {
      initTelegram();
      initSync();
      createRoot(root).render(
        <StrictMode>
          <App />
        </StrictMode>,
      );
      hideSplash();
    });
  }
};

// Аввал луғати забони интихобшуда бор мешавад (барои русӣ/англисӣ), баъд барнома
initI18n().catch(() => {}).finally(boot);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
  });
}
