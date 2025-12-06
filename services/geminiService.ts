import { GoogleGenAI } from "@google/genai";
import { getPissbotConfig, PissbotConfig } from "./firebase";

const getClient = () => {
  // Checks for standard process.env (Node) or import.meta.env (Vite)
  const apiKey = process.env.GEMINI_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    console.error("GEMINI_API_KEY is missing. Create a .env.local file with VITE_GEMINI_API_KEY=...");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

// Fallback system prompt if Firebase config not available
const FALLBACK_SYSTEM_PROMPT = `You are Pissbot, the AI assistant for Pisscord - a P2P Discord clone. Keep responses concise and use markdown formatting when appropriate.`;

// Build system instruction from Firebase config
const buildSystemInstruction = (config: PissbotConfig | null): string => {
  if (!config) {
    console.warn("Pissbot config not available, using fallback");
    return FALLBACK_SYSTEM_PROMPT;
  }

  const parts = [config.systemPrompt];

  if (config.context) {
    parts.push(`\n\n## Current Context\n${config.context}`);
  }

  if (config.patchNotes) {
    parts.push(`\n\n## Latest Patch Notes\n${config.patchNotes}`);
  }

  if (config.documentation) {
    parts.push(`\n\n## Documentation\n${config.documentation}`);
  }

  return parts.join('');
};

export const generateAIResponse = async (prompt: string): Promise<string> => {
  const ai = getClient();
  if (!ai) return "Error: API Key not found. Please configure your API key.";

  try {
    // Fetch dynamic config from Firebase
    const config = await getPissbotConfig();
    const systemInstruction = buildSystemInstruction(config);

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction,
      }
    });

    return response.text || "I couldn't generate a response.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Sorry, I encountered an error processing your request.";
  }
};