import { useState, useEffect, useCallback } from 'react';
import { ThemeMode } from '../types';

const THEME_STORAGE_KEY = 'notes_theme';

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        return saved;
      }
    } catch (e) {}
    return 'system';
  });

  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const applyTheme = useCallback((mode: ThemeMode) => {
    const isDarkResolved =
      mode === 'dark' ||
      (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    setIsDark(isDarkResolved);

    if (isDarkResolved) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', isDarkResolved ? '#0f172a' : '#f8fafc');
    }
  }, []);

  const setTheme = useCallback(
    (newTheme: ThemeMode) => {
      setThemeState(newTheme);
      try {
        localStorage.setItem(THEME_STORAGE_KEY, newTheme);
      } catch (e) {}
      applyTheme(newTheme);
    },
    [applyTheme]
  );

  const cycleTheme = useCallback(() => {
    setThemeState((current) => {
      const next: ThemeMode = current === 'light' ? 'dark' : current === 'dark' ? 'system' : 'light';
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch (e) {}
      applyTheme(next);
      return next;
    });
  }, [applyTheme]);

  useEffect(() => {
    applyTheme(theme);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        applyTheme('system');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, applyTheme]);

  return {
    theme,
    isDark,
    setTheme,
    cycleTheme,
  };
}
