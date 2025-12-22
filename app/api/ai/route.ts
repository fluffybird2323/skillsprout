import { NextRequest, NextResponse } from 'next/server';
import { generateWithGroq } from '../../../services/groqClient';
import { cleanAndParseJSON } from '../../../utils/aiHelpers';
import { CourseDepth } from '../../../types';
import {
  detectTopicCategory,
  getLessonTemplate,
  generateIntroVariation,
  selectQuestionTypes,
  getQuestionCount,
  selectWidgetType,
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

// Track model failures to avoid repeatedly trying broken models
const modelFailures = new Map<string, number>();
const FAILURE_THRESHOLD = 3;

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

// Model selection: Groq (only)
type ModelProvider = 'groq';

function getModelProvider(retryCount: number = 0): ModelProvider {
  return 'groq';
}

// Record model failure
function recordModelFailure(model: string) {
  const current = modelFailures.get(model) || 0;
  modelFailures.set(model, current + 1);
  console.warn(`Model ${model} failure count: ${current + 1}`);
}

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

    let result;

    switch (action) {
      case 'generateCourseOutline':
        result = await handleGenerateCourseOutline(payload.topic, payload.depth);
        break;
      case 'generatePathSuggestions':
        result = await handleGeneratePathSuggestions(payload.topic, payload.history);
        break;
      case 'generateUnit':
        result = await handleGenerateUnit(payload.topic, payload.existingUnitCount, payload.focus);
        break;
      case 'generateLessonContent':
        result = await handleGenerateLessonContent(payload.topic, payload.chapterTitle);
        break;
      case 'generateLessonOptimized':
        // Route to appropriate handler based on lesson type
        const lessonType = payload.lessonType || 'quiz';
        if (lessonType === 'interactive') {
          result = await handleGenerateInteractiveLesson(payload.topic, payload.chapterTitle);
        } else {
          result = await handleGenerateLessonContent(payload.topic, payload.chapterTitle);
        }
        break;
      case 'generateInteractiveLesson':
        result = await handleGenerateInteractiveLesson(payload.topic, payload.chapterTitle);
        break;
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
    const results: SearchResult[] = [];

    for (const item of searchData.query?.search || []) {
      // Get extract for each article
      const extractUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=true&explaintext=true&titles=${encodeURIComponent(item.title)}&format=json&origin=*`;

      try {
        const extractResponse = await fetch(extractUrl);
        const extractData = await extractResponse.json();
        const pages = extractData.query?.pages || {};
        const page = Object.values(pages)[0] as any;

        if (page && page.extract) {
          results.push({
            title: item.title,
            url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}`,
            snippet: page.extract.slice(0, 500),
            source: 'Wikipedia',
          });
        }
      } catch (e) {
        // Skip this result if extract fails
      }
    }

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
        snippet: data.AbstractText.slice(0, 500),
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
  // Perform search with topic context (uses Wikipedia, DuckDuckGo)
  const query = `${topic} ${chapterTitle}`;
  const allResults = await performWebSearch(query);

  if (allResults.length === 0) {
    return null;
  }

  // Deduplicate by URL
  const uniqueResults = allResults.filter((result, index, self) =>
    index === self.findIndex(r => r.url === result.url)
  ).slice(0, 5);

  // Extract facts using AI
  const factsPrompt = `Based on these search snippets about "${chapterTitle}" in ${topic}, extract 3-5 interesting, specific facts:

${uniqueResults.map(r => `- ${r.snippet}`).join('\n')}

Return ONLY valid JSON:
{
  "facts": ["fact 1", "fact 2", "fact 3"],
  "summary": "A brief 2-sentence summary of the key concept"
}`;

  let facts: string[] = [];
  let summary = '';

  try {
    const factData = await generateWithAI(
      factsPrompt,
      'You extract facts from text. Output only valid JSON.',
      0,
      'fact-extraction',
      { topic, chapterTitle }
    );
    facts = factData.facts || [];
    summary = factData.summary || '';
  } catch (e) {
    console.warn('Fact extraction failed:', e);
    facts = uniqueResults.slice(0, 3).map(r => r.snippet.slice(0, 100));
    summary = uniqueResults[0]?.snippet || '';
  }

  // Categorize resources
  const resources: ResourceLink[] = uniqueResults.map(r => ({
    title: r.title,
    url: r.url,
    type: categorizeResource(r.url, r.title),
    source: r.source,
    description: r.snippet,
  }));

  const context: RAGContext = {
    query: `${topic} ${chapterTitle}`,
    results: uniqueResults,
    summary,
    facts,
    resources,
    timestamp: Date.now(),
  };

  return context;
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
  metadata?: Record<string, any>
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
    // Use Groq (only)
    console.log(`[Model] Groq (random) | Purpose: ${purpose || 'untracked'}`);
    const text = await generateWithGroq(prompt, systemInstruction, purpose);

    console.log(`[Model] Response: ${text.length} chars | Provider: groq | Purpose: ${purpose || 'untracked'}`);

    return cleanAndParseJSON(text);
  } catch (error: any) {
    console.error(`[Model] groq error:`, error.message, error.code);

    // Record the failure
    recordModelFailure('groq');

    // Retry once with Groq if failed
    if (retryCount === 0) {
       console.warn(`[Model] Groq failed, retrying...`);
       return generateWithAI(prompt, systemInstruction, 1, purpose, metadata);
    }

    console.error(`[Model] Generation failed:`, error);
    throw new Error(`AI generation failed: ${error.message || 'Unknown error'}`);
  }
}

async function handleGenerateCourseOutline(topic: string, depth: CourseDepth) {
  // Detect topic category for smarter curriculum design
  const category = detectTopicCategory(topic);

  let depthInstruction = "";
  let structureInstruction = "";

  switch (depth) {
    case 'casual':
      depthInstruction = "Target Audience: Curious beginner. Goal: Broad overview and practical understanding.";
      structureInstruction = "Create exactly 2 Units. Keep chapters minimal (3 per unit). Focus on the most essential, engaging aspects.";
      break;
    case 'serious':
      depthInstruction = "Target Audience: Dedicated learner. Goal: Solid competency and practical application.";
      structureInstruction = "Create 8-12 Units. Start with Foundations, build through Core Concepts, add Practical Applications, and end with Advanced topics. First 2 units should be accessible, ramping up significantly by Unit 4.";
      break;
    case 'obsessed':
      depthInstruction = "Target Audience: Expert-track learner. Goal: Comprehensive mastery.";
      structureInstruction = "Create 20+ Units covering History, Theory, Mechanics, Applications, Edge Cases, and Future Directions. Be thorough and exhaustive.";
      break;
  }

  // Add category-specific guidance
  const categoryGuidance = getCategoryGuidance(category);

  const prompt = `Act as a senior curriculum designer. Design a structured learning path for: "${topic}".

Context:
${depthInstruction}

Topic Category: ${category}
${categoryGuidance}

Structure:
${structureInstruction}

Guidelines:
1. Curriculum must be logical and sequential - each unit builds on previous knowledge
2. Titles should be professional yet engaging - avoid generic names like "Introduction to X"
3. Each unit description should explain the specific learning outcome
4. Assign distinct hex colors creating a pleasing gradient (not random)
5. Chapter titles should be specific and actionable, not vague
6. Vary the complexity and style of chapters - mix theory, practice, and application

IMPORTANT: Return ONLY valid JSON. No markdown.

Output Schema:
{
  "icon": "Single emoji for topic",
  "units": [
    {
      "title": "Specific Unit Title",
      "description": "What learner will achieve",
      "color": "#HexColor",
      "chapters": [
        {
          "title": "Specific Chapter Title",
          "description": "Chapter focus"
        }
      ]
    }
  ]
}`;

  return generateWithAI(
    prompt,
    "You are an expert curriculum designer who creates engaging, well-structured courses. Output strictly valid JSON.",
    0,
    'course-generation',
    { topic }
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

async function handleGeneratePathSuggestions(topic: string, history: string[]) {
  const category = detectTopicCategory(topic);
  
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

  const prompt = `The user is learning "${topic}" (Category: ${category}).
They completed: ${history.join(', ')}.

${context}

Suggest 3 distinct, exciting next directions. These should be:
- Specific and actionable (not generic)
- Building on what they've learned
- Offering different paths (depth, breadth, application)
- Strictly relevant to the EDUCATIONAL topic, not corporate entities (e.g. for "Alphabet", focus on letters/language, not Google/Alphabet Inc.)

Return ONLY valid JSON:
{
  "suggestions": ["Direction 1", "Direction 2", "Direction 3"]
}`;

  return generateWithAI(prompt, "You are a helpful AI assistant. Ground your response in reality.", 0, 'path-suggestions', { topic });
}

async function handleGenerateUnit(topic: string, existingUnitCount: number, focus?: string) {
  const category = detectTopicCategory(topic, focus);

  let prompt = `The user is learning "${topic}" (Category: ${category}). They've completed ${existingUnitCount} units.
Create the NEXT Unit - more advanced than previous content.
Chapters (3-6) should depend on complexity.`;

  if (focus) {
    prompt += `\n\nCRITICAL: User specifically wants to focus on "${focus}". Make this the central theme.`;
  }

  prompt += `

Requirements:
- Title should be specific and engaging
- Description should explain the value
- Chapters should progress logically
- Mix of theory, practice, and application

Return ONLY valid JSON:
{
  "title": "Unit Title",
  "description": "Unit Description",
  "color": "#HexColor",
  "chapters": [
    {
      "title": "Chapter Title",
      "description": "Chapter Description"
    }
  ]
}`;

  return generateWithAI(prompt, "You are a helpful AI assistant.", 0, 'unit-generation', { topic, focus });
}

async function handleGenerateLessonContent(topic: string, chapterTitle: string) {
  const category = detectTopicCategory(topic, chapterTitle);
  const template = getLessonTemplate(topic, chapterTitle);
  const questionCount = getQuestionCount(template);
  const questionTypes = selectQuestionTypes(template, questionCount);

  // Try to get RAG context for enrichment
  let ragContext: RAGContext | null = null;
  try {
    ragContext = await buildRAGContext(topic, chapterTitle);
  } catch (e) {
    console.warn('RAG context failed:', e);
  }

  // Build enriched prompt with RAG context
  let contextSection = '';
  if (ragContext) {
    contextSection = `
REAL-WORLD CONTEXT (use this to enrich the lesson):
${ragContext.summary}

Key Facts to potentially incorporate:
${ragContext.facts.map(f => `- ${f}`).join('\n')}
`;
  }

  const intro = generateIntroVariation(category, chapterTitle, 'quiz', ragContext?.facts);

  const prompt = `Create an engaging micro-lesson for "${chapterTitle}" (Topic: ${topic}, Category: ${category}).
${contextSection}

Requirements:
1. Use this intro (or improve slightly): "${intro}"
2. Create exactly ${questionCount} questions
3. Question types to use (in order): ${questionTypes.join(', ')}
4. Make questions progressively harder
5. Include real-world examples where possible
6. Vary question formats - some direct, some scenario-based, some application-based
7. Explanations should teach, not just confirm

IMPORTANT: Focus primarily on the specific "${topic}" and "${chapterTitle}". The Category (${category}) is just a guide - if it seems unrelated, ignore it and follow the Topic.

CRITICAL FORMATTING RULES (MUST FOLLOW EXACTLY):
- multiple-choice:
  * Create EXACTLY 4 options
  * The FIRST option in the "options" array MUST BE the correct answer
  * Do NOT use letter prefixes like A), B), C), D) - just plain text
  * Make distractors plausible but clearly wrong
  * The "correctAnswer" field should contain the EXACT TEXT of the first option (no prefix)
  * Frontend will shuffle options randomly for display

- fill-blank:
  * Use ___ for the blank in the question
  * Answer should be 1-3 words maximum
  * correctAnswer should be lowercase for consistency

- true-false:
  * correctAnswer should be exactly "True" or "False" (capitalized)
  * Include subtle nuances that require understanding

${ragContext ? 'IMPORTANT: Incorporate the real-world context and facts provided above into your questions.' : ''}

Return ONLY valid JSON (no markdown, no extra text):
{
  "intro": "Engaging introduction",
  "questions": [
    {
      "type": "multiple-choice" | "fill-blank" | "true-false",
      "question": "Question text",
      "options": ["Correct answer FIRST", "Wrong answer 2", "Wrong answer 3", "Wrong answer 4"],
      "correctAnswer": "Correct answer FIRST",
      "explanation": "Educational explanation"
    }
  ]
}

EXAMPLE (multiple-choice):
{
  "type": "multiple-choice",
  "question": "What is the capital of France?",
  "options": ["Paris", "London", "Berlin", "Madrid"],
  "correctAnswer": "Paris",
  "explanation": "Paris has been the capital of France since the 12th century."
}`;

  return generateWithAI(
    prompt,
    `You are an expert educational content creator. Create engaging, accurate lessons for the topic "${topic}". Output strictly valid JSON.`,
    0,
    'lesson-generation-quiz',
    { topic, chapterTitle }
  );
}

async function handleGenerateInteractiveLesson(topic: string, chapterTitle: string) {
  const category = detectTopicCategory(topic, chapterTitle);
  const template = getLessonTemplate(topic, chapterTitle);
  const widgetType = selectWidgetType(template, chapterTitle);

  // Get RAG context for realistic scenarios
  let ragContext: RAGContext | null = null;
  try {
    ragContext = await buildRAGContext(topic, chapterTitle);
  } catch (e) {
    console.warn('RAG context failed:', e);
  }

  let contextSection = '';
  if (ragContext) {
    contextSection = `
REAL-WORLD CONTEXT (use for realistic scenarios):
${ragContext.summary}
Facts: ${ragContext.facts.join('; ')}
`;
  }

  const intro = generateIntroVariation(category, chapterTitle, 'interactive', ragContext?.facts);

  // Widget-specific instructions
  const widgetInstructions = getWidgetInstructions(widgetType, category);

  const prompt = `Create an INTERACTIVE lesson for "${chapterTitle}" (Topic: ${topic}, Category: ${category}).
${contextSection}

Widget Type: ${widgetType}
${widgetInstructions}

Requirements:
1. Use intro: "${intro}" (or improve slightly)
2. Create a realistic, engaging scenario
3. Include 2-3 follow-up multiple-choice questions
4. Make the activity educational, not just fun

IMPORTANT: Focus primarily on the specific "${topic}" and "${chapterTitle}". The Category (${category}) is just a guide - if it seems unrelated, ignore it and follow the Topic.

${widgetType === 'simulation' ? `
SIMULATION REQUIREMENTS:
- 2-4 sliders with CLEAR labels
- Use REAL-WORLD units and values
- Target values should be intuitive and explainable
- Include a hint in the instruction
- Feedback message should explain why the correct values matter` : ''}

${widgetType === 'sorting' ? `
SORTING REQUIREMENTS:
- 4-6 items to sort
- Clear correct order
- Items should be obviously sequential when understood
- Could be steps, timeline, priority, etc.` : ''}

${widgetType === 'canvas' ? `
CANVAS REQUIREMENTS:
- Clear drawing instruction
- Provide a simple guide or reference
- Focus on understanding through visualization` : ''}

Return ONLY valid JSON:
{
  "intro": "Brief engaging intro",
  "widgetType": "${widgetType}",
  "instruction": "Clear instruction with context",
  "feedback": "Encouraging success message",
  ${widgetType === 'simulation' ? `"simulationParams": [
    {
      "label": "Parameter Name",
      "min": 0,
      "max": 100,
      "step": 1,
      "targetValue": 50,
      "unit": "unit"
    }
  ],` : ''}
  ${widgetType === 'sorting' ? `"sortingItems": ["Item 1", "Item 2", "Item 3", "Item 4"],` : ''}
  ${widgetType === 'canvas' ? `"canvasBackground": "Description or guide",` : ''}
  "quizQuestions": [
    {
      "type": "multiple-choice",
      "question": "Follow-up question",
      "options": ["Correct answer FIRST", "Wrong answer 2", "Wrong answer 3", "Wrong answer 4"],
      "correctAnswer": "Correct answer FIRST",
      "explanation": "Educational explanation"
    }
  ]
}

CRITICAL: For quiz questions, the FIRST option MUST be the correct answer. No letter prefixes. Frontend will shuffle.`;

  return generateWithAI(
    prompt,
    `You are an expert in creating interactive educational experiences. Output strictly valid JSON.`,
    0,
    'lesson-generation-interactive',
    { topic, chapterTitle }
  );
}

function getWidgetInstructions(widgetType: string, category: TopicCategory): string {
  const instructions: Record<string, Record<TopicCategory, string>> = {
    simulation: {
      science: "Create a realistic scientific experiment simulation with measurable parameters.",
      technology: "Create a configuration or tuning simulation with real-world tech parameters.",
      mathematics: "Create a visual math exploration with adjustable variables.",
      history: "Create a historical scenario simulation with decision parameters.",
      language: "Create a pronunciation or grammar tuning exercise.",
      arts: "Create a composition or technique adjustment simulation.",
      business: "Create a business scenario with adjustable market/resource parameters.",
      health: "Create a health/fitness parameter adjustment simulation.",
      'social-science': "Create a social dynamics simulation with behavioral parameters.",
      'practical-skills': "Create a hands-on technique adjustment simulation.",
      general: "Create an engaging parameter adjustment exercise.",
    },
    sorting: {
      science: "Create a process or methodology ordering exercise.",
      technology: "Create a workflow or algorithm step ordering exercise.",
      mathematics: "Create a problem-solving step ordering exercise.",
      history: "Create a chronological or cause-effect ordering exercise.",
      language: "Create a sentence structure or story ordering exercise.",
      arts: "Create a technique progression or artistic process ordering.",
      business: "Create a strategy or process flow ordering exercise.",
      health: "Create a treatment protocol or procedure ordering.",
      'social-science': "Create a theory development or research method ordering.",
      'practical-skills': "Create a step-by-step procedure ordering exercise.",
      general: "Create a logical sequence ordering exercise.",
    },
    canvas: {
      science: "Create a diagram drawing exercise (circuits, molecules, etc.).",
      technology: "Create a flowchart or architecture diagram exercise.",
      mathematics: "Create a geometric construction or graph drawing exercise.",
      history: "Create a map annotation or timeline drawing exercise.",
      language: "Create a character writing or symbol drawing exercise.",
      arts: "Create a basic technique or composition drawing exercise.",
      business: "Create an org chart or strategy diagram exercise.",
      health: "Create an anatomy labeling or pathway drawing exercise.",
      'social-science': "Create a concept map or relationship diagram exercise.",
      'practical-skills': "Create a technique demonstration or plan drawing.",
      general: "Create a concept visualization drawing exercise.",
    },
    'image-editor': {
      science: "Create an image annotation or analysis exercise.",
      technology: "Create a UI/UX modification exercise.",
      mathematics: "Create a visual transformation exercise.",
      history: "Create a historical image analysis exercise.",
      language: "Create a visual vocabulary exercise.",
      arts: "Create a composition or color adjustment exercise.",
      business: "Create a presentation or marketing visual exercise.",
      health: "Create a medical image analysis exercise.",
      'social-science': "Create a data visualization modification exercise.",
      'practical-skills': "Create a before/after comparison exercise.",
      general: "Create an image enhancement or analysis exercise.",
    },
  };

  return instructions[widgetType]?.[category] || instructions[widgetType]?.general || "Create an engaging interactive exercise.";
}

async function handleGenerateUnitReferences(topic: string, unitTitle: string, chapterTitles: string[]) {
  const category = detectTopicCategory(topic, unitTitle);

  console.log(`Generating references for "${topic}" (${category})`);

  // Use DuckDuckGo directly for resources (bypassing AI extraction)
  try {
    const query = `${topic} ${unitTitle} educational resources`;
    const results = await searchDuckDuckGo(query);
    
    if (results.length > 0) {
       return {
         materials: results.slice(0, 5).map((r, idx) => ({
            id: `ref-${Date.now()}-${idx}`,
            title: r.title,
            url: r.url,
            type: categorizeResource(r.url, r.title),
            source: r.source,
            description: r.snippet,
            validatedAt: Date.now(),
            isValid: true
         })),
         shouldShowReferences: true
       };
    }
  } catch (e) {
    console.warn('Resource search failed:', e);
  }

  return {
    materials: [],
    shouldShowReferences: false,
  };
}

function getCategoryResourcePreference(category: TopicCategory): string {
  const preferences: Record<TopicCategory, string> = {
    science: "Academic papers, Khan Academy, educational YouTube channels, simulation tools",
    technology: "Official documentation, MDN, Stack Overflow, GitHub repos, tutorial sites",
    mathematics: "Khan Academy, Wolfram Alpha, interactive visualization tools, problem sets",
    history: "Primary sources, museum archives, documentary recommendations, academic articles",
    language: "Dictionary resources, grammar guides, native content, language learning apps",
    arts: "Tutorial videos, technique demonstrations, artist portfolios, museum collections",
    business: "Harvard Business Review, case studies, industry reports, professional guides",
    health: "PubMed, Mayo Clinic, WHO resources, certified health information sites",
    'social-science': "Academic journals, research databases, case studies, data sources",
    'practical-skills': "Step-by-step guides, video tutorials, equipment guides, safety resources",
    general: "Wikipedia, educational platforms, reputable news sources, expert blogs",
  };

  return preferences[category] || preferences.general;
}
