import React, { useEffect, useState, useRef } from 'react';
import { Settings, Moon, Sun, Download, X, Globe, ChevronRight, Check } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useTranslation } from 'react-i18next';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'zh', name: '中文 (简体)', flag: '🇨🇳' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
];

export const SettingsMenu: React.FC = () => {
  const { theme, toggleTheme } = useStore();
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [showLangSelector, setShowLangSelector] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // PWA Logic
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

    // Close menu when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowLangSelector(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      document.removeEventListener('mousedown', handleClickOutside);
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
      alert(t('settings.installInstructions'));
    }
  };

  const changeLanguage = (langCode: string) => {
    i18n.changeLanguage(langCode);
    setShowLangSelector(false);
    // Persist is handled by i18next plugin
  };

  return (
    <div className="fixed top-6 right-6 z-50" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-3 rounded-full bg-gravity-surface-light dark:bg-gravity-surface-dark border border-gravity-border-light dark:border-gravity-border-dark shadow-lg transition-all hover:scale-110 group"
        aria-label="Settings"
      >
        <Settings className={`w-6 h-6 text-gravity-text-main-light dark:text-gravity-text-main-dark group-hover:rotate-90 transition-transform duration-500 ${isOpen ? 'rotate-90 text-gravity-blue' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-16 right-0 w-72 bg-gravity-surface-light dark:bg-gravity-surface-dark border border-gravity-border-light dark:border-gravity-border-dark rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="p-4 border-b border-gravity-border-light dark:border-gravity-border-dark flex justify-between items-center">
            <h3 className="font-bold text-lg text-gravity-text-main-light dark:text-gravity-text-main-dark">
              {showLangSelector ? (
                <button 
                  onClick={() => setShowLangSelector(false)}
                  className="flex items-center gap-2 hover:text-gravity-blue"
                >
                   <ChevronRight className="w-5 h-5 rotate-180" />
                   {t('settings.language')}
                </button>
              ) : t('settings.title')}
            </h3>
            <button onClick={() => setIsOpen(false)} className="text-gravity-text-sub-light dark:text-gravity-text-sub-dark hover:text-gravity-text-main-light dark:hover:text-gravity-text-main-dark">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-2">
            {showLangSelector ? (
              <div className="max-h-80 overflow-y-auto">
                 {LANGUAGES.map(lang => (
                   <button
                     key={lang.code}
                     onClick={() => changeLanguage(lang.code)}
                     className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors ${i18n.language === lang.code ? 'bg-gravity-blue/10 text-gravity-blue' : 'hover:bg-black/5 dark:hover:bg-white/5 text-gravity-text-main-light dark:text-gravity-text-main-dark'}`}
                   >
                     <div className="flex items-center gap-3">
                       <span className="text-xl">{lang.flag}</span>
                       <span className="font-medium">{lang.name}</span>
                     </div>
                     {i18n.language === lang.code && <Check className="w-4 h-4" />}
                   </button>
                 ))}
              </div>
            ) : (
              <div className="space-y-1">
                {/* Theme Toggle */}
                <button
                  onClick={toggleTheme}
                  className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                      {theme === 'light' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    </div>
                    <span className="font-medium text-gravity-text-main-light dark:text-gravity-text-main-dark">{t('settings.theme')}</span>
                  </div>
                  <div className="text-sm text-gravity-text-sub-light dark:text-gravity-text-sub-dark group-hover:text-gravity-blue">
                    {theme === 'light' ? t('theme.light') : t('theme.dark')}
                  </div>
                </button>

                {/* Language Selector Trigger */}
                <button
                  onClick={() => setShowLangSelector(true)}
                  className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400">
                      <Globe className="w-5 h-5" />
                    </div>
                    <span className="font-medium text-gravity-text-main-light dark:text-gravity-text-main-dark">{t('settings.language')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gravity-text-sub-light dark:text-gravity-text-sub-dark group-hover:text-gravity-blue">
                    <span>{LANGUAGES.find(l => l.code === i18n.language)?.name || i18n.language.toUpperCase()}</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </button>

                {/* Install App */}
                {ready && !isStandalone && (deferredPrompt || isIOS) && (
                  <button
                    onClick={handleInstallClick}
                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                        <Download className="w-5 h-5" />
                      </div>
                      <span className="font-medium text-gravity-text-main-light dark:text-gravity-text-main-dark">{t('settings.install')}</span>
                    </div>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
