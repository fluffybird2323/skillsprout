import React, { useEffect, useState, useCallback } from 'react';
import { Loader2, RefreshCw, X, Zap, AlertTriangle } from 'lucide-react';
import { useStore } from '../store/useStore';
import { AppState, LoadingState } from '../types';
import { useTranslation } from 'react-i18next';

export function useLessonLoader() {
  const store = useStore();
  const { t } = useTranslation();

  const initializeLoading = useCallback((chapterTitle: string) => {
    store.setLoadingState({
      phase: 'initializing',
      progress: 0,
      message: t('loader.initializing'),
      chapterTitle,
      chapterId: null,
      startTime: Date.now(),
      retryCount: 0,
      isCached: false,
    });
  }, [store, t]);

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
      message: t('roadmap.retrying'),
    });
    return newRetryCount;
  }, [store, t]);

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
  // Make these optional for backward compatibility if needed, but we'll remove usage of the old loader
}

// Deprecated: We are moving to inline circular loader
// Kept temporarily to avoid breaking existing imports until refactor complete
export const LessonLoader: React.FC<LessonLoaderProps> = ({ onRetry, onCancel }) => {
  return null; 
};