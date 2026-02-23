import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from './store/useStore';
import { Onboarding } from './components/Onboarding';
import { Roadmap } from './components/Roadmap';
import { Lesson } from './components/Lesson';
import { AppState } from './types';
import { Loader2 } from 'lucide-react';
import { ParticleBackground } from './components/ui/ParticleBackground';
import { SettingsMenu } from './components/ui/SettingsMenu';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { AuthModal } from './components/AuthModal';
import { ExploreCourses } from './components/ExploreCourses';
import { Splash } from './components/Splash';
import { CombinedAuth } from './components/CombinedAuth';
import './lib/i18n';

const App: React.FC = () => {
  const { t } = useTranslation();
  const { appState, theme, user, addCourse, switchCourse, courses, isAuthModalOpen, setAuthModalOpen } = useStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle shared course ingress
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sharedCourseId = urlParams.get('courseId');

    if (sharedCourseId) {
      // Check if we already have it
      if (courses.some(c => c.id === sharedCourseId)) {
        switchCourse(sharedCourseId);
        window.history.replaceState({}, '', window.location.pathname);
        return;
      }

      // Fetch from server
      const fetchSharedCourse = async () => {
        try {
          const res = await fetch(`/api/courses/${sharedCourseId}`);
          if (res.ok) {
            const { course, generatedByName } = await res.json();
            addCourse({
              ...course,
              generatedByName: generatedByName || t('common.anonymous')
            });
            // Clear URL
            window.history.replaceState({}, '', window.location.pathname);
          }
        } catch (error) {
          console.error('Error fetching shared course:', error);
        }
      };

      fetchSharedCourse();
    }
  }, [addCourse, switchCourse, courses, t]);

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
      case AppState.SPLASH:
        return <Splash />;

      case AppState.AUTH_REQUIRED:
        return <CombinedAuth />;

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
      case AppState.REVIEW_SESSION:
      case AppState.LESSON_COMPLETE:
        return <Lesson />;
      case AppState.EXPLORE:
        return (
          <div className="flex flex-col md:flex-row min-h-screen">
            <div className="hidden md:block">
              <Roadmap />
            </div>
            <div className="flex-1">
              <ExploreCourses />
            </div>
          </div>
        );
      default:
        return <Onboarding />;
    }
  };

  return (
    <main className="min-h-screen transition-colors duration-300 bg-gravity-light dark:bg-gravity-dark text-gravity-text-main-light dark:text-gravity-text-main-dark font-sans selection:bg-gravity-blue selection:text-white relative overflow-hidden">
      <ParticleBackground />
      <SettingsMenu />
      <PWAInstallPrompt />

      {/* Auth UI */}
      {mounted && !user && appState !== AppState.ONBOARDING && appState !== AppState.SPLASH && appState !== AppState.AUTH_REQUIRED && (
        <button
          onClick={() => setAuthModalOpen(true)}
          className="fixed top-4 right-16 z-[60] px-4 py-2 bg-gravity-blue text-white text-sm font-bold rounded-xl shadow-lg hover:bg-gravity-blue/90 transition-all active:scale-95 flex items-center gap-2"
        >
          <span>{t('auth.signIn')}</span>
        </button>
      )}

      {user && (
        <div className="fixed top-4 right-16 z-[60] flex items-center gap-3 px-3 py-1.5 bg-white/10 dark:bg-black/20 backdrop-blur-md border border-white/10 dark:border-white/5 rounded-2xl">
          <div className="w-8 h-8 flex items-center justify-center bg-gravity-blue text-xl rounded-full shadow-inner">
            {user.emoji}
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-bold leading-none mb-0.5">{user.fullName}</p>
            <p className="text-[10px] text-gravity-text-sub-light dark:text-gravity-text-sub-dark leading-none">{user.xp} XP</p>
          </div>
        </div>
      )}

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />

      <div className="relative z-10 min-h-screen">
        {mounted && renderContent()}
      </div>
    </main>
  );
};

export default App;
