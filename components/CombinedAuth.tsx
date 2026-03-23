import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../store/useStore';
import { AppState } from '../types';
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
            const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
            const body = isLogin
                ? { email, password }
                : { email, password, fullName: username, emoji: '👋' };

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || t('auth.error', 'Something went wrong'));

            login(data.user, data.token, data.refreshToken);
            toast.success(t('auth.welcomeToast', 'Welcome! Let\'s build your first course 🎉'), { duration: 3000 });

            setTimeout(() => {
                if (courses.length > 0) {
                    setAppState(AppState.ROADMAP);
                } else {
                    setAppState(AppState.ONBOARDING);
                }
            }, 1500);

        } catch (err: any) {
            toast.error(err.message || t('auth.error', 'Something went wrong - please try again'));
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-6 bg-gravity-light dark:bg-gravity-dark overflow-hidden">
            <ParticleBackground />
            <Toaster position="top-center" />

            <div className="relative z-10 w-full max-w-md bg-white/70 dark:bg-black/40 backdrop-blur-xl rounded-[32px] p-8 shadow-[0_8px_32px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/40 dark:border-white/10 transition-colors duration-500 overflow-y-auto max-h-[calc(100vh-3rem)]">

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

                <div className="flex items-center gap-3 my-5">
                    <div className="flex-1 h-px bg-black/10 dark:bg-white/10" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">or</span>
                    <div className="flex-1 h-px bg-black/10 dark:bg-white/10" />
                </div>

                <div className="flex gap-3">
                    <a
                        href="/api/auth/google"
                        className="flex-1 py-3 flex items-center justify-center gap-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-black/10 dark:border-white/10 rounded-xl font-bold text-sm transition-all active:scale-[0.98] text-gray-800 dark:text-gray-200"
                    >
                        <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        Google
                    </a>
                    <a
                        href="/api/auth/x"
                        className="flex-1 py-3 flex items-center justify-center gap-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-black/10 dark:border-white/10 rounded-xl font-bold text-sm transition-all active:scale-[0.98] text-gray-800 dark:text-gray-200"
                    >
                        <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.736-8.857L1.254 2.25H8.08l4.253 5.622 5.91-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                        X
                    </a>
                </div>

                <p className="text-center text-[11px] text-gray-400 mt-5">
                    By continuing, you agree to our{' '}
                    <a href="/terms" target="_blank" className="underline hover:text-gray-600 dark:hover:text-gray-200">Terms of Service</a>
                    {' '}and{' '}
                    <a href="/privacy" target="_blank" className="underline hover:text-gray-600 dark:hover:text-gray-200">Privacy Policy</a>
                </p>
            </div>
        </div>
    );
};
