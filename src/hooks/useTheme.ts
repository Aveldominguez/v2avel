import { useEffect, useState } from 'react';
import { leerTema, type ThemeName } from '@/lib/theme';

export type { ThemeName };

const readTheme = leerTema;

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
