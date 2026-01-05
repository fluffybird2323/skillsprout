import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Course, Unit, Chapter, AppState, LessonContent, ReviewItem, Theme, LoadingState, UnitReferences, User } from '../types';
import { storageValidator } from '../utils/storageValidation';
import { storageRecovery } from '../services/storageRecovery';

interface GameState {
  appState: AppState;
  courses: Course[];
  activeCourseId: string | null;
  theme: Theme;
  
  // Auth State
  user: User | null;
  token: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;

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
  
  // Completed Lessons Storage for Review Access
  completedLessons: Map<string, LessonContent>; // chapterId -> lesson content

  // Loading State
  loadingState: LoadingState | null;
  prefetchedSuggestions: string[] | null;

  // UI State
  isAuthModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;

  // Actions
  setAppState: (state: AppState) => void;
  toggleTheme: () => void;
  addCourse: (course: Course) => void;
  switchCourse: (courseId: string) => void;
  deleteCourse: (courseId: string) => void;

  // Course Management
  deleteUnit: (unitId: string) => void;
  appendUnit: (unit: Unit) => void;
  setUnitReferences: (unitId: string, references: UnitReferences) => void;

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

  // Completed Lessons Management
  getCompletedLesson: (chapterId: string) => LessonContent | undefined;
  getAllCompletedLessons: () => LessonContent[];
  startReviewExercise: () => void;

  // Mechanics
  loseHeart: () => void;
  resetHearts: () => void;
  validateCourseProgress: () => void;
}

// Helper function to validate lesson status transitions
function isValidStatusTransition(currentStatus: Chapter['status'], newStatus: Chapter['status']): boolean {
  // Valid transitions:
  // locked -> active (unlock)
  // active -> completed (complete lesson)
  // completed -> completed (redo lesson, keep status)
  // Invalid transitions:
  // completed -> active (would lose progress)
  // completed -> locked (would lose progress)
  // active -> locked (would unexpectedly lock)

  if (currentStatus === 'completed') {
    // Once completed, can only stay completed
    return newStatus === 'completed';
  }

  if (currentStatus === 'active') {
    // Active can become completed or stay active
    return newStatus === 'active' || newStatus === 'completed';
  }

  if (currentStatus === 'locked') {
    // Locked can become active (unlock) or stay locked
    return newStatus === 'locked' || newStatus === 'active';
  }

  return false;
}

export const useStore = create<GameState>()(
  persist(
    (set, get) => ({
      appState: AppState.ONBOARDING,
      courses: [],
      activeCourseId: null,
      theme: 'dark', // Default to dark Antigravity theme
      
      // Auth
      user: null,
      token: null,
      login: (user, token) => set({ user, token }),
      logout: () => set({ user: null, token: null }),
      updateUser: (updates) => set((state) => ({
        user: state.user ? { ...state.user, ...updates } : null
      })),

      xp: 0,
      streak: 0,
      hearts: 5,
      lastStudyDate: null,
      
      currentLesson: null,
      activeUnitId: null,
      activeChapterId: null,
      srsItems: [],
      isReviewSession: false,
      completedLessons: new Map(),

      // Loading State
      loadingState: null,
      prefetchedSuggestions: null,

      // UI State
      isAuthModalOpen: false,
      setAuthModalOpen: (open) => set({ isAuthModalOpen: open }),

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

        const newUnits = [...course.units, unitToAppend];
        const newCourses = state.courses.map(c =>
          c.id === state.activeCourseId ? { ...c, units: newUnits } : c
        );

        // Auto-sync to server if logged in
        if (state.token) {
          fetch('/api/progress', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json', 
              'Authorization': `Bearer ${state.token}`
            },
            body: JSON.stringify({
              courseId: state.activeCourseId,
              progressData: { units: newUnits }
            }),
          }).catch(console.error);
        }

        return { courses: newCourses, appState: AppState.ROADMAP };
      }),

      setUnitReferences: (unitId, references) => set((state) => {
        if (!state.activeCourseId) return state;

        const newCourses = state.courses.map(course => {
          if (course.id !== state.activeCourseId) return course;

          const newUnits = course.units.map(unit => {
            if (unit.id !== unitId) return unit;
            return { ...unit, references };
          });

          return { ...course, units: newUnits };
        });

        return { courses: newCourses };
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

        let finalUnits: Unit[] = [];
        const newCourses = state.courses.map(course => {
          if (course.id !== state.activeCourseId) return course;
          
          const newUnits = course.units.map(unit => {
            if (unit.id !== state.activeUnitId) return unit;
            
            const newChapters = unit.chapters.map((chapter) => {
              if (chapter.id === state.activeChapterId) {
                // Validate status transition
                const newStatus = 'completed' as const;
                if (!isValidStatusTransition(chapter.status, newStatus)) {
                  console.warn(
                    `Invalid status transition for chapter ${chapter.id}: ${chapter.status} -> ${newStatus}. ` +
                    `This should not happen - keeping original status.`
                  );
                  return chapter;
                }

                // Update completed status, but preserve existing stars if better
                const existingStars = chapter.status === 'completed' ? chapter.stars : 0;
                const bestStars = Math.max(stars, existingStars) as 0 | 1 | 2 | 3;

                console.log(
                  `Completing chapter ${chapter.title}: ` +
                  `status ${chapter.status} -> completed, ` +
                  `stars ${existingStars} -> ${bestStars}`
                );

                return {
                  ...chapter,
                  status: 'completed' as const,
                  stars: bestStars // Keep the better score
                };
              }
              return chapter;
            });

            // Only unlock next chapter if it's currently locked
            const currentIndex = unit.chapters.findIndex(c => c.id === state.activeChapterId);
            if (currentIndex !== -1 && currentIndex < unit.chapters.length - 1) {
               const nextChapter = newChapters[currentIndex + 1];
               // CRITICAL FIX: Only change status from 'locked' to 'active'
               // Never overwrite 'completed' or 'active' status
               if (nextChapter.status === 'locked') {
                 newChapters[currentIndex + 1] = {
                   ...nextChapter,
                   status: 'active' as const
                 };
               }
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
               // CRITICAL FIX: Only unlock if the first chapter is 'locked'
               // Don't overwrite 'active' or 'completed' status
               if (nextUnit.chapters.length > 0 && nextUnit.chapters[0].status === 'locked') {
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

              if (firstExtendedUnit && firstExtendedUnit.chapters[0].status === 'locked') {
                // Unlock the first chapter of the first extended unit only if locked
                firstExtendedUnit.chapters[0] = { ...firstExtendedUnit.chapters[0], status: 'active' };
              }
            }
          }
          
          finalUnits = newUnits;
          return { ...course, units: newUnits, totalXp: course.totalXp + 10 };
        });

        // Auto-sync to server if logged in
        if (state.token && finalUnits.length > 0) {
          fetch('/api/progress', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json', 
              'Authorization': `Bearer ${state.token}`
            },
            body: JSON.stringify({
              courseId: state.activeCourseId,
              progressData: { units: finalUnits }
            }),
          }).catch(console.error);
        }

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
        
        // Store the completed lesson for future review access
        const newCompletedLessons = new Map(state.completedLessons);
        if (state.currentLesson && state.activeChapterId) {
          newCompletedLessons.set(state.activeChapterId, state.currentLesson);
          console.log(`Stored completed lesson for chapter ${state.activeChapterId} with ${state.currentLesson.questions.length} questions`);
        }
        
        return {
          courses: newCourses,
          xp: state.xp + (10 + stars * 5),
          streak: newStreak,
          lastStudyDate: Date.now(),
          appState: AppState.LESSON_COMPLETE,
          completedLessons: newCompletedLessons
        };
      }),

      loseHeart: () => set((state) => {
        const newHearts = Math.max(0, state.hearts - 1);
        return { hearts: newHearts };
      }),

      resetHearts: () => set({ hearts: 5 }),

      validateCourseProgress: () => set((state) => {
        if (!state.activeCourseId) return state;

        const newCourses = state.courses.map(course => {
          if (course.id !== state.activeCourseId) return course;

          let courseChanged = false;
          const newUnits = [...course.units];

          // Iterate units
          for (let i = 0; i < newUnits.length; i++) {
            const unit = newUnits[i];
            const newChapters = [...unit.chapters];
            let unitChanged = false;

            // Check chapter continuity within unit
            for (let j = 0; j < newChapters.length - 1; j++) {
              if (newChapters[j].status === 'completed' && newChapters[j+1].status === 'locked') {
                newChapters[j+1] = { ...newChapters[j+1], status: 'active' };
                unitChanged = true;
                courseChanged = true;
                console.log(`Auto-unlocking chapter ${newChapters[j+1].title}`);
              }
            }

            // Update unit if changed
            if (unitChanged) {
              newUnits[i] = { ...unit, chapters: newChapters };
            }

            // Check unit continuity
            // If this unit is fully complete (all chapters completed)
            const updatedUnit = newUnits[i]; // Use updated unit
            const isUnitComplete = updatedUnit.chapters.every(c => c.status === 'completed');
            
            if (isUnitComplete && i < newUnits.length - 1) {
              const nextUnit = newUnits[i+1];
              if (nextUnit.chapters.length > 0 && nextUnit.chapters[0].status === 'locked') {
                // Unlock first chapter of next unit
                const nextUnitChapters = [...nextUnit.chapters];
                nextUnitChapters[0] = { ...nextUnitChapters[0], status: 'active' };
                newUnits[i+1] = { ...nextUnit, chapters: nextUnitChapters };
                courseChanged = true;
                console.log(`Auto-unlocking unit ${nextUnit.title}`);
              }
            }
          }

          if (courseChanged) {
            return { ...course, units: newUnits };
          }
          return course;
        });

        return { courses: newCourses };
      }),

      // Completed Lessons Management
      getCompletedLesson: (chapterId: string) => {
        const state = get();
        return state.completedLessons.get(chapterId);
      },

      getAllCompletedLessons: () => {
        const state = get();
        return Array.from(state.completedLessons.values());
      },

      startReviewExercise: () => {
        const state = get();
        const allCompletedLessons = Array.from(state.completedLessons.values());
        
        if (allCompletedLessons.length === 0) {
          console.log('No completed lessons available for review exercise');
          return;
        }

        // Collect all questions from completed lessons
        const allQuestions = allCompletedLessons.flatMap(lesson => lesson.questions);
        
        if (allQuestions.length === 0) {
          console.log('No questions available in completed lessons');
          return;
        }

        // Shuffle and select 5 random questions (or all if less than 5)
        const shuffledQuestions = [...allQuestions].sort(() => Math.random() - 0.5);
        const selectedQuestions = shuffledQuestions.slice(0, Math.min(5, allQuestions.length));

        // Create review exercise lesson
        const reviewExercise: LessonContent = {
          chapterId: 'review-exercise',
          type: 'quiz',
          intro: "Time for a review exercise! Let's test your knowledge with questions from your completed lessons.",
          questions: selectedQuestions
        };

        console.log(`Created review exercise with ${selectedQuestions.length} questions from ${allCompletedLessons.length} completed lessons`);
        
        set({
          currentLesson: reviewExercise,
          isReviewSession: true,
          appState: AppState.LESSON_ACTIVE
        });
      },
    }),
    {
      name: 'manabu-storage',
      // Add storage validation and recovery
      storage: {
        getItem: async (name) => {
          try {
            // Check if we're in a browser environment
            if (typeof window === 'undefined') {
              return null;
            }
            
            const storedValue = localStorage.getItem(name);
            if (!storedValue) return null;

            const parsed = JSON.parse(storedValue);
            
            // Deserialize completedLessons Map
            if (parsed.state && parsed.state.completedLessons && typeof parsed.state.completedLessons === 'object') {
              parsed.state.completedLessons = new Map(Object.entries(parsed.state.completedLessons));
            }
            
            // Validate the stored state
            if (parsed.state && parsed.state.courses && Array.isArray(parsed.state.courses)) {
              const validatedCourses = [];
              const errors = [];
              
              for (const course of parsed.state.courses) {
                const validation = storageValidator.validateCourse(course);
                if (validation.isValid) {
                  validatedCourses.push(validation.data || course);
                } else {
                  console.warn(`Course validation failed: ${validation.errors.join(', ')}`);
                  errors.push({ courseId: course.id, errors: validation.errors });
                  
                  // Attempt recovery
                  const recoveryResult = await storageRecovery.recoverCourse(course, course.id);
                  if (recoveryResult.success && recoveryResult.recoveredData) {
                    validatedCourses.push(recoveryResult.recoveredData);
                    console.log(`Successfully recovered course: ${course.id}`);
                  }
                }
              }
              
              if (errors.length > 0) {
                console.warn(`Storage validation found ${errors.length} corrupted courses, recovered ${validatedCourses.length}`);
              }
              
              // Replace courses with validated ones
              parsed.state.courses = validatedCourses;
            }
            
            return parsed;
          } catch (error) {
            console.error('Storage validation error:', error);
            
            // If parsing fails completely, attempt to recover
            if (error instanceof SyntaxError && typeof window !== 'undefined') {
              console.warn('Storage data is corrupted (SyntaxError), clearing storage');
              localStorage.removeItem(name);
              return null;
            }
            
            return null;
          }
        },
        setItem: (name, value) => {
          try {
            // Check if we're in a browser environment
            if (typeof window === 'undefined') {
              return;
            }
            
            // Create a copy for serialization
            const serializedValue = JSON.parse(JSON.stringify(value));
            
            // Serialize completedLessons Map to plain object for JSON storage
            if (serializedValue.state && serializedValue.state.completedLessons) {
              serializedValue.state.completedLessons = Object.fromEntries(
                Array.from(value.state.completedLessons.entries())
              );
            }
            
            localStorage.setItem(name, JSON.stringify(serializedValue));
          } catch (error) {
            console.error('Storage write error:', error);
            
            // Handle quota exceeded or other storage errors
            if (error instanceof Error && typeof window !== 'undefined') {
              if (error.name === 'QuotaExceededError') {
                console.warn('Storage quota exceeded, attempting cleanup');
                // Clear old cache data to free up space
                localStorage.removeItem('manabu-cache');
                // Try again
                try {
                  localStorage.setItem(name, JSON.stringify(value));
                } catch (retryError) {
                  console.error('Storage write failed after cleanup:', retryError);
                }
              }
            }
          }
        },
        removeItem: (name) => {
          if (typeof window !== 'undefined') {
            localStorage.removeItem(name);
          }
        },
      },
      // Handle hydration errors
      onRehydrateStorage: () => {
        return (state, error) => {
          if (error) {
            console.error('Storage rehydration error:', error);
            
            // If there's a hydration error, reset to clean state
            if (state) {
              state.setAppState(AppState.ONBOARDING);
              state.courses = [];
              state.activeCourseId = null;
              state.currentLesson = null;
              state.activeUnitId = null;
              state.activeChapterId = null;
              
              console.warn('Reset app to clean state due to storage corruption');
            }
          }
        };
      },
    }
  )
);
