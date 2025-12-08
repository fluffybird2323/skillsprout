import React, { useEffect } from 'react';
import { useStore } from './store/useStore';
import { Onboarding } from './components/Onboarding';
import { Roadmap } from './components/Roadmap';
import { Lesson } from './components/Lesson';
import { AppState } from './types';
import { Loader2 } from 'lucide-react';
import { ParticleBackground } from './components/ui/ParticleBackground';
import { ThemeToggle } from './components/ui/ThemeToggle';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';

const App: React.FC = () => {
  const { appState, theme } = useStore();

  // Apply dark mode class to html element
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Register service worker for PWA
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('SW registered:', registration);
          })
          .catch((error) => {
            console.log('SW registration failed:', error);
          });
      });
    }
  }, []);

  const renderContent = () => {
    switch (appState) {
      case AppState.ONBOARDING:
      case AppState.ADD_COURSE:
        return <Onboarding />;

      case AppState.GENERATING_COURSE:
        return (
          <div className="min-h-screen flex flex-col items-center justify-center relative z-10">
             <div className="flex flex-col items-center animate-pulse">
               <Loader2 className="w-8 h-8 animate-spin text-gravity-blue mb-4" />
               <p className="text-sm font-bold text-gravity-text-sub-light dark:text-gravity-text-sub-dark tracking-widest uppercase">Initializing Protocol</p>
            </div>
          </div>
        );

      case AppState.ROADMAP:
      case AppState.LOADING_LESSON:
        return <Roadmap />;
      
      case AppState.LESSON_ACTIVE:
      case AppState.LESSON_COMPLETE:
        return <Lesson />;

      default:
        return <Onboarding />;
    }
  };

  return (
    <main className="min-h-screen transition-colors duration-300 bg-gravity-light dark:bg-gravity-dark text-gravity-text-main-light dark:text-gravity-text-main-dark font-sans selection:bg-gravity-blue selection:text-white relative overflow-hidden">
      <ParticleBackground />
      <ThemeToggle />
      <PWAInstallPrompt />
      <div className="relative z-10 min-h-screen">
         {renderContent()}
      </div>
    </main>
  );
};

export default App;
