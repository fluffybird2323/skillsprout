/**
 * Groq API Client with Multi-Model Support
 *
 * This module manages Groq API calls with:
 * - Random model selection for load distribution
 * - Model-specific parameters
 * - Intelligent token limits based on query complexity
 */

import Groq from 'groq-sdk';
import type { ModelCallPurpose } from './modelManager';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '',
});

/**
 * Available Groq models with their specific configurations
 */
export interface GroqModelConfig {
  id: string;
  name: string;
  maxTokens: number;
  hasSpecialParams?: boolean;
  specialParams?: Record<string, any>;
  temperature?: number;
  priority?: number; // Higher = prefer more
  isMultilingual?: boolean;
}

export const GROQ_MODELS: GroqModelConfig[] = [
  {
    id: 'llama-3.3-70b-versatile',
    name: 'Llama 3.3 70B Versatile',
    maxTokens: 8192,
    temperature: 0.7,
    priority: 10, // High priority - very good
    isMultilingual: true,
  },
  {
    id: 'meta-llama/llama-4-maverick-17b-128e-instruct',
    name: 'Llama 4 Maverick 17B',
    maxTokens: 8192,
    temperature: 0.7,
    priority: 9,
  },
  {
    id: 'meta-llama/llama-4-scout-17b-16e-instruct',
    name: 'Llama 4 Scout 17B',
    maxTokens: 8192,
    temperature: 0.7,
    priority: 9,
  },
  {
    id: 'openai/gpt-oss-120b',
    name: 'GPT OSS 120B',
    maxTokens: 8192,
    hasSpecialParams: true,
    specialParams: {
      reasoning_effort: 'medium',
    },
    temperature: 1,
    priority: 10, // High quality
    isMultilingual: true,
  },
  {
    id: 'moonshotai/kimi-k2-instruct-0905',
    name: 'Kimi K2 Instruct',
    maxTokens: 4096,
    temperature: 0.6,
    priority: 8,
  },
  {
    id: 'qwen/qwen3-32b',
    name: 'Qwen3 32B',
    maxTokens: 8192,
    temperature: 0.7,
    priority: 8,
    isMultilingual: true,
  },
  {
    id: 'groq/compound',
    name: 'Groq Compound (with tools)',
    maxTokens: 1024, // Limited for compound
    hasSpecialParams: true,
    specialParams: {
      compound_custom: {
        tools: {
          enabled_tools: ['web_search', 'code_interpreter', 'visit_website'],
        },
      },
    },
    temperature: 1,
    priority: 8, // Lower priority - specialized use
  },
  {
    id: 'groq/compound-mini',
    name: 'Groq Compound Mini (with tools)',
    maxTokens: 1024, // Limited for compound
    hasSpecialParams: true,
    specialParams: {
      compound_custom: {
        tools: {
          enabled_tools: ['web_search', 'code_interpreter', 'visit_website'],
        },
      },
    },
    temperature: 1,
    priority: 8, // Lower priority - specialized use
  }
];

/**
 * Track model failures to avoid broken models
 */
const modelFailures = new Map<string, number>();
const FAILURE_THRESHOLD = 3;

/**
 * Track model usage for the current time window (last 60 seconds)
 */
const modelUsage = new Map<string, number[]>();
const USAGE_WINDOW = 60 * 1000; // 60 seconds

/**
 * Clean up old usage timestamps periodically
 */
setInterval(() => {
  const cutoff = Date.now() - USAGE_WINDOW;
  for (const [modelId, timestamps] of modelUsage.entries()) {
    const validTimestamps = timestamps.filter(t => t > cutoff);
    if (validTimestamps.length === 0) {
      modelUsage.delete(modelId);
    } else {
      modelUsage.set(modelId, validTimestamps);
    }
  }
}, USAGE_WINDOW);

/**
 * Round-robin index for fair load distribution
 */
let roundRobinIndex = 0;

/**
 * Get a model using least-recently-used strategy for maximum load distribution
 * This ensures all models get used evenly to maximize free tier limits
 */
export function selectRandomModel(requireMultilingual: boolean = false): GroqModelConfig {
  // Filter out models that have failed too many times
  let availableModels = GROQ_MODELS.filter(model => {
    const failures = modelFailures.get(model.id) || 0;
    return failures < FAILURE_THRESHOLD;
  });

  // If multilingual is required, filter for multilingual models
  if (requireMultilingual) {
    const multilingualModels = availableModels.filter(m => m.isMultilingual);
    if (multilingualModels.length > 0) {
      availableModels = multilingualModels;
      console.log(`[Groq] Filtering for multilingual models. Found: ${availableModels.length}`);
    } else {
      console.warn(`[Groq] Multilingual required but no healthy multilingual models found. Falling back to all models.`);
    }
  }

  if (availableModels.length === 0) {
    // All models failed - reset and try again
    modelFailures.clear();
    console.warn('[Groq] All models failed, resetting failure counts');
    // Recursively call to get a model after reset
    return selectRandomModel(requireMultilingual);
  }

  // Get usage count in last 60 seconds for each model
  const now = Date.now();
  const cutoff = now - USAGE_WINDOW;

  const modelsWithUsage = availableModels.map(model => {
    const timestamps = modelUsage.get(model.id) || [];
    const recentUsage = timestamps.filter(t => t > cutoff).length;
    return { model, recentUsage };
  });

  // Sort by: 1) least used recently, 2) then by priority
  modelsWithUsage.sort((a, b) => {
    // First, prefer models used less recently
    const usageDiff = a.recentUsage - b.recentUsage;
    if (usageDiff !== 0) return usageDiff;

    // If equal usage, prefer higher priority
    return (b.model.priority || 0) - (a.model.priority || 0);
  });

  const selectedModel = modelsWithUsage[0].model;

  // Record this usage
  const timestamps = modelUsage.get(selectedModel.id) || [];
  timestamps.push(now);
  modelUsage.set(selectedModel.id, timestamps);

  console.log(
    `[Groq] Selected ${selectedModel.name} | Recent uses: ${modelsWithUsage[0].recentUsage} | Available models: ${availableModels.length}`
  );

  return selectedModel;
}

/**
 * Record model failure
 */
export function recordModelFailure(modelId: string): void {
  const current = modelFailures.get(modelId) || 0;
  modelFailures.set(modelId, current + 1);
  console.warn(`[Groq] Model ${modelId} failure count: ${current + 1}`);
}

/**
 * Determine appropriate max tokens based on query complexity
 */
export function calculateMaxTokens(prompt: string, purpose?: ModelCallPurpose): number {
  const promptLength = prompt.length;

  // Small queries (< 500 chars) - use 2.5k tokens
  if (promptLength < 500) {
    return 2500;
  }

  // Medium queries (500-1500 chars) - use 3k tokens
  if (promptLength < 1500) {
    return 3000;
  }

  // Large queries - use 4k tokens
  if (promptLength < 3000) {
    return 4000;
  }

  // Very large queries (course generation, complex lessons) - use max
  if (
    purpose === 'course-generation' ||
    purpose === 'lesson-generation-interactive' ||
    promptLength > 3000
  ) {
    return 8192;
  }

  return 4000;
}

/**
 * Generate content using Groq API with selected model
 */
export async function generateWithGroq(
  prompt: string,
  systemInstruction: string = 'Act as a Gamified Curriculum Architect. Your task is to turn a standard boring semester syllabus into an engaging "Skill Journey."',
  purpose?: ModelCallPurpose,
  requireMultilingual: boolean = false
): Promise<string> {
  const model = selectRandomModel(requireMultilingual);

  // Calculate appropriate token limit
  const calculatedMaxTokens = calculateMaxTokens(prompt, purpose);
  const maxTokens = Math.min(calculatedMaxTokens, model.maxTokens);

  console.log(
    `[Groq] Using ${model.name} | Max tokens: ${maxTokens} | Purpose: ${purpose || 'untracked'}`
  );

  try {
    // Build messages
    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: systemInstruction },
      { role: 'user', content: prompt },
    ];

    // Build request parameters
    const requestParams: any = {
      model: model.id,
      messages,
      temperature: model.temperature || 0.7,
      max_tokens: maxTokens,
      top_p: 1,
    };

    // Add model-specific parameters
    if (model.hasSpecialParams && model.specialParams) {
      Object.assign(requestParams, model.specialParams);
    }

    // Make API call (non-streaming for simplicity)
    const completion = await groq.chat.completions.create(requestParams);

    const content = completion.choices[0]?.message?.content || '{}';

    console.log(
      `[Groq] Response: ${content.length} chars | Model: ${model.name} | Purpose: ${purpose || 'untracked'}`
    );

    return content;
  } catch (error: any) {
    console.error(`[Groq] Model ${model.name} error:`, error.message);
    recordModelFailure(model.id);
    throw error;
  }
}

/**
 * Generate content with streaming support
 */
export async function generateWithGroqStreaming(
  prompt: string,
  systemInstruction: string = 'You are a helpful AI assistant.',
  purpose?: ModelCallPurpose,
  requireMultilingual: boolean = false
): Promise<string> {
  const model = selectRandomModel(requireMultilingual);

  // Calculate appropriate token limit
  const calculatedMaxTokens = calculateMaxTokens(prompt, purpose);
  const maxTokens = Math.min(calculatedMaxTokens, model.maxTokens);

  console.log(
    `[Groq] Streaming with ${model.name} | Max tokens: ${maxTokens} | Purpose: ${purpose || 'untracked'}`
  );

  try {
    // Build messages
    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: systemInstruction },
      { role: 'user', content: prompt },
    ];

    // Build request parameters
    const requestParams: any = {
      model: model.id,
      messages,
      temperature: model.temperature || 0.7,
      max_tokens: maxTokens,
      top_p: 1,
      stream: true,
    };

    // Add model-specific parameters
    if (model.hasSpecialParams && model.specialParams) {
      Object.assign(requestParams, model.specialParams);
    }

    // Make streaming API call
    const stream = await groq.chat.completions.create(requestParams);

    // Collect chunks
    let fullContent = '';
    for await (const chunk of stream as any) {
      const content = chunk.choices[0]?.delta?.content || '';
      fullContent += content;
    }

    console.log(
      `[Groq] Streamed response: ${fullContent.length} chars | Model: ${model.name} | Purpose: ${purpose || 'untracked'}`
    );

    return fullContent;
  } catch (error: any) {
    console.error(`[Groq] Streaming error with ${model.name}:`, error.message);
    recordModelFailure(model.id);
    throw error;
  }
}

/**
 * Get model statistics with usage breakdown
 */
export function getGroqModelStats() {
  const now = Date.now();
  const cutoff = now - USAGE_WINDOW;

  const usageByModel = GROQ_MODELS.map(model => {
    const timestamps = modelUsage.get(model.id) || [];
    const recentUsage = timestamps.filter(t => t > cutoff).length;
    const failures = modelFailures.get(model.id) || 0;

    return {
      id: model.id,
      name: model.name,
      priority: model.priority,
      usageLastMinute: recentUsage,
      failureCount: failures,
      isAvailable: failures < FAILURE_THRESHOLD,
    };
  });

  const totalUsage = usageByModel.reduce((sum, m) => sum + m.usageLastMinute, 0);

  return {
    totalModels: GROQ_MODELS.length,
    availableModels: usageByModel.filter(m => m.isAvailable).length,
    totalCallsLastMinute: totalUsage,
    modelBreakdown: usageByModel.sort((a, b) => b.usageLastMinute - a.usageLastMinute),
    mostUsedModel: usageByModel.reduce((max, m) => m.usageLastMinute > max.usageLastMinute ? m : max),
    leastUsedModel: usageByModel.filter(m => m.isAvailable).reduce((min, m) => m.usageLastMinute < min.usageLastMinute ? m : min),
  };
}
