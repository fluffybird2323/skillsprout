import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { generateWithGroq, calculateMaxTokens } from '../../../../services/groqClient';

// Initialize Gemini (fallback only)
const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
});

/**
 * Optimized lesson generation - single call handles everything
 * Uses Groq (primary) with Gemini fallback
 */
export async function POST(request: NextRequest) {
  let lessonType = 'quiz';
  try {
    const { topic, chapterTitle, lessonType: requestLessonType, context } = await request.json();
    lessonType = requestLessonType || 'quiz';

    if (!topic || !chapterTitle) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Single optimized prompt based on lesson type
    const prompt = buildOptimizedPrompt(topic, chapterTitle, lessonType, context);

    let text: string;

    try {
      // Try Groq first (primary)
      console.log('[Optimized] Using Groq for lesson generation');
      text = await generateWithGroq(
        prompt,
        'You are an expert educational content creator. Output strictly valid JSON.',
        `lesson-generation-${lessonType}` as any
      );
    } catch (groqError) {
      // Fallback to Gemini
      console.warn('[Optimized] Groq failed, using Gemini fallback');

      const maxTokens = calculateMaxTokens(prompt, `lesson-generation-${lessonType}` as any);

      const result = await genAI.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }]
          }
        ],
        config: {
          temperature: 0.7,
          maxOutputTokens: maxTokens,
        }
      });

      // Extract text from Gemini response
      if (result.candidates && result.candidates.length > 0) {
        text = result.candidates[0]?.content?.parts?.[0]?.text || '{}';
      } else {
        throw new Error('No response from Gemini');
      }
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
function buildOptimizedPrompt(topic: string, chapterTitle: string, lessonType: string, context: any): string {
  const category = context?.category || 'general';
  const questionCount = context?.questionCount || 3;
  const searchContext = context?.searchContext || '';
  
  // Include search context if we have relevant results
  const contextSection = searchContext && context?.hasRelevantResults ? `
REAL-WORLD CONTEXT (from web search):
${searchContext}

Use this context to make the lesson more accurate and engaging.` : '';
  
  if (lessonType === 'quiz') {
    return `Create a quick quiz lesson for "${chapterTitle}" (Topic: ${topic}, Category: ${category}).
${contextSection}

Generate exactly ${questionCount} questions with these types: multiple-choice, fill-blank, true-false.
Make questions practical and engaging. Include clear explanations.

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

  if (lessonType === 'resource') {
    return `Create a resource-based lesson for "${chapterTitle}" (Topic: ${topic}, Category: ${category}).
${contextSection}

Provide a high-quality educational resource (Wikipedia, documentation, etc.) and 2-3 questions about it.
Keep resource selection simple and reliable.

Return simple JSON:
{
  "intro": "Brief engaging introduction",
  "resource": {
    "url": "https://en.wikipedia.org/wiki/Topic",
    "title": "Resource Title",
    "summary": "2-3 sentence summary",
    "sourceName": "Wikipedia"
  },
  "questions": [
    {
      "type": "multiple-choice",
      "question": "Question about the resource",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": "A",
      "explanation": "Explanation"
    }
  ]
}`;
  }

  // Default to quiz
  return buildOptimizedPrompt(topic, chapterTitle, 'quiz', context);
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

  if (lessonType === 'resource') {
    return {
      intro: "Explore this educational resource.",
      resource: {
        url: "https://en.wikipedia.org/wiki/Main_Page",
        title: "Wikipedia",
        summary: "A comprehensive encyclopedia with articles on many topics.",
        sourceName: "Wikipedia"
      },
      questions: [
        {
          type: "multiple-choice",
          question: "What type of resource is this?",
          options: ["Encyclopedia", "Blog", "Forum", "Social Media"],
          correctAnswer: "Encyclopedia",
          explanation: "Wikipedia is a collaborative encyclopedia."
        }
      ]
    };
  }

  return getFallbackResponse('quiz');
}