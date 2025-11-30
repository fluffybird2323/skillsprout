import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useStore } from '../../store/useStore';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useStore();

  return (
    <button
      onClick={toggleTheme}
      className="fixed top-6 right-6 z-50 p-3 rounded-full bg-gravity-surface-light dark:bg-gravity-surface-dark border border-gravity-border-light dark:border-gravity-border-dark shadow-lg transition-all hover:scale-110 group"
      aria-label="Toggle Theme"
    >
      {theme === 'light' ? (
        <Moon className="w-5 h-5 text-gravity-text-main-light group-hover:text-gravity-blue" />
      ) : (
        <Sun className="w-5 h-5 text-gravity-text-main-dark group-hover:text-gravity-accent" />
      )}
    </button>
  );
};
