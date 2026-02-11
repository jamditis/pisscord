import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the logger
vi.mock('../logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// We can't fully test the audio processor in jsdom (no AudioContext, no WASM),
// but we can test the module structure and error handling.

describe('audioProcessor', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('exports createAudioProcessor function', async () => {
    const mod = await import('../audioProcessor');
    expect(mod.createAudioProcessor).toBeDefined();
    expect(typeof mod.createAudioProcessor).toBe('function');
  });

  it('throws if stream has no audio track', async () => {
    const mod = await import('../audioProcessor');

    // Create a mock MediaStream with no audio tracks
    const mockStream = {
      getAudioTracks: () => [],
      getVideoTracks: () => [],
    } as unknown as MediaStream;

    await expect(mod.createAudioProcessor(mockStream)).rejects.toThrow('No audio track in stream');
  });

  it('throws if AudioContext is not available', async () => {
    const mod = await import('../audioProcessor');

    const mockTrack = { kind: 'audio', enabled: true } as MediaStreamTrack;
    const mockStream = {
      getAudioTracks: () => [mockTrack],
      getVideoTracks: () => [],
    } as unknown as MediaStream;

    // In jsdom, AudioContext doesn't exist, so this should throw
    // about either AudioContext or WASM loading
    await expect(mod.createAudioProcessor(mockStream)).rejects.toThrow();
  });
});
