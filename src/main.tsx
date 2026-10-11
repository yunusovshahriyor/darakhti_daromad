import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { initStorage } from './storage';
import './style.css';

// Аввал маълумотро аз IndexedDB мехонем, баъд барномаро мекушем
initStorage().finally(() => {
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
