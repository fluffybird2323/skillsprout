import { LessonContent } from '../types';
import { storageValidator } from '../utils/storageValidation';
import { storageRecovery } from './storageRecovery';

const DB_NAME = 'skillsprout-cache';
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
  private db: IDBDatabase | null = null;
  private memoryCache: Map<string, CachedLesson> = new Map();
  private prefetchCache: Map<string, PrefetchedSuggestions> = new Map();
  private ragCache: Map<string, CachedRAGContext> = new Map();
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.initPromise = this.initDB();
  }

  private async initDB(): Promise<void> {
    if (typeof window === 'undefined' || !window.indexedDB) {
      console.warn('IndexedDB not available, using memory cache only');
      return;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.warn('IndexedDB error, falling back to memory cache');
        resolve();
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.cleanupExpired();
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(LESSON_STORE)) {
          const lessonStore = db.createObjectStore(LESSON_STORE, { keyPath: 'key' });
          lessonStore.createIndex('expiresAt', 'expiresAt', { unique: false });
        }

        if (!db.objectStoreNames.contains(PREFETCH_STORE)) {
          const prefetchStore = db.createObjectStore(PREFETCH_STORE, { keyPath: 'key' });
          prefetchStore.createIndex('expiresAt', 'expiresAt', { unique: false });
        }

        // New RAG context store (added in v2)
        if (!db.objectStoreNames.contains(RAG_STORE)) {
          const ragStore = db.createObjectStore(RAG_STORE, { keyPath: 'key' });
          ragStore.createIndex('expiresAt', 'expiresAt', { unique: false });
        }
      };
    });
  }

  private async ensureReady(): Promise<void> {
    if (this.initPromise) {
      await this.initPromise;
    }
  }

  private generateLessonKey(topic: string, chapterTitle: string, type?: string): string {
    const baseKey = `${topic.toLowerCase().trim()}-${chapterTitle.toLowerCase().trim()}`;
    return type ? `${baseKey}-${type}` : baseKey;
  }

  private generatePrefetchKey(courseId: string): string {
    return `prefetch-${courseId}`;
  }

  async getCachedLesson(topic: string, chapterTitle: string, type?: string): Promise<LessonContent | null> {
    await this.ensureReady();
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
    if (this.db) {
      try {
        const cached = await this.getFromDB<CachedLesson>(LESSON_STORE, key);
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
            await this.deleteFromDB(LESSON_STORE, key);
            
            // Attempt recovery
            const recoveryResult = await storageRecovery.recoverLessonContent(cached.content, topic, chapterTitle);
            if (recoveryResult.success && recoveryResult.recoveredData) {
              console.log('Successfully recovered lesson content from IndexedDB');
              // Cache the recovered content
              await this.cacheLesson(topic, chapterTitle, recoveryResult.recoveredData, type);
              return recoveryResult.recoveredData;
            }
          }
        }
      } catch (error) {
        console.warn('Cache read error, attempting recovery:', error);
        
        // If there's a corrupted entry, try to clean it up
        if (error instanceof Error && error.message.includes('DataError')) {
          try {
            await this.deleteFromDB(LESSON_STORE, key);
            console.log('Cleaned up corrupted IndexedDB entry');
          } catch (cleanupError) {
            console.warn('Failed to cleanup corrupted entry:', cleanupError);
          }
        }
      }
    }

    return null;
  }

  async cacheLesson(topic: string, chapterTitle: string, content: LessonContent, type?: string): Promise<void> {
    await this.ensureReady();
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
    if (this.db) {
      try {
        await this.putToDB(LESSON_STORE, cachedLesson);
      } catch (error) {
        console.warn('Cache write error:', error);
      }
    }
  }

  async getCachedPrefetch(courseId: string): Promise<string[] | null> {
    await this.ensureReady();
    const key = this.generatePrefetchKey(courseId);
    const now = Date.now();

    // Check memory cache first
    const memCached = this.prefetchCache.get(key);
    if (memCached && memCached.expiresAt > now) {
      return memCached.suggestions;
    }

    // Check IndexedDB
    if (this.db) {
      try {
        const cached = await this.getFromDB<PrefetchedSuggestions>(PREFETCH_STORE, key);
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
    await this.ensureReady();
    const key = this.generatePrefetchKey(courseId);
    const now = Date.now();

    const cachedPrefetch: PrefetchedSuggestions = {
      key,
      suggestions,
      timestamp: now,
      expiresAt: now + PREFETCH_CACHE_TTL,
    };

    this.prefetchCache.set(key, cachedPrefetch);

    if (this.db) {
      try {
        await this.putToDB(PREFETCH_STORE, cachedPrefetch);
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
    await this.ensureReady();
    const key = this.generateRAGKey(topic, chapterTitle);
    const now = Date.now();

    // Check memory cache first
    const memCached = this.ragCache.get(key);
    if (memCached && memCached.expiresAt > now) {
      return memCached;
    }

    // Check IndexedDB
    if (this.db) {
      try {
        const cached = await this.getFromDB<CachedRAGContext>(RAG_STORE, key);
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

  async cacheRAGContext(
    topic: string,
    chapterTitle: string,
    results: RAGSearchResult[],
    facts: string[],
    summary: string
  ): Promise<void> {
    await this.ensureReady();
    const key = this.generateRAGKey(topic, chapterTitle);
    const now = Date.now();

    const cachedRAG: CachedRAGContext = {
      key,
      topic,
      chapterTitle,
      results,
      facts,
      summary,
      timestamp: now,
      expiresAt: now + RAG_CACHE_TTL,
    };

    this.ragCache.set(key, cachedRAG);

    if (this.db) {
      try {
        await this.putToDB(RAG_STORE, cachedRAG);
      } catch (error) {
        console.warn('RAG cache write error:', error);
      }
    }
  }

  async invalidateLessonCache(topic: string, chapterTitle: string): Promise<void> {
    await this.ensureReady();
    const key = this.generateLessonKey(topic, chapterTitle);

    // Remove from memory cache (all types)
    for (const cacheKey of this.memoryCache.keys()) {
      if (cacheKey.startsWith(key)) {
        this.memoryCache.delete(cacheKey);
      }
    }

    // Remove from IndexedDB
    if (this.db) {
      try {
        const transaction = this.db.transaction(LESSON_STORE, 'readwrite');
        const store = transaction.objectStore(LESSON_STORE);

        // Delete all variations of this lesson
        const keysToDelete = [key, `${key}-quiz`, `${key}-interactive`, `${key}-resource`];
        for (const k of keysToDelete) {
          store.delete(k);
        }
      } catch (error) {
        console.warn('Cache invalidation error:', error);
      }
    }
  }

  async clearAllCache(): Promise<void> {
    await this.ensureReady();
    this.memoryCache.clear();
    this.prefetchCache.clear();
    this.ragCache.clear();

    if (this.db) {
      try {
        const transaction = this.db.transaction([LESSON_STORE, PREFETCH_STORE, RAG_STORE], 'readwrite');
        transaction.objectStore(LESSON_STORE).clear();
        transaction.objectStore(PREFETCH_STORE).clear();
        transaction.objectStore(RAG_STORE).clear();
      } catch (error) {
        console.warn('Cache clear error:', error);
      }
    }
  }

  private async cleanupExpired(): Promise<void> {
    if (!this.db) return;

    const now = Date.now();

    try {
      const transaction = this.db.transaction([LESSON_STORE, PREFETCH_STORE, RAG_STORE], 'readwrite');

      // Clean lesson store
      const lessonStore = transaction.objectStore(LESSON_STORE);
      const lessonIndex = lessonStore.index('expiresAt');
      const lessonRange = IDBKeyRange.upperBound(now);
      const lessonCursor = lessonIndex.openCursor(lessonRange);

      lessonCursor.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      // Clean prefetch store
      const prefetchStore = transaction.objectStore(PREFETCH_STORE);
      const prefetchIndex = prefetchStore.index('expiresAt');
      const prefetchRange = IDBKeyRange.upperBound(now);
      const prefetchCursor = prefetchIndex.openCursor(prefetchRange);

      prefetchCursor.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      // Clean RAG store
      const ragStore = transaction.objectStore(RAG_STORE);
      const ragIndex = ragStore.index('expiresAt');
      const ragRange = IDBKeyRange.upperBound(now);
      const ragCursor = ragIndex.openCursor(ragRange);

      ragCursor.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
    } catch (error) {
      console.warn('Cache cleanup error:', error);
    }

    // Also clean memory caches
    for (const [key, value] of this.memoryCache.entries()) {
      if (value.expiresAt <= now) {
        this.memoryCache.delete(key);
      }
    }

    for (const [key, value] of this.prefetchCache.entries()) {
      if (value.expiresAt <= now) {
        this.prefetchCache.delete(key);
      }
    }

    for (const [key, value] of this.ragCache.entries()) {
      if (value.expiresAt <= now) {
        this.ragCache.delete(key);
      }
    }
  }

  private async getFromDB<T>(storeName: string, key: string): Promise<T | null> {
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  private async putToDB<T>(storeName: string, data: T): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async deleteFromDB(storeName: string, key: string): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
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
