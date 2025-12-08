# AI Model Call Architecture

## Overview
This document explains when and how AI model calls are made in SkillSprout. All model calls are tracked, logged, and cached appropriately.

## Model Call Manager
**File**: `services/modelManager.ts`

Central tracking system for all AI model calls with:
- Call purpose tracking
- Rate limiting awareness
- Cache hint generation
- Token estimation
- Debug logging

## When Model Calls Happen

### ✅ Model Calls ARE Made During:

| Operation | Purpose | Frequency | Cached? |
|-----------|---------|-----------|---------|
| **Course Creation** | `course-generation` | Once per course | State only |
| **Unit Generation** | `unit-generation` | Once per unit | State only |
| **Quiz Lesson** | `lesson-generation-quiz` | First load only | 7 days (IndexedDB) |
| **Resource Lesson** | `lesson-generation-resource` | First load only | 7 days (IndexedDB) |
| **Interactive Lesson** | `lesson-generation-interactive` | First load only | 7 days (IndexedDB) |
| **Generate References** | `reference-generation` | On-demand (button) | Unit state |
| **Path Suggestions** | `path-suggestions` | On-demand (button) | Not cached |
| **Fact Extraction** | `fact-extraction` | During lesson RAG | Part of lesson |

### ❌ Model Calls ARE NOT Made During:

- Viewing course/roadmap
- Viewing cached lessons
- Answering quiz questions
- Clicking reference links
- Opening reference panel
- Reviewing lessons (SRS)
- Switching between courses
- Page navigation

## Implementation Details

### Backend (API Route)
**File**: `app/api/ai/route.ts`

```typescript
// All model calls go through this function with tracking
async function generateWithGemini(
  prompt: string,
  systemInstruction: string,
  retryCount: number = 0,
  purpose?: ModelCallPurpose,  // 👈 Tracks purpose
  metadata?: Record<string, any>
) {
  // Track call
  if (purpose && retryCount === 0) {
    trackModelCall({
      purpose,
      timestamp: Date.now(),
      topic: metadata?.topic,
      shouldCache: shouldCacheResult(purpose),
      estimatedTokens: estimateTokens(fullPrompt),
    });
  }

  // Generate content
  // ...
}
```

### Call Examples

#### 1. Course Generation
```typescript
handleGenerateCourseOutline(topic, depth)
  → generateWithGemini(prompt, instruction, 0, 'course-generation', { topic })
  → Logs: [Model] gemini-2.5-flash | Purpose: course-generation
```

#### 2. Lesson Generation (Quiz)
```typescript
handleGenerateLessonContent(topic, chapterTitle)
  → generateWithGemini(prompt, instruction, 0, 'lesson-generation-quiz', { topic, chapterTitle })
  → Cached in IndexedDB for 7 days
  → Next load: NO model call (cache hit)
```

#### 3. Reference Generation
```typescript
handleGenerateUnitReferences(topic, unitTitle, chapterTitles)
  → Check if shouldHaveReferences() → Skip if subjective
  → Perform web search (Wikipedia, DuckDuckGo)
  → Validate URLs
  → NO AI generation of fake content
  → Only returns real, validated sources
```

## Caching Strategy

### Lesson Content (IndexedDB)
- **TTL**: 7 days
- **Key**: `${courseId}:${chapterId}`
- **Size limit**: 50MB
- **Auto-cleanup**: Yes

### Unit References (State)
- **TTL**: Session only
- **Stored in**: `unit.references`
- **Re-generated**: Only if user clicks button

### Course Structure (State)
- **TTL**: Session only
- **Stored in**: Zustand store
- **Persisted**: localStorage

## Rate Limiting

### Server-Side
- **Window**: 60 seconds
- **Limit**: 10 calls per minute per IP
- **Response**: 429 with retryAfter

### Model-Specific Limits
- **Reference generation**: Max 3 per minute
- **General calls**: Max 10 per minute

## Logging

All model calls log with format:
```
[Model] gemini-2.5-flash | Purpose: lesson-generation-quiz
[Model] Response: 1247 chars | Purpose: lesson-generation-quiz
```

Development mode includes additional tracking:
```
[Model Call] lesson-generation-quiz {
  topic: 'JavaScript',
  cached: true,
  estimatedTokens: 1234
}
```

## Flow Diagrams

### Course Creation Flow
```
User enters topic + depth
  ↓
generateCourseOutline(topic, depth)
  ↓
API: handleGenerateCourseOutline()
  ↓
generateWithGemini(..., 'course-generation', { topic })
  ↓
trackModelCall() logs the call
  ↓
Returns course structure
  ↓
Store in Zustand state
  ↓
No further model calls for viewing
```

### Lesson Load Flow
```
User clicks chapter
  ↓
Check lessonCache.getCachedLesson()
  ↓
Cache HIT? → Load immediately (NO MODEL CALL)
  ↓
Cache MISS? → Generate
  ↓
generateLessonContent(topic, chapter)
  ↓
API: handleGenerateLessonContent()
  ↓
generateWithGemini(..., 'lesson-generation-quiz', { topic, chapter })
  ↓
trackModelCall() logs the call
  ↓
Returns lesson with questions
  ↓
Cache in IndexedDB (7 days)
  ↓
Next load: Cache hit (NO MODEL CALL)
```

### Reference Generation Flow
```
User clicks "References" icon
  ↓
Modal opens showing unit.references
  ↓
If empty → "Generate References" button shown
  ↓
User clicks button
  ↓
generateUnitReferences(topic, unitTitle, chapters)
  ↓
API: handleGenerateUnitReferences()
  ↓
shouldHaveReferences() → Check if topic needs refs
  ↓
If NO (subjective) → Return empty with flag
  ↓
If YES → Search web (Wikipedia, DuckDuckGo)
  ↓
Validate URLs (5 concurrent)
  ↓
Score and rank results
  ↓
Return top 5 validated sources
  ↓
NO MODEL CALL (uses web search only)
  ↓
Store in unit.references
  ↓
Modal shows links
  ↓
Clicking links → External navigation (NO MODEL CALL)
```

## Key Principles

1. **Generate Once, Cache Forever** - Lessons are generated once and cached
2. **Explicit Actions Only** - Model calls only on button clicks or first loads
3. **No Hidden Calls** - All calls are logged and tracked
4. **Real Sources Only** - References use web search, not AI generation
5. **Smart Filtering** - Subjective topics skip reference generation entirely

## Monitoring

Use `getModelCallStats()` to monitor:
- Total calls
- Calls in last hour
- Calls in last minute
- Breakdown by purpose

Example output:
```
=== Model Call Statistics ===
Total calls: 47
Last hour: 12
Last minute: 2

By purpose:
  lesson-generation-quiz: 18
  course-generation: 5
  unit-generation: 8
  reference-generation: 3
  path-suggestions: 7
  fact-extraction: 6
============================
```

## Best Practices

### For Developers
1. Always pass `purpose` parameter to `generateWithGemini()`
2. Check caches before generating
3. Use appropriate TTLs
4. Log all generation operations
5. Handle rate limits gracefully

### For Users
1. References are optional - not all topics need them
2. Lessons load instantly after first generation
3. Course structure persists across sessions
4. Reference links are external - just bookmarks

## Files

- `services/modelManager.ts` - Call tracking and analytics
- `app/api/ai/route.ts` - All generation endpoints
- `services/lessonCache.ts` - IndexedDB caching
- `services/ai.ts` - Client-side API wrappers

## Summary

✅ **No model calls when viewing content**
✅ **All calls tracked and logged**
✅ **Aggressive caching (7 days)**
✅ **Smart filtering (skip subjective topics)**
✅ **Real sources only (no hallucinations)**
✅ **Explicit user actions required**

The system is designed to minimize API costs while providing instant user experience through intelligent caching and selective generation.
