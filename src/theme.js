// Theme controller: 'system' | 'light' | 'dark', persisted in the settings table.
// Applies by toggling the `.dark` class on <html> (the shadcn dark variant).
import { getSetting, setSetting } from './db.js';

let mql = null;

function prefersDark() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function resolveDark(theme) {
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  return prefersDark(); // 'system'
}

export function getTheme() {
  return getSetting('theme', 'system');
}

function paint(theme) {
  document.documentElement.classList.toggle('dark', resolveDark(theme));
}

/** Apply the stored theme and start reacting to OS changes while on 'system'. */
export function initTheme() {
  paint(getTheme());
  if (!mql && window.matchMedia) {
    mql = window.matchMedia('(prefers-color-scheme: dark)');
    mql.addEventListener('change', () => {
      if (getTheme() === 'system') paint('system');
    });
  }
}

export function setTheme(theme) {
  setSetting('theme', theme);
  paint(theme);
}
