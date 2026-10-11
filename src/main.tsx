import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import InstallPage from './components/InstallPage';
import { initStorage } from './storage';
import { initSync } from './sync';
import { initTelegram, loginCodeFromLaunch } from './tg';
import TelegramLoginComplete from './components/TelegramLoginComplete';
import './style.css';

const installMode = new URLSearchParams(location.search).get('install') === '1';

// Аввал маълумотро аз IndexedDB мехонем, баъд барномаро мекушем
const loginCode = loginCodeFromLaunch();
if (loginCode) {
  createRoot(document.getElementById('root')!).render(<StrictMode><TelegramLoginComplete code={loginCode} /></StrictMode>);
} else if (installMode) {
  createRoot(document.getElementById('root')!).render(<StrictMode><InstallPage /></StrictMode>);
} else initStorage().finally(() => {
  initTelegram();
  initSync();
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
  });
}
