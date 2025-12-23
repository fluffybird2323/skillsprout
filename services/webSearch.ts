/**
 * Web Search RAG Service
 *
 * Provides web search capabilities to enrich lesson content with real-world
 * information, current facts, and diverse educational resources.
 */

import { lessonCache } from './lessonCache';

// Search result types
export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
  publishedDate?: string;
}

export interface RAGContext {
  query: string;
  results: SearchResult[];
  summary: string;
  facts: string[];
  resources: ResourceLink[];
  timestamp: number;
}

export interface ResourceLink {
  title: string;
  url: string;
  type: 'article' | 'video' | 'documentation' | 'tutorial' | 'research' | 'interactive';
  source: string;
  description: string;
}

// Topic category detection for lesson variance
export type TopicCategory =
  | 'science'
  | 'technology'
  | 'mathematics'
  | 'history'
  | 'language'
  | 'arts'
  | 'business'
  | 'health'
  | 'social-science'
  | 'practical-skills'
  | 'general';

// Lesson template variations based on topic category
export interface LessonTemplate {
  category: TopicCategory;
  questionTypes: Array<'multiple-choice' | 'fill-blank' | 'true-false' | 'ordering' | 'matching'>;
  interactiveWidgets: Array<'simulation' | 'image-editor' | 'code-editor' | 'timeline'>;
  questionCount: { min: number; max: number };
  includeRealExamples: boolean;
  includeHistoricalContext: boolean;
  includeCurrentEvents: boolean;
  resourceTypes: ResourceLink['type'][];
}

// Topic category templates for variety
export const TOPIC_TEMPLATES: Record<TopicCategory, LessonTemplate> = {
  science: {
    category: 'science',
    questionTypes: ['multiple-choice', 'true-false', 'fill-blank', 'ordering'],
    interactiveWidgets: ['simulation'],
    questionCount: { min: 3, max: 6 },
    includeRealExamples: true,
    includeHistoricalContext: true,
    includeCurrentEvents: true,
    resourceTypes: ['article', 'video', 'research', 'interactive'],
  },
  technology: {
    category: 'technology',
    questionTypes: ['multiple-choice', 'fill-blank', 'true-false'],
    interactiveWidgets: ['simulation'],
    questionCount: { min: 3, max: 5 },
    includeRealExamples: true,
    includeHistoricalContext: false,
    includeCurrentEvents: true,
    resourceTypes: ['documentation', 'tutorial', 'video', 'interactive'],
  },
  mathematics: {
    category: 'mathematics',
    questionTypes: ['fill-blank', 'multiple-choice', 'ordering'],
    interactiveWidgets: ['simulation'],
    questionCount: { min: 4, max: 7 },
    includeRealExamples: true,
    includeHistoricalContext: true,
    includeCurrentEvents: false,
    resourceTypes: ['tutorial', 'video', 'interactive'],
  },
  history: {
    category: 'history',
    questionTypes: ['multiple-choice', 'true-false', 'ordering', 'matching'],
    interactiveWidgets: ['timeline', 'simulation'],
    questionCount: { min: 4, max: 6 },
    includeRealExamples: true,
    includeHistoricalContext: true,
    includeCurrentEvents: false,
    resourceTypes: ['article', 'video', 'research'],
  },
  language: {
    category: 'language',
    questionTypes: ['fill-blank', 'multiple-choice', 'matching'],
    interactiveWidgets: ['timeline', 'simulation'],
    questionCount: { min: 5, max: 8 },
    includeRealExamples: true,
    includeHistoricalContext: false,
    includeCurrentEvents: false,
    resourceTypes: ['article', 'video', 'interactive'],
  },
  arts: {
    category: 'arts',
    questionTypes: ['multiple-choice', 'true-false', 'matching'],
    interactiveWidgets: ['image-editor', 'simulation'],
    questionCount: { min: 3, max: 5 },
    includeRealExamples: true,
    includeHistoricalContext: true,
    includeCurrentEvents: true,
    resourceTypes: ['video', 'article', 'interactive'],
  },
  business: {
    category: 'business',
    questionTypes: ['multiple-choice', 'true-false', 'fill-blank'],
    interactiveWidgets: ['simulation'],
    questionCount: { min: 4, max: 6 },
    includeRealExamples: true,
    includeHistoricalContext: false,
    includeCurrentEvents: true,
    resourceTypes: ['article', 'video', 'tutorial'],
  },
  health: {
    category: 'health',
    questionTypes: ['multiple-choice', 'true-false', 'fill-blank'],
    interactiveWidgets: ['simulation'],
    questionCount: { min: 4, max: 6 },
    includeRealExamples: true,
    includeHistoricalContext: false,
    includeCurrentEvents: true,
    resourceTypes: ['article', 'video', 'research'],
  },
  'social-science': {
    category: 'social-science',
    questionTypes: ['multiple-choice', 'true-false', 'matching'],
    interactiveWidgets: ['simulation'],
    questionCount: { min: 4, max: 6 },
    includeRealExamples: true,
    includeHistoricalContext: true,
    includeCurrentEvents: true,
    resourceTypes: ['article', 'research', 'video'],
  },
  'practical-skills': {
    category: 'practical-skills',
    questionTypes: ['ordering', 'multiple-choice', 'fill-blank'],
    interactiveWidgets: ['simulation'],
    questionCount: { min: 3, max: 5 },
    includeRealExamples: true,
    includeHistoricalContext: false,
    includeCurrentEvents: false,
    resourceTypes: ['tutorial', 'video', 'interactive'],
  },
  general: {
    category: 'general',
    questionTypes: ['multiple-choice', 'true-false', 'fill-blank'],
    interactiveWidgets: ['simulation'],
    questionCount: { min: 3, max: 5 },
    includeRealExamples: true,
    includeHistoricalContext: false, // Default to false to prevent irrelevant academic drift
    includeCurrentEvents: true,
    resourceTypes: ['article', 'video', 'tutorial'],
  },
};

// Keywords for topic categorization
const CATEGORY_KEYWORDS: Record<TopicCategory, string[]> = {
  science: ['physics', 'chemistry', 'biology', 'astronomy', 'geology', 'ecology', 'genetics', 'neuroscience', 'quantum', 'thermodynamics', 'evolution', 'cells', 'atoms', 'molecules', 'energy', 'force', 'matter'],
  technology: ['programming', 'software', 'computer', 'coding', 'web', 'app', 'database', 'ai', 'machine learning', 'cybersecurity', 'cloud', 'devops', 'api', 'framework', 'algorithm', 'data structure'],
  mathematics: ['algebra', 'calculus', 'geometry', 'statistics', 'probability', 'trigonometry', 'linear', 'differential', 'integral', 'number theory', 'topology', 'discrete', 'equation', 'function', 'theorem'],
  history: ['ancient', 'medieval', 'modern', 'war', 'civilization', 'empire', 'revolution', 'dynasty', 'colonialism', 'renaissance', 'reformation', 'industrial', 'historical', 'century', 'era', 'archaeology'],
  language: ['grammar', 'vocabulary', 'writing', 'speaking', 'reading', 'linguistics', 'phonetics', 'syntax', 'semantics', 'translation', 'japanese', 'spanish', 'french', 'german', 'mandarin', 'english', 'korean', 'communication'],
  arts: ['painting', 'sculpture', 'music', 'dance', 'theater', 'film', 'photography', 'design', 'architecture', 'drawing', 'composition', 'color theory', 'art history', 'creative', 'performance', 'acting'],
  business: ['marketing', 'finance', 'accounting', 'management', 'entrepreneurship', 'economics', 'strategy', 'sales', 'investment', 'startup', 'leadership', 'negotiation', 'branding', 'career'],
  health: ['medicine', 'nutrition', 'fitness', 'mental health', 'anatomy', 'physiology', 'pharmacology', 'disease', 'wellness', 'exercise', 'diet', 'healthcare', 'therapy'],
  'social-science': ['psychology', 'sociology', 'anthropology', 'political science', 'economics', 'geography', 'culture', 'society', 'behavior', 'cognition', 'social'],
  'practical-skills': ['cooking', 'gardening', 'woodworking', 'sewing', 'repair', 'diy', 'crafts', 'automotive', 'home improvement', 'survival', 'first aid', 'how to', 'tutorial', 'guide', 'tips', 'technique', 'method', 'camera', 'video', 'editing', 'travel', 'backpacking', 'hiking', 'outdoors', 'navigation', 'transportation', 'hitchhiking', 'camping', 'adventure'],
  general: [],
};

/**
 * Detect the topic category based on topic and chapter title
 */
export function detectTopicCategory(topic: string, chapterTitle?: string): TopicCategory {
  const searchText = `${topic} ${chapterTitle || ''}`.toLowerCase();

  let bestMatch: TopicCategory = 'general';
  let maxScore = 0;

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (category === 'general') continue;

    let score = 0;
    for (const keyword of keywords) {
      // Use word boundary check to avoid false positives (e.g., 'era' in 'camera')
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      if (regex.test(searchText)) {
        score += keyword.length; // Longer matches score higher
      }
    }

    if (score > maxScore) {
      maxScore = score;
      bestMatch = category as TopicCategory;
    }
  }

  return bestMatch;
}

/**
 * Get the lesson template for a topic
 */
export function getLessonTemplate(topic: string, chapterTitle?: string): LessonTemplate {
  const category = detectTopicCategory(topic, chapterTitle);
  return TOPIC_TEMPLATES[category];
}

/**
 * Generate search queries for RAG based on topic and chapter
 */
export function generateSearchQueries(topic: string, chapterTitle: string): string[] {
  const queries = [
    `${topic} ${chapterTitle} explained`,
    `${chapterTitle} key concepts`,
    `${topic} ${chapterTitle} examples`,
    `learn ${chapterTitle} beginners`,
  ];

  const template = getLessonTemplate(topic, chapterTitle);

  if (template.includeHistoricalContext) {
    queries.push(`history of ${chapterTitle}`);
  }

  if (template.includeCurrentEvents) {
    queries.push(`${chapterTitle} recent developments 2024`);
  }

  return queries;
}

/**
 * Cache key for RAG context
 */
function getRAGCacheKey(topic: string, chapterTitle: string): string {
  return `rag-${topic.toLowerCase().trim()}-${chapterTitle.toLowerCase().trim()}`;
}

/**
 * Memory cache for RAG results (1 hour TTL)
 */
const ragCache = new Map<string, { data: RAGContext; expiresAt: number }>();
const RAG_CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Get cached RAG context
 */
export function getCachedRAGContext(topic: string, chapterTitle: string): RAGContext | null {
  const key = getRAGCacheKey(topic, chapterTitle);
  const cached = ragCache.get(key);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  ragCache.delete(key);
  return null;
}

/**
 * Cache RAG context
 */
export function cacheRAGContext(topic: string, chapterTitle: string, context: RAGContext): void {
  const key = getRAGCacheKey(topic, chapterTitle);
  ragCache.set(key, {
    data: context,
    expiresAt: Date.now() + RAG_CACHE_TTL,
  });
}

/**
 * Generate varied intro based on lesson type and context
 */
export function generateIntroVariation(
  category: TopicCategory,
  chapterTitle: string,
  lessonType: 'quiz' | 'interactive' | 'resource',
  facts?: string[]
): string {
  const introTemplates: Record<TopicCategory, Record<string, string[]>> = {
    science: {
      quiz: [
        `Ready to test your understanding of ${chapterTitle}? Let's explore the fascinating science behind this concept!`,
        `Scientists have studied ${chapterTitle} for decades. How much do you know?`,
        `From labs to real life, ${chapterTitle} shapes our world. Time to prove your knowledge!`,
      ],
      interactive: [
        `Experience ${chapterTitle} hands-on! Manipulate variables and see science in action.`,
        `Welcome to your virtual lab! Today you'll experiment with ${chapterTitle}.`,
        `Theory meets practice - let's simulate ${chapterTitle} together.`,
      ],
      resource: [
        `Dive deep into ${chapterTitle} with curated research and expert explanations.`,
        `The best scientists never stop learning. Explore ${chapterTitle} through these resources.`,
        `Discover groundbreaking insights about ${chapterTitle} from leading sources.`,
      ],
    },
    technology: {
      quiz: [
        `Tech skills require practice! Let's test your ${chapterTitle} knowledge.`,
        `From concept to code - how well do you understand ${chapterTitle}?`,
        `Developers face ${chapterTitle} daily. Are you ready for these challenges?`,
      ],
      interactive: [
        `Build your skills! This interactive session covers ${chapterTitle} hands-on.`,
        `Time to get your hands dirty with ${chapterTitle}. Let's code!`,
        `Learn by doing - explore ${chapterTitle} through interactive challenges.`,
      ],
      resource: [
        `Documentation is your friend! Explore ${chapterTitle} resources from the pros.`,
        `Master ${chapterTitle} with tutorials and guides from industry experts.`,
        `Level up your skills with these curated ${chapterTitle} resources.`,
      ],
    },
    history: {
      quiz: [
        `History comes alive through stories. How well do you know ${chapterTitle}?`,
        `The past shapes our future. Test your knowledge of ${chapterTitle}!`,
        `Events, dates, and significance - let's explore ${chapterTitle} together.`,
      ],
      interactive: [
        `Step back in time! Experience ${chapterTitle} through interactive exploration.`,
        `History isn't just reading - it's understanding. Interact with ${chapterTitle}.`,
        `Connect the dots of history - explore ${chapterTitle} through activities.`,
      ],
      resource: [
        `Primary sources bring history to life. Discover ${chapterTitle} through research.`,
        `Historians spend years studying topics like ${chapterTitle}. Here's what they found.`,
        `From archives to analysis - explore ${chapterTitle} in depth.`,
      ],
    },
    mathematics: {
      quiz: [
        `Math is a skill that improves with practice. Let's work through ${chapterTitle}!`,
        `Numbers don't lie - test your ${chapterTitle} problem-solving skills.`,
        `From theory to application - can you solve these ${chapterTitle} challenges?`,
      ],
      interactive: [
        `Visualize ${chapterTitle}! Play with the numbers and see patterns emerge.`,
        `Math comes alive when you interact with it. Explore ${chapterTitle} visually.`,
        `Hands-on mathematics - manipulate ${chapterTitle} concepts in real-time.`,
      ],
      resource: [
        `Mathematical mastery takes study. Dive into ${chapterTitle} with expert resources.`,
        `From basics to advanced - explore ${chapterTitle} at your own pace.`,
        `Great mathematicians were also great learners. Study ${chapterTitle} deeply.`,
      ],
    },
    language: {
      quiz: [
        `Language learning is a journey! Test your ${chapterTitle} skills.`,
        `Every word counts - how well do you understand ${chapterTitle}?`,
        `Fluency comes from practice. Let's explore ${chapterTitle} together!`,
      ],
      interactive: [
        `Practice makes perfect! Interact with ${chapterTitle} exercises.`,
        `Language is meant to be used - engage with ${chapterTitle} actively.`,
        `Build your skills through ${chapterTitle} practice activities.`,
      ],
      resource: [
        `Immerse yourself in ${chapterTitle} through authentic resources.`,
        `Native speakers and experts share insights on ${chapterTitle}.`,
        `Expand your horizons - explore ${chapterTitle} through multimedia.`,
      ],
    },
    arts: {
      quiz: [
        `Art appreciation grows with knowledge. Test your ${chapterTitle} understanding!`,
        `From technique to theory - how well do you know ${chapterTitle}?`,
        `Creative minds think critically. Explore ${chapterTitle} concepts!`,
      ],
      interactive: [
        `Create and explore! Experience ${chapterTitle} through hands-on activities.`,
        `Art is action - engage with ${chapterTitle} interactively.`,
        `Express yourself while learning ${chapterTitle} techniques.`,
      ],
      resource: [
        `Masters and movements - explore ${chapterTitle} through curated content.`,
        `Art history and technique come together in ${chapterTitle}. Dive in!`,
        `Inspiration awaits - discover ${chapterTitle} through expert resources.`,
      ],
    },
    business: {
      quiz: [
        `Business acumen is built through knowledge. Test your ${chapterTitle} skills!`,
        `From boardroom to startup - how well do you understand ${chapterTitle}?`,
        `Success leaves clues. Can you identify the key ${chapterTitle} concepts?`,
      ],
      interactive: [
        `Business simulation time! Make decisions about ${chapterTitle} scenarios.`,
        `Real-world challenges await - practice ${chapterTitle} strategies.`,
        `Learn by doing - navigate ${chapterTitle} situations hands-on.`,
      ],
      resource: [
        `Industry insights on ${chapterTitle} from business leaders and experts.`,
        `Case studies and analysis - master ${chapterTitle} through research.`,
        `Stay ahead of the curve - explore ${chapterTitle} trends and strategies.`,
      ],
    },
    health: {
      quiz: [
        `Health knowledge empowers. Test your understanding of ${chapterTitle}!`,
        `Your body is complex - how well do you know ${chapterTitle}?`,
        `Evidence-based learning - explore ${chapterTitle} concepts!`,
      ],
      interactive: [
        `Health is hands-on! Explore ${chapterTitle} through interactive content.`,
        `Visualize and understand ${chapterTitle} through simulation.`,
        `Active learning for ${chapterTitle} - engage with the material!`,
      ],
      resource: [
        `Medical research and expert insights on ${chapterTitle}.`,
        `Evidence-based resources for understanding ${chapterTitle}.`,
        `Health professionals share knowledge on ${chapterTitle}.`,
      ],
    },
    'social-science': {
      quiz: [
        `Society is complex - test your ${chapterTitle} understanding!`,
        `Human behavior and systems - how well do you know ${chapterTitle}?`,
        `Research meets reality in ${chapterTitle}. Let's explore!`,
      ],
      interactive: [
        `Analyze and understand ${chapterTitle} through interactive scenarios.`,
        `Social dynamics in action - explore ${chapterTitle} hands-on.`,
        `Data and insights meet - interact with ${chapterTitle} concepts.`,
      ],
      resource: [
        `Research and analysis on ${chapterTitle} from leading scholars.`,
        `Deep dive into ${chapterTitle} with academic and journalistic sources.`,
        `Understanding society through ${chapterTitle} - curated readings.`,
      ],
    },
    'practical-skills': {
      quiz: [
        `Skills are built through knowledge and practice. Test your ${chapterTitle} know-how!`,
        `From theory to application - how well do you understand ${chapterTitle}?`,
        `Practical wisdom - demonstrate your ${chapterTitle} knowledge!`,
      ],
      interactive: [
        `Hands-on time! Practice ${chapterTitle} through interactive exercises.`,
        `Learning by doing - master ${chapterTitle} step by step.`,
        `From beginner to expert - work through ${chapterTitle} activities.`,
      ],
      resource: [
        `Expert guides and tutorials on ${chapterTitle}.`,
        `Learn from the pros - ${chapterTitle} resources and tips.`,
        `Step-by-step guidance for mastering ${chapterTitle}.`,
      ],
    },
    general: {
      quiz: [
        `Ready to learn? Test your knowledge of ${chapterTitle}!`,
        `Knowledge is power - how much do you know about ${chapterTitle}?`,
        `Curiosity leads to mastery. Explore ${chapterTitle} concepts!`,
      ],
      interactive: [
        `Learning is better when it's interactive! Explore ${chapterTitle}.`,
        `Engage with ${chapterTitle} through hands-on activities.`,
        `Active learning time - discover ${chapterTitle} by doing.`,
      ],
      resource: [
        `Expand your knowledge with curated ${chapterTitle} resources.`,
        `Deep dive into ${chapterTitle} with expert content.`,
        `Knowledge awaits - explore ${chapterTitle} materials.`,
      ],
    },
  };

  const templates = introTemplates[category]?.[lessonType] || introTemplates.general[lessonType];
  const randomIndex = Math.floor(Math.random() * templates.length);
  let intro = templates[randomIndex];

  // Add a fact if available
  if (facts && facts.length > 0) {
    const randomFact = facts[Math.floor(Math.random() * facts.length)];
    intro += ` Fun fact: ${randomFact}`;
  }

  return intro;
}

/**
 * Select question types with variety based on template
 */
export function selectQuestionTypes(
  template: LessonTemplate,
  count: number
): Array<'multiple-choice' | 'fill-blank' | 'true-false'> {
  const types = template.questionTypes.filter(t =>
    t === 'multiple-choice' || t === 'fill-blank' || t === 'true-false'
  ) as Array<'multiple-choice' | 'fill-blank' | 'true-false'>;

  const result: Array<'multiple-choice' | 'fill-blank' | 'true-false'> = [];

  // Ensure variety - try not to repeat same type consecutively
  let lastType: string | null = null;

  for (let i = 0; i < count; i++) {
    // Filter to avoid repetition when possible
    const availableTypes = types.filter(t => t !== lastType || types.length === 1);
    const selectedType = availableTypes[Math.floor(Math.random() * availableTypes.length)];
    result.push(selectedType);
    lastType = selectedType;
  }

  return result;
}

/**
 * Get randomized question count based on template
 */
export function getQuestionCount(template: LessonTemplate): number {
  const { min, max } = template.questionCount;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Select interactive widget type based on template and context
 */
export function selectWidgetType(
  template: LessonTemplate,
  chapterTitle: string
): 'simulation' | 'image-editor' | 'code-editor' | 'timeline' {
  const available = template.interactiveWidgets.filter(w =>
    w === 'simulation' || w === 'image-editor' || w === 'code-editor' || w === 'timeline'
  ) as Array<'simulation' | 'image-editor' | 'code-editor' | 'timeline'>;

  // Context-aware selection
  const titleLower = chapterTitle.toLowerCase();

  // Prefer certain widgets for certain content
  if (titleLower.includes('adjust') || titleLower.includes('parameter') || titleLower.includes('configure')) {
    if (available.includes('simulation')) return 'simulation';
  }

  if (titleLower.includes('history') || titleLower.includes('timeline') || titleLower.includes('era')) {
    if (available.includes('timeline')) return 'timeline';
  }

  // Random selection from available
  return available[Math.floor(Math.random() * available.length)] || 'simulation';
}

/**
 * Clean up old cache entries
 */
export function cleanupRAGCache(): void {
  const now = Date.now();
  for (const [key, value] of ragCache.entries()) {
    if (value.expiresAt <= now) {
      ragCache.delete(key);
    }
  }
}

// Run cleanup periodically
if (typeof window !== 'undefined') {
  setInterval(cleanupRAGCache, 5 * 60 * 1000); // Every 5 minutes
}
