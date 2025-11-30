import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Schema, Type, GenerateContentResponse } from "@google/genai";
import { cleanAndParseJSON } from '../../../utils/aiHelpers';
import { CourseDepth, WidgetType } from '../../../types';

// Initialize Gemini on the server side securely
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const MODEL_NAME = 'gemini-2.5-flash';
const IMAGE_MODEL_NAME = 'gemini-2.5-flash-image';

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
        result = await handleEditImage(payload.base64Image, payload.mimeType, payload.prompt);
        break;
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

// --- Logic Handlers (Moved from old client service) ---

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
  
  Output Schema:
  Generate a JSON object containing the course structure.
  `;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      icon: { type: Type.STRING, description: "A single emoji representing the topic" },
      units: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            color: { type: Type.STRING },
            chapters: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                },
                required: ["title", "description"]
              }
            }
          },
          required: ["title", "description", "color", "chapters"]
        }
      }
    },
    required: ["units", "icon"]
  };

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: schema,
      systemInstruction: "You are an expert curriculum designer.",
    },
  });

  return cleanAndParseJSON(response.text || "{}");
}

async function handleGeneratePathSuggestions(topic: string, history: string[]) {
  const prompt = `The user is learning "${topic}". 
  They have already completed units on: ${history.join(', ')}.
  
  Suggest 3 distinct, exciting "Next Steps" or subtopics they could learn next. 
  These should be short, punchy titles (max 4 words).
  `;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      suggestions: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    },
    required: ["suggestions"]
  };

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  });

  return cleanAndParseJSON(response.text || "{}");
}

async function handleGenerateUnit(topic: string, existingUnitCount: number, focus?: string) {
  let prompt = `The user is learning "${topic}". They have completed ${existingUnitCount} units.
  Create the NEXT Unit in the sequence. It should be slightly more advanced.
  The number of chapters (3-6) should depend on the complexity.
  `;

  if (focus) {
    prompt += `\nCRITICAL: The user specifically wants this unit to focus on "${focus}".`;
  }

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      description: { type: Type.STRING },
      color: { type: Type.STRING },
      chapters: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
          },
          required: ["title", "description"]
        }
      }
    },
    required: ["title", "description", "color", "chapters"]
  };

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  });

  return cleanAndParseJSON(response.text || "{}");
}

async function handleGenerateLessonContent(topic: string, chapterTitle: string) {
  const prompt = `Create an interactive, gamified micro-lesson for the chapter "${chapterTitle}" on the topic "${topic}".
  
  1. Provide a very short, engaging conceptual introduction.
  2. Create 4 interactive questions.
  
  Question Types: 'multiple-choice', 'fill-blank', 'true-false'.
  `;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      intro: { type: Type.STRING },
      questions: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING, enum: ["multiple-choice", "fill-blank", "true-false"] },
            question: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctAnswer: { type: Type.STRING },
            explanation: { type: Type.STRING }
          },
          required: ["type", "question", "options", "correctAnswer", "explanation"]
        }
      }
    },
    required: ["intro", "questions"]
  };

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  });

  return cleanAndParseJSON(response.text || "{}");
}

async function handleGenerateResourceLesson(topic: string, chapterTitle: string) {
  const prompt = `Find a high-quality, educational article or video tutorial about "${chapterTitle}" in the context of learning "${topic}". 
  Return the URL, the title of the resource, and a short summary.
  Then, generate 3 multiple-choice questions.
  `;

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      systemInstruction: "You are a research assistant. Return ONLY a JSON object with this structure: { resource: { url, title, summary, sourceName }, questions: [{ type: 'multiple-choice', question, options, correctAnswer, explanation }] }.",
    },
  });

  // Google Search tool responses often require relaxed parsing or specific handling
  // Here we rely on the utility to find the JSON blob
  return cleanAndParseJSON(response.text || "{}");
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
  `;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      intro: { type: Type.STRING },
      widgetType: { type: Type.STRING, enum: ['simulation', 'sorting', 'canvas', 'image-editor'] },
      instruction: { type: Type.STRING },
      feedback: { type: Type.STRING },
      simulationParams: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
             label: { type: Type.STRING, description: "Clear, descriptive name using simple language" },
             min: { type: Type.NUMBER, description: "Minimum value - should be intuitive and reasonable" },
             max: { type: Type.NUMBER, description: "Maximum value - should be intuitive and reasonable" },
             step: { type: Type.NUMBER, description: "Step size - keep small for precision near target" },
             targetValue: { type: Type.NUMBER, description: "The correct answer - should be intuitive and not require complex calculation" },
             unit: { type: Type.STRING, description: "Simple unit (%, °C, kg, etc.) - avoid complex units" }
          },
          required: ["label", "min", "max", "targetValue"]
        }
      },
      sortingItems: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      },
      canvasBackground: { type: Type.STRING },
      quizQuestions: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING, enum: ["multiple-choice"] },
            question: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctAnswer: { type: Type.STRING },
            explanation: { type: Type.STRING }
          },
          required: ["question", "options", "correctAnswer"]
        }
      }
    },
    required: ["intro", "widgetType", "instruction", "feedback", "quizQuestions"]
  };

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  });

  return cleanAndParseJSON(response.text || "{}");
}

async function handleEditImage(base64Image: string, mimeType: string, prompt: string) {
  const response = await ai.models.generateContent({
    model: IMAGE_MODEL_NAME,
    contents: {
      parts: [
        {
          inlineData: {
            data: base64Image,
            mimeType: mimeType,
          },
        },
        {
          text: prompt,
        },
      ],
    },
  });

  const parts = response.candidates?.[0]?.content?.parts || [];
  for (const part of parts) {
    if (part.inlineData && part.inlineData.data) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  
  throw new Error("No image generated");
}
