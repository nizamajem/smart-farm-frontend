'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

export type ThemePref = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'smartfarm_theme';

/** Dijalankan sebelum React dimuat agar halaman tidak berkedip saat memakai mode gelap. */
export const themeInitScript = `(function(){try{var p=localStorage.getItem('${STORAGE_KEY}')||'system';var d=p==='dark'||(p==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light';}catch(e){}})();`;

const ThemeContext = createContext<{ pref: ThemePref; setPref: (p: ThemePref) => void } | null>(null);

function apply(pref: ThemePref) {
  const dark = pref === 'dark' || (pref === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [pref, setPrefState] = useState<ThemePref>('system');

  useEffect(() => {
    try {
      setPrefState((localStorage.getItem(STORAGE_KEY) as ThemePref) || 'system');
    } catch {}
  }, []);

  useEffect(() => {
    apply(pref);
    if (pref !== 'system') return;
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => apply('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [pref]);

  const setPref = useCallback((p: ThemePref) => {
    setPrefState(p);
    try {
      localStorage.setItem(STORAGE_KEY, p);
    } catch {}
  }, []);

  return <ThemeContext.Provider value={{ pref, setPref }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme harus dipakai di dalam ThemeProvider');
  return ctx;
}
