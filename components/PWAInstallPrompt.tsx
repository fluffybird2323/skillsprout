import React, { useEffect, useState } from 'react';
import { X, Download, Smartphone } from 'lucide-react';
import { useStore } from '../store/useStore';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PWAInstallPrompt: React.FC = () => {
  const { theme } = useStore();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const promptIntervalMs = 24 * 60 * 60 * 1000;

  useEffect(() => {
    // Check if already installed
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes('android-app://');

    setIsStandalone(isInStandaloneMode);

    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(iOS);

    const legacyPrompted = localStorage.getItem('pwa-install-prompted');
    const promptedAtRaw = localStorage.getItem('pwa-install-prompted-at');
    const lastPromptAt = promptedAtRaw ? parseInt(promptedAtRaw, 10) : 0;
    const now = Date.now();
    const shouldThrottle = !!lastPromptAt && now - lastPromptAt < promptIntervalMs;
    const hasInstalled = localStorage.getItem('pwa-installed');

    if (hasInstalled || isInStandaloneMode) {
      return;
    }

    // For Android/Desktop - wait for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);

      if (!shouldThrottle) {
        setTimeout(() => {
          setShowPrompt(true);
          localStorage.setItem('pwa-install-prompted-at', Date.now().toString());
        }, 3000); // Wait 3 seconds before showing
      }
    };

    if (iOS && !shouldThrottle && !isInStandaloneMode) {
      setTimeout(() => {
        setShowPrompt(true);
        localStorage.setItem('pwa-install-prompted-at', Date.now().toString());
      }, 3000);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for successful installation
    window.addEventListener('appinstalled', () => {
      localStorage.setItem('pwa-installed', 'true');
      setShowPrompt(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      localStorage.setItem('pwa-installed', 'true');
    }

    localStorage.setItem('pwa-install-prompted-at', Date.now().toString());
    setShowPrompt(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    localStorage.setItem('pwa-install-prompted-at', Date.now().toString());
    setShowPrompt(false);
  };

  // Don't show if already installed or dismissed
  if (!showPrompt || isStandalone) {
    return null;
  }

  // iOS Install Instructions
  if (isIOS) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom duration-300 md:left-auto md:right-4 md:max-w-sm">
        <div className="bg-white dark:bg-gravity-surface-dark rounded-2xl shadow-2xl border border-gray-200 dark:border-gravity-border-dark p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
              <Smartphone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-bold text-gray-900 dark:text-gravity-text-main-dark text-sm">
                  Install SkillSprout
                </h3>
                <button
                  onClick={handleDismiss}
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-gray-600 dark:text-gravity-text-sub-dark mb-3">
                Install this app on your iPhone: tap{' '}
                <span className="inline-flex items-center justify-center w-5 h-5 mx-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" />
                  </svg>
                </span>
                and then <strong>Add to Home Screen</strong>.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Android/Desktop Install Prompt
  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom duration-300 md:left-auto md:right-4 md:max-w-sm">
      <div className="bg-white dark:bg-gravity-surface-dark rounded-2xl shadow-2xl border border-gray-200 dark:border-gravity-border-dark p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
            <Download className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-bold text-gray-900 dark:text-gravity-text-main-dark text-sm">
                Install SkillSprout
              </h3>
              <button
                onClick={handleDismiss}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-600 dark:text-gravity-text-sub-dark mb-3">
              Install the app for a better experience with offline access and faster loading.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleInstallClick}
                className="flex-1 px-3 py-2 bg-blue-600 dark:bg-gravity-blue text-white rounded-lg text-xs font-medium hover:bg-blue-700 dark:hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
              >
                <Download className="w-3 h-3" />
                Install
              </button>
              <button
                onClick={handleDismiss}
                className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
