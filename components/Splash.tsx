import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../store/useStore';
import { AppState } from '../types';

export const Splash: React.FC = () => {
    const { t } = useTranslation();
    const { setAppState, user } = useStore();
    const [phase, setPhase] = useState(0);

    useEffect(() => {
        const timers = [
            setTimeout(() => setPhase(1), 1500), // icons appear
            setTimeout(() => setPhase(2), 3000), // tagline appears
            setTimeout(() => {
                setPhase(3);
                // After 4-5s, check auth and transition
                setTimeout(() => {
                    if (user) {
                        setAppState(AppState.ROADMAP);
                    } else {
                        setAppState(AppState.AUTH_REQUIRED);
                    }
                }, 1000);
            }, 4000)
        ];

        return () => timers.forEach(clearTimeout);
    }, [setAppState, user]);

    const skipSplash = () => {
        if (user) {
            setAppState(AppState.ROADMAP);
        } else {
            setAppState(AppState.AUTH_REQUIRED);
        }
    };

    return (
        <div
            onClick={skipSplash}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gravity-light dark:bg-gravity-dark cursor-pointer transition-colors duration-1000"
        >
            <div className="relative flex flex-col items-center justify-center h-full w-full max-w-md p-6">

                <div className={`motion-safe:transition-all motion-reduce:transition-opacity duration-1000 ease-in-out ${phase >= 0 ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
                    <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gravity-blue to-purple-500 tracking-tight">
                        {t('splash.title', 'Manabu')}
                    </h1>
                </div>

                {/* Subjects (Science, Arts, Code) */}
                <div className={`absolute motion-safe:transition-all motion-reduce:transition-opacity duration-1000 flex items-center justify-center gap-12 mt-32 w-full
            ${phase >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>

                    {/* Glowing connections background */}
                    <div className="absolute top-1/2 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-transparent via-gravity-blue/30 to-transparent -z-10 blur-[1px]" />

                    <div className="flex flex-col items-center gap-2 motion-safe:animate-float-slow">
                        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center text-2xl shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                            ⚛️
                        </div>
                    </div>
                    <div className="flex flex-col items-center gap-2 motion-safe:animate-float px-2">
                        <div className="w-14 h-14 rounded-2xl bg-purple-500/10 dark:bg-purple-500/20 flex items-center justify-center text-3xl shadow-[0_0_20px_rgba(168,85,247,0.2)]">
                            🎨
                        </div>
                    </div>
                    <div className="flex flex-col items-center gap-2 motion-safe:animate-float-slow" style={{ animationDelay: '0.5s' }}>
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center text-2xl shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                            💻
                        </div>
                    </div>
                </div>

                {/* Tagline */}
                <div className={`absolute bottom-1/4 motion-safe:transition-all motion-reduce:transition-opacity duration-1000 ease-out text-center px-8
           ${phase >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                    <p className="text-xl font-medium text-gravity-text-main-light dark:text-gravity-text-main-dark mb-2">
                        {t('splash.question', 'What do you want to learn today?')}
                    </p>
                    <p className={`text-sm text-gravity-text-sub-light dark:text-gravity-text-sub-dark transition-all duration-500
             ${phase >= 3 ? 'opacity-100 text-gravity-blue dark:text-gravity-blue ' : 'opacity-70'}`}>
                        {t('splash.tagline', 'AI will design your journey.')}
                    </p>
                </div>

            </div>
        </div>
    );
};
