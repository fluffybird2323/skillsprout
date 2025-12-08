import React, { useEffect, useState, useCallback } from 'react';
import { Loader2, RefreshCw, X, Zap, AlertTriangle } from 'lucide-react';
import { useStore } from '../store/useStore';
import { AppState, LoadingState } from '../types';

export function useLessonLoader() {
  const store = useStore();

  const initializeLoading = useCallback((chapterTitle: string) => {
    store.setLoadingState({
      phase: 'initializing',
      progress: 0,
      message: 'Loading lesson...',
      chapterTitle,
      chapterId: null,
      startTime: Date.now(),
      retryCount: 0,
      isCached: false,
    });
  }, [store]);

  const updatePhase = useCallback((phase: LoadingState['phase'], message?: string) => {
    const state = store.loadingState;
    if (!state) return;

    store.setLoadingState({
      ...state,
      phase,
      progress: getPhaseProgress(phase),
      message: message || state.message,
    });
  }, [store]);

  const getPhaseProgress = (phase: LoadingState['phase']): number => {
    switch (phase) {
      case 'initializing': return 5;
      case 'searching': return 20;
      case 'checking-cache': return 35;
      case 'generating': return 70;
      case 'finalizing': return 90;
      case 'complete': return 100;
      default: return 0;
    }
  };

  const setError = useCallback((message: string) => {
    const state = store.loadingState;
    if (!state) return;

    store.setLoadingState({
      ...state,
      phase: 'error',
      progress: 0,
      message,
    });
  }, [store]);

  const incrementRetry = useCallback(() => {
    const state = store.loadingState;
    if (!state) return state?.retryCount || 0;

    const newRetryCount = state.retryCount + 1;
    store.setLoadingState({
      ...state,
      retryCount: newRetryCount,
      phase: 'generating',
      message: 'Retrying...',
    });
    return newRetryCount;
  }, [store]);

  return {
    loadingState: store.loadingState,
    initializeLoading,
    updatePhase,
    setError,
    incrementRetry,
  };
}

interface LessonLoaderProps {
  onRetry: () => void;
  onCancel: () => void;
}

// Simplified phases - only essential states
const PHASE_MESSAGES: Record<LoadingState['phase'], string> = {
  'initializing': 'Loading...',
  'searching': 'Searching for context...',
  'checking-cache': 'Loading...',
  'generating': 'Creating lesson...',
  'finalizing': 'Almost ready...',
  'complete': 'Ready!',
  'error': 'Failed',
  'timeout': 'Timeout',
};

// Ultra-lightweight loader component
export const LessonLoader: React.FC<LessonLoaderProps> = ({ onRetry, onCancel }) => {
  const { loadingState } = useStore();
  const [elapsedTime, setElapsedTime] = useState(0);

  // Simple elapsed time tracking
  useEffect(() => {
    if (loadingState.phase === 'generating' || loadingState.phase === 'initializing') {
      const startTime = Date.now();
      const interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [loadingState.phase]);

  // Simple progress animation
  const getProgress = () => {
    switch (loadingState.phase) {
      case 'initializing':
      case 'checking-cache': return 25;
      case 'generating': return 60;
      case 'finalizing': return 90;
      case 'complete': return 100;
      default: return 0;
    }
  };

  if (loadingState.phase === 'complete') {
    return null; // Don't show loader when complete
  }

  return (
    <div className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white/90 dark:bg-gravity-surface-dark/95 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/20 dark:border-gravity-border-dark max-w-sm mx-4">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 dark:bg-gravity-blueDark rounded-full animate-pulse" />
            <span className="text-sm font-medium text-gray-700 dark:text-gravity-text-main-dark">
              {PHASE_MESSAGES[loadingState.phase]}
            </span>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
            <div
              className="bg-blue-500 dark:bg-gravity-blueDark h-1 rounded-full transition-all duration-300"
              style={{ width: `${getProgress()}%` }}
            />
          </div>
        </div>

        {/* Status Message */}
        {loadingState.message && (
          <p className="text-xs text-gray-500 dark:text-gravity-text-sub-dark mb-4 truncate">
            {loadingState.message}
          </p>
        )}

        {/* Error State */}
        {loadingState.phase === 'error' && (
          <div className="mb-4">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-3">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">{loadingState.message || 'Failed to load lesson'}</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={onRetry}
                className="flex-1 bg-blue-500 dark:bg-gravity-blue text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                Retry
              </button>
              <button
                onClick={onCancel}
                className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Timeout State */}
        {loadingState.phase === 'timeout' && (
          <div className="mb-4">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-3">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">Request timed out</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={onRetry}
                className="flex-1 bg-blue-500 dark:bg-gravity-blue text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                Retry
              </button>
              <button
                onClick={onCancel}
                className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Time display for long loads */}
        {elapsedTime > 3 && loadingState.phase === 'generating' && (
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gravity-text-sub-dark">
            <Zap className="w-3 h-3" />
            <span>{elapsedTime}s elapsed</span>
          </div>
        )}
      </div>
    </div>
  );
};