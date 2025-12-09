import { GoogleGenAI } from "@google/genai";
import { getPissbotConfig, PissbotConfig } from "./firebase";

const getClient = () => {
  // Safe environment variable access - try Vite first, then Node.js
  let apiKey: string | undefined;

  // Try Vite's import.meta.env first (browser)
  if (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GEMINI_API_KEY) {
    apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY;
  }
  // Fallback to process.env (Node.js/Electron)
  else if (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) {
    apiKey = process.env.GEMINI_API_KEY;
  }

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

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

// Transcribe audio from URL using Gemini
export const transcribeAudio = async (audioUrl: string): Promise<string> => {
  try {
    const client = getClient();
    if (!client) {
      return "⚠️ Transcription unavailable: API key not configured.";
    }

    // Fetch audio file and convert to base64
    const response = await fetch(audioUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch audio: ${response.status}`);
    }

    const blob = await response.blob();
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        // Extract base64 part after the data URL prefix
        const base64Data = dataUrl.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    // Determine MIME type
    const mimeType = blob.type || 'audio/wav';

    // Timeout Promise
    const timeout = new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error("Transcription timed out after 30s")), 30000)
    );

    const transcribePromise = async () => {
      const result = await client.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: base64
                }
              },
              {
                text: "Transcribe this audio message exactly as spoken. Only output the transcription text, nothing else. If the audio is unclear or silent, respond with '[Audio unclear or silent]'."
              }
            ]
          }
        ],
        config: {
          maxOutputTokens: 1024,
          temperature: 0.1, // Low temperature for accurate transcription
        },
      });
      return result.text || "[No transcription generated]";
    };

    return await Promise.race([transcribePromise(), timeout]);
  } catch (error: any) {
    console.error("Error transcribing audio:", error);
    return `⚠️ Transcription failed: ${error.message || "Unknown error"}`;
  }
};

export const generateAIResponse = async (
  prompt: string,
  conversationHistory: ChatMessage[] = []
): Promise<string> => {
  if (!prompt || !prompt.trim()) {
    return "Please provide a prompt.";
  }

  try {
    const client = getClient();
    if (!client) {
      return "⚠️ Pissbot is offline: API key not configured.";
    }

    // Get config from Firebase
    const config = await getPissbotConfig();
    const systemInstruction = buildSystemInstruction(config);

    // Build contents array with conversation history
    const contents = [
      // Include last 10 messages of history for context
      ...conversationHistory.slice(-10).map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content }]
      })),
      // Current user message
      {
        role: 'user' as const,
        parts: [{ text: prompt }]
      }
    ];

    // Timeout Promise
    const timeout = new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error("Request timed out after 15s")), 15000)
    );

    const fetchPromise = async () => {
      const response = await client.models.generateContent({
        model: "gemini-2.0-flash",
        contents,
        config: {
          systemInstruction,
          maxOutputTokens: 1024,
          temperature: 0.8,
        },
      });
      return response.text || "No response generated.";
    };

    // Race fetch vs timeout
    return await Promise.race([fetchPromise(), timeout]);
  } catch (error: any) {
    console.error("Error generating AI response:", error);
    return `⚠️ Pissbot Error: ${error.message || "Connection failed"}`;
  }
};