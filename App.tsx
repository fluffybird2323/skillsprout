import React, { useEffect } from 'react';
import { useStore } from './store/useStore';
import { Onboarding } from './components/Onboarding';
import { Roadmap } from './components/Roadmap';
import { Lesson } from './components/Lesson';
import { AppState } from './types';
import { Loader2 } from 'lucide-react';
import { ParticleBackground } from './components/ui/ParticleBackground';
import { ThemeToggle } from './components/ui/ThemeToggle';

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

  const renderContent = () => {
    switch (appState) {
      case AppState.ONBOARDING:
      case AppState.ADD_COURSE:
        return <Onboarding />;

      case AppState.GENERATING_COURSE:
        return (
          <div className="min-h-screen flex flex-col items-center justify-center relative z-10">
            <div className="bg-gravity-surface-light dark:bg-gravity-surface-dark p-8 rounded-3xl shadow-xl flex flex-col items-center border border-gravity-border-light dark:border-gravity-border-dark">
               <Loader2 className="w-12 h-12 animate-spin text-gravity-blue mb-6" />
               <p className="text-xl font-bold text-gravity-text-main-light dark:text-gravity-text-main-dark mb-2">Generating Protocol</p>
               <p className="text-gravity-text-sub-light dark:text-gravity-text-sub-dark font-mono text-sm">Consulting Neural Net...</p>
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
      <div className="relative z-10 min-h-screen">
         {renderContent()}
      </div>
    </main>
  );
};

export default App;
