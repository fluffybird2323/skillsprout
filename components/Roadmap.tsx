import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../store/useStore';
import { generateLessonOptimized } from '../services/aiOptimized';
import { generateUnit, generatePathSuggestions, generateUnitReferences, UNIT_SAFE_COLORS } from '../services/ai';
import { Star, Lock, Check, Loader2, Plus, Trash2, BookOpen, Settings, Dumbbell, Cloud, MapPin, ArrowRight, X, Library, Share2, Edit2, MoreVertical, Layout, Compass, LogOut, User as UserIcon } from 'lucide-react';
import { Unit, Chapter, AppState, DEFAULT_LOADER_CONFIG, UnitReferences } from '../types';
import { Button } from './ui/Button';
import { CircularLoader } from './ui/CircularLoader';
import { useLessonLoader } from './LessonLoaderOptimized';
import { lessonCache } from '../services/lessonCache';
import { ReferenceSection } from './ReferenceSection';

// Remap any legacy dark color to a deterministic safe palette color.
function getSafeColor(color: string, unitId: string): string {
  if (UNIT_SAFE_COLORS.includes(color)) return color;
  const hash = unitId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return UNIT_SAFE_COLORS[hash % UNIT_SAFE_COLORS.length];
}

export const Roadmap: React.FC = () => {
  const { t } = useTranslation();
  const store = useStore();
  const lessonLoader = useLessonLoader();
  const [loadingChapterId, setLoadingChapterId] = useState<string | null>(null);
  const [isAddingUnit, setIsAddingUnit] = useState(false);
  const [manageMode, setManageMode] = useState(false);
  const loadingAbortRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Path Selection State
  const [isPathModalOpen, setIsPathModalOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [customPath, setCustomPath] = useState("");

  const [showShareModal, setShowShareModal] = useState<string | null>(null);
  const [courseToDelete, setCourseToDelete] = useState<{ id: string, topic: string } | null>(null);

  const activeCourse = store.courses.find(c => c.id === store.activeCourseId);

  const handleSignOut = () => {
    if (confirm(t('roadmap.signOutConfirm'))) {
      store.logout();
    }
  };

  const handleShare = (courseId: string) => {
    const shareUrl = `${window.location.origin}/?courseId=${courseId}`;
    if (navigator.share) {
      navigator.share({
        title: activeCourse?.topic || t('roadmap.shareTitle'),
        text: t('roadmap.shareText', { topic: activeCourse?.topic }),
        url: shareUrl,
      });
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert(t('roadmap.linkCopied'));
    }
  };

  const handleExplore = () => {
    store.setAppState(AppState.EXPLORE);
  };

  // Reference Section State
  const [referenceUnitId, setReferenceUnitId] = useState<string | null>(null);
  const referenceUnit = activeCourse?.units.find(u => u.id === referenceUnitId);

  const dueReviewItems = store.srsItems.filter(
    item => item.courseId === store.activeCourseId && item.nextReviewDate <= Date.now()
  ).length;

  // Check if user is on the last lesson of the course (for prefetching)
  // Prefetching removed as per request to only suggest extensions on demand


  // Cleanup on unmount
  useEffect(() => {
    store.validateCourseProgress();
    return () => {
      if (loadingAbortRef.current) {
        loadingAbortRef.current.abort();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (!activeCourse && store.appState !== AppState.EXPLORE) return null;

  const totalChapters = activeCourse.units.reduce((acc, unit) => acc + unit.chapters.length, 0);
  const completedChapters = activeCourse.units.reduce((acc, unit) => 
    acc + unit.chapters.filter(c => c.status === 'completed').length, 0);
  const progressPercentage = totalChapters === 0 ? 0 : Math.round((completedChapters / totalChapters) * 100);
  const canExtend = totalChapters > 0 && completedChapters === totalChapters;

  const loadLessonWithRetry = useCallback(async (
    unit: Unit,
    chapter: Chapter,
    retryCount: number = 0
  ): Promise<boolean> => {
    const topic = activeCourse!.topic;

    // Check if aborted before starting
    if (loadingAbortRef.current?.signal.aborted) {
      return false;
    }

    const lessonType = 'quiz' as const;

    try {
      // Phase: Checking cache
      lessonLoader.updatePhase('checking-cache', t('roadmap.checkingCache'));

      // Check abort signal
      if (loadingAbortRef.current?.signal.aborted) {
        return false;
      }

      // Try to get from cache first
      const cached = await lessonCache.getCachedLesson(topic, chapter.title, lessonType, chapter.id);
      if (cached && cached.questions && cached.questions.length > 0) {
        lessonLoader.updatePhase('finalizing', t('roadmap.loadingCache'));
        await new Promise(resolve => setTimeout(resolve, 300)); // Brief pause for UX
        store.setLessonContent({ ...cached, chapterId: chapter.id });
        setLoadingChapterId(null);
        return true;
      }

      // Phase: Generating with better error handling
      lessonLoader.updatePhase('generating', t('roadmap.generatingContent'));

      // Check abort signal before generating
      if (loadingAbortRef.current?.signal.aborted) {
        return false;
      }

      // Use optimized single-call generation with search phase
      const content = await generateLessonOptimized(topic, chapter.title, lessonType, (phase, message) => {
        // We still use the message from the service, but we could translate the phase if needed
        lessonLoader.updatePhase(phase as any, message);
      });

      // Check abort signal after generating
      if (loadingAbortRef.current?.signal.aborted) {
        return false;
      }

      // Validate generated content
      if (!content || !content.questions || content.questions.length === 0) {
        throw new Error('Generated content is invalid or empty');
      }

      // Inject chapterId before caching to ensure validation passes on retrieval
      const contentWithId = { ...content, chapterId: chapter.id };

      // Cache the generated content
      await lessonCache.cacheLesson(topic, chapter.title, contentWithId, lessonType, chapter.id);

      // Phase: Finalizing
      lessonLoader.updatePhase('finalizing', t('roadmap.almostReady'));
      await new Promise(resolve => setTimeout(resolve, 200));

      store.setLessonContent(contentWithId);
      setLoadingChapterId(null);
      return true;
    } catch (error) {
      console.error('Error loading lesson:', error);

      // Check if aborted (don't retry if aborted)
      if (loadingAbortRef.current?.signal.aborted) {
        return false;
      }

      // Simple retry logic - just retry the same call once
      if (retryCount === 0) {
        lessonLoader.updatePhase('generating', t('roadmap.retrying'));
        await new Promise(resolve => setTimeout(resolve, 1000));
        return loadLessonWithRetry(unit, chapter, 1);
      }

      // Max retries exceeded - provide helpful error message
      const errorMessage = error instanceof Error 
        ? error.message.includes('Rate limit')
          ? t('roadmap.rateLimit')
          : error.message.includes('Network')
            ? t('roadmap.networkError')
            : error.message
        : t('roadmap.failedLoad');
        
      lessonLoader.setError(errorMessage);
      return false;
    }
  }, [activeCourse, lessonLoader, store, t]);

  const handleChapterClick = async (unit: Unit, chapter: Chapter) => {
    if (manageMode) return;
    if (chapter.status === 'locked') return;

    // Cancel any existing loading
    if (loadingAbortRef.current) {
      loadingAbortRef.current.abort();
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Create new abort controller
    loadingAbortRef.current = new AbortController();

    setLoadingChapterId(chapter.id);
    store.startLesson(unit.id, chapter.id);

    try {
      // Initialize loading state
      lessonLoader.initializeLoading(chapter.title);

      // Set up timeout
      timeoutRef.current = setTimeout(() => {
        if (store.loadingState?.chapterId === chapter.id) {
          lessonLoader.setError(t('roadmap.takingLonger'));
        }
      }, DEFAULT_LOADER_CONFIG.timeout);

      // Start loading
      const success = await loadLessonWithRetry(unit, chapter);

      // Clear timeout if successful
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      if (!success) {
        // Only clear loading state if aborted, otherwise keep error visible
        if (loadingAbortRef.current?.signal.aborted) {
          setLoadingChapterId(null);
        }
      }
    } catch (error) {
      console.error('Error in handleChapterClick:', error);
      // Ensure cleanup on error
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      // Only clear if aborted
      if (loadingAbortRef.current?.signal.aborted) {
        setLoadingChapterId(null);
      } else {
        lessonLoader.setError(t('roadmap.unexpectedError'));
      }
    }
  };

  const handleRetryLoading = useCallback(() => {
    const state = store.loadingState;
    if (!state?.chapterId) return;

    // Find the chapter and unit
    for (const unit of activeCourse!.units) {
      const chapter = unit.chapters.find(ch => ch.id === state.chapterId);
      if (chapter) {
        // Reset and retry
        lessonLoader.initializeLoading(chapter.title);
        setLoadingChapterId(chapter.id);
        loadLessonWithRetry(unit, chapter);
        return;
      }
    }
  }, [activeCourse, store.loadingState, lessonLoader, loadLessonWithRetry]);

  const handleCancelLoading = useCallback(() => {
    if (loadingAbortRef.current) {
      loadingAbortRef.current.abort();
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setLoadingChapterId(null);
    store.setLoadingState(null);
  }, [lessonLoader]);

  const handleReviewClick = () => {
    if (dueReviewItems > 0) store.startReviewSession();
  };

  const handleReviewExerciseClick = () => {
    store.startReviewExercise();
  };

  const openPathSelector = async () => {
    setIsPathModalOpen(true);

    // Check if we have prefetched suggestions
    if (store.prefetchedSuggestions && store.prefetchedSuggestions.length > 0) {
      setSuggestions(store.prefetchedSuggestions);
      setLoadingSuggestions(false);
      return;
    }

    // Check cache
    const cached = await lessonCache.getCachedPrefetch(activeCourse.id);
    if (cached && cached.length > 0) {
      setSuggestions(cached);
      store.setPrefetchedSuggestions(cached);
      setLoadingSuggestions(false);
      return;
    }

    // Generate new suggestions
    setLoadingSuggestions(true);
    try {
      const titles = activeCourse.units.map(u => u.title);
      const suggs = await generatePathSuggestions(activeCourse.topic, titles);
      setSuggestions(suggs);
      // Cache for future use
      await lessonCache.cachePrefetch(activeCourse.id, suggs);
      store.setPrefetchedSuggestions(suggs);
    } catch (e) {
      setSuggestions(["Advanced Concepts", "Practical Applications", "History & Theory"]);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleAddSpecificUnit = async (focus: string) => {
    if (!focus.trim()) return;
    setIsPathModalOpen(false);
    setIsAddingUnit(true);
    setCustomPath("");
    try {
        const newUnit = await generateUnit(activeCourse.topic, activeCourse.units.length, focus);
        store.appendUnit(newUnit);

        // Validate progress to ensure continuity if previous unit was complete
        store.validateCourseProgress();

        // Clear prefetched suggestions since the course structure changed
        store.setPrefetchedSuggestions(null);
        // Invalidate the cached suggestions
        await lessonCache.cachePrefetch(activeCourse.id, []);

        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    } catch (e) {
        alert("Failed to generate unit.");
    } finally {
        setIsAddingUnit(false);
    }
  };

  const handleGenerateReferences = async (unitId: string): Promise<UnitReferences | null> => {
    const unit = activeCourse?.units.find(u => u.id === unitId);
    if (!unit || !activeCourse) return null;

    try {
      const refs = await generateUnitReferences(activeCourse.topic, unit.title, unit.chapters.map(c => c.title));
      // Update the unit with references in the store
      store.setUnitReferences(unitId, refs);
      return refs;
    } catch (e) {
      console.error('Failed to generate references:', e);
      return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row overflow-hidden bg-transparent">
      
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-72 bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-md border-r border-gray-200 dark:border-gray-600 p-6 flex md:flex-col justify-between sticky top-0 z-30 md:h-screen transition-colors">
        <div className="flex md:flex-col gap-2 w-full overflow-x-auto md:overflow-visible no-scrollbar items-center md:items-stretch">
          <h1 className="hidden md:block text-2xl font-black text-gray-900 dark:text-gray-100 mb-10 tracking-tighter cursor-pointer" onClick={() => store.setAppState(AppState.ONBOARDING)}>
              {t('common.brand').slice(0, 4)}<span className="text-blue-600">{t('common.brand').slice(4)}</span>
            </h1>
          
          <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em] px-2 mb-4 hidden md:block">{t('roadmap.navigation')}</div>
          
          <button
            onClick={handleExplore}
            className={`flex items-center gap-4 p-3 rounded-xl transition-all duration-300 w-full text-left min-w-[60px] md:min-w-0 justify-center md:justify-start mb-2
              ${store.appState === AppState.EXPLORE 
                 ? 'bg-blue-600 text-white shadow-md' 
                 : 'bg-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}
            `}
          >
            <Compass className="w-5 h-5" />
            <span className="font-bold hidden md:block text-sm">{t('roadmap.explore')}</span>
          </button>

          <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em] px-2 mb-4 hidden md:block mt-4">{t('roadmap.activeTracks')}</div>
          {store.courses.map(c => (
            <div key={c.id} className="relative group flex-shrink-0 md:w-full">
             <button
               onClick={() => store.switchCourse(c.id)}
               className={`flex items-center gap-4 p-3 rounded-xl transition-all duration-300 w-full text-left min-w-[60px] md:min-w-0 justify-center md:justify-start
                 ${c.id === store.activeCourseId && store.appState !== AppState.EXPLORE
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'bg-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}
               `}
             >
               <span className="text-xl">{c.icon}</span>
               <span className="font-bold hidden md:block truncate text-sm">{c.topic}</span>
             </button>
             
             {/* Delete Button */}
             <button
                onClick={(e) => {
                    e.stopPropagation();
                    setCourseToDelete({ id: c.id, topic: c.topic });
                }}
                className={`
                    absolute -top-1 -right-1 md:top-1/2 md:-translate-y-1/2 md:right-2 
                    w-5 h-5 md:w-6 md:h-6 
                    flex items-center justify-center
                    rounded-full transition-all z-20 shadow-sm
                    bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600
                    text-gray-400 hover:text-red-500 hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-900/30
                    md:opacity-0 md:group-hover:opacity-100
                `}
                title={t('roadmap.deleteTrackTooltip')}
             >
                <X className="w-3 h-3" />
             </button>
            </div>
          ))}
          
          <button 
            onClick={() => store.setAppState(AppState.ADD_COURSE)}
            className="flex items-center gap-3 p-3 rounded-xl text-gray-500 dark:text-gray-400 font-bold border border-dashed border-gray-200 dark:border-gray-600 hover:border-blue-600 hover:text-blue-600 transition-colors w-full justify-center md:justify-start mt-2"
          >
             <Plus className="w-5 h-5" />
             <span className="hidden md:block text-xs uppercase tracking-wider">{t('roadmap.addTrack')}</span>
          </button>
        </div>

        <div className="hidden md:block border-t border-gravity-border-light dark:border-gravity-border-dark pt-6">
             {store.user ? (
               <div className="group relative">
                 <div className="flex items-center gap-4 p-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-gravity-border-light dark:border-gravity-border-dark hover:bg-black/10 dark:hover:bg-white/10 transition-all cursor-pointer">
                    <div className="w-10 h-10 bg-gravity-blue text-white rounded-full flex items-center justify-center font-bold text-xl shadow-inner shrink-0">
                      {store.user.emoji || '👤'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-gravity-text-main-light dark:text-gravity-text-main-dark text-xs uppercase tracking-wider truncate">
                        {store.user.fullName}
                      </div>
                      <div className="text-[10px] text-gravity-text-sub-light dark:text-gravity-text-sub-dark font-mono flex items-center gap-2">
                        <span>{t('roadmap.xp', { count: store.xp })}</span>
                        <span className="w-1 h-1 bg-gravity-blue rounded-full"></span>
                        <span>{t('roadmap.streak', { count: store.streak })}</span>
                      </div>
                    </div>
                    <button 
                      onClick={handleSignOut}
                      className="p-2 text-gravity-text-sub-light dark:text-gravity-text-sub-dark hover:text-red-500 transition-colors"
                      title={t('auth.signOut')}
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                 </div>
               </div>
             ) : (
               <button
                 onClick={() => store.setAuthModalOpen(true)}
                 className="w-full flex items-center gap-3 p-4 rounded-2xl bg-gravity-blue text-white font-bold shadow-lg hover:shadow-gravity-blue/20 hover:scale-[1.02] active:scale-95 transition-all group"
               >
                 <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center group-hover:bg-white/30 transition-colors">
                   <UserIcon className="w-4 h-4" />
                 </div>
                 <span>{t('auth.signIn')}</span>
               </button>
             )}
        </div>
      </aside>

      {/* Main Content */}
      {store.appState !== AppState.EXPLORE && activeCourse && (
        <main className="flex-1 pb-[420px] relative overflow-y-auto overflow-x-hidden">
        
        {/* Mobile Header */}
        <div className="sticky top-0 z-40 bg-gray-50/90 dark:bg-gray-900/90 backdrop-blur border-b border-gray-200 dark:border-gray-600 px-4 py-3 flex justify-between items-center md:hidden">
             <div className="font-black text-xl tracking-tighter">{t('common.brand').slice(0, 4)}<span className="text-blue-600">{t('common.brand').slice(4)}</span></div>
             <div className="flex items-center gap-4 ml-auto">
                <span className="font-bold text-yellow-500 font-mono">🔥 {store.streak}</span>
                <span className="font-bold text-red-500 font-mono">❤️ {store.hearts}</span>
             </div>
        </div>

        {/* ── Background Treasure Map Decoration ── */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none" style={{ zIndex: 0 }}>
        <svg
          className="w-full pointer-events-none select-none text-gray-500 dark:text-gray-500 opacity-[0.07] dark:opacity-[0.05]"
          style={{ height: '4000px' }}
          viewBox="0 0 800 4000"
          preserveAspectRatio="xMidYMin slice"
          fill="none"
          aria-hidden="true"
        >
          {/* Left winding trail */}
          <path
            d="M 55 0 C 55 180 82 330 48 520 C 22 700 76 850 44 1050 C 18 1210 72 1370 38 1570 C 14 1730 68 1890 36 2090 C 14 2250 66 2410 38 2610 C 18 2770 66 2930 42 3130 C 22 3290 70 3450 40 3650 C 20 3810 62 3910 40 4000"
            stroke="currentColor" strokeWidth="2" strokeDasharray="12 7" strokeLinecap="round"
          />
          {/* Right winding trail */}
          <path
            d="M 745 0 C 745 180 718 330 752 520 C 778 700 724 850 756 1050 C 782 1210 728 1370 762 1570 C 786 1730 732 1890 764 2090 C 786 2250 734 2410 762 2610 C 782 2770 734 2930 758 3130 C 778 3290 730 3450 760 3650 C 780 3810 738 3910 760 4000"
            stroke="currentColor" strokeWidth="2" strokeDasharray="12 7" strokeLinecap="round"
          />
          {/* Scattered X marks */}
          <g stroke="currentColor" strokeWidth="2" opacity="0.4">
            <line x1="146" y1="890" x2="156" y2="900" /><line x1="156" y1="890" x2="146" y2="900" />
            <line x1="648" y1="1392" x2="658" y2="1402" /><line x1="658" y1="1392" x2="648" y2="1402" />
            <line x1="86" y1="1890" x2="96" y2="1900" /><line x1="96" y1="1890" x2="86" y2="1900" />
            <line x1="696" y1="2392" x2="706" y2="2402" /><line x1="706" y1="2392" x2="696" y2="2402" />
            <line x1="130" y1="2890" x2="140" y2="2900" /><line x1="140" y1="2890" x2="130" y2="2900" />
          </g>
        </svg>
        </div>

        <div className="max-w-3xl mx-auto mt-8 px-4 relative z-10">
          
          {/* Header Card */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 p-8 rounded-3xl shadow-xl mb-12 flex justify-between items-center relative overflow-hidden group">
             <div className="relative z-10">
                <h2 className="text-4xl font-black mb-2 text-gray-900 dark:text-gray-100 tracking-tight">{activeCourse.topic}</h2>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 h-2 rounded-full mt-2 mb-4 overflow-hidden max-w-[200px]">
                     <div className="h-full bg-blue-600" style={{ width: `${progressPercentage}%` }}></div>
                  </div>
                  <span className="inline-block bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">{activeCourse.depth || 'serious'}</span>
                
                {dueReviewItems > 0 && (
                  <button 
                    onClick={handleReviewClick}
                    className="mt-6 bg-blue-600 text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 hover:bg-blue-700 transition-all uppercase tracking-wider text-sm shadow-lg"
                  >
                     <Dumbbell className="w-4 h-4" />
                     {t('roadmap.review')} ({dueReviewItems})
                  </button>
                )}
                
                {store.getAllCompletedLessons().length > 0 && (
                  <button 
                    onClick={handleReviewExerciseClick}
                    className="mt-6 bg-green-600 text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 hover:bg-green-700 transition-all uppercase tracking-wider text-sm shadow-lg ml-4"
                  >
                     <BookOpen className="w-4 h-4" />
                     {t('roadmap.reviewExercise')}
                  </button>
                )}
             </div>
             <div className="relative z-10 text-8xl opacity-10 grayscale group-hover:grayscale-0 transition-all duration-500">{activeCourse.icon}</div>
          </div>

          {/* Lesson Loading Indicator - Removed as per request */}
          {/* loadingChapterId logic handled by LessonLoader component now */}

          {/* Controls */}
          <div className="flex justify-between items-center mb-8">
             <div className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-[0.2em] text-xs">{t('roadmap.curriculumPath')}</div>
             <div className="flex items-center gap-2">
               <button
                 onClick={() => handleShare(activeCourse.id)}
                 className="p-3 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                 title={t('roadmap.shareCourse')}
               >
                 <Share2 className="w-5 h-5" />
               </button>
               <button 
                 onClick={() => setManageMode(!manageMode)}
                 className={`p-3 rounded-full transition-all ${manageMode ? 'bg-gray-900 dark:bg-white text-gray-50 dark:text-gray-900' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
               >
                  <Settings className="w-5 h-5" />
               </button>
             </div>
          </div>

          {manageMode && (
             <div className="bg-red-50 border border-red-200 p-6 rounded-2xl mb-8 text-center">
               <h3 className="font-bold text-red-500 mb-4 uppercase tracking-widest text-xs">{t('roadmap.editMode')}</h3>
                <div className="flex gap-2 justify-center">
                   <Button variant="danger" onClick={() => store.deleteCourse(activeCourse.id)} size="sm">
                      {t('roadmap.deleteTrack')}
                   </Button>
                </div>
             </div>
          )}

          {/* Units */}
          <div className="space-y-16 pb-64 relative z-10">
            {activeCourse.units.map((unit, unitIdx) => {
               // Calculate global chapter index start for this unit to maintain continuous path
               const previousChaptersCount = activeCourse.units
                 .slice(0, unitIdx)
                 .reduce((acc, u) => acc + u.chapters.length, 0);
               const safeColor = getSafeColor(unit.color, unit.id);

               return (
                <div key={unit.id} className="relative">
                  {/* Unit Map Decorations */}
                <div className="absolute inset-0 pointer-events-none -z-20 opacity-30 dark:opacity-20 overflow-visible">
                   {unitIdx % 3 === 0 ? (
                     <>
                       {/* Palm Trees */}
                       <svg className="absolute top-[15%] left-[-15%] w-24 h-24 text-emerald-700/40 dark:text-emerald-500/30 rotate-12" fill="currentColor" viewBox="0 0 24 24">
                         <path d="M19.9 12.6c-1.3-.4-3.5-.2-4.9.6.5-1.1 1.2-3.1 1.1-4.3-.3.1-.7.2-1 .4-1.1 1.8-1.4 3.9-1.3 6 0 0-1.1-2.4-1.6-3.8-.6 1.4-1.7 4.7-1.3 6.6.6.1 1.1.2 1.6.3 0 0-.2-2.1.3-4.2 1.3-.4 2.8-.2 4.1.3 1.4.5 2.5 1.5 3.3 2.7.7-.6 1.3-1.4 1.7-2.3-.6-.8-1.3-1.6-2-2.3zm-13.8.3c1.3.4 2.8.2 4.1-.3.5 2.1.3 4.2.3 4.2.5-.1 1.1-.2 1.6-.3.4-1.9-.7-5.2-1.3-6.6-.5 1.4-1.6 3.8-1.6 3.8.1-2.1-.2-4.2-1.3-6-.3-.2-.7-.3-1-.4-.1 1.2.6 3.2 1.1 4.3-1.4-.8-3.6-1-4.9-.6-.7.7-1.4 1.5-2 2.3.4.9 1 1.7 1.7 2.3.8-1.2 1.9-2.2 3.3-2.7z" />
                         <path d="M12 14c-.6 0-1 .4-1 1v7h2v-7c0-.6-.4-1-1-1z" opacity=".5" />
                       </svg>
                       {/* Ship */}
                       <svg className="absolute bottom-[20%] right-[-10%] w-20 h-20 text-blue-800/20 dark:text-blue-400/20" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M20 21c-1.39 0-2.78-.47-4-1.32-2.44 1.71-5.56 1.71-8 0C6.78 20.53 5.39 21 4 21H2v2h2c1.38 0 2.74-.35 4-.99 2.52 1.29 5.48 1.29 8 0 1.26.65 2.62.99 4 .99h2v-2h-2zM10 5H5v11h10.67c-1.34-1.95-3.08-3.39-5.67-4.17V5zm6 3h-4v2.55c2.44.83 4.17 2.21 5.46 3.96.32-.42.54-.92.54-1.51V8z" />
                       </svg>
                     </>
                   ) : unitIdx % 3 === 1 ? (
                     <>
                        {/* UFO - Quirky */}
                       <svg className="absolute top-[20%] right-[-5%] w-16 h-16 text-purple-500/30 dark:text-purple-400/20 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 3.97-3.08 6-3.08 2.03 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
                       </svg>
                       {/* Mountains */}
                       <svg className="absolute bottom-[10%] left-[-8%] w-28 h-28 text-gray-400/30 dark:text-gray-600/30" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M14 6l-3.75 5 2.85 3.8-1.6 1.2C9.81 13.75 7 10 7 10l-6 8h22L14 6z" />
                       </svg>
                     </>
                   ) : (
                     <>
                        {/* Treasure Chest */}
                       <svg className="absolute top-[40%] left-[5%] w-14 h-14 text-yellow-600/30 dark:text-yellow-500/20" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-9 13h-2v-2h2v2zm0-4h-2V7h2v4z" />
                       </svg>
                        {/* Compass Rose */}
                       <svg className="absolute bottom-[30%] right-[0%] w-24 h-24 text-gray-300/30 dark:text-gray-600/20 rotate-45" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" />
                       </svg>
                     </>
                   )}
                </div>

                {/* Unit Header */}
                <div
                  className="mb-8 rounded-2xl p-1 shadow-sm relative overflow-visible z-20"
                  style={{ backgroundColor: safeColor }}
                >
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 flex justify-between items-center h-[98%] w-[99.5%] mx-auto mt-[1px] relative">
                    {/* Map Marker Pin Effect */}
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center border-4 border-gray-200 dark:border-gray-700 shadow-sm z-30">
                       <div className="w-2 h-2 rounded-full" style={{ backgroundColor: safeColor }}></div>
                    </div>

                    <div>
                      <h3 className="font-black text-2xl text-gray-900 dark:text-white uppercase tracking-tight">{t('roadmap.unit')} {unitIdx + 1}</h3>
                      <p className="font-bold text-sm mt-1" style={{ color: safeColor }}>{unit.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-300 mt-2 max-w-md">{unit.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Reference Materials Button */}
                      {!manageMode && (
                        <button
                          onClick={() => setReferenceUnitId(unit.id)}
                          className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors group relative"
                          title={t('roadmap.referenceMaterials')}
                        >
                          <Library className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-blue-600 transition-colors" />
                          {unit.references && unit.references.materials.length > 0 && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                              {unit.references.materials.length}
                            </span>
                          )}
                        </button>
                      )}
                      {manageMode ? (
                        <button onClick={() => store.deleteUnit(unit.id)} className="text-red-500 p-2 hover:bg-red-100 rounded-full">
                           <Trash2 className="w-5 h-5" />
                        </button>
                      ) : (
                        <BookOpen className="w-6 h-6 text-gray-400 dark:text-gray-500 opacity-20" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Chapters Path */}
                <div className="flex flex-col items-center space-y-20 relative">
                   {/* Vertical Connection Line to Next Unit */}
                   {unitIdx < activeCourse.units.length - 1 && (
                      <div className="absolute left-1/2 bottom-[-128px] h-[128px] w-full pointer-events-none overflow-visible z-0">
                         <svg className="w-full h-full overflow-visible" preserveAspectRatio="none">
                            {/* Calculate start point based on last chapter position */}
                            {(() => {
                               const lastChapterGlobalIdx = previousChaptersCount + unit.chapters.length - 1;
                               const offsets = [0, 40, 60, 40, 0, -40, -60, -40];
                               const startX = offsets[lastChapterGlobalIdx % offsets.length];
                               
                               // Jitter for the last lesson
                               const jitterX = (lastChapterGlobalIdx * 13) % 12 - 6;
                               const jitterY = (lastChapterGlobalIdx * 7) % 10 - 5;
                               
                               // End point should connect to the NEXT unit header (center)
                               const endX = 0;
                               
                               return (
                                 <>
                                   {/* Desktop Curve */}
                                   <path 
                                     d={`M ${startX + jitterX} ${jitterY} C ${startX + jitterX} 70, ${endX} 58, ${endX} 128`} 
                                     fill="none" 
                                     stroke="currentColor" 
                                     strokeWidth="3" 
                                     strokeDasharray="6 6" 
                                     strokeLinecap="round" 
                                     className="text-gray-400 dark:text-gray-600 opacity-40 hidden md:block" 
                                   />
                                   {/* Mobile Curve - Scaled */}
                                   <path 
                                     d={`M ${startX*0.8 + jitterX*0.8} ${jitterY*0.8} C ${startX*0.8 + jitterX*0.8} 70, ${endX} 58, ${endX} 128`} 
                                     fill="none" 
                                     stroke="currentColor" 
                                     strokeWidth="3" 
                                     strokeDasharray="6 6" 
                                     strokeLinecap="round" 
                                     className="text-gray-400 dark:text-gray-600 opacity-40 md:hidden" 
                                   />
                                 </>
                               );
                            })()}
                         </svg>
                      </div>
                   )}


                   {unit.chapters.map((chapter, idx) => {
                     const globalIdx = previousChaptersCount + idx;
                     const offsets = [0, 40, 60, 40, 0, -40, -60, -40];
                     const offsetVal = offsets[globalIdx % offsets.length];
                     const offset = `${offsetVal}px`;
                     
                     // Deterministic "jitter" for treasure map look
                     const jitterX = (globalIdx * 13) % 12 - 6; // -6 to 6
                     const jitterY = (globalIdx * 7) % 10 - 5; // -5 to 5
                     
                     const isLocked = chapter.status === 'locked';
                     const isCompleted = chapter.status === 'completed';
                     const isActive = chapter.status === 'active';
                     const isLoading = loadingChapterId === chapter.id;

                     return (
                       <div
                         key={chapter.id}
                         className={`relative group ${isLoading ? 'z-40' : ''}`}
                         style={{ transform: `translateX(${offset})` }}
                       >

                         {/* Island / Planet Atmosphere */}
                         <div className="absolute inset-0 pointer-events-none" style={{ margin: '-28px' }}>
                           {/* Atmosphere glow — always present */}
                           <div className={`absolute inset-0 rounded-full blur-xl opacity-30 ${isCompleted ? 'bg-green-400' : isActive ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`} style={{ margin: '10px' }} />
                           {/* Hard rings only for completed/locked — not active */}
                           {!isActive && (
                             <>
                               <div className={`absolute inset-0 rounded-full border-2 opacity-20 ${isCompleted ? 'border-green-300' : 'border-gray-300 dark:border-gray-600'}`} style={{ margin: '8px' }} />
                               <div className={`absolute inset-0 rounded-full border opacity-10 ${isCompleted ? 'border-green-200' : 'border-gray-200 dark:border-gray-700'}`} style={{ margin: '-4px' }} />
                             </>
                           )}
                           {/* Active: light dotted ring */}
                           {isActive && (
                             <div className="absolute inset-0 rounded-full border border-dotted border-blue-400/40" style={{ margin: '6px' }} />
                           )}
                           {/* Completed: slow spinning dashed ring */}
                           {isCompleted && (
                             <div className="absolute inset-0 rounded-full border border-dashed border-green-300/20 animate-[spin_20s_linear_infinite_reverse]" style={{ margin: '-14px' }} />
                           )}
                         </div>

                         {/* Chapter Circle - Interactive */}
                        <button
                          onClick={() => handleChapterClick(unit, chapter)}
                          disabled={chapter.status === 'locked'}
                          className={`
                            relative z-10 w-12 h-12 md:w-16 md:h-16 flex items-center justify-center transition-all duration-500
                            ${isLoading 
                              ? 'bg-white dark:bg-gray-800 scale-110 shadow-xl ring-4 ring-blue-100 dark:ring-blue-900/30 rounded-2xl' 
                              : chapter.status === 'locked'
                                ? 'bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed border-4 border-gray-300 dark:border-gray-700 shadow-inner rounded-[45%]'
                                : chapter.status === 'completed'
                                  ? 'bg-gradient-to-br from-green-400 to-emerald-600 text-white shadow-[0_8px_16px_-6px_rgba(16,185,129,0.6)] hover:shadow-[0_12px_20px_-6px_rgba(16,185,129,0.8)] scale-100 hover:scale-105 border-2 border-green-300 dark:border-green-500 rounded-[42%]'
                                  : 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-[0_8px_20px_-6px_rgba(59,130,246,0.6)] hover:shadow-[0_12px_24px_-6px_rgba(59,130,246,0.8)] hover:scale-105 animate-bounce hover:animate-none rounded-[48%]'
                            }
                          `}
                          style={
                            !isLoading && chapter.status === 'active' 
                              ? { 
                                  boxShadow: `0 8px 20px -6px ${safeColor}80, inset 0 -4px 10px rgba(0,0,0,0.2), inset 0 4px 10px rgba(255,255,255,0.4)`
                                } 
                              : chapter.status === 'completed'
                                ? {
                                  boxShadow: `0 8px 20px -6px rgba(16,185,129,0.6), inset 0 -4px 10px rgba(0,0,0,0.2), inset 0 4px 10px rgba(255,255,255,0.4)`
                                }
                              : undefined
                          }
                        >
                          {/* Circular Loader Overlay */}
                          {isLoading && store.loadingState && (
                            <div className="absolute inset-0 -m-1 z-50 pointer-events-none flex items-center justify-center">
                               {/* Responsive loader size */}
                               <div className="md:hidden">
                                 <CircularLoader 
                                   progress={store.loadingState.progress} 
                                   size={56} 
                                   strokeWidth={3} 
                                 />
                               </div>
                               <div className="hidden md:block">
                                 <CircularLoader 
                                   progress={store.loadingState.progress} 
                                   size={72} 
                                   strokeWidth={4} 
                                 />
                               </div>
                            </div>
                          )}

                          {chapter.status === 'locked' ? (
                            <Lock className="w-5 h-5 md:w-6 md:h-6" />
                          ) : chapter.status === 'completed' ? (
                            <Check className="w-6 h-6 md:w-8 md:h-8 stroke-[3]" />
                          ) : isLoading ? (
                            // Show nothing or a different icon while loading inside the circle
                            <div className="flex flex-col items-center justify-center">
                               <span className="text-[10px] md:text-xs font-bold text-blue-600 animate-pulse">
                                 {Math.round(store.loadingState?.progress || 0)}%
                               </span>
                            </div>
                          ) : (
                            <Star className="w-6 h-6 md:w-8 md:h-8 fill-current" />
                          )}
                        </button>
                        
                        {/* Title Tooltip (Popout) */}
                        {!isLoading && (
                          <div className={`
                            absolute left-1/2 -translate-x-1/2 bottom-[calc(100%+8px)] md:bottom-[calc(100%+12px)] w-max max-w-[200px] text-center text-xs font-bold leading-tight transition-all duration-300
                            pointer-events-none opacity-0 group-hover:opacity-100 group-active:opacity-100 group-focus:opacity-100
                            bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-3 py-2 rounded-xl shadow-2xl z-[100]
                          `}>
                             {chapter.title}
                             <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-gray-900 dark:border-t-white"></div>
                          </div>
                        )}
                        
                        {/* Loading Status Text - Moved inside tooltip/popover logic, removed fixed display */}
                        
                        {/* Cancel button only for mobile or separate UI, keeping it clean */}
                        {isLoading && store.loadingState && (
                           <button 
                             onClick={(e) => {
                               e.stopPropagation();
                               handleCancelLoading();
                             }}
                             className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-gray-400 hover:text-red-500 underline decoration-dotted whitespace-nowrap"
                           >
                             Cancel
                           </button>
                        )}
                      </div>
                    );
                  })}

                </div>
              </div>
            );
          })}
          </div>
        </div>

        {/* Cloud Barrier - Antigravity Style */}
        <div className="absolute bottom-0 left-0 right-0 h-[400px] overflow-hidden pointer-events-none z-5 select-none">
            <div className="absolute bottom-0 w-full h-full bg-gradient-to-t from-gray-50 dark:from-gray-900 via-gray-50/95 dark:via-gray-900/95 to-transparent z-5"></div>
            
            <div className="absolute bottom-0 left-0 right-0 flex justify-center items-end pointer-events-auto translate-y-12 z-5">
                <div className="relative w-full max-w-4xl h-[300px] flex flex-col items-center justify-end pb-24">
                    <div className="mb-6 opacity-50">
                        <Lock className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                    </div>
                    {isAddingUnit ? (
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 px-8 py-4 rounded-full flex items-center gap-3 shadow-xl">
                          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                          <span className="font-bold text-gray-900 dark:text-gray-100 text-sm">{t('roadmap.extending')}</span>
                      </div>
                    ) : (
                      <button 
                        onClick={openPathSelector}
                        disabled={loadingSuggestions || !canExtend}
                        className={`
                          bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 
                          text-gray-900 dark:text-gray-100 px-8 py-4 rounded-full shadow-2xl 
                          flex items-center gap-4 transition-all transform 
                          ${loadingSuggestions ? 'opacity-70 cursor-wait' : !canExtend ? 'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-gray-900 grayscale' : 'hover:bg-gray-50 dark:hover:bg-gray-700 hover:-translate-y-1'}
                        `}
                        title={!canExtend ? "Complete all lessons to unlock new ones" : ""}
                      >
                          {loadingSuggestions ? (
                            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                          ) : !canExtend ? (
                            <Lock className="w-5 h-5 text-gray-400" />
                          ) : (
                            <Compass className="w-5 h-5 text-blue-600" />
                          )}
                          <span className="font-bold text-sm uppercase tracking-wider">
                            {loadingSuggestions ? t('roadmap.thinking') : !canExtend ? t('roadmap.completeToExtend') : t('roadmap.extendPath')}
                          </span>
                      </button>
                    )}
                </div>
            </div>
        </div>

      </main>
      )}

      {/* Path Selector Modal */}
      {isPathModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-3xl shadow-2xl w-full max-w-md p-8 relative">
              <button 
                onClick={() => setIsPathModalOpen(false)}
                className="absolute top-4 right-4 p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full"
              >
                <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
              </button>

              <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100 mb-6">{t('roadmap.whereNext')}</h2>

              {loadingSuggestions ? (
                 <div className="space-y-3 py-4">
                    {[1,2,3].map(i => (
                       <div key={i} className="h-16 bg-black/5 dark:bg-white/5 rounded-xl animate-pulse"></div>
                    ))}
                 </div>
              ) : (
                 <div className="space-y-3 mb-8">
                    {suggestions.map((sugg, idx) => (
                       <button 
                         key={idx}
                         onClick={() => handleAddSpecificUnit(sugg)}
                         className="w-full text-left p-4 border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-black/20 rounded-xl hover:border-blue-600 hover:shadow-md transition-all flex items-center justify-between group"
                       >
                          <span className="font-bold text-gray-900 dark:text-gray-100">{sugg}</span>
                          <ArrowRight className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-blue-600" />
                       </button>
                    ))}
                 </div>
              )}

              <div className="flex gap-2">
                 <input
                    type="text"
                    value={customPath}
                    onChange={(e) => setCustomPath(e.target.value)}
                    placeholder={t('roadmap.customTopicPlaceholder')}
                    className="flex-1 p-3 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:border-blue-600 text-gray-900 dark:text-gray-100 text-sm"
                 />
                 <Button onClick={() => handleAddSpecificUnit(customPath)} disabled={!customPath.trim()}>
                    <MapPin className="w-5 h-5" />
                 </Button>
              </div>
           </div>
        </div>
      )}

      {/* Reference Section Modal */}
      {referenceUnit && (
        <ReferenceSection
          unit={referenceUnit}
          topic={activeCourse.topic}
          isOpen={!!referenceUnitId}
          onClose={() => setReferenceUnitId(null)}
          onGenerateReferences={handleGenerateReferences}
        />
      )}

      {/* Custom Deletion Confirmation Modal */}
      {courseToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl shadow-2xl w-full max-w-sm p-6 overflow-hidden">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              
              <h3 className="text-xl font-black text-gray-900 dark:text-gray-100 mb-2">{t('roadmap.deletePathTitle')}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
                {t('roadmap.deletePathConfirm', { topic: courseToDelete.topic })}
              </p>
              
              <div className="flex gap-3 w-full">
                <button 
                  onClick={() => setCourseToDelete(null)}
                  className="flex-1 px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button 
                  onClick={() => {
                    store.deleteCourse(courseToDelete.id);
                    setCourseToDelete(null);
                  }}
                  className="flex-1 px-4 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20"
                >
                  {t('common.delete')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
