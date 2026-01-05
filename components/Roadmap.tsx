import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useStore } from '../store/useStore';
import { generateLessonOptimized } from '../services/aiOptimized';
import { generateUnit, generatePathSuggestions, generateUnitReferences } from '../services/ai';
import { Star, Lock, Check, Loader2, Plus, Trash2, BookOpen, Settings, Dumbbell, Cloud, MapPin, ArrowRight, X, Library, Share2, Edit2, MoreVertical, Layout, Compass, LogOut, User as UserIcon } from 'lucide-react';
import { Unit, Chapter, AppState, DEFAULT_LOADER_CONFIG, UnitReferences } from '../types';
import { Button } from './ui/Button';
import { LessonLoader, useLessonLoader } from './LessonLoaderOptimized';
import { lessonCache } from '../services/lessonCache';
import { getLessonTemplate } from '../services/webSearch';
import { ReferenceSection } from './ReferenceSection';

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

  const [showShareModal, setShowShareModal] = useState<string | null>(null);

  const activeCourse = store.courses.find(c => c.id === store.activeCourseId);

  const handleSignOut = () => {
    if (confirm('Are you sure you want to sign out? Your local progress will be saved but sync will stop.')) {
      store.logout();
    }
  };

  const handleShare = (courseId: string) => {
    const shareUrl = `${window.location.origin}/?courseId=${courseId}`;
    if (navigator.share) {
      navigator.share({
        title: activeCourse?.topic || 'Manabu Course',
        text: `Check out this course on ${activeCourse?.topic}!`,
        url: shareUrl,
      });
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert('Link copied to clipboard!');
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

    // Determine lesson type based on topic category for variety
    const template = getLessonTemplate(topic, chapter.title);
    const rand = Math.random();

    // Vary distribution based on topic category
    // Categories with more hands-on content get more interactive lessons
    const hasStrongInteractive = template.interactiveWidgets.length >= 3;
    const hasStrongResources = template.resourceTypes.length >= 3;

    let lessonType: 'quiz' | 'interactive';
    if (hasStrongInteractive && hasStrongResources) {
      // Balanced distribution for versatile topics
      lessonType = rand < 0.6 ? 'quiz' : 'interactive';
    } else if (hasStrongInteractive) {
      // More interactive for hands-on topics
      lessonType = rand < 0.5 ? 'quiz' : 'interactive';
    } else if (hasStrongResources) {
      // More resources for research-heavy topics
      lessonType = rand < 0.6 ? 'quiz' : 'interactive';
    } else {
      // Default distribution
      lessonType = rand < 0.7 ? 'quiz' : 'interactive';
    }

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
        lessonLoader.updatePhase('finalizing', 'Loading from cache...');
        await new Promise(resolve => setTimeout(resolve, 300)); // Brief pause for UX
        store.setLessonContent({ ...cached, chapterId: chapter.id });
        setLoadingChapterId(null);
        return true;
      }

      // Phase: Generating with better error handling
      lessonLoader.updatePhase('generating', 'Generating personalized content...');

      // Check abort signal before generating
      if (loadingAbortRef.current?.signal.aborted) {
        return false;
      }

      // Use optimized single-call generation with search phase
      const content = await generateLessonOptimized(topic, chapter.title, lessonType, (phase, message) => {
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

      // Simple retry logic - just retry the same call once
      if (retryCount === 0) {
        lessonLoader.updatePhase('generating', 'Retrying...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        return loadLessonWithRetry(unit, chapter, 1);
      }

      // Max retries exceeded - provide helpful error message
      const errorMessage = error instanceof Error 
        ? error.message.includes('Rate limit')
          ? 'Rate limit reached. Please wait a few minutes before trying again.'
          : error.message.includes('Network')
            ? 'Network error. Please check your connection.'
            : error.message
        : 'Failed to load lesson after multiple attempts';
        
      lessonLoader.setError(errorMessage);
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
      lessonLoader.initializeLoading(chapter.title);

      // Set up timeout
      timeoutRef.current = setTimeout(() => {
        if (store.loadingState?.chapterId === chapter.id) {
          lessonLoader.setError('Taking longer than usual...');
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
              SKILL<span className="text-blue-600">SPROUT</span>
            </h1>
          
          <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em] px-2 mb-4 hidden md:block">Navigation</div>
          
          <button
            onClick={handleExplore}
            className={`flex items-center gap-4 p-3 rounded-xl transition-all duration-300 w-full text-left min-w-[60px] md:min-w-0 justify-center md:justify-start mb-2
              ${store.appState === AppState.EXPLORE 
                 ? 'bg-blue-600 text-white shadow-md' 
                 : 'bg-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}
            `}
          >
            <Compass className="w-5 h-5" />
            <span className="font-bold hidden md:block text-sm">Explore</span>
          </button>

          <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em] px-2 mb-4 hidden md:block mt-4">Active Tracks</div>
          {store.courses.map(c => (
             <button
               key={c.id}
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
          ))}
          
          <button 
            onClick={() => store.setAppState(AppState.ADD_COURSE)}
            className="flex items-center gap-3 p-3 rounded-xl text-gray-500 dark:text-gray-400 font-bold border border-dashed border-gray-200 dark:border-gray-600 hover:border-blue-600 hover:text-blue-600 transition-colors w-full justify-center md:justify-start mt-2"
          >
             <Plus className="w-5 h-5" />
             <span className="hidden md:block text-xs uppercase tracking-wider">Add Track</span>
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
                        <span>XP: {store.xp}</span>
                        <span className="w-1 h-1 bg-gravity-blue rounded-full"></span>
                        <span>🔥 {store.streak}</span>
                      </div>
                    </div>
                    <button 
                      onClick={handleSignOut}
                      className="p-2 text-gravity-text-sub-light dark:text-gravity-text-sub-dark hover:text-red-500 transition-colors"
                      title="Sign Out"
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
                 <span>Sign In</span>
               </button>
             )}
        </div>
      </aside>

      {/* Main Content */}
      {store.appState !== AppState.EXPLORE && activeCourse && (
        <main className="flex-1 pb-32 relative overflow-y-auto overflow-x-hidden">
        
        {/* Mobile Header */}
        <div className="sticky top-0 z-40 bg-gray-50/90 dark:bg-gray-900/90 backdrop-blur border-b border-gray-200 dark:border-gray-600 px-4 py-3 flex justify-between items-center md:hidden">
             <div className="font-black text-xl tracking-tighter">MANA<span className="text-blue-600">BU</span></div>
             <div className="flex items-center gap-4 ml-auto">
                <span className="font-bold text-yellow-500 font-mono">🔥 {store.streak}</span>
                <span className="font-bold text-red-500 font-mono">❤️ {store.hearts}</span>
             </div>
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
                     Review ({dueReviewItems})
                  </button>
                )}
                
                {store.getAllCompletedLessons().length > 0 && (
                  <button 
                    onClick={handleReviewExerciseClick}
                    className="mt-6 bg-green-600 text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 hover:bg-green-700 transition-all uppercase tracking-wider text-sm shadow-lg ml-4"
                  >
                     <BookOpen className="w-4 h-4" />
                     Review Exercise
                  </button>
                )}
             </div>
             <div className="relative z-10 text-8xl opacity-10 grayscale group-hover:grayscale-0 transition-all duration-500">{activeCourse.icon}</div>
          </div>

          {/* Lesson Loading Indicator - Removed as per request */}
          {/* loadingChapterId logic handled by LessonLoader component now */}

          {/* Controls */}
          <div className="flex justify-between items-center mb-8">
             <div className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-[0.2em] text-xs">Curriculum Path</div>
             <div className="flex items-center gap-2">
               <button
                 onClick={() => handleShare(activeCourse.id)}
                 className="p-3 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                 title="Share Course"
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
               <h3 className="font-bold text-red-500 mb-4 uppercase tracking-widest text-xs">Edit Mode Active</h3>
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
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 flex justify-between items-center h-[98%] w-[99.5%] mx-auto mt-[1px]">
                    <div>
                      <h3 className="font-black text-2xl text-gray-900 dark:text-gray-100 uppercase tracking-tight">Unit {unitIdx + 1}</h3>
                      <p className="font-bold text-sm mt-1" style={{ color: unit.color }}>{unit.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 max-w-md">{unit.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Reference Materials Button */}
                      {!manageMode && (
                        <button
                          onClick={() => setReferenceUnitId(unit.id)}
                          className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors group relative"
                          title="Reference Materials"
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
                               ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-400 dark:text-gray-500' 
                               : 'hover:scale-110'}
                            ${isActive 
                               ? 'bg-blue-50 dark:bg-blue-900 border-blue-500 text-blue-600 ring-4 ring-blue-500/20' 
                               : ''}
                            ${isCompleted 
                               ? 'bg-green-600 text-white border-green-600' 
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
                            absolute left-1/2 -translate-x-1/2 -top-12 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600
                            px-4 py-2 rounded-lg text-xs font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20
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
            <div className="absolute bottom-0 w-full h-full bg-gradient-to-t from-gray-50 dark:from-gray-900 via-gray-50/95 dark:via-gray-900/95 to-transparent z-5"></div>
            
            <div className="absolute bottom-0 left-0 right-0 flex justify-center items-end pointer-events-auto translate-y-12 z-5">
                <div className="relative w-full max-w-4xl h-[300px] flex flex-col items-center justify-end pb-24">
                    <div className="mb-6 opacity-50">
                        <Lock className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                    </div>
                    {isAddingUnit ? (
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 px-8 py-4 rounded-full flex items-center gap-3 shadow-xl">
                          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                          <span className="font-bold text-gray-900 dark:text-gray-100 text-sm">Extending...</span>
                      </div>
                    ) : (
                      <button 
                        onClick={openPathSelector}
                        disabled={loadingSuggestions}
                        className={`
                          bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 
                          text-gray-900 dark:text-gray-100 px-8 py-4 rounded-full shadow-2xl 
                          flex items-center gap-4 transition-all transform 
                          ${loadingSuggestions ? 'opacity-70 cursor-wait' : 'hover:bg-gray-50 dark:hover:bg-gray-700 hover:-translate-y-1'}
                        `}
                      >
                          {loadingSuggestions ? (
                            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                          ) : (
                            <Cloud className="w-5 h-5 text-blue-600" />
                          )}
                          <span className="font-bold text-sm uppercase tracking-wider">
                            {loadingSuggestions ? 'Thinking...' : 'Extend Path'}
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

              <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100 mb-6">Where to next?</h2>

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
                    placeholder="Or type custom topic..."
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
    </div>
  );
};
