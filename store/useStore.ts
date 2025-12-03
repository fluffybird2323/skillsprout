import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Course, Unit, AppState, LessonContent, ReviewItem, Theme, LoadingState } from '../types';

interface GameState {
  appState: AppState;
  courses: Course[];
  activeCourseId: string | null;
  theme: Theme;

  // User Profile
  xp: number;
  streak: number;
  hearts: number;
  lastStudyDate: number | null;

  // Session State
  currentLesson: LessonContent | null;
  activeUnitId: string | null;
  activeChapterId: string | null;
  srsItems: ReviewItem[];
  isReviewSession: boolean;

  // Loading State
  loadingState: LoadingState | null;
  prefetchedSuggestions: string[] | null;

  // Actions
  setAppState: (state: AppState) => void;
  toggleTheme: () => void;
  addCourse: (course: Course) => void;
  switchCourse: (courseId: string) => void;
  deleteCourse: (courseId: string) => void;

  // Course Management
  deleteUnit: (unitId: string) => void;
  appendUnit: (unit: Unit) => void;

  // Lesson & Progress
  startLesson: (unitId: string, chapterId: string, forceType?: 'quiz' | 'interactive' | 'resource') => void;
  startReviewSession: () => void;
  setLessonContent: (content: LessonContent) => void;
  completeLesson: (stars: 0 | 1 | 2 | 3) => void;

  // Loading State Management
  setLoadingState: (state: LoadingState | null) => void;
  updateLoadingProgress: (phase: LoadingState['phase'], progress: number, message: string) => void;
  setPrefetchedSuggestions: (suggestions: string[] | null) => void;

  // SRS
  processAnswer: (questionId: string, isCorrect: boolean) => void;

  // Mechanics
  loseHeart: () => void;
  resetHearts: () => void;
}

export const useStore = create<GameState>()(
  persist(
    (set, get) => ({
      appState: AppState.ONBOARDING,
      courses: [],
      activeCourseId: null,
      theme: 'dark', // Default to dark Antigravity theme
      xp: 0,
      streak: 0,
      hearts: 5,
      lastStudyDate: null,
      
      currentLesson: null,
      activeUnitId: null,
      activeChapterId: null,
      srsItems: [],
      isReviewSession: false,

      // Loading State
      loadingState: null,
      prefetchedSuggestions: null,

      setAppState: (state) => set({ appState: state }),
      
      toggleTheme: () => set((state) => ({ 
        theme: state.theme === 'light' ? 'dark' : 'light' 
      })),

      addCourse: (course) => set((state) => {
        const newCourses = [...state.courses, course];
        return { 
          courses: newCourses,
          activeCourseId: course.id, 
          appState: AppState.ROADMAP,
          // Unlock first chapter of first unit
          activeUnitId: course.units[0].id, 
        };
      }),

      switchCourse: (courseId) => set({ 
        activeCourseId: courseId,
        appState: AppState.ROADMAP 
      }),

      deleteCourse: (courseId) => set((state) => {
        const newCourses = state.courses.filter(c => c.id !== courseId);
        return {
          courses: newCourses,
          activeCourseId: newCourses.length > 0 ? newCourses[0].id : null,
          appState: newCourses.length > 0 ? AppState.ROADMAP : AppState.ONBOARDING
        };
      }),

      deleteUnit: (unitId) => set((state) => {
        if (!state.activeCourseId) return state;
        const course = state.courses.find(c => c.id === state.activeCourseId);
        if (!course) return state;

        const newUnits = course.units.filter(u => u.id !== unitId);
        const newCourses = state.courses.map(c => 
          c.id === state.activeCourseId ? { ...c, units: newUnits } : c
        );

        return { courses: newCourses };
      }),

      appendUnit: (unit) => set((state) => {
        if (!state.activeCourseId) return state;

        const course = state.courses.find(c => c.id === state.activeCourseId);
        if (!course) return state;

        // Check if the last unit's chapters are all completed
        const lastUnit = course.units[course.units.length - 1];
        const lastUnitComplete = lastUnit && lastUnit.chapters.every(ch => ch.status === 'completed');

        // If last unit is complete, unlock the first chapter of the new unit
        const unitToAppend = lastUnitComplete && unit.chapters.length > 0
          ? {
              ...unit,
              chapters: unit.chapters.map((ch, idx) =>
                idx === 0 ? { ...ch, status: 'active' as const } : ch
              ),
            }
          : unit;

        const newCourses = state.courses.map(c =>
          c.id === state.activeCourseId ? { ...c, units: [...c.units, unitToAppend] } : c
        );
        return { courses: newCourses, appState: AppState.ROADMAP };
      }),

      startLesson: (unitId, chapterId) => set({
        activeUnitId: unitId,
        activeChapterId: chapterId,
        isReviewSession: false,
        appState: AppState.LOADING_LESSON
      }),

      startReviewSession: () => {
        const state = get();
        const now = Date.now();
        const dueItems = state.srsItems.filter(item => 
          item.courseId === state.activeCourseId && item.nextReviewDate <= now
        );

        if (dueItems.length === 0) return;

        // Create a "Lesson" from review items
        const reviewLesson: LessonContent = {
          chapterId: 'review',
          type: 'quiz',
          intro: "It's time to strengthen your memory! Review these concepts to keep your streak alive.",
          questions: dueItems.map(i => i.question)
        };

        set({
          currentLesson: reviewLesson,
          isReviewSession: true,
          appState: AppState.LESSON_ACTIVE
        });
      },

      setLessonContent: (content) => set({
        currentLesson: content,
        appState: AppState.LESSON_ACTIVE,
        loadingState: null, // Clear loading state when lesson is ready
      }),

      setLoadingState: (loadingState) => set({ loadingState }),

      updateLoadingProgress: (phase, progress, message) => set((state) => ({
        loadingState: state.loadingState
          ? { ...state.loadingState, phase, progress, message }
          : null,
      })),

      setPrefetchedSuggestions: (suggestions) => set({ prefetchedSuggestions: suggestions }),

      processAnswer: (questionId, isCorrect) => set((state) => {
        if (!state.currentLesson) return state;
        
        const question = state.currentLesson.questions.find(q => q.id === questionId);
        if (!question || !state.activeCourseId) return state;

        const existingItemIndex = state.srsItems.findIndex(i => i.question.id === question.id);
        let newItems = [...state.srsItems];
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;

        if (existingItemIndex > -1) {
          const item = newItems[existingItemIndex];
          if (isCorrect) {
            const newInterval = item.interval * 2.5; 
            newItems[existingItemIndex] = {
              ...item,
              interval: newInterval,
              nextReviewDate: now + (newInterval * oneDay)
            };
          } else {
            newItems[existingItemIndex] = {
              ...item,
              interval: 1,
              nextReviewDate: now + oneDay
            };
          }
        } else if (isCorrect) {
          newItems.push({
            id: `srs-${Date.now()}-${Math.random()}`,
            courseId: state.activeCourseId,
            question: question,
            interval: 3, 
            nextReviewDate: now + (3 * oneDay),
            easeFactor: 2.5
          });
        }

        return { srsItems: newItems };
      }),

      completeLesson: (stars) => set((state) => {
        if (state.isReviewSession) {
          return {
             xp: state.xp + 15,
             appState: AppState.LESSON_COMPLETE
          };
        }

        if (!state.activeCourseId || !state.activeUnitId || !state.activeChapterId) return state;

        const newCourses = state.courses.map(course => {
          if (course.id !== state.activeCourseId) return course;
          
          const newUnits = course.units.map(unit => {
            if (unit.id !== state.activeUnitId) return unit;
            
            const newChapters = unit.chapters.map(chapter => {
              if (chapter.id === state.activeChapterId) {
                return { ...chapter, status: 'completed' as const, stars };
              }
              return chapter;
            });

            const currentIndex = unit.chapters.findIndex(c => c.id === state.activeChapterId);
            if (currentIndex !== -1 && currentIndex < unit.chapters.length - 1) {
               newChapters[currentIndex + 1] = { 
                 ...newChapters[currentIndex + 1], 
                 status: newChapters[currentIndex + 1].status === 'locked' ? 'active' : newChapters[currentIndex + 1].status 
               };
            }

            return { ...unit, chapters: newChapters };
          });

          const activeUnitIndex = newUnits.findIndex(u => u.id === state.activeUnitId);
          const activeUnit = newUnits[activeUnitIndex];
          const allChaptersComplete = activeUnit.chapters.every(c => c.status === 'completed');
          
          if (allChaptersComplete) {
            // Check if there's a next unit in the sequence
            if (activeUnitIndex < newUnits.length - 1) {
               const nextUnit = newUnits[activeUnitIndex + 1];
               if (nextUnit.chapters.length > 0) {
                 nextUnit.chapters[0] = { ...nextUnit.chapters[0], status: 'active' };
               }
            } else {
              // This is the last unit - check if there are any extended units with all locked chapters
              // This handles the case where user extended the path after completing the course
              const firstExtendedUnit = newUnits.find((unit, index) => 
                index > activeUnitIndex && 
                unit.chapters.length > 0 && 
                unit.chapters.every(chapter => chapter.status === 'locked')
              );
              
              if (firstExtendedUnit) {
                // Unlock the first chapter of the first extended unit
                firstExtendedUnit.chapters[0] = { ...firstExtendedUnit.chapters[0], status: 'active' };
              }
            }
          }
          
          return { ...course, units: newUnits, totalXp: course.totalXp + 10 };
        });

        const today = new Date().setHours(0,0,0,0);
        const last = state.lastStudyDate ? new Date(state.lastStudyDate).setHours(0,0,0,0) : 0;
        let newStreak = state.streak;
        if (today > last) {
          if (today - last === 86400000) { 
            newStreak += 1;
          } else {
            newStreak = 1;
          }
        }
        
        return {
          courses: newCourses,
          xp: state.xp + (10 + stars * 5),
          streak: newStreak,
          lastStudyDate: Date.now(),
          appState: AppState.LESSON_COMPLETE
        };
      }),

      loseHeart: () => set((state) => {
        const newHearts = Math.max(0, state.hearts - 1);
        return { hearts: newHearts };
      }),

      resetHearts: () => set({ hearts: 5 }),
    }),
    {
      name: 'skillsprout-storage',
    }
  )
);
