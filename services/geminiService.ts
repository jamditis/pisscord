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
        systemInstruction: `You are Pissbot, the AI assistant for Pisscord - a P2P Discord clone. Keep responses concise and use markdown formatting when appropriate.

About Pisscord:
- P2P voice/video calling using PeerJS
- Real-time text messaging over P2P data channels
- Screen sharing with Electron's desktopCapturer
- Auto-updates via GitHub Releases
- Single instance lock to prevent duplicates
- Customizable user profiles with persistent settings

Latest Release (v1.0.6):
- Fixed screen sharing with new source picker modal
- Fixed Copy ID button with clipboard IPC
- Fixed text cursor visibility in input fields
- Improved audio playback reliability

Known Limitations:
- Single 1-on-1 connections only (no group calls yet)
- No message history persistence
- Device changes require reconnect
- Volume settings don't persist across restarts`,
      }
    });
    
    return response.text || "I couldn't generate a response.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Sorry, I encountered an error processing your request.";
  }
};