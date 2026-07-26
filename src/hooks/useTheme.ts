import { useEffect, useState } from 'react';

export type ThemeName = 'dark' | 'light' | 'exterior' | 'sky' | 'aero';

const readTheme = (): ThemeName => {
  if (typeof window === 'undefined') return 'dark';
  const saved = localStorage.getItem('theme');
  if (saved === 'light' || saved === 'exterior' || saved === 'dark' || saved === 'sky' || saved === 'aero') {
    return saved;
  }
  return 'dark';
};

/**
 * Lee el tema activo y se actualiza en vivo cuando cambia (ThemeToggle
 * dispara el evento 'themechange'). Se usa donde el renderizado
 * condicional de React es más fiable que alternar display por CSS —
 * por ejemplo listas grandes, donde algunos navegadores (Safari/iOS) a
 * veces no repintan bien contenido que pasa de display:none a grid al
 * reentrar en un tema ya visitado antes.
 */
export function useTheme(): ThemeName {
  const [theme, setTheme] = useState<ThemeName>(readTheme);

  useEffect(() => {
    const handler = () => setTheme(readTheme());
    window.addEventListener('themechange', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('themechange', handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  return theme;
}
