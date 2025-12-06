import { GoogleGenAI } from "@google/genai";

const getClient = () => {
  // Checks for standard process.env (Node) or import.meta.env (Vite)
  // Note: For the generated EXE, you might need to add a .env file locally before building
  const apiKey = process.env.API_KEY || (import.meta as any).env?.VITE_API_KEY;
  
  if (!apiKey) {
    console.error("API_KEY is missing. If building locally, create a .env file with VITE_API_KEY=...");
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
        systemInstruction: "You are a helpful, witty, and concise AI assistant living inside a Discord-like chat application. Use markdown for formatting. Keep responses relatively short unless asked for detail.",
      }
    });
    
    return response.text || "I couldn't generate a response.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Sorry, I encountered an error processing your request.";
  }
};