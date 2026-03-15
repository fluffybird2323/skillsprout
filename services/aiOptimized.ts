import { Course, Unit, LessonContent, CourseDepth, UnitReferences, ReferenceMaterial } from "../types";
import { UNIT_SAFE_COLORS } from './ai';
import { withRetry } from "../utils/aiHelpers";
import { buildSearchContext, formatSearchContext, hasRelevantResults } from "./webSearchMinimal";
import { detectTopicCategory, getLessonTemplate, getQuestionCount } from "./webSearch";
import i18n from '../lib/i18n';

// Support both local development and production Cloud Function/Run deployments
const API_ENDPOINT = process.env.NEXT_PUBLIC_API_ENDPOINT || '/api/ai';

/**
 * Hybrid RAG lesson generation - pre-search + single optimized call
 */
export async function generateLessonOptimized(
  topic: string,
  chapterTitle: string,
  lessonType: 'quiz' = 'quiz',
  onPhaseUpdate?: (phase: string, message?: string) => void
): Promise<LessonContent> {
  
  // Phase 1: Pre-search (lightweight, frontend)
  let searchContext = null;
  try {
    onPhaseUpdate?.('searching', i18n.t('loader.searchingContext'));
    searchContext = await buildSearchContext(topic, chapterTitle);
  } catch (error) {
    console.warn('Pre-search failed, continuing without context:', error);
  }
  
  // Single payload with search context
  const payload = {
    topic,
    chapterTitle,
    lessonType,
    locale: i18n.language,
    context: {
      category: detectTopicCategory(topic, chapterTitle),
      template: getLessonTemplate(topic, chapterTitle),
      questionCount: getQuestionCount(getLessonTemplate(topic, chapterTitle)),
      // Include search context if available
      searchContext: searchContext ? formatSearchContext(searchContext) : null,
      hasRelevantResults: searchContext ? hasRelevantResults(searchContext) : false
    }
  };

  try {
    // Single API call with built-in optimization
    const data = await withRetry(() => apiCall('generateLessonOptimized', payload));
    
    return mapToLessonContent(data);
    
  } catch (error) {
    console.warn('Optimized generation failed, falling back to simple quiz', error);
    // Ultra-simple fallback - just generate basic questions
    return generateFallbackLesson(topic, chapterTitle);
  }
}

/**
 * Ultra-simple fallback lesson - generates in milliseconds
 */
async function generateFallbackLesson(topic: string, chapterTitle: string): Promise<LessonContent> {
  const options = [
    i18n.t('lesson.fallback.optionA'),
    i18n.t('lesson.fallback.optionB'),
    i18n.t('lesson.fallback.optionC'),
    i18n.t('lesson.fallback.optionD'),
  ];
  const questions = [
    {
      id: `fallback-1`,
      type: 'multiple-choice' as const,
      question: i18n.t('lesson.fallback.question1', { chapter: chapterTitle }),
      options,
      correctAnswer: options[0],
      explanation: i18n.t('lesson.fallback.explanation1', { chapter: chapterTitle })
    },
    {
      id: `fallback-2`,
      type: 'fill-blank' as const,
      question: i18n.t('lesson.fallback.question2', { topic }),
      correctAnswer: 'understanding',
      explanation: i18n.t('lesson.fallback.explanation2')
    }
  ];

  return {
    chapterId: '',
    type: 'quiz',
    intro: i18n.t('lesson.fallback.intro', { chapter: chapterTitle }),
    questions
  };
}

/**
 * Direct data mapping - no processing overhead
 */
function mapToLessonContent(data: any): LessonContent {
  return {
    chapterId: '',
    type: 'quiz',
    intro: data.intro || i18n.t('lesson.fallback.defaultIntro', { topic: data.chapterTitle || 'this topic' }),
    questions: data.questions?.map((q: any, idx: number) => ({
      ...q,
      id: q.id || `q-${Date.now()}-${idx}`
    })) || []
  };
}

/**
 * Simplified API call - reduced timeout, minimal error handling
 */
async function apiCall(action: string, payload: any, retryCount = 0): Promise<any> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, payload }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      
      // Simplified retry logic: only retry on rate limit
      if (response.status === 429 && retryCount < 2) {
        const retryAfter = errorData.retryAfter || 2;
        console.warn(`Rate limited. Waiting ${retryAfter}s before retry ${retryCount + 1}`);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        return apiCall(action, payload, retryCount + 1);
      }
      
      // Throw immediately for other errors - no endless retries
      throw new Error(errorData.error || `API Request Failed: ${response.status}`);
    }

    return response.json();
  } catch (error: any) {
    // Minimal error handling - just surface the issue
    if (error.name === 'AbortError') {
      throw new Error(i18n.t('error.requestTimeout'));
    }
    throw error;
  }
}


/**
 * Keep existing functions for compatibility
 */
export async function generateCourseOutline(topic: string, depth: CourseDepth): Promise<Course> {
  const data = await withRetry(() => apiCall('generateCourseOutline', { topic, depth }));
  const courseId = `course-${Date.now()}`;
  const units: Unit[] = (data.units || []).map((u: any, uIdx: number) => ({
    id: `u-${courseId}-${uIdx}`,
    title: u.title,
    description: u.description,
    color: UNIT_SAFE_COLORS[uIdx % UNIT_SAFE_COLORS.length],
    chapters: (u.chapters || []).map((c: any, cIdx: number) => ({
      id: `c-${courseId}-${uIdx}-${cIdx}`,
      title: c.title,
      description: c.description,
      status: (uIdx === 0 && cIdx === 0) ? 'active' : 'locked',
      stars: 0
    }))
  }));
  return { id: courseId, topic, depth, icon: data.icon || '📚', units, totalXp: 0 };
}

export async function generateUnitContent(topic: string, unitTitle: string, focus?: string): Promise<Unit> {
  const u = await withRetry(() => apiCall('generateUnit', { topic, existingUnitCount: 0, focus }));
  const unitIdSuffix = Date.now();
  return {
    id: `u-${unitIdSuffix}`,
    title: u.title,
    description: u.description,
    color: UNIT_SAFE_COLORS[0],
    chapters: (u.chapters || []).map((c: any, cIdx: number) => ({
      id: `c-${unitIdSuffix}-${cIdx}`,
      title: c.title,
      description: c.description,
      status: 'locked' as const,
      stars: 0
    }))
  };
}

export async function generateUnitReferences(topic: string, unitTitle: string, chapterTitles: string[]): Promise<UnitReferences> {
  try {
    const data = await withRetry(() => apiCall('generateUnitReferences', { topic, unitTitle, chapterTitles }));
    
    const materials: ReferenceMaterial[] = (data.materials || []).map((m: any, idx: number) => ({
      id: m.id || `ref-${Date.now()}-${idx}`,
      title: m.title,
      url: m.url,
      type: m.type || 'article',
      source: m.source,
      description: m.description,
      validatedAt: m.validatedAt,
      isValid: m.isValid,
      category: m.category,
    }));

    return {
      unitId: '',
      materials,
      generatedAt: data.generatedAt || Date.now(),
      shouldShowReferences: data.shouldShowReferences,
    };
  } catch (e) {
    console.warn("Reference generation failed", e);
    return {
      unitId: '',
      materials: [],
      generatedAt: Date.now(),
      shouldShowReferences: false,
    };
  }
}
