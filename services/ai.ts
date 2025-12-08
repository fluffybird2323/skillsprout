import { Course, Unit, LessonContent, CourseDepth, UnitReferences, ReferenceMaterial } from "../types";
import { withRetry } from "../utils/aiHelpers";

// Support both local development and production Cloud Function/Run deployments
const API_ENDPOINT = process.env.NEXT_PUBLIC_API_ENDPOINT || '/api/ai';

async function apiCall(action: string, payload: any, retryCount = 0) {
  try {
    // Add timeout to fetch request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, payload }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      
      // Handle rate limiting with exponential backoff
      if (response.status === 429 && retryCount < 3) {
        const retryAfter = errorData.retryAfter || Math.pow(2, retryCount + 1);
        console.warn(`Rate limited. Waiting ${retryAfter}s before retry ${retryCount + 1}`);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        return apiCall(action, payload, retryCount + 1);
      }
      
      // Handle specific error types
      if (response.status === 503) {
        throw new Error('Service temporarily unavailable. Please try again.');
      } else if (response.status === 502) {
        throw new Error('Gateway error. The service is experiencing issues.');
      } else if (response.status === 504) {
        throw new Error('Gateway timeout. The request took too long to process.');
      }
      
      throw new Error(errorData.error || `API Request Failed: ${response.status}`);
    }

    return response.json();
  } catch (error: any) {
    // Handle network errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Network error. Please check your connection.');
    }
    
    // Handle abort errors (timeout)
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }
    
    // Re-throw the error to be handled by withRetry
    throw error;
  }
}

// --- Public Interface (Matches old service signatures) ---

export async function generateCourseOutline(topic: string, depth: CourseDepth): Promise<Course> {
  const data = await withRetry(() => apiCall('generateCourseOutline', { topic, depth }));
  
  const courseId = `course-${Date.now()}`;
  const units: Unit[] = (data.units || []).map((u: any, uIdx: number) => ({
    id: `u-${courseId}-${uIdx}`,
    title: u.title,
    description: u.description,
    color: u.color || '#58cc02',
    chapters: (u.chapters || []).map((c: any, cIdx: number) => ({
      id: `c-${courseId}-${uIdx}-${cIdx}`,
      title: c.title,
      description: c.description,
      status: (uIdx === 0 && cIdx === 0) ? 'active' : 'locked',
      stars: 0
    }))
  }));

  return {
    id: courseId,
    topic,
    depth,
    icon: data.icon || '📚',
    units,
    totalXp: 0
  };
}

export async function generatePathSuggestions(topic: string, history: string[]): Promise<string[]> {
  try {
    const data = await withRetry(() => apiCall('generatePathSuggestions', { topic, history }));
    return data.suggestions || [];
  } catch (error) {
    console.error("Suggestion error", error);
    return ["Advanced Concepts", "Practical Application", "Mastery Review"];
  }
}

export async function generateUnit(topic: string, existingUnitCount: number, focus?: string): Promise<Unit> {
  const u = await withRetry(() => apiCall('generateUnit', { topic, existingUnitCount, focus }));
  
  const unitIdSuffix = Date.now();
  return {
    id: `u-${unitIdSuffix}`,
    title: u.title,
    description: u.description,
    color: u.color || '#ce82ff',
    chapters: (u.chapters || []).map((c: any, cIdx: number) => ({
      id: `c-${unitIdSuffix}-${cIdx}`,
      title: c.title,
      description: c.description,
      status: 'locked',
      stars: 0
    }))
  };
}

export async function generateLessonContent(topic: string, chapterTitle: string): Promise<LessonContent> {
  const data = await withRetry(() => apiCall('generateLessonContent', { topic, chapterTitle }));
  
  return {
    chapterId: '', // Set by caller
    type: 'quiz',
    intro: data.intro,
    questions: data.questions.map((q: any, idx: number) => ({
      ...q,
      id: `q-${Date.now()}-${idx}`
    }))
  };
}

export async function generateResourceLesson(topic: string, chapterTitle: string): Promise<LessonContent> {
  try {
    const data = await withRetry(() => apiCall('generateResourceLesson', { topic, chapterTitle }));
    
    return {
      chapterId: '',
      type: 'resource',
      intro: "Let's explore the real world! Study this resource, then answer the questions.",
      resourceConfig: data.resource,
      questions: data.questions.map((q: any, idx: number) => ({
        ...q,
        id: `rq-${Date.now()}-${idx}`
      }))
    };
  } catch (e) {
    console.warn("Resource generation failed, falling back to standard lesson", e);
    return generateLessonContent(topic, chapterTitle);
  }
}

export async function generateInteractiveLesson(topic: string, chapterTitle: string): Promise<LessonContent> {
  try {
    const data = await withRetry(() => apiCall('generateInteractiveLesson', { topic, chapterTitle }));

    return {
      chapterId: '',
      type: 'interactive',
      intro: data.intro,
      interactiveConfig: {
        type: data.widgetType,
        instruction: data.instruction,
        feedback: data.feedback,
        params: data.simulationParams,
        items: data.sortingItems,
        backgroundImage: data.canvasBackground
      },
      questions: data.quizQuestions.map((q: any, idx: number) => ({
        ...q,
        id: `iq-${Date.now()}-${idx}`
      }))
    };
  } catch (e) {
    console.warn("Interactive generation failed, falling back to standard lesson", e);
    return generateLessonContent(topic, chapterTitle);
  }
}

export async function editImageWithGemini(base64Image: string, mimeType: string, prompt: string): Promise<string> {
  // We can increase the timeout for image generation if needed, but withRetry handles typical glitches
  const result = await withRetry(() => apiCall('editImageWithGemini', { base64Image, mimeType, prompt }));
  return result; // The API returns the data URL string directly
}

export async function generateUnitReferences(topic: string, unitTitle: string, chapterTitles: string[]): Promise<UnitReferences> {
  try {
    const data = await withRetry(() => apiCall('generateUnitReferences', { topic, unitTitle, chapterTitles }));

    const materials: ReferenceMaterial[] = (data.materials || []).map((m: any, idx: number) => ({
      id: `ref-${Date.now()}-${idx}`,
      title: m.title,
      url: m.url,
      type: m.type || 'article',
      source: m.source,
      description: m.description,
    }));

    return {
      unitId: '', // Set by caller
      materials,
      generatedAt: Date.now(),
    };
  } catch (e) {
    console.warn("Reference generation failed", e);
    return {
      unitId: '',
      materials: [],
      generatedAt: Date.now(),
    };
  }
}
