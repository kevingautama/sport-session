// Tiny app store: holds the navigation state, a "version" that bumps after every
// DB write so screens re-query, and a toast. No external state lib needed.
import { createContext, useContext, useState, useCallback } from 'react';

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const [tab, setTab] = useState('home'); // home | history | new | friends | stats | settings
  const [version, setVersion] = useState(0);
  const [toast, setToast] = useState(null);

  // Call after any DB mutation to force dependent screens to re-read.
  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }, []);

  const navigate = useCallback((next) => {
    setTab(next);
    // scroll the content region back to top on navigation
    requestAnimationFrame(() => {
      const el = document.querySelector('.scroll');
      if (el) el.scrollTop = 0;
    });
  }, []);

  const value = { tab, navigate, version, refresh, toast, showToast };
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
