import { GoogleGenAI } from "@google/genai";

const getClient = () => {
  // Checks for standard process.env (Node) or import.meta.env (Vite)
  const apiKey = process.env.GEMINI_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    console.error("GEMINI_API_KEY is missing. Create a .env.local file with VITE_GEMINI_API_KEY=...");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const generateAIResponse = async (prompt: string): Promise<string> => {
  const ai = getClient();
  if (!ai) return "Error: API Key not found. Please configure your API key.";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: "You are Pissbot, a helpful AI assistant. Keep responses concise and use markdown formatting when appropriate.",
      }
    });
    
    return response.text || "I couldn't generate a response.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Sorry, I encountered an error processing your request.";
  }
};