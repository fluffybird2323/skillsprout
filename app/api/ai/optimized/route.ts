import { NextRequest, NextResponse } from 'next/server';
import { generateWithGroq, calculateMaxTokens } from '../../../../services/groqClient';

/**
 * Optimized lesson generation - single call handles everything
 * Uses Groq (primary)
 */
export async function POST(request: NextRequest) {
  let lessonType = 'quiz';
  try {
    const { topic, chapterTitle, lessonType: requestLessonType, context, locale } = await request.json();
    lessonType = requestLessonType || 'quiz';

    if (!topic || !chapterTitle) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Single optimized prompt based on lesson type
    const prompt = buildOptimizedPrompt(topic, chapterTitle, lessonType, context, locale);

    let text: string;

    try {
      // Try Groq (primary)
      console.log(`[Optimized] Using Groq for lesson generation (Locale: ${locale || 'en'})`);
      const requireMultilingual = locale && locale !== 'en';
      
      text = await generateWithGroq(
        prompt,
        'You are an expert educational content creator. Output strictly valid JSON.',
        `lesson-generation-${lessonType}` as any,
        requireMultilingual
      );
    } catch (groqError) {
       console.error('[Optimized] Groq failed:', groqError);
       throw groqError;
    }

    // Parse and validate response
    const data = parseOptimizedResponse(text, lessonType || 'quiz');

    return NextResponse.json(data);

  } catch (error) {
    console.error('Optimized lesson generation failed:', error);

    // Return ultra-simple fallback immediately
    return NextResponse.json(getFallbackResponse(lessonType));
  }
}

/**
 * Build optimized prompt - includes search context if available
 */
function buildOptimizedPrompt(topic: string, chapterTitle: string, lessonType: string, context: any, locale: string = 'en'): string {
  const category = context?.category || 'general';
  const questionCount = context?.questionCount || 3;
  const searchContext = context?.searchContext || '';
  
  // Language instruction
  const languageInstruction = locale && locale !== 'en' 
    ? `IMPORTANT: The user's language is "${locale}". You MUST generate ALL content (questions, options, explanations, intro) in "${locale}". Do not output English unless the term is technical and commonly used in English.`
    : '';
  
  // Include search context if we have relevant results
  const contextSection = searchContext && context?.hasRelevantResults ? `
REAL-WORLD CONTEXT (from web search):
${searchContext}

Use this context to make the lesson more accurate and engaging.` : '';
  
  if (lessonType === 'quiz') {
    return `Create a quick quiz lesson for "${chapterTitle}" (Topic: ${topic}, Category: ${category}).
${contextSection}

${languageInstruction}

Generate exactly ${questionCount} questions with these types: multiple-choice, fill-blank, true-false.
Make questions practical and engaging. Include clear explanations.

IMPORTANT: Focus primarily on the specific "${topic}" and "${chapterTitle}". The Category (${category}) is just a guide - if it seems unrelated, ignore it and follow the Topic.

Return simple JSON:
{
  "intro": "Brief engaging introduction",
  "questions": [
    {
      "type": "multiple-choice",
      "question": "Question text",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": "A",
      "explanation": "Why this is correct"
    }
  ]
}`;
  }

  if (lessonType === 'interactive') {
    return `Create a simple interactive lesson for "${chapterTitle}" (Topic: ${topic}, Category: ${category}).
${contextSection}

Include a basic interactive element (simulation or activity) and 2-3 questions.
Keep it lightweight and fast to generate.

IMPORTANT: Focus primarily on the specific "${topic}" and "${chapterTitle}". The Category (${category}) is just a guide - if it seems unrelated, ignore it and follow the Topic.

Return simple JSON:
{
  "intro": "Brief engaging introduction",
  "interactiveConfig": {
    "type": "simulation",
    "instruction": "What to do",
    "feedback": "Great job!"
  },
  "questions": [
    {
      "type": "multiple-choice",
      "question": "Question about the activity",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": "A",
      "explanation": "Explanation"
    }
  ]
}`;
  }

  // Default to quiz
  return buildOptimizedPrompt(topic, chapterTitle, 'quiz', context, locale);
}

/**
 * Parse response with minimal validation
 */
function parseOptimizedResponse(text: string, lessonType: string): any {
  try {
    // Simple JSON extraction
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');
    
    const data = JSON.parse(jsonMatch[0]);
    
    // Minimal validation
    if (!data.intro || !data.questions || !Array.isArray(data.questions)) {
      throw new Error('Invalid response structure');
    }
    
    return data;
    
  } catch (error) {
    console.error('Response parsing failed:', error);
    return getFallbackResponse(lessonType);
  }
}

/**
 * Ultra-fast fallback responses
 */
function getFallbackResponse(lessonType: string): any {
  if (lessonType === 'quiz') {
    return {
      intro: "Let's test your understanding with a quick quiz.",
      questions: [
        {
          type: "multiple-choice",
          question: "What is the main concept here?",
          options: ["Option A", "Option B", "Option C", "Option D"],
          correctAnswer: "Option A",
          explanation: "This is the correct answer because it's the most accurate."
        }
      ]
    };
  }

  if (lessonType === 'interactive') {
    return {
      intro: "Try this interactive exercise.",
      interactiveConfig: {
        type: "simulation",
        instruction: "Complete the activity",
        feedback: "Well done!"
      },
      questions: [
        {
          type: "multiple-choice",
          question: "What did you learn from the activity?",
          options: ["A", "B", "C", "D"],
          correctAnswer: "A",
          explanation: "This demonstrates the key concept."
        }
      ]
    };
  }

  return getFallbackResponse('quiz');
}