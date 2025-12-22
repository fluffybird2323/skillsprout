import React, { useEffect, useState } from 'react';
import { Moon, Sun, Download } from 'lucide-react';
import { useStore } from '../../store/useStore';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useStore();
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setReady(true);

    const isInStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes('android-app://');

    setIsStandalone(isInStandaloneMode);

    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(iOS);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsStandalone(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        if (typeof window !== 'undefined') {
          localStorage.setItem('pwa-installed', 'true');
        }
        setIsStandalone(true);
      }

      setDeferredPrompt(null);
    } else if (isIOS && typeof window !== 'undefined') {
      alert('To install this app, open the Share menu and tap "Add to Home Screen".');
    }
  };

  return (
    <>
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

      {ready && !isStandalone && (
        <button
          onClick={handleInstallClick}
          className="fixed top-20 right-6 z-50 px-4 py-2 rounded-full bg-gravity-surface-light dark:bg-gravity-surface-dark border border-gravity-border-light dark:border-gravity-border-dark shadow-lg transition-all hover:scale-105 group flex items-center gap-2 text-sm text-gravity-text-main-light dark:text-gravity-text-main-dark"
          aria-label="Install app"
        >
          <Download className="w-4 h-4 text-gravity-text-main-light dark:text-gravity-text-main-dark group-hover:text-gravity-blue dark:group-hover:text-gravity-accent" />
          <span className="hidden md:inline">Install</span>
        </button>
      )}
    </>
  );
};
