/**
 * Cleans raw LLM output to extract valid JSON.
 * Handles Markdown code blocks, trailing commas, and extra text.
 */
export function cleanAndParseJSON(text: string): any {
  if (!text) return {};

  let cleanText = text.trim();

  // Remove markdown code blocks (```json ... ```)
  if (cleanText.includes('```')) {
    cleanText = cleanText.replace(/```json/g, '').replace(/```/g, '');
  }

  // Find the first '{' and last '}' to strip intro/outro text
  const firstBrace = cleanText.indexOf('{');
  const lastBrace = cleanText.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace !== -1) {
    cleanText = cleanText.substring(firstBrace, lastBrace + 1);
  }

  try {
    return JSON.parse(cleanText);
  } catch (error) {
    console.warn("JSON Parse Failed. Attempting simple repairs...", error);
    
    // Very basic repair: remove trailing commas before closing braces/brackets
    // Note: This regex is not perfect but catches common LLM errors
    cleanText = cleanText.replace(/,\s*([\]}])/g, '$1');
    
    try {
      return JSON.parse(cleanText);
    } catch (retryError) {
      console.error("Critical JSON Parse Error", retryError);
      throw new Error('Failed to parse AI response');
    }
  }
}

/**
 * Retries an async function with exponential backoff.
 * Useful for API rate limits (429) or temporary network glitches.
 */
export async function withRetry<T>(
  fn: () => Promise<T>, 
  retries = 3, 
  baseDelay = 1000
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (retries === 0) throw error;
    
    // Check if it's a retryable error (e.g., 503 Service Unavailable or 429 Too Many Requests)
    // Google GenAI errors often contain status codes or messages
    const isRetryable = 
      error?.status === 503 || 
      error?.status === 429 || 
      error?.message?.includes('overloaded') ||
      error?.message?.includes('fetch failed');

    if (!isRetryable && retries < 3) {
      // If it's a specific logic error (like 400), don't retry endlessly
      throw error; 
    }

    const delay = baseDelay * Math.pow(2, 3 - retries); // 1s, 2s, 4s...
    console.log(`API Error. Retrying in ${delay}ms... (${retries} attempts left)`);
    
    await new Promise(resolve => setTimeout(resolve, delay));
    
    return withRetry(fn, retries - 1, baseDelay);
  }
}