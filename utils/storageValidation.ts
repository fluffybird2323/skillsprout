import { Course, LessonContent, Unit, Chapter } from '../types';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  data?: any;
}

export interface StorageRecoveryOptions {
  attemptRepair: boolean;
  fallbackToDefault: boolean;
  logErrors: boolean;
}

export class StorageValidator {
  private static instance: StorageValidator;
  
  private constructor() {}
  
  static getInstance(): StorageValidator {
    if (!StorageValidator.instance) {
      StorageValidator.instance = new StorageValidator();
    }
    return StorageValidator.instance;
  }

  /**
   * Validates and repairs course data
   */
  validateCourse(course: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let repairedCourse = { ...course };

    try {
      // Basic structure validation
      if (!course || typeof course !== 'object') {
        errors.push('Course is not a valid object');
        return { isValid: false, errors, warnings };
      }

      // Required fields
      if (!course.id || typeof course.id !== 'string') {
        errors.push('Course ID is missing or invalid');
        repairedCourse.id = this.generateId('course');
      }

      if (!course.topic || typeof course.topic !== 'string') {
        errors.push('Course topic is missing or invalid');
        repairedCourse.topic = 'Unknown Topic';
      }

      if (!course.units || !Array.isArray(course.units)) {
        errors.push('Course units is missing or not an array');
        repairedCourse.units = [];
      }

      // Validate units
      if (course.units && Array.isArray(course.units)) {
        const validatedUnits = course.units.map((unit: any, index: number) => {
          const unitValidation = this.validateUnit(unit, course.id);
          if (!unitValidation.isValid) {
            errors.push(`Unit ${index}: ${unitValidation.errors.join(', ')}`);
          }
          if (unitValidation.warnings.length > 0) {
            warnings.push(`Unit ${index}: ${unitValidation.warnings.join(', ')}`);
          }
          return unitValidation.data || this.createDefaultUnit(course.id, index);
        });
        repairedCourse.units = validatedUnits;
      }

      // Optional fields with defaults
      if (!course.totalXp || typeof course.totalXp !== 'number') {
        warnings.push('Course totalXp is missing or invalid, setting to 0');
        repairedCourse.totalXp = 0;
      }

      if (!course.createdAt || typeof course.createdAt !== 'number') {
        warnings.push('Course createdAt is missing or invalid, setting to now');
        repairedCourse.createdAt = Date.now();
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        data: repairedCourse
      };

    } catch (error) {
      errors.push(`Unexpected error validating course: ${error instanceof Error ? error.message : String(error)}`);
      return { isValid: false, errors, warnings };
    }
  }

  /**
   * Validates and repairs unit data
   */
  validateUnit(unit: any, courseId: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let repairedUnit = { ...unit };

    try {
      if (!unit || typeof unit !== 'object') {
        errors.push('Unit is not a valid object');
        return { isValid: false, errors, warnings };
      }

      if (!unit.id || typeof unit.id !== 'string') {
        errors.push('Unit ID is missing or invalid');
        repairedUnit.id = this.generateId('unit');
      }

      if (!unit.title || typeof unit.title !== 'string') {
        errors.push('Unit title is missing or invalid');
        repairedUnit.title = 'Untitled Unit';
      }

      if (!unit.chapters || !Array.isArray(unit.chapters)) {
        errors.push('Unit chapters is missing or not an array');
        repairedUnit.chapters = [];
      }

      // Validate chapters
      if (unit.chapters && Array.isArray(unit.chapters)) {
        const validatedChapters = unit.chapters.map((chapter: any, index: number) => {
          const chapterValidation = this.validateChapter(chapter, unit.id);
          if (!chapterValidation.isValid) {
            errors.push(`Chapter ${index}: ${chapterValidation.errors.join(', ')}`);
          }
          return chapterValidation.data || this.createDefaultChapter(unit.id, index);
        });
        repairedUnit.chapters = validatedChapters;
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        data: repairedUnit
      };

    } catch (error) {
      errors.push(`Unexpected error validating unit: ${error instanceof Error ? error.message : String(error)}`);
      return { isValid: false, errors, warnings };
    }
  }

  /**
   * Validates and repairs chapter data
   */
  validateChapter(chapter: any, unitId: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let repairedChapter = { ...chapter };

    try {
      if (!chapter || typeof chapter !== 'object') {
        errors.push('Chapter is not a valid object');
        return { isValid: false, errors, warnings };
      }

      if (!chapter.id || typeof chapter.id !== 'string') {
        errors.push('Chapter ID is missing or invalid');
        repairedChapter.id = this.generateId('chapter');
      }

      if (!chapter.title || typeof chapter.title !== 'string') {
        errors.push('Chapter title is missing or invalid');
        repairedChapter.title = 'Untitled Chapter';
      }

      if (!chapter.status || !['locked', 'active', 'completed'].includes(chapter.status)) {
        warnings.push(`Chapter status is invalid: ${chapter.status}, defaulting to 'locked'`);
        repairedChapter.status = 'locked';
      }

      if (chapter.stars !== undefined && (typeof chapter.stars !== 'number' || chapter.stars < 0 || chapter.stars > 3)) {
        warnings.push(`Chapter stars is invalid: ${chapter.stars}, clearing value`);
        delete repairedChapter.stars;
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        data: repairedChapter
      };

    } catch (error) {
      errors.push(`Unexpected error validating chapter: ${error instanceof Error ? error.message : String(error)}`);
      return { isValid: false, errors, warnings };
    }
  }

  /**
   * Validates lesson content
   */
  validateLessonContent(content: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let repairedContent = { ...content };

    try {
      if (!content || typeof content !== 'object') {
        errors.push('Lesson content is not a valid object');
        return { isValid: false, errors, warnings };
      }

      if (!content.chapterId || typeof content.chapterId !== 'string') {
        errors.push('Lesson chapterId is missing or invalid');
        return { isValid: false, errors, warnings };
      }

      if (!content.type || !['quiz', 'interactive', 'resource'].includes(content.type)) {
        errors.push(`Lesson type is invalid: ${content.type}`);
        return { isValid: false, errors, warnings };
      }

      if (!content.intro || typeof content.intro !== 'string') {
        warnings.push('Lesson intro is missing or invalid, using default');
        repairedContent.intro = 'Welcome to this lesson!';
      }

      if (!content.questions || !Array.isArray(content.questions)) {
        errors.push('Lesson questions is missing or not an array');
        return { isValid: false, errors, warnings };
      }

      // Validate questions
      const validQuestions = content.questions.filter((q: any) => {
        const questionValidation = this.validateQuestion(q);
        if (!questionValidation.isValid) {
          errors.push(`Question validation failed: ${questionValidation.errors.join(', ')}`);
          return false;
        }
        return true;
      });

      if (validQuestions.length === 0) {
        errors.push('No valid questions found in lesson');
        return { isValid: false, errors, warnings };
      }

      if (validQuestions.length < content.questions.length) {
        warnings.push(`Filtered out ${content.questions.length - validQuestions.length} invalid questions`);
        repairedContent.questions = validQuestions;
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        data: repairedContent
      };

    } catch (error) {
      errors.push(`Unexpected error validating lesson content: ${error instanceof Error ? error.message : String(error)}`);
      return { isValid: false, errors, warnings };
    }
  }

  /**
   * Validates individual questions
   */
  validateQuestion(question: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      if (!question || typeof question !== 'object') {
        errors.push('Question is not a valid object');
        return { isValid: false, errors, warnings };
      }

      if (!question.id || typeof question.id !== 'string') {
        errors.push('Question ID is missing or invalid');
        return { isValid: false, errors, warnings };
      }

      if (!question.question || typeof question.question !== 'string') {
        errors.push('Question text is missing or invalid');
        return { isValid: false, errors, warnings };
      }

      if (!question.type || !['multiple-choice', 'true-false', 'fill-blank'].includes(question.type)) {
        errors.push(`Question type is invalid: ${question.type}`);
        return { isValid: false, errors, warnings };
      }

      if (!question.correctAnswer || typeof question.correctAnswer !== 'string') {
        errors.push('Question correctAnswer is missing or invalid');
        return { isValid: false, errors, warnings };
      }

      if (question.type === 'multiple-choice' && (!question.options || !Array.isArray(question.options) || question.options.length < 2)) {
        errors.push('Multiple choice question must have at least 2 options');
        return { isValid: false, errors, warnings };
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };

    } catch (error) {
      errors.push(`Unexpected error validating question: ${error instanceof Error ? error.message : String(error)}`);
      return { isValid: false, errors, warnings };
    }
  }

  /**
   * Creates a default unit for recovery
   */
  private createDefaultUnit(courseId: string, index: number): Unit {
    return {
      id: this.generateId('unit'),
      title: `Unit ${index + 1}`,
      description: 'Recovery unit created due to data corruption',
      color: '#3B82F6',
      chapters: [this.createDefaultChapter('', 0)],
      references: undefined
    };
  }

  /**
   * Creates a default chapter for recovery
   */
  private createDefaultChapter(unitId: string, index: number): Chapter {
    return {
      id: this.generateId('chapter'),
      title: `Chapter ${index + 1}`,
      description: 'Recovery chapter created due to data corruption',
      status: index === 0 ? 'active' : 'locked',
      stars: 0
    };
  }

  /**
   * Generates a unique ID
   */
  private generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Attempts to repair corrupted data
   */
  attemptRepair(corruptedData: any, dataType: 'course' | 'unit' | 'chapter' | 'lesson'): { success: boolean; repairedData?: any; error?: string } {
    try {
      let validation: ValidationResult;

      switch (dataType) {
        case 'course':
          validation = this.validateCourse(corruptedData);
          break;
        case 'unit':
          validation = this.validateUnit(corruptedData, '');
          break;
        case 'chapter':
          validation = this.validateChapter(corruptedData, '');
          break;
        case 'lesson':
          validation = this.validateLessonContent(corruptedData);
          break;
        default:
          return { success: false, error: `Unknown data type: ${dataType}` };
      }

      if (validation.isValid) {
        return { success: true, repairedData: validation.data };
      }

      // If validation failed but we have repaired data, return it
      if (validation.data && validation.errors.length > 0) {
        return { 
          success: true, 
          repairedData: validation.data,
          error: `Repaired with warnings: ${validation.warnings.join(', ')}`
        };
      }

      return { success: false, error: validation.errors.join(', ') };

    } catch (error) {
      return { 
        success: false, 
        error: `Repair failed: ${error instanceof Error ? error.message : String(error)}` 
      };
    }
  }
}

export const storageValidator = StorageValidator.getInstance();