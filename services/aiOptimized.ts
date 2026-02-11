import { Course, Unit, LessonContent, CourseDepth, UnitReferences, ReferenceMaterial } from "../types";
import { withRetry } from "../utils/aiHelpers";
import { buildSearchContext, formatSearchContext, hasRelevantResults } from "./webSearchMinimal";
import i18n from '../lib/i18n';

// Support both local development and production Cloud Function/Run deployments
const API_ENDPOINT = process.env.NEXT_PUBLIC_API_ENDPOINT || '/api/ai';

/**
 * Hybrid RAG lesson generation - pre-search + single optimized call
 */
export async function generateLessonOptimized(
  topic: string, 
  chapterTitle: string,
  lessonType: 'quiz' | 'interactive' | 'resource' = 'quiz',
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
    
    // Direct mapping to LessonContent - no intermediate processing
    return mapToLessonContent(data, lessonType);
    
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
  const questions = [
    {
      id: `fallback-1`,
      type: 'multiple-choice' as const,
      question: i18n.t('lesson.fallback.question1', { chapter: chapterTitle }),
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswer: 'Option A',
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
function mapToLessonContent(data: any, lessonType: string): LessonContent {
  const baseContent = {
    chapterId: '',
    type: lessonType as any,
    intro: data.intro || i18n.t('lesson.fallback.defaultIntro', { topic: data.chapterTitle || 'this topic' })
  };

  if (lessonType === 'quiz') {
    return {
      ...baseContent,
      questions: data.questions?.map((q: any, idx: number) => ({
        ...q,
        id: q.id || `q-${Date.now()}-${idx}`
      })) || []
    };
  }

  if (lessonType === 'interactive') {
    return {
      ...baseContent,
      interactiveConfig: data.interactiveConfig || {
        type: 'simulation',
        instruction: i18n.t('interactive.defaultInstruction'),
        feedback: i18n.t('interactive.defaultFeedback')
      },
      questions: data.questions?.map((q: any, idx: number) => ({
        ...q,
        id: q.id || `iq-${Date.now()}-${idx}`
      })) || []
    };
  }

  return baseContent as LessonContent;
}

/**
 * Simplified API call - reduced timeout, minimal error handling
 */
async function apiCall(action: string, payload: any, retryCount = 0): Promise<any> {
  try {
    // Reduced timeout: 15 seconds instead of 30
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
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
 * Lightweight utility functions - no complex logic
 */
function detectTopicCategory(topic: string, chapterTitle: string): string {
  const title = `${topic} ${chapterTitle}`.toLowerCase();
  
  if (title.includes('code') || title.includes('programming') || title.includes('javascript')) return 'programming';
  if (title.includes('math') || title.includes('algebra') || title.includes('calculus')) return 'mathematics';
  if (title.includes('science') || title.includes('physics') || title.includes('chemistry')) return 'science';
  if (title.includes('history') || title.includes('ancient') || title.includes('war')) return 'history';
  
  return 'general';
}

function getLessonTemplate(topic: string, chapterTitle: string): any {
  const category = detectTopicCategory(topic, chapterTitle);
  
  return {
    questionCount: category === 'programming' ? 4 : 3,
    resourceTypes: ['article', 'documentation', 'tutorial']
  };
}

function getQuestionCount(template: any): number {
  return template?.questionCount || 3;
}

/**
 * Keep existing functions for compatibility
 */
export async function generateCourseOutline(topic: string, depth: CourseDepth): Promise<Course> {
  const data = await withRetry(() => apiCall('generateCourseOutline', { topic, depth }));
  return data.course;
}

export async function generateUnitContent(topic: string, unitTitle: string, focus?: string): Promise<Unit> {
  const data = await withRetry(() => apiCall('generateUnitContent', { topic, unitTitle, focus }));
  return data.unit;
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
