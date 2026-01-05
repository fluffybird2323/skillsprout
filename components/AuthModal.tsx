import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../store/useStore';
import { X, Mail, Lock, User as UserIcon, Loader2 } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
}

const EMOJIS = ['👤', '🚀', '🧠', '🎨', '🧪', '🧬', '💻', '🌟', '🔥', '🌈', '⚡️', '🦄'];

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialMode = 'login' }) => {
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
        throw new Error(data.error || 'Authentication failed');
      }

      store.login(data.user, data.token);
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
      <div className="relative w-full max-w-md bg-gravity-light dark:bg-gravity-dark border border-gravity-border-light dark:border-gravity-border-dark rounded-[32px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="p-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-black tracking-tight text-gravity-text-main-light dark:text-gravity-text-main-dark">
              {mode === 'login' ? 'Welcome Back' : 'Create Account'}
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
                    Full Name
                  </label>
                  <div className="relative group">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gravity-text-sub-light dark:text-gravity-text-sub-dark group-focus-within:text-gravity-blue transition-colors" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-black/5 dark:bg-white/5 border border-gravity-border-light dark:border-gravity-border-dark rounded-2xl focus:border-gravity-blue focus:ring-4 focus:ring-gravity-blue/10 outline-none transition-all font-medium"
                      placeholder="John Doe"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gravity-text-sub-light dark:text-gravity-text-sub-dark ml-1">
                    Choose Your Avatar
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
                Email Address
              </label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gravity-text-sub-light dark:text-gravity-text-sub-dark group-focus-within:text-gravity-blue transition-colors" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-black/5 dark:bg-white/5 border border-gravity-border-light dark:border-gravity-border-dark rounded-2xl focus:border-gravity-blue focus:ring-4 focus:ring-gravity-blue/10 outline-none transition-all font-medium"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gravity-text-sub-light dark:text-gravity-text-sub-dark ml-1">
                Password
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
                mode === 'login' ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              className="text-sm font-bold text-gravity-text-sub-light dark:text-gravity-text-sub-dark hover:text-gravity-blue transition-colors"
            >
              {mode === 'login' ? (
                <>
                  Don't have an account? <span className="text-gravity-blue">Sign up</span>
                </>
              ) : (
                <>
                  Already have an account? <span className="text-gravity-blue">Sign in</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
