/**
 * Centralized AI Model Call Manager
 *
 * This module provides:
 * 1. Single point of control for all AI model calls
 * 2. Call tracking and analytics
 * 3. Rate limiting awareness
 * 4. Caching hints
 * 5. Debug logging
 */

export type ModelCallPurpose =
  | 'course-generation'
  | 'unit-generation'
  | 'lesson-generation-quiz'
  | 'lesson-generation-resource'
  | 'lesson-generation-interactive'
  | 'reference-generation'
  | 'path-suggestions'
  | 'fact-extraction';

export interface ModelCallMetadata {
  purpose: ModelCallPurpose;
  timestamp: number;
  topic?: string;
  cacheKey?: string;
  shouldCache: boolean;
  estimatedTokens?: number;
}

// In-memory call tracking (resets on server restart)
const callHistory: ModelCallMetadata[] = [];
const MAX_HISTORY = 100;

/**
 * Track a model call for analytics and debugging
 */
export function trackModelCall(metadata: ModelCallMetadata): void {
  callHistory.push(metadata);

  // Keep only recent history
  if (callHistory.length > MAX_HISTORY) {
    callHistory.shift();
  }

  // Log in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Model Call] ${metadata.purpose}`, {
      topic: metadata.topic,
      cached: metadata.shouldCache,
      cacheKey: metadata.cacheKey,
    });
  }
}

/**
 * Get recent model call statistics
 */
export function getModelCallStats() {
  const now = Date.now();
  const lastHour = callHistory.filter(c => now - c.timestamp < 60 * 60 * 1000);
  const lastMinute = callHistory.filter(c => now - c.timestamp < 60 * 1000);

  const byPurpose = callHistory.reduce((acc, call) => {
    acc[call.purpose] = (acc[call.purpose] || 0) + 1;
    return acc;
  }, {} as Record<ModelCallPurpose, number>);

  return {
    total: callHistory.length,
    lastHour: lastHour.length,
    lastMinute: lastMinute.length,
    byPurpose,
  };
}

/**
 * Check if a call should be allowed based on rate limiting
 */
export function shouldAllowCall(purpose: ModelCallPurpose): { allowed: boolean; reason?: string } {
  const now = Date.now();
  const recentCalls = callHistory.filter(c => now - c.timestamp < 60 * 1000);

  // Conservative rate limiting (10 calls per minute per instance)
  if (recentCalls.length >= 10) {
    return {
      allowed: false,
      reason: 'Rate limit: 10 calls per minute exceeded',
    };
  }

  // Specific limits for expensive operations
  if (purpose === 'reference-generation') {
    const recentRefCalls = recentCalls.filter(c => c.purpose === 'reference-generation');
    if (recentRefCalls.length >= 3) {
      return {
        allowed: false,
        reason: 'Rate limit: Max 3 reference generations per minute',
      };
    }
  }

  return { allowed: true };
}

/**
 * Generate a cache key for a model call
 */
export function generateCacheKey(purpose: ModelCallPurpose, params: Record<string, any>): string {
  const paramsString = JSON.stringify(params, Object.keys(params).sort());
  return `${purpose}:${Buffer.from(paramsString).toString('base64').slice(0, 32)}`;
}

/**
 * Determine if a call should be cached based on purpose
 */
export function shouldCacheResult(purpose: ModelCallPurpose): boolean {
  // These should always be cached
  const cacheable: ModelCallPurpose[] = [
    'lesson-generation-quiz',
    'lesson-generation-resource',
    'lesson-generation-interactive',
    'reference-generation',
  ];

  return cacheable.includes(purpose);
}

/**
 * Estimate token count for a prompt (rough approximation)
 */
export function estimateTokens(text: string): number {
  // Rough estimate: ~4 characters per token
  return Math.ceil(text.length / 4);
}

/**
 * Get optimization hints for a specific call type
 */
export function getOptimizationHints(purpose: ModelCallPurpose): string[] {
  const hints: Record<ModelCallPurpose, string[]> = {
    'course-generation': [
      'Called once per course',
      'Results stored in browser state',
      'No need to regenerate',
    ],
    'unit-generation': [
      'Called once per new unit',
      'Use "Extend Path" for guided generation',
      'Results stored in course',
    ],
    'lesson-generation-quiz': [
      'Cached in IndexedDB (7 days)',
      'First load only',
      'Consider preloading next chapter',
    ],
    'lesson-generation-resource': [
      'Cached in IndexedDB (7 days)',
      'Includes RAG web search',
      'Falls back to quiz if search fails',
    ],
    'lesson-generation-interactive': [
      'Cached in IndexedDB (7 days)',
      'Most expensive generation',
      'Falls back to quiz if fails',
    ],
    'reference-generation': [
      'Cached in unit.references',
      'Includes URL validation (5 concurrent)',
      'Optional for subjective topics',
    ],
    'path-suggestions': [
      'Called on-demand only',
      'Not cached (personalized)',
      'Shows next learning directions',
    ],
    'fact-extraction': [
      'Part of RAG pipeline',
      'Enriches lesson content',
      'Based on real search results',
    ],
  };

  return hints[purpose] || [];
}

/**
 * Log model call stats (for admin/debug)
 */
export function logModelStats(): void {
  const stats = getModelCallStats();
  console.log('=== Model Call Statistics ===');
  console.log(`Total calls: ${stats.total}`);
  console.log(`Last hour: ${stats.lastHour}`);
  console.log(`Last minute: ${stats.lastMinute}`);
  console.log('\nBy purpose:');
  Object.entries(stats.byPurpose).forEach(([purpose, count]) => {
    console.log(`  ${purpose}: ${count}`);
  });
  console.log('============================');
}

/**
 * Clear call history (for testing)
 */
export function clearCallHistory(): void {
  callHistory.length = 0;
}
