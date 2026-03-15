import { NextRequest, NextResponse } from 'next/server';
import { generateWithGroq } from '../../../services/groqClient';
import { cleanAndParseJSON } from '../../../utils/aiHelpers';
import { CourseDepth } from '../../../types';
import {
  detectTopicCategory,
  getLessonTemplate,
  selectQuestionTypes,
  getQuestionCount,
  TopicCategory,
  SearchResult,
  RAGContext,
  ResourceLink,
} from '../../../services/webSearch';
import {
  trackModelCall,
  shouldAllowCall,
  generateCacheKey,
  shouldCacheResult,
  estimateTokens,
  type ModelCallPurpose,
} from '../../../services/modelManager';

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute window
const MAX_REQUESTS_PER_WINDOW = 10; // Max 10 requests per minute

// Track requests per IP with timestamps
const requestTracker = new Map<string, number[]>();

// Clean up old entries periodically
setInterval(() => {
  const cutoff = Date.now() - RATE_LIMIT_WINDOW;
  for (const [ip, timestamps] of requestTracker.entries()) {
    const validTimestamps = timestamps.filter(t => t > cutoff);
    if (validTimestamps.length === 0) {
      requestTracker.delete(ip);
    } else {
      requestTracker.set(ip, validTimestamps);
    }
  }
}, RATE_LIMIT_WINDOW);

// Optional paid search APIs (if configured, used as primary for better results)
const BRAVE_SEARCH_API_KEY = process.env.BRAVE_SEARCH_API_KEY;
const SERPER_API_KEY = process.env.SERPER_API_KEY;

// Note: RAG context caching is done on frontend (IndexedDB) to reduce backend load
// Backend only performs searches and returns results for frontend to cache

export async function POST(req: NextRequest) {
  try {
    // Rate limiting check
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW;
    
    // Get or create request history for this IP
    let requestHistory = requestTracker.get(clientIP) || [];
    requestHistory = requestHistory.filter(timestamp => timestamp > windowStart);
    
    // Check if rate limit exceeded
    if (requestHistory.length >= MAX_REQUESTS_PER_WINDOW) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded: free-models-per-min.',
          code: 429,
          retryAfter: Math.ceil((requestHistory[0] + RATE_LIMIT_WINDOW - now) / 1000)
        }, 
        { status: 429 }
      );
    }
    
    // Record this request
    requestHistory.push(now);
    requestTracker.set(clientIP, requestHistory);
    
    const body = await req.json();
    const { action, payload } = body;
    const locale = payload.locale || 'en';
    const requireMultilingual = locale !== 'en';

    let result;

    switch (action) {
      case 'generateCourseOutline':
        result = await handleGenerateCourseOutline(payload.topic, payload.depth, locale, requireMultilingual);
        break;
      case 'generatePathSuggestions':
        result = await handleGeneratePathSuggestions(payload.topic, payload.history, locale, requireMultilingual);
        break;
      case 'generateUnit':
        result = await handleGenerateUnit(payload.topic, payload.existingUnitCount, payload.focus, locale, requireMultilingual);
        break;
      case 'generateLessonContent':
        result = await handleGenerateLessonContent(payload.topic, payload.chapterTitle, locale, requireMultilingual);
        break;
      case 'generateLessonOptimized': {
        const frontendSearchContext: string | null = payload.context?.searchContext || null;
        result = await handleGenerateLessonContent(payload.topic, payload.chapterTitle, locale, requireMultilingual, frontendSearchContext);
        break;
      }
      case 'searchWeb':
        result = await handleWebSearch(payload.query);
        break;
      case 'generateUnitReferences':
        result = await handleGenerateUnitReferences(payload.topic, payload.unitTitle, payload.chapterTitles);
        break;
      case 'editImageWithGemini':
        throw new Error("Image editing not supported with current model");
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json(result);

  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

// --- Web Search RAG Functions ---

// Serper (Google Search) - optional paid API for better results
async function searchSerper(query: string): Promise<SearchResult[]> {
  if (!SERPER_API_KEY) return [];

  try {
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ q: query, num: 5 }),
    });

    if (!response.ok) return [];

    const data = await response.json();
    return (data.organic || []).map((result: any) => ({
      title: result.title,
      url: result.link,
      snippet: result.snippet,
      source: new URL(result.link).hostname.replace('www.', ''),
      publishedDate: result.date,
    }));
  } catch (e) {
    console.warn('Serper search failed:', e);
    return [];
  }
}

// Brave Search - optional paid API
async function searchBrave(query: string): Promise<SearchResult[]> {
  if (!BRAVE_SEARCH_API_KEY) return [];

  try {
    const response = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`,
      {
        headers: {
          'Accept': 'application/json',
          'X-Subscription-Token': BRAVE_SEARCH_API_KEY,
        },
      }
    );

    if (!response.ok) return [];

    const data = await response.json();
    return (data.web?.results || []).map((result: any) => ({
      title: result.title,
      url: result.url,
      snippet: result.description,
      source: new URL(result.url).hostname.replace('www.', ''),
      publishedDate: result.age,
    }));
  } catch (e) {
    console.warn('Brave search failed:', e);
    return [];
  }
}

// Wikipedia API - completely free
async function searchWikipedia(query: string): Promise<SearchResult[]> {
  try {
    // Search for articles
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*&srlimit=3`;
    const searchResponse = await fetch(searchUrl);

    if (!searchResponse.ok) return [];

    const searchData = await searchResponse.json();
    const searchItems = searchData.query?.search || [];
    if (searchItems.length === 0) return [];

    // Batch all extract requests into a single API call
    const titlesParam = searchItems.map((item: any) => item.title).join('|');
    const extractUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=true&explaintext=true&titles=${encodeURIComponent(titlesParam)}&format=json&origin=*`;

    const extractResponse = await fetch(extractUrl);
    const extractData = await extractResponse.json();
    const pages = extractData.query?.pages || {};

    const results: SearchResult[] = Object.values(pages)
      .filter((page: any) => page.extract)
      .map((page: any) => ({
        title: page.title,
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`,
        snippet: page.extract.slice(0, 300),
        source: 'Wikipedia',
      }));

    return results;
  } catch (e) {
    console.warn('Wikipedia search failed:', e);
    return [];
  }
}

// DuckDuckGo Instant Answer API - free, no API key needed
async function searchDuckDuckGo(query: string): Promise<SearchResult[]> {
  try {
    const response = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`
    );

    if (!response.ok) return [];

    const data = await response.json();
    const results: SearchResult[] = [];

    // Abstract (main result)
    if (data.Abstract && data.AbstractText) {
      results.push({
        title: data.Heading || query,
        url: data.AbstractURL || `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
        snippet: data.AbstractText.slice(0, 300),
        source: data.AbstractSource || 'DuckDuckGo',
      });
    }

    // Related topics
    for (const topic of (data.RelatedTopics || []).slice(0, 3)) {
      if (topic.Text && topic.FirstURL) {
        results.push({
          title: topic.Text.split(' - ')[0] || topic.Text.slice(0, 50),
          url: topic.FirstURL,
          snippet: topic.Text,
          source: 'DuckDuckGo',
        });
      }
    }

    return results;
  } catch (e) {
    console.warn('DuckDuckGo search failed:', e);
    return [];
  }
}

// Note: Removed fake WikiHow URL generation to prevent hallucinated links

// Combine all sources - paid APIs first (if configured), then free fallbacks
async function performWebSearch(query: string): Promise<SearchResult[]> {
  const allResults: SearchResult[] = [];

  // Try paid APIs first if configured (better quality results)
  if (SERPER_API_KEY || BRAVE_SEARCH_API_KEY) {
    const [serperResults, braveResults] = await Promise.all([
      searchSerper(query),
      searchBrave(query),
    ]);
    allResults.push(...serperResults);
    allResults.push(...braveResults);
  }

  // Always add free sources for additional context
  const [wikiResults, ddgResults] = await Promise.all([
    searchWikipedia(query),
    searchDuckDuckGo(query),
  ]);

  allResults.push(...wikiResults);
  allResults.push(...ddgResults);

  // Only use real search results - no fake URL generation

  // Deduplicate by URL
  const seen = new Set<string>();
  return allResults.filter(r => {
    if (seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });
}

// Build RAG context - no server-side caching, frontend handles caching via IndexedDB
async function buildRAGContext(topic: string, chapterTitle: string): Promise<RAGContext | null> {
  const query = `${topic} ${chapterTitle}`;
  // performWebSearch already deduplicates by URL
  const allResults = await performWebSearch(query);

  if (allResults.length === 0) return null;

  const topResults = allResults.slice(0, 4);

  // Extract facts directly from snippets — no extra AI call needed.
  // The main lesson prompt will incorporate these inline.
  const facts = topResults
    .map(r => r.snippet.split(/[.!?]/)[0].trim())
    .filter(f => f.length > 20);

  // Use the first snippet as a brief summary (already grounded, no AI distillation needed)
  const summary = topResults[0]?.snippet.slice(0, 300) || '';

  const resources: ResourceLink[] = topResults.map(r => ({
    title: r.title,
    url: r.url,
    type: categorizeResource(r.url, r.title),
    source: r.source,
    description: r.snippet.slice(0, 200),
  }));

  return {
    query,
    results: topResults,
    summary,
    facts,
    resources,
    timestamp: Date.now(),
  };
}

function categorizeResource(url: string, title: string): ResourceLink['type'] {
  const urlLower = url.toLowerCase();
  const titleLower = title.toLowerCase();

  if (urlLower.includes('youtube.com') || urlLower.includes('vimeo.com') || titleLower.includes('video')) {
    return 'video';
  }
  if (urlLower.includes('docs.') || urlLower.includes('documentation') || urlLower.includes('api.')) {
    return 'documentation';
  }
  if (urlLower.includes('tutorial') || titleLower.includes('tutorial') || titleLower.includes('how to')) {
    return 'tutorial';
  }
  if (urlLower.includes('arxiv.org') || urlLower.includes('nature.com') || urlLower.includes('research')) {
    return 'research';
  }
  if (urlLower.includes('interactive') || urlLower.includes('playground') || urlLower.includes('codepen')) {
    return 'interactive';
  }
  return 'article';
}

async function handleWebSearch(query: string) {
  const results = await performWebSearch(query);
  return { results };
}

// --- Core Generation Functions ---

async function generateWithAI(
  prompt: string,
  systemInstruction: string = "You are a helpful AI assistant.",
  retryCount: number = 0,
  purpose?: ModelCallPurpose,
  metadata?: Record<string, any>,
  requireMultilingual: boolean = false
): Promise<any> {
  // Track this model call
  if (purpose && retryCount === 0) {
    const fullPrompt = `${systemInstruction}\n\n${prompt}`;
    trackModelCall({
      purpose,
      timestamp: Date.now(),
      topic: metadata?.topic,
      cacheKey: metadata?.cacheKey,
      shouldCache: shouldCacheResult(purpose),
      estimatedTokens: estimateTokens(fullPrompt),
    });
  }

  try {
    console.log(`[Model] Groq | Purpose: ${purpose || 'untracked'}`);
    const text = await generateWithGroq(prompt, systemInstruction, purpose, requireMultilingual);

    console.log(`[Model] Response: ${text.length} chars | Provider: groq | Purpose: ${purpose || 'untracked'}`);

    return cleanAndParseJSON(text);
  } catch (error: any) {
    console.error(`[Model] groq error:`, error.message, error.code);

    // Retry once with Groq if failed
    if (retryCount === 0) {
       console.warn(`[Model] Groq failed, retrying...`);
       return generateWithAI(prompt, systemInstruction, 1, purpose, metadata, requireMultilingual);
    }

    console.error(`[Model] Generation failed:`, error);
    throw new Error(`AI generation failed: ${error.message || 'Unknown error'}`);
  }
}

async function handleGenerateCourseOutline(topic: string, depth: CourseDepth, locale: string = 'en', requireMultilingual: boolean = false) {
  const category = detectTopicCategory(topic);
  const categoryGuidance = getCategoryGuidance(category);

  const depthConfig: Record<CourseDepth, { audience: string; structure: string }> = {
    casual:  { audience: 'curious beginner', structure: 'Exactly 2 units, 3 chapters each. Cover only the most essential aspects.' },
    serious: { audience: 'dedicated learner', structure: '8-12 units, 4-5 chapters each. Begin with Foundations → Core Concepts → Practical Applications → Advanced.' },
    obsessed:{ audience: 'expert-track learner', structure: '20-25 units, 4-5 chapters each. Cover History, Theory, Mechanics, Applications, Edge Cases, Future Directions.' },
  };
  const { audience, structure } = depthConfig[depth];
  const langLine = locale !== 'en' ? `\nOutput ALL text in "${locale}".` : '';

  const prompt = `Create a course curriculum for: "${topic}"
Audience: ${audience} | Category: ${category}
${categoryGuidance}
Structure: ${structure}${langLine}

Rules: sequential progression, specific non-generic titles, each unit description states the learning outcome.

Return ONLY valid JSON:
{
  "icon": "emoji",
  "units": [
    {
      "title": "Unit Title",
      "description": "What learner achieves in this unit",
      "chapters": [
        { "title": "Chapter Title", "description": "What this chapter covers" }
      ]
    }
  ]
}`;

  return generateWithAI(
    prompt,
    "You are an expert curriculum designer. Output strictly valid JSON.",
    0,
    'course-generation',
    { topic },
    requireMultilingual
  );
}

function getCategoryGuidance(category: TopicCategory): string {
  const guidance: Record<TopicCategory, string> = {
    science: "Include both theoretical concepts and experimental/observational aspects. Balance equations with real-world applications.",
    technology: "Focus on practical skills. Include both conceptual understanding and hands-on implementation. Progress from basics to advanced patterns.",
    mathematics: "Build concepts progressively. Include proofs and problem-solving. Connect abstract concepts to practical applications.",
    history: "Organize chronologically or thematically. Include primary sources, cause-effect analysis, and multiple perspectives.",
    language: "Balance grammar, vocabulary, reading, writing, and speaking. Include cultural context and practical usage.",
    arts: "Combine technique with theory and history. Include both analysis and creation. Progress from fundamentals to personal style.",
    business: "Include theory and case studies. Balance strategy with practical execution. Cover both foundational concepts and current trends.",
    health: "Balance scientific understanding with practical application. Include evidence-based information and safety considerations.",
    'social-science': "Include research methods, theories, and real-world applications. Present multiple perspectives and encourage critical thinking.",
    'practical-skills': "Focus on step-by-step skill building. Include safety, tools, techniques, and troubleshooting. Progress from basics to advanced.",
    general: "Create a balanced mix of theory, examples, and practical application. Ensure clear progression and engaging content.",
  };

  return guidance[category] || guidance.general;
}

async function handleGeneratePathSuggestions(topic: string, history: string[], locale: string = 'en', requireMultilingual: boolean = false) {
  // Ground with DuckDuckGo to prevent hallucinations
  let context = "";
  try {
    const searchResults = await searchDuckDuckGo(topic);
    if (searchResults.length > 0) {
      context = `
REAL-WORLD CONTEXT (Use this to ground your suggestions):
${searchResults.map(r => `- ${r.title}: ${r.snippet}`).join('\n')}
`;
    }
  } catch (e) {
    console.warn("Failed to ground path suggestions:", e);
  }

  const langLine = locale !== 'en' ? `\nOutput in "${locale}".` : '';
  const prompt = `A learner studying "${topic}" has completed: ${history.join(', ')}.
${context}${langLine}

Suggest 3 specific, distinct next learning directions that build on their progress (vary depth, breadth, application).

Return ONLY valid JSON:
{ "suggestions": ["Direction 1", "Direction 2", "Direction 3"] }`;

  return generateWithAI(prompt, "You are a curriculum advisor. Output strictly valid JSON.", 0, 'path-suggestions', { topic }, requireMultilingual);
}

async function handleGenerateUnit(topic: string, existingUnitCount: number, focus?: string, locale: string = 'en', requireMultilingual: boolean = false) {
  const category = detectTopicCategory(topic, focus);
  const langLine = locale !== 'en' ? `\nOutput ALL text in "${locale}".` : '';

  const prompt = `Design the next learning unit for a "${topic}" course (${category}).
Units already completed: ${existingUnitCount}. This unit must be more advanced than previous ones.${focus ? `\nFocus area: "${focus}" — make this the central theme.` : ''}${langLine}

4-5 chapters with logical progression. Specific, non-generic titles.

Return ONLY valid JSON:
{
  "title": "Unit Title",
  "description": "What the learner achieves",
  "chapters": [
    { "title": "Chapter Title", "description": "What this chapter covers" }
  ]
}`;

  return generateWithAI(prompt, "You are a curriculum designer. Output strictly valid JSON.", 0, 'unit-generation', { topic, focus }, requireMultilingual);
}

async function handleGenerateLessonContent(topic: string, chapterTitle: string, locale: string = 'en', requireMultilingual: boolean = false, prebuiltSearchContext: string | null = null) {
  const category = detectTopicCategory(topic, chapterTitle);
  const template = getLessonTemplate(topic, chapterTitle);
  const questionCount = getQuestionCount(template);
  const questionTypes = selectQuestionTypes(template, questionCount);
  const langLine = locale !== 'en' ? `\nOutput ALL text (intro, questions, options, explanations) in "${locale}".` : '';

  // Use frontend pre-built context if available, otherwise fall back to backend search
  let contextSection = '';
  let ragContext: RAGContext | null = null;
  if (prebuiltSearchContext) {
    contextSection = `\nContext (use to ground questions in reality):\n${prebuiltSearchContext}\n`;
  } else {
    try {
      ragContext = await buildRAGContext(topic, chapterTitle);
    } catch (e) {
      console.warn('RAG context failed:', e);
    }
    if (ragContext) {
      contextSection = `\nContext (use to ground questions in reality):\n${ragContext.summary}\n${ragContext.facts.map(f => `- ${f}`).join('\n')}\n`;
    }
  }

  const prompt = `Write a quiz lesson for "${chapterTitle}" (topic: "${topic}").${langLine}
${contextSection}
${questionCount} questions. Types in order: ${questionTypes.join(', ')}. Questions must be strictly about "${topic}".
Each question must test a DIFFERENT angle: definition, example, cause/effect, comparison, application, or common misconception. No two questions should test the same fact.

FORMAT RULES — follow exactly:
- multiple-choice: 4 options, options[0] is ALWAYS correct, correctAnswer = exact text of options[0], no A/B/C prefixes
- fill-blank: use ___ in question, correctAnswer is 1-3 words lowercase
- true-false: correctAnswer is exactly "True" or "False"

Return ONLY valid JSON:
{
  "intro": "1-2 sentence engaging intro for this lesson",
  "questions": [
    {
      "type": "multiple-choice",
      "question": "Question text",
      "options": ["Correct answer", "Wrong 2", "Wrong 3", "Wrong 4"],
      "correctAnswer": "Correct answer",
      "explanation": "Why this is correct"
    }
  ]
}`;

  return generateWithAI(
    prompt,
    `You are an educational content creator. Write accurate lessons about "${topic}" only. Output strictly valid JSON.`,
    0,
    'lesson-generation-quiz',
    { topic, chapterTitle },
    requireMultilingual
  );
}


async function handleGenerateUnitReferences(topic: string, unitTitle: string, chapterTitles: string[]) {
  const category = detectTopicCategory(topic, unitTitle);

  console.log(`Generating references for "${topic}" (${category})`);

  try {
    // Build a slightly more generic query so we get stable results
    const query = `${topic} ${unitTitle} tutorial guide course learning resources`;

    // Use the same multi-source search pipeline as RAG (Wikipedia + DuckDuckGo, plus paid APIs if configured)
    const results = await performWebSearch(query);
    
    if (results.length > 0) {
      const timestamp = Date.now();

      return {
        materials: results.slice(0, 5).map((r, idx) => ({
          id: `ref-${timestamp}-${idx}`,
          title: r.title,
          url: r.url,
          type: categorizeResource(r.url, r.title),
          source: r.source,
          description: r.snippet,
          validatedAt: timestamp,
          isValid: true,
        })),
        shouldShowReferences: true,
        generatedAt: timestamp,
      };
    }
  } catch (e) {
    console.warn('Resource search failed:', e);
  }

  return {
    materials: [],
    shouldShowReferences: false,
    generatedAt: Date.now(),
  };
}

