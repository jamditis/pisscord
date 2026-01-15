/**
 * @fileoverview Gemini AI Service for Pisscord
 *
 * This module provides AI-powered features for Pisscord using Google's Gemini API:
 * - **Pissbot Chat**: AI assistant that responds to messages in the #pissbot channel
 * - **Audio Transcription**: Converts voice messages and audio files to text
 *
 * ## Architecture
 *
 * The service uses the Google GenAI SDK with the `gemini-2.0-flash` model for both
 * chat and transcription tasks. Configuration is fetched dynamically from Firebase,
 * allowing Pissbot's personality and knowledge to be updated without code changes.
 *
 * ## Configuration
 *
 * Requires a Gemini API key set via environment variable:
 * - **Vite/Browser**: `VITE_GEMINI_API_KEY` in `.env.local`
 * - **Node.js/Electron**: `GEMINI_API_KEY` in environment
 *
 * ## Timeout Behavior
 *
 * All API calls use `Promise.race()` with timeout promises to prevent hanging:
 * - Chat responses: 15 second timeout
 * - Audio transcription: 30 second timeout
 *
 * If a timeout occurs, a user-friendly error message is returned instead of throwing.
 *
 * ## Error Handling
 *
 * Errors are caught and transformed into user-friendly messages prefixed with ⚠️.
 * This ensures the chat UI always receives a displayable string response.
 *
 * @module services/geminiService
 * @see {@link https://ai.google.dev/docs} Google AI Documentation
 */

import { GoogleGenAI } from "@google/genai";
import { getPissbotConfig, PissbotConfig } from "./firebase";

/**
 * Creates and returns a Google GenAI client instance.
 *
 * This function attempts to load the API key from multiple sources to support
 * different runtime environments:
 *
 * 1. **Vite (Browser)**: Checks `import.meta.env.VITE_GEMINI_API_KEY`
 * 2. **Node.js/Electron**: Falls back to `process.env.GEMINI_API_KEY`
 *
 * @returns {GoogleGenAI | null} A configured GenAI client, or null if no API key is found
 *
 * @example
 * ```typescript
 * const client = getClient();
 * if (!client) {
 *   console.error("API key not configured");
 *   return;
 * }
 * // Use client for API calls...
 * ```
 *
 * @internal This is a private helper function, not exported
 */
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

/**
 * Fallback system prompt used when Firebase configuration is unavailable.
 *
 * This minimal prompt ensures Pissbot can still respond with basic functionality
 * even if the Firebase connection fails or the `/pissbot` config path is missing.
 *
 * @constant {string}
 * @internal
 */
const FALLBACK_SYSTEM_PROMPT = `You are Pissbot, the AI assistant for Pisscord - a P2P Discord clone. Keep responses concise and use markdown formatting when appropriate.`;

/**
 * Constructs the system instruction for Gemini from Firebase configuration.
 *
 * The system instruction defines Pissbot's personality, knowledge, and behavior.
 * It assembles multiple sections from the Firebase config into a single prompt:
 *
 * 1. **systemPrompt**: Core personality and role definition
 * 2. **context**: Current app information (version, features, known issues)
 * 3. **patchNotes**: Recent version changes and updates
 * 4. **documentation**: User guides and troubleshooting info
 *
 * Each section is only included if it exists in the config, allowing partial
 * updates without breaking the prompt.
 *
 * @param {PissbotConfig | null} config - Configuration fetched from Firebase `/pissbot` path
 * @returns {string} Complete system instruction for Gemini, or fallback if config is null
 *
 * @example
 * ```typescript
 * const config = await getPissbotConfig();
 * const instruction = buildSystemInstruction(config);
 * // Result: "You are Pissbot...\n\n## Current Context\n...\n\n## Latest Patch Notes\n..."
 * ```
 *
 * @see {@link getPissbotConfig} Firebase function that fetches the config
 * @internal This is a private helper function, not exported
 */
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

/**
 * Represents a single message in a Pissbot conversation.
 *
 * This interface is used to pass conversation history to the AI, enabling
 * contextual responses. The Gemini API requires messages to be labeled with
 * their source role.
 *
 * @interface ChatMessage
 * @property {('user' | 'model')} role - Who sent the message:
 *   - `'user'`: Message sent by the human user
 *   - `'model'`: Response generated by Pissbot/Gemini
 * @property {string} content - The text content of the message
 *
 * @example
 * ```typescript
 * const history: ChatMessage[] = [
 *   { role: 'user', content: 'What is Pisscord?' },
 *   { role: 'model', content: 'Pisscord is a P2P Discord clone...' },
 *   { role: 'user', content: 'How do I start a voice call?' }
 * ];
 *
 * const response = await generateAIResponse('Tell me more', history);
 * ```
 */
export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

/**
 * Transcribes audio content from a URL using Gemini's multimodal capabilities.
 *
 * This function fetches audio from the provided URL (typically Firebase Storage),
 * converts it to base64 for the Gemini API, and returns a formatted transcript.
 *
 * ## Processing Pipeline
 *
 * 1. **Fetch**: Downloads audio file from URL via `fetch()`
 * 2. **Convert**: Uses FileReader to convert Blob → Base64 string
 * 3. **Detect MIME**: Extracts MIME type from blob, defaults to `audio/wav`
 * 4. **Transcribe**: Sends to Gemini with transcription prompt
 * 5. **Return**: Returns formatted transcript or error message
 *
 * ## Timeout Handling
 *
 * Uses `Promise.race()` with a 30-second timeout. Audio transcription takes
 * longer than text generation due to audio processing overhead. If the timeout
 * is reached, returns a user-friendly error message instead of throwing.
 *
 * ## Model Configuration
 *
 * - **Model**: `gemini-2.0-flash` (optimized for speed)
 * - **Temperature**: `0.1` (low for accuracy, minimal creativity)
 * - **Max Tokens**: `1024` (sufficient for most voice messages)
 *
 * ## Supported Formats
 *
 * Gemini supports: WAV, MP3, AAC, OGG, FLAC, WEBM
 * The function auto-detects MIME type from the blob.
 *
 * @param {string} audioUrl - Fully-qualified URL to the audio file (typically Firebase Storage URL)
 * @returns {Promise<string>} The transcript text, or an error message prefixed with ⚠️
 *
 * @example
 * ```typescript
 * // Transcribe a voice message from Firebase Storage
 * const transcript = await transcribeAudio(
 *   'https://firebasestorage.googleapis.com/v0/b/pisscord/o/audio%2Fmessage.wav'
 * );
 *
 * if (transcript.startsWith('⚠️')) {
 *   console.error('Transcription failed:', transcript);
 * } else {
 *   console.log('Transcript:', transcript);
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Handle multi-speaker audio
 * const transcript = await transcribeAudio(audioUrl);
 * // Possible output:
 * // "Speaker 1: Hey, are you there?
 * //  Speaker 2: Yeah, I can hear you."
 * ```
 *
 * @see {@link https://ai.google.dev/gemini-api/docs/audio} Gemini Audio Documentation
 */
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
                text: "Transcribe this audio message. Format the transcript nicely with proper punctuation and capitalization. If multiple speakers are detected, label them as 'Speaker 1:', 'Speaker 2:', etc. on separate lines. Keep the transcription accurate to what was spoken. If the audio is unclear or silent, respond with '[Audio unclear or silent]'."
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

/**
 * Generates an AI response for the Pissbot chat channel.
 *
 * This is the main function for Pissbot AI interactions. It sends the user's
 * message to Gemini along with conversation history for contextual responses.
 *
 * ## How It Works
 *
 * 1. **Validate**: Checks that prompt is non-empty
 * 2. **Get Client**: Creates Gemini client with API key
 * 3. **Fetch Config**: Loads Pissbot personality from Firebase (cached 5 min)
 * 4. **Build Context**: Combines system instruction + last 10 messages + current prompt
 * 5. **Generate**: Sends to Gemini with timeout protection
 * 6. **Return**: Returns response text or error message
 *
 * ## Conversation Memory
 *
 * The function accepts conversation history to enable contextual follow-ups.
 * Only the last 10 messages are included to stay within token limits while
 * maintaining enough context for coherent conversations.
 *
 * Example flow:
 * ```
 * User: "What is Pisscord?"
 * Bot: "Pisscord is a P2P Discord clone..."
 * User: "Tell me more about voice calls"  <- History allows this follow-up
 * ```
 *
 * ## Firebase Configuration
 *
 * Pissbot's personality and knowledge are fetched from Firebase `/pissbot` path.
 * This allows updating the AI's behavior without code changes. Configuration
 * is cached for 5 minutes to reduce Firebase reads.
 *
 * ## Timeout Handling
 *
 * Uses `Promise.race()` with a 15-second timeout. If Gemini doesn't respond
 * in time, returns a user-friendly error message instead of hanging.
 *
 * ## Model Configuration
 *
 * - **Model**: `gemini-2.0-flash` (fast responses for chat)
 * - **Temperature**: `0.8` (balanced creativity and accuracy)
 * - **Max Tokens**: `1024` (sufficient for detailed responses)
 *
 * @param {string} prompt - The user's message to respond to
 * @param {ChatMessage[]} [conversationHistory=[]] - Previous messages for context (last 10 used)
 * @returns {Promise<string>} The AI response, or an error message prefixed with ⚠️
 *
 * @example
 * ```typescript
 * // Simple one-off question
 * const response = await generateAIResponse("What features does Pisscord have?");
 * console.log(response);
 * // "Pisscord includes voice/video calls, screen sharing, AI chat..."
 * ```
 *
 * @example
 * ```typescript
 * // Conversation with history
 * const history: ChatMessage[] = [
 *   { role: 'user', content: 'What is Pisscord?' },
 *   { role: 'model', content: 'Pisscord is a P2P Discord clone for families...' }
 * ];
 *
 * const response = await generateAIResponse("How do I start a voice call?", history);
 * // Response will be contextually aware of previous messages
 * ```
 *
 * @example
 * ```typescript
 * // Error handling
 * const response = await generateAIResponse("Hello");
 * if (response.startsWith('⚠️')) {
 *   // Show error toast or fallback message
 *   showToast({ message: response, type: 'error' });
 * } else {
 *   // Display Pissbot's response
 *   addMessage({ content: response, sender: 'Pissbot' });
 * }
 * ```
 *
 * @see {@link ChatMessage} Interface for conversation history entries
 * @see {@link getPissbotConfig} Firebase function that provides AI configuration
 * @see {@link buildSystemInstruction} Constructs the system prompt from config
 */
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