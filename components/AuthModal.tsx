import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../store/useStore';
import { X, Mail, Lock, User as UserIcon, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
}

const EMOJIS = ['👤', '🚀', '🧠', '🎨', '🧪', '🧬', '💻', '🌟', '🔥', '🌈', '⚡️', '🦄'];

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialMode = 'login' }) => {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [emoji, setEmoji] = useState(EMOJIS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const store = useStore();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
    const body = mode === 'login' 
      ? { email, password } 
      : { email, password, fullName, emoji };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || t('auth.failed'));
      }

      store.login(data.user, data.token, data.refreshToken);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div 
        className="fixed inset-0 cursor-pointer" 
        onClick={onClose} 
      />
      <div className="relative w-full max-w-md bg-gravity-light dark:bg-gravity-dark border border-gravity-border-light dark:border-gravity-border-dark rounded-[32px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] overflow-hidden animate-in fade-in zoom-in duration-300 max-h-[90vh]">
        <div className="p-8 overflow-y-auto max-h-[90vh]">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-black tracking-tight text-gravity-text-main-light dark:text-gravity-text-main-dark">
              {mode === 'login' ? t('auth.welcomeBack') : t('auth.createAccount')}
            </h2>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-4 text-sm font-medium text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl animate-in shake-in duration-300">
                {error}
              </div>
            )}

            {mode === 'register' && (
              <>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gravity-text-sub-light dark:text-gravity-text-sub-dark ml-1">
                    {t('auth.fullName')}
                  </label>
                  <div className="relative group">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gravity-text-sub-light dark:text-gravity-text-sub-dark group-focus-within:text-gravity-blue transition-colors" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-black/5 dark:bg-white/5 border border-gravity-border-light dark:border-gravity-border-dark rounded-2xl focus:border-gravity-blue focus:ring-4 focus:ring-gravity-blue/10 outline-none transition-all font-medium"
                      placeholder={t('auth.fullNamePlaceholder')}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gravity-text-sub-light dark:text-gravity-text-sub-dark ml-1">
                    {t('auth.chooseAvatar')}
                  </label>
                  <div className="grid grid-cols-6 gap-2 p-3 bg-black/5 dark:bg-white/5 rounded-2xl border border-gravity-border-light dark:border-gravity-border-dark">
                    {EMOJIS.map((e) => (
                      <button
                        key={e}
                        type="button"
                        onClick={() => setEmoji(e)}
                        className={`w-10 h-10 flex items-center justify-center text-xl rounded-xl transition-all ${
                          emoji === e 
                            ? 'bg-gravity-blue text-white scale-110 shadow-lg shadow-gravity-blue/20' 
                            : 'hover:bg-black/10 dark:hover:bg-white/10 opacity-60 hover:opacity-100'
                        }`}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gravity-text-sub-light dark:text-gravity-text-sub-dark ml-1">
                {t('auth.emailAddress')}
              </label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gravity-text-sub-light dark:text-gravity-text-sub-dark group-focus-within:text-gravity-blue transition-colors" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-black/5 dark:bg-white/5 border border-gravity-border-light dark:border-gravity-border-dark rounded-2xl focus:border-gravity-blue focus:ring-4 focus:ring-gravity-blue/10 outline-none transition-all font-medium"
                  placeholder={t('auth.emailPlaceholder')}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gravity-text-sub-light dark:text-gravity-text-sub-dark ml-1">
                {t('auth.password')}
              </label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gravity-text-sub-light dark:text-gravity-text-sub-dark group-focus-within:text-gravity-blue transition-colors" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-black/5 dark:bg-white/5 border border-gravity-border-light dark:border-gravity-border-dark rounded-2xl focus:border-gravity-blue focus:ring-4 focus:ring-gravity-blue/10 outline-none transition-all font-medium"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-gravity-blue hover:bg-gravity-blue/90 text-white font-black rounded-2xl shadow-xl shadow-gravity-blue/25 transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2 mt-4 text-lg"
            >
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                mode === 'login' ? t('auth.signIn') : t('auth.createAccount')
              )}
            </button>
          </form>

          <div className="mt-6 relative flex items-center gap-3">
            <div className="flex-1 h-px bg-gravity-border-light dark:bg-gravity-border-dark" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gravity-text-sub-light dark:text-gravity-text-sub-dark">or</span>
            <div className="flex-1 h-px bg-gravity-border-light dark:bg-gravity-border-dark" />
          </div>

          <div className="mt-4 flex gap-3">
            <a
              href="/api/auth/google"
              className="flex-1 py-4 flex items-center justify-center gap-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-gravity-border-light dark:border-gravity-border-dark rounded-2xl font-bold transition-all active:scale-[0.98] text-gravity-text-main-light dark:text-gravity-text-main-dark"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google
            </a>
            <a
              href="/api/auth/x"
              className="flex-1 py-4 flex items-center justify-center gap-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-gravity-border-light dark:border-gravity-border-dark rounded-2xl font-bold transition-all active:scale-[0.98] text-gravity-text-main-light dark:text-gravity-text-main-dark"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.736-8.857L1.254 2.25H8.08l4.253 5.622 5.91-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              X
            </a>
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              className="text-sm font-bold text-gravity-text-sub-light dark:text-gravity-text-sub-dark hover:text-gravity-blue transition-colors"
            >
              {mode === 'login' ? (
                <>
                  {t('auth.dontHaveAccount')} <span className="text-gravity-blue">{t('auth.signUp')}</span>
                </>
              ) : (
                <>
                  {t('auth.alreadyHaveAccount')} <span className="text-gravity-blue">{t('auth.signIn')}</span>
                </>
              )}
            </button>
          </div>

          <p className="text-center text-[11px] text-gravity-text-sub-light dark:text-gravity-text-sub-dark mt-4">
            By continuing, you agree to our{' '}
            <a href="/terms" target="_blank" className="underline hover:text-gravity-blue transition-colors">Terms of Service</a>
            {' '}and{' '}
            <a href="/privacy" target="_blank" className="underline hover:text-gravity-blue transition-colors">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
};
