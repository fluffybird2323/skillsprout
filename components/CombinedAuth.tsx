import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../store/useStore';
import { AppState, User } from '../types';
import { Loader2 } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { ParticleBackground } from './ui/ParticleBackground';

export const CombinedAuth: React.FC = () => {
    const { t } = useTranslation();
    const { login, courses, setAppState } = useStore();
    const [isLogin, setIsLogin] = useState(false);
    const [loading, setLoading] = useState(false);

    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password || (!isLogin && !username)) return;

        setLoading(true);
        try {
            // Simulate real auth call
            await new Promise(resolve => setTimeout(resolve, 800));

            const mockUser: User = {
                id: `usr_${Date.now()}`,
                email,
                fullName: username || email.split('@')[0],
                emoji: '👋',
                xp: 0,
                streak: 0,
                hearts: 5
            };

            login(mockUser, `tok_${Date.now()}`);
            toast.success(t('auth.welcomeToast', 'Welcome! Let\'s build your first course 🎉'), { duration: 3000 });

            // Wait for toast to be readable before redirecting
            setTimeout(() => {
                if (courses.length > 0) {
                    setAppState(AppState.ROADMAP);
                } else {
                    setAppState(AppState.ONBOARDING); // Equivalent to starting generation
                }
            }, 1500);

        } catch (err) {
            toast.error(t('auth.error', 'Something went wrong - please try again'));
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-6 bg-gravity-light dark:bg-gravity-dark overflow-hidden">
            <ParticleBackground />
            <Toaster position="top-center" />

            <div className="relative z-10 w-full max-w-md bg-white/70 dark:bg-black/40 backdrop-blur-xl rounded-[32px] p-8 shadow-[0_8px_32px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/40 dark:border-white/10 transition-colors duration-500">

                <div className="flex flex-col items-center mb-8">
                    <img
                        src="/AppImages/android/android-launchericon-192-192.png"
                        alt="Manabu Logo"
                        className="w-16 h-16 rounded-2xl shadow-lg mb-4 object-contain"
                    />
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white transition-colors duration-300">
                        {t('auth.welcome')}
                    </h2>
                    <p className="text-sm text-gravity-text-sub-light dark:text-gravity-text-sub-dark text-center mt-2">
                        {t('auth.subtitle')}
                    </p>
                </div>

                <div className="flex p-1 bg-black/5 dark:bg-white/5 backdrop-blur-md rounded-xl mb-6 transition-colors duration-300 border border-white/20 dark:border-white/5">
                    <button
                        onClick={() => setIsLogin(false)}
                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${!isLogin ? 'bg-white/90 dark:bg-white/10 shadow-sm text-gray-900 dark:text-white backdrop-blur-md' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                    >
                        {t('auth.createTab', 'Create Account')}
                    </button>
                    <button
                        onClick={() => setIsLogin(true)}
                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${isLogin ? 'bg-white/90 dark:bg-white/10 shadow-sm text-gray-900 dark:text-white backdrop-blur-md' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                    >
                        {t('auth.signInTab', 'Sign In')}
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {!isLogin && (
                        <div>
                            <input
                                type="text"
                                placeholder={t('auth.username', 'Username')}
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                className="w-full bg-black/5 dark:bg-white/5 backdrop-blur-sm border border-white/20 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gravity-blue transition-all text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                                required={!isLogin}
                            />
                        </div>
                    )}

                    <div>
                        <input
                            type="email"
                            placeholder={t('auth.email', 'Email field')}
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="w-full bg-black/5 dark:bg-white/5 backdrop-blur-sm border border-white/20 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gravity-blue transition-all text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                            required
                        />
                    </div>

                    <div>
                        <input
                            type="password"
                            placeholder={t('auth.password', 'Password')}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full bg-black/5 dark:bg-white/5 backdrop-blur-sm border border-white/20 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gravity-blue transition-all text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                            required
                        />
                        {!isLogin && password.length > 0 && password.length < 6 && (
                            <p className="text-xs text-orange-500 mt-2 ml-1">
                                {t('auth.passwordHint', 'Should be at least 6 characters')}
                            </p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gravity-blue hover:bg-gravity-blue/90 text-white font-bold py-4 rounded-xl shadow-[0_4px_14px_0_rgba(59,130,246,0.39)] mt-2 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <span>
                                {isLogin
                                    ? t('auth.signInButton', 'Sign In')
                                    : t('auth.createButton', 'Create Account & Start Learning')}
                            </span>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};
