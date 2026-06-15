import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { initDb } from './db.js';
import { initTheme } from './theme.js';
import App from './App.jsx';
import { StoreProvider } from './store.jsx';
import './index.css';

async function boot() {
  await initDb();
  initTheme();
  createRoot(document.getElementById('app')).render(
    <StrictMode>
      <StoreProvider>
        <App />
      </StoreProvider>
    </StrictMode>
  );
}

boot().catch((err) => {
  console.error(err);
  document.getElementById('app').innerHTML =
    `<div class="boot"><div class="boot-logo">⚠️</div><div class="boot-text">Failed to load database.<br/>${err.message}</div></div>`;
});
