import React, { useState } from 'react';
import { Loader2, Sparkles, Brain, X, Coffee, Zap, Flame } from 'lucide-react';
import { Button } from './ui/Button';
import { useStore } from '../store/useStore';
import { generateCourseOutline } from '../services/ai';
import { AppState, CourseDepth } from '../types';

export const Onboarding: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [depth, setDepth] = useState<CourseDepth>('serious');
  const [loading, setLoading] = useState(false);
  const store = useStore();
  
  const isAdding = store.appState === AppState.ADD_COURSE;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setLoading(true);
    setAppState(AppState.GENERATING_COURSE);
    
    try {
      const course = await generateCourseOutline(topic, depth);
      store.addCourse(course);
    } catch (error) {
      console.error(error);
      setLoading(false);
      store.setAppState(isAdding ? AppState.ADD_COURSE : AppState.ONBOARDING);
      alert("Oops! AI had a hiccup. Try again.");
    }
  };
  
  const setAppState = store.setAppState;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-700">
      
      {isAdding && (
        <button 
          onClick={() => setAppState(AppState.ROADMAP)}
          className="absolute top-24 right-6 p-2 rounded-full bg-gravity-surface-light dark:bg-gravity-surface-dark hover:scale-105 transition-transform text-gravity-text-sub-light dark:text-gravity-text-sub-dark shadow-sm border border-gravity-border-light dark:border-gravity-border-dark"
        >
           <X className="w-6 h-6" />
        </button>
      )}

      <div className="max-w-xl w-full space-y-10">
        
        {/* Header Section */}
        <div className="space-y-4">
           <h1 className="text-5xl md:text-7xl font-black tracking-tight text-gravity-text-main-light dark:text-gravity-text-main-dark">
             {isAdding ? "New Course" : "Start Learning"}
           </h1>
           <p className="text-xl text-gravity-text-sub-light dark:text-gravity-text-sub-dark font-light max-w-lg mx-auto">
             What do you want to learn today? <br/>AI will design your journey.
           </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* Main Input */}
          <div className="relative group">
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Quantum Computing, React.js..."
              className="w-full p-6 text-xl bg-transparent border-b-2 border-gravity-border-light dark:border-gravity-border-dark text-gravity-text-main-light dark:text-gravity-text-main-dark placeholder-gravity-text-sub-light/50 dark:placeholder-gravity-text-sub-dark/50 focus:outline-none focus:border-gravity-blue transition-all font-bold text-center tracking-tight"
              disabled={loading}
              autoFocus
            />
          </div>

          {/* Depth Cards */}
          <div className="grid grid-cols-3 gap-4">
             {(['casual', 'serious', 'obsessed'] as CourseDepth[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDepth(d)}
                  className={`p-6 rounded-2xl flex flex-col items-center gap-3 transition-all duration-200 border
                    ${depth === d 
                      ? 'bg-gravity-blue text-white shadow-lg border-gravity-blue transform scale-105' 
                      : 'bg-gravity-surface-light dark:bg-gravity-surface-dark text-gravity-text-sub-light dark:text-gravity-text-sub-dark border-gravity-border-light dark:border-gravity-border-dark hover:bg-gray-100 dark:hover:bg-gray-800'}
                  `}
                >
                   {d === 'casual' && <Coffee className="w-6 h-6" />}
                   {d === 'serious' && <Zap className="w-6 h-6" />}
                   {d === 'obsessed' && <Flame className="w-6 h-6" />}
                   <span className="text-xs font-bold uppercase tracking-widest">{d}</span>
                </button>
             ))}
          </div>
          
          {/* Action Button */}
          <Button 
            type="submit" 
            fullWidth 
            variant="primary" 
            size="lg"
            disabled={loading || !topic}
            className="h-16 text-lg rounded-full shadow-xl shadow-gravity-blue/20"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="animate-spin" /> Constructing...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Sparkles className="w-5 h-5" /> {isAdding ? "Generate New Course" : "Start Learning"}
              </span>
            )}
          </Button>
        </form>

        {/* Footer Icons */}
        <div className="flex justify-center gap-8 opacity-40 grayscale hover:grayscale-0 transition-all duration-500">
           <div className="flex flex-col items-center gap-2">
             <div className="w-10 h-10 bg-gravity-surface-light dark:bg-gravity-surface-dark rounded-xl flex items-center justify-center text-xl shadow-sm">⚛️</div>
             <span className="text-[10px] font-bold text-gravity-text-sub-light dark:text-gravity-text-sub-dark uppercase">Science</span>
           </div>
           <div className="flex flex-col items-center gap-2">
             <div className="w-10 h-10 bg-gravity-surface-light dark:bg-gravity-surface-dark rounded-xl flex items-center justify-center text-xl shadow-sm">🎨</div>
             <span className="text-[10px] font-bold text-gravity-text-sub-light dark:text-gravity-text-sub-dark uppercase">Arts</span>
           </div>
           <div className="flex flex-col items-center gap-2">
             <div className="w-10 h-10 bg-gravity-surface-light dark:bg-gravity-surface-dark rounded-xl flex items-center justify-center text-xl shadow-sm">💻</div>
             <span className="text-[10px] font-bold text-gravity-text-sub-light dark:text-gravity-text-sub-dark uppercase">Code</span>
           </div>
        </div>
      </div>
    </div>
  );
};
