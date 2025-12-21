/**
 * Lightweight web search service for hybrid RAG
 * Uses DuckDuckGo API for pre-model retrieval
 */

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

export interface SearchContext {
  query: string;
  results: SearchResult[];
  extractedFacts: string[];
  timestamp: number;
}

/**
 * Minimal DuckDuckGo search implementation
 * No API key required - uses public search API
 */
export async function searchDuckDuckGo(query: string, maxResults: number = 3): Promise<SearchResult[]> {
  try {
    if (typeof window !== 'undefined') {
      return [];
    }
    // Use DuckDuckGo's instant answer API for lightweight search
    const searchQuery = encodeURIComponent(query);
    const response = await fetch(`https://api.duckduckgo.com/?q=${searchQuery}&format=json&no_html=1&skip_disambig=1`);
    
    if (!response.ok) {
      throw new Error('Search request failed');
    }
    
    const data = await response.json();
    
    // Extract relevant results
    const results: SearchResult[] = [];
    
    // Add instant answer if available
    if (data.AbstractText && data.AbstractURL) {
      results.push({
        title: data.Heading || query,
        url: data.AbstractURL,
        snippet: data.AbstractText.substring(0, 200),
        source: data.AbstractSource || 'DuckDuckGo'
      });
    }
    
    // Add related topics
    if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
      data.RelatedTopics.slice(0, maxResults - results.length).forEach((topic: any) => {
        if (topic.Text && topic.FirstURL) {
          results.push({
            title: topic.Text.substring(0, 50) + (topic.Text.length > 50 ? '...' : ''),
            url: topic.FirstURL,
            snippet: topic.Text.substring(0, 150),
            source: 'DuckDuckGo'
          });
        }
      });
    }
    
    return results.slice(0, maxResults);
    
  } catch (error) {
    console.warn('DuckDuckGo search failed:', error);
    return [];
  }
}

/**
 * Extract key facts from search results for context
 */
export function extractFactsFromResults(results: SearchResult[]): string[] {
  const facts: string[] = [];
  
  results.forEach(result => {
    // Simple fact extraction - take first sentence of snippets
    const sentences = result.snippet.split(/[.!?]/).filter(s => s.trim().length > 20);
    if (sentences.length > 0) {
      facts.push(sentences[0].trim());
    }
    
    // Extract any numbers or specific terms
    const numbers = result.snippet.match(/\d+/g);
    if (numbers && numbers.length > 0) {
      numbers.slice(0, 2).forEach(num => {
        facts.push(`Contains ${num} relevant items`);
      });
    }
  });
  
  return facts.slice(0, 5); // Limit to 5 facts
}

/**
 * Build search context for lesson generation
 */
export async function buildSearchContext(topic: string, chapterTitle: string): Promise<SearchContext> {
  const query = `${topic} ${chapterTitle} educational content`;
  
  try {
    const results = await searchDuckDuckGo(query, 3);
    const extractedFacts = extractFactsFromResults(results);
    
    return {
      query,
      results,
      extractedFacts,
      timestamp: Date.now()
    };
    
  } catch (error) {
    console.warn('Failed to build search context:', error);
    return {
      query,
      results: [],
      extractedFacts: [],
      timestamp: Date.now()
    };
  }
}

/**
 * Quick relevance check - returns true if search found useful results
 */
export function hasRelevantResults(context: SearchContext): boolean {
  return context.results.length > 0 && context.extractedFacts.length > 0;
}

/**
 * Format search context for model consumption
 */
export function formatSearchContext(context: SearchContext): string {
  if (!hasRelevantResults(context)) {
    return '';
  }
  
  const factsText = context.extractedFacts.map(fact => `• ${fact}`).join('\n');
  const sourcesText = context.results.map(r => `• ${r.source}: ${r.title}`).join('\n');
  
  return `SEARCH CONTEXT (from ${context.results.length} sources):
${factsText}

SOURCES:
${sourcesText}`;
}
