import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Use vi.hoisted so these exist before vi.mock factories are evaluated
const { mockGenerateContent, mockGetPissbotConfig, mockGetGeminiApiKey } = vi.hoisted(() => ({
  mockGenerateContent: vi.fn(),
  mockGetPissbotConfig: vi.fn().mockResolvedValue({
    systemPrompt: 'You are Pissbot',
    context: 'Test context',
    patchNotes: null,
    documentation: null,
    lastUpdated: Date.now(),
  }),
  mockGetGeminiApiKey: vi.fn().mockResolvedValue(null),
}));

vi.mock('../firebase', () => ({
  getPissbotConfig: mockGetPissbotConfig,
  getGeminiApiKey: mockGetGeminiApiKey,
  auth: {},
}));

vi.mock('../logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('@google/genai', () => ({
  GoogleGenAI: class MockGoogleGenAI {
    models = { generateContent: mockGenerateContent };
  },
}));

import { generateAIResponse, transcribeAudio } from '../geminiService';

describe('geminiService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset default mock behaviors after clearAllMocks wipes them
    mockGetPissbotConfig.mockResolvedValue({
      systemPrompt: 'You are Pissbot',
      context: 'Test context',
      patchNotes: null,
      documentation: null,
      lastUpdated: Date.now(),
    });
    mockGetGeminiApiKey.mockResolvedValue(null);
    // Ensure env var is set so getClient() finds a key by default
    (import.meta as any).env = { VITE_GEMINI_API_KEY: 'test-key' };
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('generateAIResponse', () => {
    it('returns response text on success', async () => {
      mockGenerateContent.mockResolvedValue({ text: 'Hello from Pissbot!' });
      const result = await generateAIResponse('Hi there');
      expect(result).toBe('Hello from Pissbot!');
    });

    it('returns prompt message for empty input', async () => {
      const result = await generateAIResponse('');
      expect(result).toBe('Please provide a prompt.');
    });

    it('returns prompt message for whitespace-only input', async () => {
      const result = await generateAIResponse('   ');
      expect(result).toBe('Please provide a prompt.');
    });

    it('returns error message when API call fails', async () => {
      mockGenerateContent.mockRejectedValue(new Error('API error'));
      const result = await generateAIResponse('Hello');
      expect(result).toContain('⚠️');
      expect(result).toContain('API error');
    });

    // Note: The "no API key" path can't be tested because Vitest statically
    // replaces import.meta.env.VITE_GEMINI_API_KEY at transform time from .env.local.
    // Runtime mutation of import.meta.env has no effect on the already-transformed code.

    it('includes conversation history in request', async () => {
      mockGenerateContent.mockResolvedValue({ text: 'response' });

      const history = [
        { role: 'user' as const, content: 'first message' },
        { role: 'model' as const, content: 'first response' },
      ];

      await generateAIResponse('second message', history);

      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
      const callArgs = mockGenerateContent.mock.calls[0][0];
      expect(callArgs.contents.length).toBe(3);
    });

    it('limits conversation history to 10 messages', async () => {
      mockGenerateContent.mockResolvedValue({ text: 'response' });

      const history = Array.from({ length: 20 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' as const : 'model' as const,
        content: `message ${i}`,
      }));

      await generateAIResponse('latest', history);

      const callArgs = mockGenerateContent.mock.calls[0][0];
      expect(callArgs.contents.length).toBe(11);
    });

    it('falls back to fallback prompt when config is null', async () => {
      mockGetPissbotConfig.mockResolvedValueOnce(null);
      mockGenerateContent.mockResolvedValue({ text: 'fallback response' });

      const result = await generateAIResponse('Hello');
      expect(result).toBe('fallback response');
      expect(mockGenerateContent).toHaveBeenCalled();
    });
  });

  describe('transcribeAudio', () => {
    // Note: Same as above — can't test the "no API key" path at runtime
    // because Vitest/Vite statically injects env vars from .env.local.

    it('returns error when fetch returns non-ok', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      }));

      const result = await transcribeAudio('https://example.com/missing.wav');
      expect(result).toContain('⚠️');
      expect(result).toContain('404');
    });

    it('returns error when fetch rejects', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

      const result = await transcribeAudio('https://example.com/audio.wav');
      expect(result).toContain('⚠️');
      expect(result).toContain('Network error');
    });
  });
});
