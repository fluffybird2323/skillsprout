/**
 * URL Validation Service
 * Validates URLs to prevent 404s and broken links
 */

export interface URLValidationResult {
  url: string;
  isValid: boolean;
  statusCode?: number;
  error?: string;
  checkedAt: number;
}

// Simple in-memory cache for validation results (7 days TTL)
const validationCache = new Map<string, URLValidationResult>();
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Validate a single URL by checking if it's accessible
 */
export async function validateURL(url: string): Promise<URLValidationResult> {
  // Check cache first
  const cached = validationCache.get(url);
  if (cached && Date.now() - cached.checkedAt < CACHE_TTL) {
    return cached;
  }

  const result: URLValidationResult = {
    url,
    isValid: false,
    checkedAt: Date.now(),
  };

  try {
    // Basic URL format validation
    new URL(url);

    // For server-side validation, use fetch with HEAD request
    // Note: This only works in Node.js/Edge runtime, not in browser
    if (typeof window === 'undefined') {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      try {
        const response = await fetch(url, {
          method: 'HEAD',
          signal: controller.signal,
          headers: {
            'User-Agent': 'Manabu-Bot/1.0',
          },
        });

        clearTimeout(timeout);

        result.statusCode = response.status;
        result.isValid = response.status >= 200 && response.status < 400;
      } catch (fetchError: any) {
        clearTimeout(timeout);

        // If HEAD fails, some servers block it - consider it valid
        // (We'll assume it's a server configuration issue, not a 404)
        if (fetchError.name === 'AbortError') {
          result.error = 'Timeout';
          result.isValid = false;
        } else {
          // CORS or network error - assume valid if URL format is correct
          result.isValid = true;
          result.error = fetchError.message;
        }
      }
    } else {
      // In browser, we can't validate without CORS issues
      // Just check format and assume valid
      result.isValid = true;
    }
  } catch (error: any) {
    result.error = error.message;
    result.isValid = false;
  }

  // Cache the result
  validationCache.set(url, result);

  return result;
}

/**
 * Validate multiple URLs in batch with concurrency limit
 */
export async function batchValidateURLs(
  urls: string[],
  concurrency: number = 5
): Promise<URLValidationResult[]> {
  const results: URLValidationResult[] = [];

  // Process in batches to avoid overwhelming the server
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(
      batch.map(url => validateURL(url))
    );

    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        // If validation itself failed, mark as invalid
        results.push({
          url: batch[index],
          isValid: false,
          error: result.reason?.message || 'Validation failed',
          checkedAt: Date.now(),
        });
      }
    });
  }

  return results;
}

/**
 * Quick format-only validation (doesn't check if URL is accessible)
 */
export function isValidURLFormat(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Clear old entries from cache
 */
export function cleanCache(): void {
  const now = Date.now();
  for (const [url, result] of validationCache.entries()) {
    if (now - result.checkedAt > CACHE_TTL) {
      validationCache.delete(url);
    }
  }
}

// Clean cache every hour
if (typeof window === 'undefined') {
  setInterval(cleanCache, 60 * 60 * 1000);
}
