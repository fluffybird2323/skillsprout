import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { cleanAndParseJSON } from '../../../utils/aiHelpers';
import { CourseDepth, WidgetType } from '../../../types';

// Initialize OpenAI client for OpenRouter
const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "https://skillsprout.app", // Optional: For OpenRouter rankings
    "X-Title": "SkillSprout", // Optional: For OpenRouter rankings
  }
});

const MODEL_NAME = 'x-ai/grok-4.1-fast:free'; // As requested by user

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, payload } = body;

    let result;

    switch (action) {
      case 'generateCourseOutline':
        result = await handleGenerateCourseOutline(payload.topic, payload.depth);
        break;
      case 'generatePathSuggestions':
        result = await handleGeneratePathSuggestions(payload.topic, payload.history);
        break;
      case 'generateUnit':
        result = await handleGenerateUnit(payload.topic, payload.existingUnitCount, payload.focus);
        break;
      case 'generateLessonContent':
        result = await handleGenerateLessonContent(payload.topic, payload.chapterTitle);
        break;
      case 'generateResourceLesson':
        result = await handleGenerateResourceLesson(payload.topic, payload.chapterTitle);
        break;
      case 'generateInteractiveLesson':
        result = await handleGenerateInteractiveLesson(payload.topic, payload.chapterTitle);
        break;
      case 'editImageWithGemini':
        // Image editing is not directly supported by text-generation models on OpenRouter in the same way
        // We'll return an error or mock for now
        throw new Error("Image editing not supported with current model");
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json(result);

  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

// --- Logic Handlers ---

async function generateWithOpenAI(prompt: string, systemInstruction: string = "You are a helpful AI assistant.") {
  const completion = await openai.chat.completions.create({
    model: MODEL_NAME,
    messages: [
      { role: "system", content: systemInstruction },
      { role: "user", content: prompt }
    ],
    // Some models support json_object, but not all. Grok is smart enough with prompt engineering.
    // We'll force JSON in the prompt.
  });

  return cleanAndParseJSON(completion.choices[0].message.content || "{}");
}

async function handleGenerateCourseOutline(topic: string, depth: CourseDepth) {
  let depthInstruction = "";
  let structureInstruction = "";
  
  switch (depth) {
    case 'casual':
      depthInstruction = "Target Audience: Curious beginner. Goal: Broad overview.";
      structureInstruction = "Create exactly 2 Units. Unit 1: 'The Basics'. Unit 2: 'Common Applications'. Keep chapters minimal (3 per unit).";
      break;
    case 'serious':
      depthInstruction = "Target Audience: University student. Goal: Solid competency.";
      structureInstruction = "Create a standard textbook structure with 8-12 Units. Start with Foundations, move to Core Concepts, then Advanced Theory, and finally Real-world Application. The first 2 units should be introductory and accessible, ramping up difficulty significantly by Unit 4.";
      break;
    case 'obsessed':
      depthInstruction = "Target Audience: Expert/PhD candidate. Goal: Total Mastery.";
      structureInstruction = "Create a massive, year-long curriculum with 20+ Units. Cover History, Theoretical Frameworks, Core Mechanics, Edge Cases, Niche Applications, and Future Trends. Detailed and exhaustive.";
      break;
  }

  const prompt = `Act as a senior curriculum designer for a leading university. Design a structured learning path for the topic: "${topic}".
  
  Context:
  ${depthInstruction}
  
  Structure Constraints:
  ${structureInstruction}
  
  Guidelines:
  1. The curriculum must be logical and sequential (A leads to B, B leads to C).
  2. Titles should sound professional and academic yet engaging.
  3. The description for each unit should briefly explain the learning outcome.
  4. Assign a single, distinct hex color for each unit to create a rainbow gradient effect.
  
  IMPORTANT: Return ONLY valid JSON. No markdown formatting, no backticks.
  
  Output Schema:
  {
    "icon": "A single emoji representing the topic",
    "units": [
      {
        "title": "Unit Title",
        "description": "Unit Description",
        "color": "#HexColor",
        "chapters": [
          {
            "title": "Chapter Title",
            "description": "Chapter Description"
          }
        ]
      }
    ]
  }
  `;

  return generateWithOpenAI(prompt, "You are an expert curriculum designer. You output strictly valid JSON.");
}

async function handleGeneratePathSuggestions(topic: string, history: string[]) {
  const prompt = `The user is learning "${topic}". 
  They have already completed units on: ${history.join(', ')}.
  
  Suggest 3 distinct, exciting "Next Steps" or subtopics they could learn next. 
  These should be short, punchy titles (max 4 words).

  IMPORTANT: Return ONLY valid JSON. No markdown formatting.

  Output Schema:
  {
    "suggestions": ["Suggestion 1", "Suggestion 2", "Suggestion 3"]
  }
  `;

  return generateWithOpenAI(prompt);
}

async function handleGenerateUnit(topic: string, existingUnitCount: number, focus?: string) {
  let prompt = `The user is learning "${topic}". They have completed ${existingUnitCount} units.
  Create the NEXT Unit in the sequence. It should be slightly more advanced.
  The number of chapters (3-6) should depend on the complexity.
  `;

  if (focus) {
    prompt += `\nCRITICAL: The user specifically wants this unit to focus on "${focus}".`;
  }

  prompt += `
  IMPORTANT: Return ONLY valid JSON. No markdown formatting.
  
  Output Schema:
  {
    "title": "Unit Title",
    "description": "Unit Description",
    "color": "#HexColor",
    "chapters": [
      {
        "title": "Chapter Title",
        "description": "Chapter Description"
      }
    ]
  }
  `;

  return generateWithOpenAI(prompt);
}

async function handleGenerateLessonContent(topic: string, chapterTitle: string) {
  const prompt = `Create an interactive, gamified micro-lesson for the chapter "${chapterTitle}" on the topic "${topic}".
  
  1. Provide a very short, engaging conceptual introduction.
  2. Create 4 interactive questions.
  
  Question Types: 'multiple-choice', 'fill-blank', 'true-false'.

  IMPORTANT: Return ONLY valid JSON. No markdown formatting.

  Output Schema:
  {
    "intro": "Short introduction text",
    "questions": [
      {
        "type": "multiple-choice" | "fill-blank" | "true-false",
        "question": "The question text",
        "options": ["Option 1", "Option 2"] (only for multiple-choice),
        "correctAnswer": "The exact correct answer string",
        "explanation": "Why this is correct"
      }
    ]
  }
  `;

  return generateWithOpenAI(prompt);
}

async function handleGenerateResourceLesson(topic: string, chapterTitle: string) {
  const prompt = `Find or generate a high-quality, educational resource recommendation about "${chapterTitle}" in the context of learning "${topic}". 
  Provide a URL (can be a well-known placeholder if unknown, e.g., to a relevant Wikipedia page or official doc), the title, and a short summary.
  Then, generate 3 multiple-choice questions based on the likely content of such a resource.

  IMPORTANT: Return ONLY valid JSON. No markdown formatting.

  Output Schema:
  {
    "resource": {
      "url": "https://example.com/resource",
      "title": "Resource Title",
      "summary": "Short summary",
      "sourceName": "Source Name (e.g. Wikipedia, MDN, etc.)"
    },
    "questions": [
      {
        "type": "multiple-choice",
        "question": "Question text",
        "options": ["A", "B", "C", "D"],
        "correctAnswer": "Correct Option",
        "explanation": "Explanation"
      }
    ]
  }
  `;

  return generateWithOpenAI(prompt, "You are a research assistant. Output strictly valid JSON.");
}

async function handleGenerateInteractiveLesson(topic: string, chapterTitle: string) {
  const prompt = `Create an INTERACTIVE simulation or mini-game config for "${chapterTitle}" (Topic: ${topic}).
  
  IMPORTANT: For simulation widgets, create CLEAR and UNAMBIGUOUS slider questions with these requirements:
  
  1. Use SIMPLE, EVERYDAY LANGUAGE - avoid technical jargon or complex terminology
  2. Provide EXPLICIT VALUE RANGES and EXPECTED ANSWER FORMATS
  3. Include CONTEXTUAL HINTS about what constitutes a correct answer
  4. Make questions STRAIGHTFORWARD with only one correct interpretation
  5. Use FAMILIAR CONCEPTS that don't require specialized knowledge
  
  For simulation sliders:
  - Each parameter should have a CLEAR, DESCRIPTIVE LABEL
  - Target values should be REASONABLE and INTUITIVE
  - Provide simple context clues in the instruction
  - Avoid ambiguous terms like "optimal" or "ideal" without clear definition
  
  Choose the best Widget Type: 'simulation', 'sorting', 'canvas', or 'image-editor'.

  IMPORTANT: Return ONLY valid JSON. No markdown formatting.

  Output Schema:
  {
    "intro": "Brief intro",
    "widgetType": "simulation" | "sorting" | "canvas" | "image-editor",
    "instruction": "What the user should do",
    "feedback": "Success message",
    "simulationParams": [
      {
        "label": "Parameter Name",
        "min": 0,
        "max": 100,
        "step": 1,
        "targetValue": 50,
        "unit": "%"
      }
    ],
    "sortingItems": ["Item 1", "Item 2"] (if widgetType is sorting),
    "canvasBackground": "Description of background" (if widgetType is canvas),
    "quizQuestions": [
      {
        "type": "multiple-choice",
        "question": "Follow up question",
        "options": ["A", "B"],
        "correctAnswer": "A",
        "explanation": "Why"
      }
    ]
  }
  `;

  return generateWithOpenAI(prompt);
}
