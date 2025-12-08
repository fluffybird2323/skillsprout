/**
 * Academic Sources Catalog
 * Curated list of reliable, authoritative sources by topic category
 */

import { TopicCategory } from './webSearch';

export interface AcademicSource {
  domain: string;
  name: string;
  priority: number; // Higher = better
  categories: TopicCategory[];
  minDepth?: 'beginner' | 'intermediate' | 'advanced'; // Some sources only for advanced topics
}

// Curated list of academic and educational sources
export const ACADEMIC_SOURCES: AcademicSource[] = [
  // Universal Educational Sources
  { domain: 'wikipedia.org', name: 'Wikipedia', priority: 8, categories: ['general', 'science', 'technology', 'mathematics', 'history', 'language', 'arts', 'business', 'health', 'social-science', 'practical-skills'] },
  { domain: 'khanacademy.org', name: 'Khan Academy', priority: 10, categories: ['science', 'mathematics', 'technology', 'arts'] },

  // Science & Research
  { domain: 'arxiv.org', name: 'arXiv', priority: 9, categories: ['science', 'mathematics'], minDepth: 'advanced' },
  { domain: 'nature.com', name: 'Nature', priority: 8, categories: ['science', 'health'], minDepth: 'intermediate' },
  { domain: 'sciencedirect.com', name: 'ScienceDirect', priority: 7, categories: ['science', 'health'], minDepth: 'advanced' },

  // Mathematics
  { domain: 'mathworld.wolfram.com', name: 'Wolfram MathWorld', priority: 9, categories: ['mathematics'] },
  { domain: 'brilliant.org', name: 'Brilliant', priority: 8, categories: ['mathematics', 'science', 'technology'] },

  // Technology & Programming
  { domain: 'developer.mozilla.org', name: 'MDN Web Docs', priority: 10, categories: ['technology'] },
  { domain: 'stackoverflow.com', name: 'Stack Overflow', priority: 7, categories: ['technology'] },
  { domain: 'docs.python.org', name: 'Python Docs', priority: 9, categories: ['technology'] },
  { domain: 'github.com', name: 'GitHub', priority: 6, categories: ['technology'] },

  // Health & Medicine
  { domain: 'mayoclinic.org', name: 'Mayo Clinic', priority: 9, categories: ['health'] },
  { domain: 'nih.gov', name: 'NIH', priority: 8, categories: ['health'] },
  { domain: 'who.int', name: 'WHO', priority: 8, categories: ['health'] },

  // Languages
  { domain: 'duolingo.com', name: 'Duolingo', priority: 8, categories: ['language'] },
  { domain: 'babbel.com', name: 'Babbel', priority: 7, categories: ['language'] },

  // History & Social Sciences
  { domain: 'britannica.com', name: 'Encyclopedia Britannica', priority: 8, categories: ['history', 'social-science'] },
  { domain: 'nationalarchives.gov', name: 'National Archives', priority: 7, categories: ['history'] },

  // Arts
  { domain: 'metmuseum.org', name: 'The Met', priority: 7, categories: ['arts', 'history'] },
  { domain: 'moma.org', name: 'MoMA', priority: 7, categories: ['arts'] },

  // Business
  { domain: 'hbr.org', name: 'Harvard Business Review', priority: 8, categories: ['business'] },
  { domain: 'investopedia.com', name: 'Investopedia', priority: 7, categories: ['business'] },

  // General Educational Platforms
  { domain: 'coursera.org', name: 'Coursera', priority: 8, categories: ['general', 'science', 'technology', 'business', 'arts'] },
  { domain: 'edx.org', name: 'edX', priority: 8, categories: ['general', 'science', 'technology', 'business', 'arts'] },
  { domain: 'youtube.com', name: 'YouTube Educational', priority: 7, categories: ['general', 'science', 'technology', 'mathematics', 'language', 'arts', 'practical-skills'] },
];

/**
 * Determines if a topic should have external references
 */
export function shouldHaveReferences(topic: string, category: TopicCategory): boolean {
  const topicLower = topic.toLowerCase();

  // Subjective/personal development topics - prefer quiz-based learning
  const subjectiveKeywords = [
    'how to wake up',
    'productivity',
    'habits',
    'motivation',
    'mindset',
    'self-help',
    'personal development',
    'morning routine',
    'sleep schedule',
    'time management basics',
    'goal setting',
  ];

  if (subjectiveKeywords.some(keyword => topicLower.includes(keyword))) {
    return false;
  }

  // Academic and objective topics - benefit from references
  const objectiveCategories: TopicCategory[] = [
    'science',
    'technology',
    'mathematics',
    'history',
    'language',
    'health',
    'social-science',
  ];

  if (objectiveCategories.includes(category)) {
    return true;
  }

  // For general topics, check if it's educational
  const educationalKeywords = [
    'learning',
    'programming',
    'language',
    'physics',
    'chemistry',
    'biology',
    'math',
    'history',
    'science',
    'course',
    'tutorial',
  ];

  return educationalKeywords.some(keyword => topicLower.includes(keyword));
}

/**
 * Get preferred sources for a specific category and depth
 */
export function getPreferredSources(
  category: TopicCategory,
  depth: 'beginner' | 'intermediate' | 'advanced' = 'beginner'
): AcademicSource[] {
  return ACADEMIC_SOURCES
    .filter(source => {
      // Must support this category
      if (!source.categories.includes(category) && !source.categories.includes('general')) {
        return false;
      }

      // Check depth requirements
      if (source.minDepth === 'advanced' && depth !== 'advanced') {
        return false;
      }
      if (source.minDepth === 'intermediate' && depth === 'beginner') {
        return false;
      }

      return true;
    })
    .sort((a, b) => b.priority - a.priority);
}

/**
 * Check if a URL is from a trusted academic source
 */
export function isAcademicSource(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    return ACADEMIC_SOURCES.some(source => hostname.includes(source.domain));
  } catch {
    return false;
  }
}

/**
 * Get source priority score
 */
export function getSourcePriority(url: string, category: TopicCategory): number {
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    const source = ACADEMIC_SOURCES.find(s => hostname.includes(s.domain));

    if (!source) return 0;

    // Bonus if it's specifically for this category
    const categoryBonus = source.categories.includes(category) ? 2 : 0;

    return source.priority + categoryBonus;
  } catch {
    return 0;
  }
}
