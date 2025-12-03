import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useStore } from '../store/useStore';
import { generateLessonContent, generateUnit, generatePathSuggestions, generateInteractiveLesson, generateResourceLesson } from '../services/ai';
import { Star, Lock, Check, Loader2, Plus, Trash2, BookOpen, Settings, Dumbbell, Cloud, MapPin, ArrowRight, X } from 'lucide-react';
import { Unit, Chapter, AppState, DEFAULT_LOADER_CONFIG } from '../types';
import { Button } from './ui/Button';
import { LessonLoader, useLessonLoader } from './LessonLoader';
import { lessonCache } from '../services/lessonCache';

export const Roadmap: React.FC = () => {
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

  const activeCourse = store.courses.find(c => c.id === store.activeCourseId);

  const dueReviewItems = store.srsItems.filter(
    item => item.courseId === store.activeCourseId && item.nextReviewDate <= Date.now()
  ).length;

  // Check if user is on the last lesson of the course (for prefetching)
  const isOnLastLesson = useCallback(() => {
    if (!activeCourse) return false;
    const lastUnit = activeCourse.units[activeCourse.units.length - 1];
    if (!lastUnit) return false;
    const completedInLastUnit = lastUnit.chapters.filter(ch => ch.status === 'completed').length;
    const totalInLastUnit = lastUnit.chapters.length;
    // Consider "near last" if only 1 lesson remains
    return completedInLastUnit >= totalInLastUnit - 1;
  }, [activeCourse]);

  // Prefetch path suggestions when user reaches the last lesson
  useEffect(() => {
    const prefetchSuggestions = async () => {
      if (!activeCourse || !isOnLastLesson()) return;

      // Check if already prefetched
      const cached = await lessonCache.getCachedPrefetch(activeCourse.id);
      if (cached) {
        store.setPrefetchedSuggestions(cached);
        return;
      }

      try {
        const titles = activeCourse.units.map(u => u.title);
        const suggs = await generatePathSuggestions(activeCourse.topic, titles);
        await lessonCache.cachePrefetch(activeCourse.id, suggs);
        store.setPrefetchedSuggestions(suggs);
      } catch (error) {
        console.warn('Failed to prefetch suggestions:', error);
      }
    };

    prefetchSuggestions();
  }, [activeCourse, isOnLastLesson, store]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (loadingAbortRef.current) {
        loadingAbortRef.current.abort();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (!activeCourse) return null;

  const totalChapters = activeCourse.units.reduce((acc, unit) => acc + unit.chapters.length, 0);
  const completedChapters = activeCourse.units.reduce((acc, unit) => 
    acc + unit.chapters.filter(c => c.status === 'completed').length, 0);
  const progressPercentage = totalChapters === 0 ? 0 : Math.round((completedChapters / totalChapters) * 100);

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

    // Determine lesson type
    const rand = Math.random();
    const lessonType = rand < 0.7 ? 'quiz' : rand < 0.85 ? 'interactive' : 'resource';

    try {
      // Phase: Checking cache
      lessonLoader.updatePhase('checking-cache', 'Checking for saved content...');

      // Check abort signal
      if (loadingAbortRef.current?.signal.aborted) {
        return false;
      }

      // Try to get from cache first
      const cached = await lessonCache.getCachedLesson(topic, chapter.title, lessonType);
      if (cached) {
        lessonLoader.updatePhase('finalizing', 'Loading from cache...', true);
        await new Promise(resolve => setTimeout(resolve, 300)); // Brief pause for UX
        store.setLessonContent({ ...cached, chapterId: chapter.id });
        setLoadingChapterId(null);
        return true;
      }

      // Phase: Generating
      lessonLoader.updatePhase('generating', 'Generating personalized content...');

      // Check abort signal before generating
      if (loadingAbortRef.current?.signal.aborted) {
        return false;
      }

      let content;
      if (lessonType === 'quiz') {
        content = await generateLessonContent(topic, chapter.title);
      } else if (lessonType === 'interactive') {
        content = await generateInteractiveLesson(topic, chapter.title);
      } else {
        content = await generateResourceLesson(topic, chapter.title);
      }

      // Check abort signal after generating
      if (loadingAbortRef.current?.signal.aborted) {
        return false;
      }

      // Cache the generated content
      await lessonCache.cacheLesson(topic, chapter.title, content, lessonType);

      // Phase: Finalizing
      lessonLoader.updatePhase('finalizing', 'Almost ready...');
      await new Promise(resolve => setTimeout(resolve, 200));

      store.setLessonContent({ ...content, chapterId: chapter.id });
      setLoadingChapterId(null);
      return true;
    } catch (error) {
      console.error('Error loading lesson:', error);

      // Check if aborted (don't retry if aborted)
      if (loadingAbortRef.current?.signal.aborted) {
        return false;
      }

      // Retry logic
      if (retryCount < DEFAULT_LOADER_CONFIG.maxRetries) {
        const newRetryCount = lessonLoader.incrementRetry();
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Exponential backoff
        return loadLessonWithRetry(unit, chapter, newRetryCount);
      }

      // Max retries exceeded
      lessonLoader.setError(
        error instanceof Error ? error.message : 'Failed to load lesson after multiple attempts'
      );
      return false;
    }
  }, [activeCourse, lessonLoader, store]);

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
      lessonLoader.initializeLoading(chapter.id, chapter.title);

      // Set up timeout
      timeoutRef.current = setTimeout(() => {
        if (store.loadingState?.chapterId === chapter.id) {
          lessonLoader.setTimeout();
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
        setLoadingChapterId(null);
      }
    } catch (error) {
      console.error('Error in handleChapterClick:', error);
      // Ensure cleanup on error
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setLoadingChapterId(null);
      lessonLoader.setError('An unexpected error occurred. Please try again.');
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
        lessonLoader.initializeLoading(chapter.id, chapter.title);
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
    lessonLoader.cancelLoading();
  }, [lessonLoader]);

  const handleReviewClick = () => {
    if (dueReviewItems > 0) store.startReviewSession();
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

  return (
    <div className="min-h-screen flex flex-col md:flex-row overflow-hidden bg-transparent">
      
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-72 bg-gravity-light/80 dark:bg-gravity-surface-dark/80 backdrop-blur-md border-r border-gravity-border-light dark:border-gravity-border-dark p-6 flex md:flex-col justify-between sticky top-0 z-30 md:h-screen transition-colors">
        <div className="flex md:flex-col gap-2 w-full overflow-x-auto md:overflow-visible no-scrollbar items-center md:items-stretch">
          <h1 className="hidden md:block text-2xl font-black text-gravity-text-main-light dark:text-gravity-text-main-dark mb-10 tracking-tighter">
            SKILL<span className="text-gravity-blue">SPROUT</span>
          </h1>
          
          <div className="text-[10px] font-bold text-gravity-text-sub-light dark:text-gravity-text-sub-dark uppercase tracking-[0.2em] px-2 mb-4 hidden md:block">Active Tracks</div>
          {store.courses.map(c => (
             <button
               key={c.id}
               onClick={() => store.switchCourse(c.id)}
               className={`flex items-center gap-4 p-3 rounded-xl transition-all duration-300 w-full text-left min-w-[60px] md:min-w-0 justify-center md:justify-start
                 ${c.id === store.activeCourseId 
                    ? 'bg-gravity-blue text-white shadow-md' 
                    : 'bg-transparent text-gravity-text-sub-light dark:text-gravity-text-sub-dark hover:bg-gravity-surface-light dark:hover:bg-gravity-surface-dark'}
               `}
             >
               <span className="text-xl">{c.icon}</span>
               <span className="font-bold hidden md:block truncate text-sm">{c.topic}</span>
             </button>
          ))}
          
          <button 
            onClick={() => store.setAppState(AppState.ADD_COURSE)}
            className="flex items-center gap-3 p-3 rounded-xl text-gravity-text-sub-light dark:text-gravity-text-sub-dark font-bold border border-dashed border-gravity-border-light dark:border-gravity-border-dark hover:border-gravity-blue hover:text-gravity-blue transition-colors w-full justify-center md:justify-start mt-2"
          >
             <Plus className="w-5 h-5" />
             <span className="hidden md:block text-xs uppercase tracking-wider">Add Track</span>
          </button>
        </div>

        <div className="hidden md:block border-t border-gravity-border-light dark:border-gravity-border-dark pt-6">
             <div className="flex items-center gap-4 p-3 rounded-xl bg-gravity-surface-light dark:bg-gravity-surface-dark hover:shadow-md transition-all cursor-pointer">
                 <div className="w-10 h-10 bg-gravity-accent text-gravity-dark rounded-full flex items-center justify-center font-bold">
                    {store.xp > 1000 ? '99+' : Math.floor(store.xp / 100)}
                 </div>
                 <div>
                    <div className="font-bold text-gravity-text-main-light dark:text-gravity-text-main-dark text-xs uppercase tracking-wider">User Profile</div>
                    <div className="text-xs text-gravity-text-sub-light dark:text-gravity-text-sub-dark font-mono">XP: {store.xp}</div>
                 </div>
             </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 pb-32 relative overflow-y-auto overflow-x-hidden">
        
        {/* Mobile Header */}
        <div className="sticky top-0 z-40 bg-gravity-light/90 dark:bg-gravity-dark/90 backdrop-blur border-b border-gravity-border-light dark:border-gravity-border-dark px-4 py-3 flex justify-between items-center md:hidden">
             <div className="font-black text-xl tracking-tighter">SKILL<span className="text-gravity-blue">SPROUT</span></div>
             <div className="flex items-center gap-4 ml-auto">
                <span className="font-bold text-gravity-accent font-mono">🔥 {store.streak}</span>
                <span className="font-bold text-gravity-danger font-mono">❤️ {store.hearts}</span>
             </div>
        </div>

        <div className="max-w-3xl mx-auto mt-8 px-4 relative z-10">
          
          {/* Header Card */}
          <div className="bg-gravity-surface-light dark:bg-gravity-surface-dark border border-gravity-border-light dark:border-gravity-border-dark p-8 rounded-3xl shadow-xl mb-12 flex justify-between items-center relative overflow-hidden group antigravity-card">
             <div className="relative z-10">
                <h2 className="text-4xl font-black mb-2 text-gravity-text-main-light dark:text-gravity-text-main-dark tracking-tight">{activeCourse.topic}</h2>
                <div className="w-full bg-gravity-border-light dark:bg-gravity-border-dark h-2 rounded-full mt-2 mb-4 overflow-hidden max-w-[200px]">
                   <div className="h-full bg-gravity-blue" style={{ width: `${progressPercentage}%` }}></div>
                </div>
                <span className="inline-block bg-gravity-blue/10 text-gravity-blue px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">{activeCourse.depth || 'serious'}</span>
                
                {dueReviewItems > 0 && (
                  <button 
                    onClick={handleReviewClick}
                    className="mt-6 bg-gravity-blue text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 hover:bg-blue-600 transition-all uppercase tracking-wider text-sm shadow-lg"
                  >
                     <Dumbbell className="w-4 h-4" />
                     Review ({dueReviewItems})
                  </button>
                )}
             </div>
             <div className="relative z-10 text-8xl opacity-10 grayscale group-hover:grayscale-0 transition-all duration-500">{activeCourse.icon}</div>
          </div>

          {/* Lesson Loading Indicator */}
          {loadingChapterId && (
            <div className="mb-8 bg-gravity-blue/10 dark:bg-gravity-blue/20 border border-gravity-blue/30 rounded-2xl p-8 text-center animate-pulse">
              <div className="flex items-center justify-center mb-4">
                <Loader2 className="w-8 h-8 animate-spin text-gravity-blue mr-3" />
                <h3 className="text-xl font-bold text-gravity-blue">Loading Lesson</h3>
              </div>
              {activeCourse.units
                .flatMap(unit => unit.chapters)
                .find(chapter => chapter.id === loadingChapterId)?.title && (
                <p className="text-gravity-text-sub-light dark:text-gravity-text-sub-dark font-medium">
                  Preparing: {activeCourse.units
                    .flatMap(unit => unit.chapters)
                    .find(chapter => chapter.id === loadingChapterId)?.title
                  }
                </p>
              )}
              <div className="flex justify-center space-x-1 mt-4">
                <div className="w-2 h-2 bg-gravity-blue rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                <div className="w-2 h-2 bg-gravity-blue rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-gravity-blue rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex justify-between items-center mb-8">
             <div className="text-gravity-text-sub-light dark:text-gravity-text-sub-dark font-bold uppercase tracking-[0.2em] text-xs">Curriculum Path</div>
             <button 
               onClick={() => setManageMode(!manageMode)}
               className={`p-3 rounded-full transition-all ${manageMode ? 'bg-gravity-text-main-light dark:bg-white text-gravity-light dark:text-gravity-dark' : 'text-gravity-text-sub-light dark:text-gravity-text-sub-dark hover:bg-gravity-surface-light dark:hover:bg-gravity-surface-dark'}`}
             >
                <Settings className="w-5 h-5" />
             </button>
          </div>

          {manageMode && (
             <div className="bg-gravity-danger/5 border border-gravity-danger/20 p-6 rounded-2xl mb-8 text-center">
                <h3 className="font-bold text-gravity-danger mb-4 uppercase tracking-widest text-xs">Edit Mode Active</h3>
                <div className="flex gap-2 justify-center">
                   <Button variant="danger" onClick={() => store.deleteCourse(activeCourse.id)} size="sm">
                      Delete Track
                   </Button>
                </div>
             </div>
          )}

          {/* Units */}
          <div className="space-y-16 pb-64 relative z-10">
            {activeCourse.units.map((unit, unitIdx) => (
              <div key={unit.id} className="relative">
                {/* Unit Header */}
                <div 
                  className="mb-8 rounded-2xl p-1 shadow-sm relative overflow-hidden"
                  style={{ backgroundColor: unit.color }}
                >
                  <div className="bg-gravity-light dark:bg-gravity-surface-dark rounded-xl p-6 flex justify-between items-center h-[98%] w-[99.5%] mx-auto mt-[1px]">
                    <div>
                      <h3 className="font-black text-2xl text-gravity-text-main-light dark:text-gravity-text-main-dark uppercase tracking-tight">Unit {unitIdx + 1}</h3>
                      <p className="font-bold text-sm mt-1" style={{ color: unit.color }}>{unit.title}</p>
                      <p className="text-xs text-gravity-text-sub-light dark:text-gravity-text-sub-dark mt-2 max-w-md">{unit.description}</p>
                    </div>
                    {manageMode ? (
                      <button onClick={() => store.deleteUnit(unit.id)} className="text-gravity-danger p-2 hover:bg-gravity-danger/10 rounded-full">
                         <Trash2 className="w-5 h-5" />
                      </button>
                    ) : (
                      <BookOpen className="w-6 h-6 text-gravity-text-sub-light dark:text-gravity-text-sub-dark opacity-20" />
                    )}
                  </div>
                </div>

                {/* Chapters Path */}
                <div className="flex flex-col items-center space-y-8 relative">
                  {unit.chapters.map((chapter, idx) => {
                    const offset = idx % 2 === 0 ? '0px' : (idx % 4 === 1 ? '60px' : '-60px');
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
                        <button
                          onClick={() => handleChapterClick(unit, chapter)}
                          disabled={isLocked || isLoading || manageMode}
                          className={`
                            w-20 h-20 rounded-full flex items-center justify-center relative z-10 transition-all duration-300 shadow-lg border-4
                            ${manageMode ? 'opacity-50 grayscale' : ''}
                            ${isLocked 
                               ? 'bg-gravity-surface-light dark:bg-gravity-surface-dark border-gravity-border-light dark:border-gravity-border-dark text-gravity-text-sub-light dark:text-gravity-text-sub-dark' 
                               : 'hover:scale-110'}
                            ${isActive 
                               ? 'bg-gravity-light dark:bg-gravity-dark border-gravity-blue text-gravity-blue ring-4 ring-gravity-blue/20' 
                               : ''}
                            ${isCompleted 
                               ? 'bg-gravity-success text-white border-gravity-success' 
                               : ''}
                          `}
                          style={{ 
                              borderColor: (!isLocked && !isActive && !isCompleted) ? unit.color : undefined,
                              backgroundColor: (!isLocked && !isActive && !isCompleted) ? unit.color : undefined,
                              color: (!isLocked && !isActive && !isCompleted) ? '#FFF' : undefined
                          }}
                        >
                           {isLoading ? (
                             <Loader2 className="animate-spin w-8 h-8" />
                           ) : isCompleted ? (
                             <Check className="w-10 h-10 stroke-[3]" />
                           ) : isLocked ? (
                             <Lock className="w-8 h-8" />
                           ) : (
                             <Star className="w-8 h-8 fill-current" />
                           )}
                        </button>
                        
                        {/* Hover tooltip - hide when loading */}
                        {!manageMode && !isLoading && (
                          <div className={`
                            absolute left-1/2 -translate-x-1/2 -top-12 bg-gravity-surface-light dark:bg-gravity-surface-dark border border-gravity-border-light dark:border-gravity-border-dark
                            px-4 py-2 rounded-lg text-xs font-bold text-gravity-text-main-light dark:text-gravity-text-main-dark whitespace-nowrap shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20
                          `}>
                            {chapter.title}
                          </div>
                        )}

                        {/* Loading popup - appears below the chapter button */}
                        {isLoading && store.loadingState && (
                          <LessonLoader
                            onRetry={handleRetryLoading}
                            onCancel={handleCancelLoading}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cloud Barrier - Antigravity Style */}
        <div className="absolute bottom-0 left-0 right-0 h-[400px] overflow-hidden pointer-events-none z-5 select-none">
            <div className="absolute bottom-0 w-full h-full bg-gradient-to-t from-gravity-light dark:from-gravity-dark via-gravity-light/95 dark:via-gravity-dark/95 to-transparent z-5"></div>
            
            <div className="absolute bottom-0 left-0 right-0 flex justify-center items-end pointer-events-auto translate-y-12 z-5">
                <div className="relative w-full max-w-4xl h-[300px] flex flex-col items-center justify-end pb-24">
                    <div className="mb-6 opacity-50">
                        <Lock className="w-8 h-8 text-gravity-text-sub-light dark:text-gravity-text-sub-dark" />
                    </div>
                    {isAddingUnit ? (
                      <div className="bg-gravity-surface-light dark:bg-gravity-surface-dark border border-gravity-border-light dark:border-gravity-border-dark px-8 py-4 rounded-full flex items-center gap-3 shadow-xl">
                          <Loader2 className="w-5 h-5 animate-spin text-gravity-blue" />
                          <span className="font-bold text-gravity-text-main-light dark:text-gravity-text-main-dark text-sm">Extending...</span>
                      </div>
                    ) : (
                      <button 
                        onClick={openPathSelector}
                        className="bg-gravity-surface-light dark:bg-gravity-surface-dark hover:bg-white dark:hover:bg-gravity-surface-dark/80 border border-gravity-border-light dark:border-gravity-border-dark text-gravity-text-main-light dark:text-gravity-text-main-dark px-8 py-4 rounded-full shadow-2xl flex items-center gap-4 transition-all transform hover:-translate-y-1"
                      >
                          <Cloud className="w-5 h-5 text-gravity-blue" />
                          <span className="font-bold text-sm uppercase tracking-wider">Extend Path</span>
                      </button>
                    )}
                </div>
            </div>
        </div>

      </main>

      {/* Path Selector Modal */}
      {isPathModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gravity-dark/50 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-gravity-surface-light dark:bg-gravity-surface-dark border border-gravity-border-light dark:border-gravity-border-dark rounded-3xl shadow-2xl w-full max-w-md p-8 relative">
              <button 
                onClick={() => setIsPathModalOpen(false)}
                className="absolute top-4 right-4 p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full"
              >
                <X className="w-6 h-6 text-gravity-text-sub-light dark:text-gravity-text-sub-dark" />
              </button>

              <h2 className="text-2xl font-black text-gravity-text-main-light dark:text-gravity-text-main-dark mb-6">Where to next?</h2>

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
                         className="w-full text-left p-4 border border-gravity-border-light dark:border-gravity-border-dark bg-gravity-light dark:bg-black/20 rounded-xl hover:border-gravity-blue hover:shadow-md transition-all flex items-center justify-between group"
                       >
                          <span className="font-bold text-gravity-text-main-light dark:text-gravity-text-main-dark">{sugg}</span>
                          <ArrowRight className="w-5 h-5 text-gravity-text-sub-light dark:text-gravity-text-sub-dark group-hover:text-gravity-blue" />
                       </button>
                    ))}
                 </div>
              )}

              <div className="flex gap-2">
                 <input 
                    type="text" 
                    value={customPath}
                    onChange={(e) => setCustomPath(e.target.value)}
                    placeholder="Or type custom topic..."
                    className="flex-1 p-3 bg-gravity-light dark:bg-black/20 border border-gravity-border-light dark:border-gravity-border-dark rounded-xl focus:outline-none focus:border-gravity-blue text-gravity-text-main-light dark:text-gravity-text-main-dark text-sm"
                 />
                 <Button onClick={() => handleAddSpecificUnit(customPath)} disabled={!customPath.trim()}>
                    <MapPin className="w-5 h-5" />
                 </Button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
