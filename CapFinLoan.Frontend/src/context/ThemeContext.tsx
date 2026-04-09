import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextValue {
  theme: Theme;
  toggle: (originX: number, originY: number) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  toggle: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('capfinloan_theme') as Theme) ?? 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
      root.classList.remove('light');
    }
    localStorage.setItem('capfinloan_theme', theme);
  }, [theme]);

  const toggle = (originX: number, originY: number) => {
    // Use View Transitions API if available for the ripple effect
    const next: Theme = theme === 'dark' ? 'light' : 'dark';

    const root = document.documentElement;
    root.style.setProperty('--ripple-x', `${originX}px`);
    root.style.setProperty('--ripple-y', `${originY}px`);

    if (!(document as any).startViewTransition) {
      setTheme(next);
      return;
    }

    (document as any).startViewTransition(() => {
      setTheme(next);
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
