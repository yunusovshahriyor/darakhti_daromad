import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import InstallPage from './components/InstallPage';
import { initStorage } from './storage';
import { initSync } from './sync';
import { initTelegram, loginCodeFromLaunch } from './tg';
import TelegramLoginComplete from './components/TelegramLoginComplete';
import { initI18n } from './i18n';
import './style.css';

const installMode = new URLSearchParams(location.search).get('install') === '1';

const boot = () => {
  const root = document.getElementById('root')!;
  const loginCode = loginCodeFromLaunch();
  if (loginCode) {
    createRoot(root).render(<StrictMode><TelegramLoginComplete code={loginCode} /></StrictMode>);
  } else if (installMode) {
    createRoot(root).render(<StrictMode><InstallPage /></StrictMode>);
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
