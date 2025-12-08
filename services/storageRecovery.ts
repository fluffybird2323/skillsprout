import { storageValidator, ValidationResult } from '../utils/storageValidation';
import { Course, LessonContent } from '../types';

export interface RecoveryResult {
  success: boolean;
  recoveredData?: any;
  error?: string;
  warnings?: string[];
  recoveryMethod: 'repair' | 'regenerate' | 'fallback' | 'none';
}

export interface StorageRecoveryConfig {
  maxRepairAttempts: number;
  enableAutoRepair: boolean;
  enableFallbackRegeneration: boolean;
  logRecoveryAttempts: boolean;
}

export class StorageRecoveryService {
  private static instance: StorageRecoveryService;
  private recoveryAttempts: Map<string, number> = new Map();
  
  private config: StorageRecoveryConfig = {
    maxRepairAttempts: 3,
    enableAutoRepair: true,
    enableFallbackRegeneration: true,
    logRecoveryAttempts: true
  };

  private constructor() {}

  static getInstance(): StorageRecoveryService {
    if (!StorageRecoveryService.instance) {
      StorageRecoveryService.instance = new StorageRecoveryService();
    }
    return StorageRecoveryService.instance;
  }

  /**
   * Attempts to recover corrupted course data
   */
  async recoverCourse(corruptedData: any, courseId: string): Promise<RecoveryResult> {
    try {
      this.log(`Starting recovery for course: ${courseId}`);
      
      // Check if we've exceeded max repair attempts
      const attempts = this.recoveryAttempts.get(courseId) || 0;
      if (attempts >= this.config.maxRepairAttempts) {
        return {
          success: false,
          error: 'Maximum repair attempts exceeded',
          recoveryMethod: 'none'
        };
      }

      this.recoveryAttempts.set(courseId, attempts + 1);

      // Step 1: Try to repair the corrupted data
      if (this.config.enableAutoRepair) {
        const repairResult = storageValidator.attemptRepair(corruptedData, 'course');
        if (repairResult.success && repairResult.repairedData) {
          this.log(`Successfully repaired course: ${courseId}`);
          this.recoveryAttempts.delete(courseId); // Reset attempts on success
          
          return {
            success: true,
            recoveredData: repairResult.repairedData,
            warnings: repairResult.error ? [repairResult.error] : undefined,
            recoveryMethod: 'repair'
          };
        }
      }

      // Step 2: Try to regenerate from partial data
      if (this.config.enableFallbackRegeneration) {
        const regenerateResult = await this.attemptRegenerateCourse(corruptedData, courseId);
        if (regenerateResult.success) {
          this.log(`Successfully regenerated course: ${courseId}`);
          this.recoveryAttempts.delete(courseId); // Reset attempts on success
          
          return {
            success: true,
            recoveredData: regenerateResult.data,
            warnings: regenerateResult.warnings,
            recoveryMethod: 'regenerate'
          };
        }
      }

      // Step 3: Create minimal fallback course
      const fallbackResult = this.createFallbackCourse(courseId);
      this.log(`Created fallback course for: ${courseId}`);
      
      return {
        success: true,
        recoveredData: fallbackResult,
        warnings: ['Course data was severely corrupted, created minimal fallback'],
        recoveryMethod: 'fallback'
      };

    } catch (error) {
      const errorMessage = `Recovery failed for course ${courseId}: ${error instanceof Error ? error.message : String(error)}`;
      this.log(errorMessage, 'error');
      
      return {
        success: false,
        error: errorMessage,
        recoveryMethod: 'none'
      };
    }
  }

  /**
   * Attempts to recover corrupted lesson content
   */
  async recoverLessonContent(corruptedData: any, topic: string, chapterTitle: string): Promise<RecoveryResult> {
    try {
      this.log(`Starting recovery for lesson: ${topic} - ${chapterTitle}`);
      
      const cacheKey = `${topic}-${chapterTitle}`;
      const attempts = this.recoveryAttempts.get(cacheKey) || 0;
      
      if (attempts >= this.config.maxRepairAttempts) {
        return {
          success: false,
          error: 'Maximum repair attempts exceeded for lesson',
          recoveryMethod: 'none'
        };
      }

      this.recoveryAttempts.set(cacheKey, attempts + 1);

      // Step 1: Try to repair the lesson content
      if (this.config.enableAutoRepair) {
        const repairResult = storageValidator.attemptRepair(corruptedData, 'lesson');
        if (repairResult.success && repairResult.repairedData) {
          this.log(`Successfully repaired lesson: ${topic} - ${chapterTitle}`);
          this.recoveryAttempts.delete(cacheKey);
          
          return {
            success: true,
            recoveredData: repairResult.repairedData,
            warnings: repairResult.error ? [repairResult.error] : undefined,
            recoveryMethod: 'repair'
          };
        }
      }

      // Step 2: Create minimal fallback lesson
      const fallbackResult = this.createFallbackLesson(topic, chapterTitle);
      this.log(`Created fallback lesson for: ${topic} - ${chapterTitle}`);
      
      return {
        success: true,
        recoveredData: fallbackResult,
        warnings: ['Lesson content was corrupted, created minimal fallback'],
        recoveryMethod: 'fallback'
      };

    } catch (error) {
      const errorMessage = `Recovery failed for lesson ${topic} - ${chapterTitle}: ${error instanceof Error ? error.message : String(error)}`;
      this.log(errorMessage, 'error');
      
      return {
        success: false,
        error: errorMessage,
        recoveryMethod: 'none'
      };
    }
  }

  /**
   * Attempts to regenerate course from partial data
   */
  private async attemptRegenerateCourse(corruptedData: any, courseId: string): Promise<{ success: boolean; data?: Course; warnings?: string[] }> {
    try {
      const warnings: string[] = [];
      
      // Try to extract basic info from corrupted data
      const topic = corruptedData?.topic || 'Unknown Topic';
      const depth = corruptedData?.depth || 'serious';
      const icon = corruptedData?.icon || '📚';
      
      if (!corruptedData?.topic) {
        warnings.push('Original topic was lost, using default');
      }

      // Create a minimal valid course structure
      const regeneratedCourse: Course = {
        id: courseId,
        topic: topic,
        depth: depth,
        icon: icon,
        units: [this.createRecoveryUnit()],
        totalXp: corruptedData?.totalXp || 0
      };

      return {
        success: true,
        data: regeneratedCourse,
        warnings
      };

    } catch (error) {
      return {
        success: false,
        warnings: [`Regeneration failed: ${error instanceof Error ? error.message : String(error)}`]
      };
    }
  }

  /**
   * Creates a minimal fallback course
   */
  private createFallbackCourse(courseId: string): Course {
    return {
      id: courseId,
      topic: 'Recovered Course',
      depth: 'casual',
      icon: '🔧',
      units: [this.createRecoveryUnit()],
      totalXp: 0
    };
  }

  /**
   * Creates a recovery unit with basic structure
   */
  private createRecoveryUnit() {
    return {
      id: `recovery-unit-${Date.now()}`,
      title: 'Recovery Unit',
      description: 'This unit was created to recover from data corruption',
      color: '#EF4444',
      chapters: [this.createRecoveryChapter()]
    };
  }

  /**
   * Creates a recovery chapter with basic structure
   */
  private createRecoveryChapter() {
    return {
      id: `recovery-chapter-${Date.now()}`,
      title: 'Recovery Chapter',
      description: 'This chapter was created to recover from data corruption',
      status: 'active' as const,
      stars: 0 as const
    };
  }

  /**
   * Creates a minimal fallback lesson
   */
  private createFallbackLesson(topic: string, chapterTitle: string): LessonContent {
    return {
      chapterId: `recovery-${Date.now()}`,
      type: 'quiz',
      intro: `This is a recovery lesson for "${chapterTitle}" in "${topic}". The original lesson data was corrupted.`,
      questions: [this.createRecoveryQuestion()]
    };
  }

  /**
   * Creates a recovery question
   */
  private createRecoveryQuestion() {
    return {
      id: `recovery-question-${Date.now()}`,
      type: 'multiple-choice' as const,
      question: 'This is a recovery question. The original lesson content was corrupted.',
      options: ['Recovery Option A', 'Recovery Option B', 'Recovery Option C'],
      correctAnswer: 'Recovery Option A',
      explanation: 'This question was created as part of data recovery.'
    };
  }

  /**
   * Clears recovery attempt counter for a specific key
   */
  resetRecoveryAttempts(key: string): void {
    this.recoveryAttempts.delete(key);
  }

  /**
   * Clears all recovery attempt counters
   */
  resetAllRecoveryAttempts(): void {
    this.recoveryAttempts.clear();
  }

  /**
   * Updates recovery configuration
   */
  updateConfig(newConfig: Partial<StorageRecoveryConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Gets current recovery statistics
   */
  getRecoveryStats(): { totalAttempts: number; pendingRecoveries: number } {
    const totalAttempts = Array.from(this.recoveryAttempts.values()).reduce((sum, attempts) => sum + attempts, 0);
    const pendingRecoveries = this.recoveryAttempts.size;
    
    return { totalAttempts, pendingRecoveries };
  }

  /**
   * Logging utility
   */
  private log(message: string, level: 'info' | 'error' | 'warn' = 'info'): void {
    if (!this.config.logRecoveryAttempts) return;
    
    const timestamp = new Date().toISOString();
    const logMessage = `[StorageRecovery ${timestamp}] ${message}`;
    
    switch (level) {
      case 'error':
        console.error(logMessage);
        break;
      case 'warn':
        console.warn(logMessage);
        break;
      default:
        console.log(logMessage);
    }
  }
}

export const storageRecovery = StorageRecoveryService.getInstance();