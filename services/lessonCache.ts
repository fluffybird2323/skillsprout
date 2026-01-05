import { openDB, IDBPDatabase } from 'idb';
import { LessonContent } from '../types';
import { storageValidator } from '../utils/storageValidation';
import { storageRecovery } from './storageRecovery';

const DB_NAME = 'manabu-cache';
const DB_VERSION = 2; // Bumped for RAG store
const LESSON_STORE = 'lessons';
const PREFETCH_STORE = 'prefetch';
const RAG_STORE = 'rag-context';

// Cache TTL: 24 hours for lessons, 1 hour for prefetched data, 6 hours for RAG
const LESSON_CACHE_TTL = 24 * 60 * 60 * 1000;
const PREFETCH_CACHE_TTL = 60 * 60 * 1000;
const RAG_CACHE_TTL = 6 * 60 * 60 * 1000;

interface CachedLesson {
  key: string;
  content: LessonContent;
  timestamp: number;
  expiresAt: number;
}

interface PrefetchedSuggestions {
  key: string;
  suggestions: string[];
  timestamp: number;
  expiresAt: number;
}

// RAG Context types for frontend caching
export interface RAGSearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

export interface CachedRAGContext {
  key: string;
  topic: string;
  chapterTitle: string;
  results: RAGSearchResult[];
  facts: string[];
  summary: string;
  timestamp: number;
  expiresAt: number;
}

class LessonCacheService {
  private dbPromise: Promise<IDBPDatabase> | null = null;
  private memoryCache: Map<string, CachedLesson> = new Map();
  private prefetchCache: Map<string, PrefetchedSuggestions> = new Map();
  private ragCache: Map<string, CachedRAGContext> = new Map();

  constructor() {
    if (typeof window !== 'undefined' && window.indexedDB) {
      this.dbPromise = openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(LESSON_STORE)) {
            const store = db.createObjectStore(LESSON_STORE, { keyPath: 'key' });
            store.createIndex('expiresAt', 'expiresAt');
          }
          if (!db.objectStoreNames.contains(PREFETCH_STORE)) {
            const store = db.createObjectStore(PREFETCH_STORE, { keyPath: 'key' });
            store.createIndex('expiresAt', 'expiresAt');
          }
          if (!db.objectStoreNames.contains(RAG_STORE)) {
            const store = db.createObjectStore(RAG_STORE, { keyPath: 'key' });
            store.createIndex('expiresAt', 'expiresAt');
          }
        },
      });

      // Trigger cleanup on startup
      this.cleanupExpired().catch(console.warn);
    } else {
      console.warn('IndexedDB not available, using memory cache only');
    }
  }

  private async getDB(): Promise<IDBPDatabase | null> {
    if (!this.dbPromise) return null;
    try {
      return await this.dbPromise;
    } catch (error) {
      console.warn('Failed to open IndexedDB:', error);
      return null;
    }
  }

  generateLessonKey(topic: string, chapterTitle: string, type: string = 'quiz'): string {
    return `${topic.toLowerCase().trim()}:${chapterTitle.toLowerCase().trim()}:${type}`;
  }

  private generatePrefetchKey(courseId: string): string {
    return `prefetch-${courseId}`;
  }

  async getCachedLesson(topic: string, chapterTitle: string, type?: string): Promise<LessonContent | null> {
    const key = this.generateLessonKey(topic, chapterTitle, type);
    const now = Date.now();

    // Check memory cache first
    const memCached = this.memoryCache.get(key);
    if (memCached && memCached.expiresAt > now) {
      // Validate cached content before returning
      const validation = storageValidator.validateLessonContent(memCached.content);
      if (validation.isValid) {
        return memCached.content;
      } else {
        console.warn('Invalid lesson content in memory cache, attempting recovery:', validation.errors);
        // Remove invalid content from memory cache
        this.memoryCache.delete(key);
        
        // Attempt recovery
        const recoveryResult = await storageRecovery.recoverLessonContent(memCached.content, topic, chapterTitle);
        if (recoveryResult.success && recoveryResult.recoveredData) {
          console.log('Successfully recovered lesson content from memory cache');
          return recoveryResult.recoveredData;
        }
      }
    }

    // Check IndexedDB
    const db = await this.getDB();
    if (db) {
      try {
        const cached = await db.get(LESSON_STORE, key) as CachedLesson | undefined;
        if (cached && cached.expiresAt > now) {
          // Validate cached content before using
          const validation = storageValidator.validateLessonContent(cached.content);
          if (validation.isValid) {
            // Restore to memory cache
            this.memoryCache.set(key, cached);
            return cached.content;
          } else {
            console.warn('Invalid lesson content in IndexedDB, attempting recovery:', validation.errors);
            
            // Remove invalid content from IndexedDB
            await db.delete(LESSON_STORE, key);
            
            // Attempt recovery
            const recoveryResult = await storageRecovery.recoverLessonContent(cached.content, topic, chapterTitle);
            if (recoveryResult.success && recoveryResult.recoveredData) {
              console.log('Successfully recovered lesson content from IndexedDB');
              // Cache the recovered content
              await this.cacheLesson(topic, chapterTitle, recoveryResult.recoveredData, type);
              return recoveryResult.recoveredData;
            }
          }
        } else if (cached) {
            // Expired, delete it
            await db.delete(LESSON_STORE, key);
        }
      } catch (error) {
        console.warn('Cache read error, attempting recovery:', error);
        
        // If there's a corrupted entry, try to clean it up
        try {
            await db.delete(LESSON_STORE, key);
            console.log('Cleaned up corrupted IndexedDB entry');
        } catch (cleanupError) {
            console.warn('Failed to cleanup corrupted entry:', cleanupError);
        }
      }
    }

    return null;
  }

  async cacheLesson(topic: string, chapterTitle: string, content: LessonContent, type?: string): Promise<void> {
    const key = this.generateLessonKey(topic, chapterTitle, type);
    const now = Date.now();

    const cachedLesson: CachedLesson = {
      key,
      content,
      timestamp: now,
      expiresAt: now + LESSON_CACHE_TTL,
    };

    // Always update memory cache
    this.memoryCache.set(key, cachedLesson);

    // Persist to IndexedDB
    const db = await this.getDB();
    if (db) {
      try {
        await db.put(LESSON_STORE, cachedLesson);
      } catch (error) {
        console.warn('Cache write error:', error);
      }
    }
  }

  async getCachedPrefetch(courseId: string): Promise<string[] | null> {
    const key = this.generatePrefetchKey(courseId);
    const now = Date.now();

    // Check memory cache first
    const memCached = this.prefetchCache.get(key);
    if (memCached && memCached.expiresAt > now) {
      return memCached.suggestions;
    }

    // Check IndexedDB
    const db = await this.getDB();
    if (db) {
      try {
        const cached = await db.get(PREFETCH_STORE, key) as PrefetchedSuggestions | undefined;
        if (cached && cached.expiresAt > now) {
          this.prefetchCache.set(key, cached);
          return cached.suggestions;
        }
      } catch (error) {
        console.warn('Prefetch cache read error:', error);
      }
    }

    return null;
  }

  async cachePrefetch(courseId: string, suggestions: string[]): Promise<void> {
    const key = this.generatePrefetchKey(courseId);
    const now = Date.now();

    const cachedPrefetch: PrefetchedSuggestions = {
      key,
      suggestions,
      timestamp: now,
      expiresAt: now + PREFETCH_CACHE_TTL,
    };

    this.prefetchCache.set(key, cachedPrefetch);

    const db = await this.getDB();
    if (db) {
      try {
        await db.put(PREFETCH_STORE, cachedPrefetch);
      } catch (error) {
        console.warn('Prefetch cache write error:', error);
      }
    }
  }

  // --- RAG Context Caching (frontend-side for reduced backend load) ---

  private generateRAGKey(topic: string, chapterTitle: string): string {
    return `rag-${topic.toLowerCase().trim()}-${chapterTitle.toLowerCase().trim()}`;
  }

  async getCachedRAGContext(topic: string, chapterTitle: string): Promise<CachedRAGContext | null> {
    const key = this.generateRAGKey(topic, chapterTitle);
    const now = Date.now();

    // Check memory cache first
    const memCached = this.ragCache.get(key);
    if (memCached && memCached.expiresAt > now) {
      return memCached;
    }

    // Check IndexedDB
    const db = await this.getDB();
    if (db) {
      try {
        const cached = await db.get(RAG_STORE, key) as CachedRAGContext | undefined;
        if (cached && cached.expiresAt > now) {
          this.ragCache.set(key, cached);
          return cached;
        }
      } catch (error) {
        console.warn('RAG cache read error:', error);
      }
    }

    return null;
  }

  async cacheRAGContext(topic: string, chapterTitle: string, context: { results: RAGSearchResult[], facts: string[], summary: string }): Promise<void> {
    const key = this.generateRAGKey(topic, chapterTitle);
    const now = Date.now();

    const cachedContext: CachedRAGContext = {
      key,
      topic,
      chapterTitle,
      results: context.results,
      facts: context.facts,
      summary: context.summary,
      timestamp: now,
      expiresAt: now + RAG_CACHE_TTL,
    };

    this.ragCache.set(key, cachedContext);

    const db = await this.getDB();
    if (db) {
      try {
        await db.put(RAG_STORE, cachedContext);
      } catch (error) {
        console.warn('RAG cache write error:', error);
      }
    }
  }

  async invalidateLessonCache(topic: string, chapterTitle: string): Promise<void> {
    const key = this.generateLessonKey(topic, chapterTitle);

    // Remove from memory cache (all types)
    for (const cacheKey of this.memoryCache.keys()) {
      if (cacheKey.startsWith(key)) {
        this.memoryCache.delete(cacheKey);
      }
    }

    // Remove from IndexedDB
    const db = await this.getDB();
    if (db) {
      try {
        const tx = db.transaction(LESSON_STORE, 'readwrite');
        const store = tx.objectStore(LESSON_STORE);

        // Delete all variations of this lesson
        // IDB doesn't support prefix deletion easily, so we just delete known variations
        const keysToDelete = [key, `${key}-quiz`, `${key}-interactive`, `${key}-resource`];
        await Promise.all(keysToDelete.map(k => store.delete(k)));
        await tx.done;
      } catch (error) {
        console.warn('Cache invalidation error:', error);
      }
    }
  }

  async clearAllCache(): Promise<void> {
    this.memoryCache.clear();
    this.prefetchCache.clear();
    this.ragCache.clear();

    const db = await this.getDB();
    if (db) {
      try {
        await db.clear(LESSON_STORE);
        await db.clear(PREFETCH_STORE);
        await db.clear(RAG_STORE);
      } catch (error) {
        console.warn('Clear all cache error:', error);
      }
    }
  }

  private async cleanupExpired(): Promise<void> {
    const db = await this.getDB();
    if (!db) return;

    const now = Date.now();
    const stores = [LESSON_STORE, PREFETCH_STORE, RAG_STORE];

    for (const storeName of stores) {
      try {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const index = store.index('expiresAt');
        
        let cursor = await index.openCursor(IDBKeyRange.upperBound(now));
        
        while (cursor) {
          await cursor.delete();
          cursor = await cursor.continue();
        }
        
        await tx.done;
      } catch (error) {
        console.warn(`Cleanup error for ${storeName}:`, error);
      }
    }
  }

  getCacheStats(): { memoryLessons: number; memoryPrefetch: number } {
    return {
      memoryLessons: this.memoryCache.size,
      memoryPrefetch: this.prefetchCache.size,
    };
  }
}

// Singleton instance
export const lessonCache = new LessonCacheService();
