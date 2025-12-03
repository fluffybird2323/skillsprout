import React, { useEffect, useState, useCallback } from 'react';
import { Loader2, RefreshCw, X, Zap, AlertTriangle, Clock } from 'lucide-react';
import { useStore } from '../store/useStore';
import { AppState, LoadingState, DEFAULT_LOADER_CONFIG } from '../types';

interface LessonLoaderProps {
  onRetry: () => void;
  onCancel: () => void;
}

const PHASE_MESSAGES: Record<LoadingState['phase'], string> = {
  'initializing': 'Preparing...',
  'checking-cache': 'Checking cache...',
  'generating': 'Generating...',
  'finalizing': 'Almost ready...',
  'complete': 'Ready!',
  'error': 'Failed',
  'timeout': 'Timeout',
};

const PHASE_PROGRESS: Record<LoadingState['phase'], number> = {
  'initializing': 10,
  'checking-cache': 25,
  'generating': 50,
  'finalizing': 85,
  'complete': 100,
  'error': 0,
  'timeout': 0,
};

export const LessonLoader: React.FC<LessonLoaderProps> = ({ onRetry, onCancel }) => {
  const { loadingState } = useStore();
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showSlowWarning, setShowSlowWarning] = useState(false);
  const [animatedProgress, setAnimatedProgress] = useState(0);

  // Update elapsed time
  useEffect(() => {
    if (!loadingState?.startTime) return;

    const interval = setInterval(() => {
      const elapsed = Date.now() - loadingState.startTime;
      setElapsedTime(elapsed);

      if (elapsed > DEFAULT_LOADER_CONFIG.slowThreshold && !showSlowWarning) {
        setShowSlowWarning(true);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [loadingState?.startTime, showSlowWarning]);

  // Animate progress bar smoothly
  useEffect(() => {
    if (!loadingState) return;

    const targetProgress = loadingState.progress || PHASE_PROGRESS[loadingState.phase];

    const animationInterval = setInterval(() => {
      setAnimatedProgress((prev) => {
        if (prev < targetProgress) {
          return Math.min(prev + 2, targetProgress);
        }
        return prev;
      });
    }, 20);

    return () => clearInterval(animationInterval);
  }, [loadingState?.progress, loadingState?.phase]);

  // Reset states when loading starts
  useEffect(() => {
    if (loadingState?.phase === 'initializing') {
      setShowSlowWarning(false);
      setAnimatedProgress(0);
      setElapsedTime(0);
    }
  }, [loadingState?.phase]);

  if (!loadingState) return null;

  const { phase, message, chapterTitle, retryCount, error, isCached } = loadingState;
  const isError = phase === 'error';
  const isTimeout = phase === 'timeout';
  const displayMessage = message || PHASE_MESSAGES[phase];

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    return `${seconds}s`;
  };

  return (
    <div className="absolute left-1/2 -translate-x-1/2 top-full mt-3 z-50 w-64">
      {/* Compact popup card */}
      <div
        className={`
          p-4 rounded-xl shadow-2xl transition-all duration-200
          ${isError || isTimeout
            ? 'bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800'
            : isCached
              ? 'bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800'
              : 'bg-gravity-surface-light dark:bg-gravity-surface-dark border border-gravity-border-light dark:border-gravity-border-dark'
          }
        `}
      >
        {/* Arrow pointer */}
        <div
          className={`
            absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45 border-l border-t
            ${isError || isTimeout
              ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
              : isCached
                ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
                : 'bg-gravity-surface-light dark:bg-gravity-surface-dark border-gravity-border-light dark:border-gravity-border-dark'
            }
          `}
        />

        {/* Header row */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {isError || isTimeout ? (
              <AlertTriangle className="w-4 h-4 text-red-500" />
            ) : isCached ? (
              <Zap className="w-4 h-4 text-gravity-success" />
            ) : (
              <Loader2 className="w-4 h-4 text-gravity-blue animate-spin" />
            )}
            <span
              className={`text-sm font-semibold ${
                isError || isTimeout
                  ? 'text-red-600 dark:text-red-400'
                  : isCached
                    ? 'text-gravity-success'
                    : 'text-gravity-text-main-light dark:text-gravity-text-main-dark'
              }`}
            >
              {isError ? 'Failed' : isTimeout ? 'Timeout' : isCached ? 'Cached!' : 'Loading'}
            </span>
          </div>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded transition-colors"
            aria-label="Cancel"
          >
            <X className="w-4 h-4 text-gravity-text-sub-light dark:text-gravity-text-sub-dark" />
          </button>
        </div>

        {/* Chapter title */}
        {chapterTitle && (
          <p className="text-xs text-gravity-text-sub-light dark:text-gravity-text-sub-dark mb-2 truncate">
            {chapterTitle}
          </p>
        )}

        {/* Progress bar (only show when not error/timeout) */}
        {!isError && !isTimeout && (
          <div className="mb-2">
            <div className="h-1.5 bg-gravity-border-light dark:bg-gravity-border-dark rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-150 ease-out rounded-full ${
                  isCached ? 'bg-gravity-success' : 'bg-gravity-blue'
                }`}
                style={{ width: `${animatedProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Status message */}
        <div className="flex items-center justify-between text-xs">
          <span
            className={`${
              isError || isTimeout
                ? 'text-red-500'
                : 'text-gravity-text-sub-light dark:text-gravity-text-sub-dark'
            }`}
          >
            {displayMessage}
          </span>
          {!isError && !isTimeout && (
            <span className="flex items-center gap-1 text-gravity-text-sub-light dark:text-gravity-text-sub-dark">
              <Clock className="w-3 h-3" />
              {formatTime(elapsedTime)}
            </span>
          )}
        </div>

        {/* Slow warning */}
        {showSlowWarning && !isError && !isTimeout && !isCached && (
          <div className="mt-2 text-xs text-gravity-accent font-medium">
            Taking longer than usual...
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mt-2 text-xs text-red-500 font-mono break-words">
            {error.length > 50 ? error.substring(0, 50) + '...' : error}
          </div>
        )}

        {/* Retry info */}
        {retryCount > 0 && !isError && !isTimeout && (
          <div className="mt-1 text-xs text-gravity-text-sub-light dark:text-gravity-text-sub-dark">
            Retry {retryCount}/{DEFAULT_LOADER_CONFIG.maxRetries}
          </div>
        )}

        {/* Action buttons for error/timeout */}
        {(isError || isTimeout) && (
          <div className="flex gap-2 mt-3">
            <button
              onClick={onCancel}
              className="flex-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-gravity-surface-light dark:bg-gravity-surface-dark border border-gravity-border-light dark:border-gravity-border-dark text-gravity-text-main-light dark:text-gravity-text-main-dark hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onRetry}
              className="flex-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-gravity-blue text-white hover:bg-blue-600 transition-colors flex items-center justify-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </button>
          </div>
        )}

        {/* Phase dots */}
        {!isError && !isTimeout && (
          <div className="flex justify-center gap-1.5 mt-3">
            {['initializing', 'checking-cache', 'generating', 'finalizing'].map((p, idx) => {
              const phases = ['initializing', 'checking-cache', 'generating', 'finalizing'];
              const currentIdx = phases.indexOf(phase);
              const isActive = idx === currentIdx;
              const isComplete = idx < currentIdx;

              return (
                <div
                  key={p}
                  className={`
                    w-1.5 h-1.5 rounded-full transition-all duration-200
                    ${isActive ? 'bg-gravity-blue scale-125' : ''}
                    ${isComplete ? 'bg-gravity-success' : ''}
                    ${!isActive && !isComplete ? 'bg-gravity-border-light dark:bg-gravity-border-dark' : ''}
                  `}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// Hook for managing lesson loading with caching and retry logic
export function useLessonLoader() {
  const store = useStore();

  const initializeLoading = useCallback(
    (chapterId: string, chapterTitle: string) => {
      store.setLoadingState({
        phase: 'initializing',
        progress: 0,
        message: 'Preparing...',
        startTime: Date.now(),
        chapterId,
        chapterTitle,
        retryCount: 0,
      });
    },
    [store]
  );

  const updatePhase = useCallback(
    (phase: LoadingState['phase'], message?: string, isCached?: boolean) => {
      const state = store.loadingState;
      if (!state) return;

      store.setLoadingState({
        ...state,
        phase,
        progress: PHASE_PROGRESS[phase],
        message: message || PHASE_MESSAGES[phase],
        isCached,
      });
    },
    [store]
  );

  const setError = useCallback(
    (error: string) => {
      const state = store.loadingState;
      if (!state) return;

      store.setLoadingState({
        ...state,
        phase: 'error',
        progress: 0,
        message: 'Failed to load',
        error,
      });
    },
    [store]
  );

  const setTimeout = useCallback(() => {
    const state = store.loadingState;
    if (!state) return;

    store.setLoadingState({
      ...state,
      phase: 'timeout',
      progress: 0,
      message: 'Request timed out',
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
      message: `Retrying...`,
    });
    return newRetryCount;
  }, [store]);

  const clearLoading = useCallback(() => {
    store.setLoadingState(null);
  }, [store]);

  const cancelLoading = useCallback(() => {
    store.setLoadingState(null);
    store.setAppState(AppState.ROADMAP);
  }, [store]);

  return {
    loadingState: store.loadingState,
    initializeLoading,
    updatePhase,
    setError,
    setTimeout,
    incrementRetry,
    clearLoading,
    cancelLoading,
  };
}
