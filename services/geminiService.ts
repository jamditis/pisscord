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
    if (!prompt || !prompt.trim()) {
      return "Please provide a prompt.";
    }

    // Timeout Promise
    const timeout = new Promise<string>((_, reject) => 
        setTimeout(() => reject(new Error("Request timed out after 15s")), 15000)
    );

    const fetchPromise = async () => {
        const model = genAI.getGenerativeModel({
          model: "gemini-2.0-flash",
          systemInstruction: await buildSystemInstruction(),
        });

        const chatSession = model.startChat({
          generationConfig,
          history: [],
        });

        const result = await chatSession.sendMessage(prompt);
        return result.response.text();
    };

    // Race fetch vs timeout
    return await Promise.race([fetchPromise(), timeout]);

  } catch (error: any) {
    console.error("Error generating AI response:", error);
    // Log to app debug logs if possible (this service is isolated, but we console.error which goes to AppLogs via App.tsx override if we did that, 
    // but App.tsx only overrides console.log if we explicitly call log().
    // We should probably return a descriptive error message.
    return `⚠️ Pissbot Error: ${error.message || "Connection failed"}`;
  }
};