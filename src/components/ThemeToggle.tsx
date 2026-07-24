import React, { useEffect, useState } from 'react';
import { Moon, Palette, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';

type Theme = 'dark' | 'light' | 'aero';

export const ThemeToggle: React.FC = () => {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme') as Theme | null;
      return saved === 'dark' || saved === 'light' || saved === 'aero' ? saved : 'dark';
    }
    return 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('light', theme === 'light');
    root.classList.toggle('aero', theme === 'aero');
    root.classList.toggle('dark', theme === 'aero');
    localStorage.setItem('theme', theme);

    const themeColor = theme === 'light' ? '#ffffff' : theme === 'aero' ? '#17243a' : '#18202e';
    document.querySelectorAll('meta[name="theme-color"]').forEach(el => {
      (el as HTMLMetaElement).content = themeColor;
    });
  }, [theme]);

  const nextTheme: Theme = theme === 'dark' ? 'light' : theme === 'light' ? 'aero' : 'dark';
  const nextLabel = nextTheme === 'aero' ? 'Activar tema Aero' : nextTheme === 'light' ? 'Activar tema claro' : 'Activar tema oscuro clásico';

  return (
    <button
      onClick={() => setTheme(nextTheme)}
      className={cn(
        'shrink-0 flex items-center justify-center h-10 w-10 rounded-lg border-2 transition-colors',
        theme === 'dark'
          ? 'bg-secondary border-muted-foreground/40 text-warning hover:bg-secondary/80'
          : theme === 'aero'
          ? 'bg-secondary border-primary/40 text-primary hover:bg-secondary/80'
          : 'bg-muted border-border text-foreground hover:bg-muted/80'
      )}
      aria-label={nextLabel}
      title={nextLabel}
    >
      {theme === 'dark' ? (
        <Sun className="h-5 w-5" />
      ) : theme === 'aero' ? (
        <Palette className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </button>
  );
};
