
export interface Question {
  id: string;
  type: 'multiple-choice' | 'fill-blank' | 'true-false';
  question: string;
  options?: string[]; // For multiple choice
  correctAnswer: string; // For all types
  explanation: string;
}

export type WidgetType = 'simulation' | 'canvas' | 'sorting' | 'image-editor';

export interface SimulationParam {
  label: string;
  min: number;
  max: number;
  step: number;
  targetValue: number; // The correct answer
  unit?: string;
}

export interface InteractiveWidget {
  type: WidgetType;
  instruction: string;
  // For Simulation (e.g. Camera ISO, Physics)
  params?: SimulationParam[];
  feedback: string; // What to say when they get it right
  // For Sorting (e.g. Cooking steps, Code order)
  items?: string[]; // The correct order
  // For Canvas (e.g. Kanji)
  backgroundImage?: string; // Optional guide
  strokeGuide?: string; // Description of what to draw
}

export interface LessonContent {
  chapterId: string;
  type: 'quiz' | 'interactive';
  intro: string;
  questions: Question[];
  // Optional fields based on type
  interactiveConfig?: InteractiveWidget;
}

export interface Chapter {
  id: string;
  title: string;
  description: string;
  status: 'locked' | 'active' | 'completed';
  stars: 0 | 1 | 2 | 3;
}

// Reference material for supplementary learning
export interface ReferenceMaterial {
  id: string;
  title: string;
  url: string;
  type: 'article' | 'video' | 'documentation' | 'tutorial' | 'interactive' | 'research' | 'knowledge-summary';
  source: string;
  description: string;
  // Validation metadata
  validatedAt?: number;
  isValid?: boolean;
  // For knowledge summaries (when url is empty)
  category?: 'theory' | 'application' | 'history' | 'example';
}

export interface UnitReferences {
  unitId: string;
  materials: ReferenceMaterial[];
  generatedAt: number;
  // Flag to indicate if references were intentionally skipped for this topic
  shouldShowReferences?: boolean;
}

export interface Unit {
  id: string;
  title: string;
  description: string;
  color: string; // hex code for UI theming
  chapters: Chapter[];
  references?: UnitReferences; // Optional reference materials for the unit
}

export type CourseDepth = 'casual' | 'serious' | 'obsessed';

export interface Course {
  id: string;
  topic: string;
  depth: CourseDepth;
  icon: string; // emoji or url
  units: Unit[];
  totalXp: number;
}

export interface ReviewItem {
  id: string;
  courseId: string;
  question: Question;
  nextReviewDate: number; // timestamp
  interval: number; // in days
  easeFactor: number; 
}

export enum AppState {
  ONBOARDING, // Initial empty state
  ADD_COURSE, // Adding a specific course (modal/view)
  GENERATING_COURSE,
  ROADMAP,
  LOADING_LESSON,
  LESSON_ACTIVE,
  LESSON_COMPLETE,
  MANAGE_COURSE, // Editing the track
  REVIEW_SESSION // SRS Session
}

export type Theme = 'light' | 'dark';

// Loading state types for progressive loading
export type LoadingPhase =
  | 'initializing'
  | 'searching'
  | 'checking-cache'
  | 'generating'
  | 'finalizing'
  | 'complete'
  | 'error'
  | 'timeout';

export interface LoadingState {
  phase: LoadingPhase;
  progress: number; // 0-100
  message: string;
  startTime: number;
  chapterId: string | null;
  chapterTitle: string | null;
  retryCount: number;
  error?: string;
  isCached?: boolean;
}

export interface LessonLoaderConfig {
  timeout: number; // ms before showing timeout warning
  maxRetries: number;
  slowThreshold: number; // ms before showing "taking longer than usual"
}

// Default loader configuration
export const DEFAULT_LOADER_CONFIG: LessonLoaderConfig = {
  timeout: 30000, // 30 seconds
  maxRetries: 3,
  slowThreshold: 10000, // 10 seconds
};
