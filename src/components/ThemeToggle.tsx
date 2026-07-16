import React, { useEffect, useState } from 'react';
import { Moon, Sun, Contrast } from 'lucide-react';
import { cn } from '@/lib/utils';

type Theme = 'dark' | 'light' | 'exterior';

const CYCLE: Record<Theme, Theme> = { dark: 'light', light: 'exterior', exterior: 'dark' };

const LABEL: Record<Theme, string> = {
  dark: 'Tema oscuro (toca para claro)',
  light: 'Tema claro (toca para exterior)',
  exterior: 'Modo exterior alto contraste (toca para oscuro)',
};

export const ThemeToggle: React.FC = () => {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved === 'light' || saved === 'exterior' || saved === 'dark') return saved;
    }
    return 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    // 'exterior' es una variante de alto contraste sobre el tema claro
    root.classList.toggle('light', theme === 'light' || theme === 'exterior');
    root.classList.toggle('exterior', theme === 'exterior');
    localStorage.setItem('theme', theme);

    const themeColor = theme === 'dark' ? '#18202e' : '#ffffff';
    document.querySelectorAll('meta[name="theme-color"]').forEach(el => {
      (el as HTMLMetaElement).content = themeColor;
    });
  }, [theme]);

  return (
    <button
      onClick={() => setTheme(CYCLE[theme])}
      className={cn(
        'shrink-0 flex items-center justify-center h-10 w-10 rounded-lg border-2 transition-colors',
        theme === 'dark' && 'bg-secondary border-muted-foreground/40 text-warning hover:bg-secondary/80',
        theme === 'light' && 'bg-muted border-border text-foreground hover:bg-muted/80',
        theme === 'exterior' && 'bg-foreground text-background border-foreground'
      )}
      aria-label={LABEL[theme]}
      title={LABEL[theme]}
    >
      {theme === 'dark' && <Sun className="h-5 w-5" />}
      {theme === 'light' && <Contrast className="h-5 w-5" />}
      {theme === 'exterior' && <Moon className="h-5 w-5" />}
    </button>
  );
};
