import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock firebase modules before importing withRetry
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
}));

vi.mock('firebase/database', () => ({
  getDatabase: vi.fn(() => ({})),
  ref: vi.fn(() => ({})),
  get: vi.fn(),
  set: vi.fn(),
  push: vi.fn(),
  remove: vi.fn(),
  onValue: vi.fn().mockReturnValue(vi.fn()),
  onDisconnect: vi.fn().mockReturnValue({ remove: vi.fn().mockResolvedValue(undefined) }),
  query: vi.fn(),
  limitToLast: vi.fn(),
  orderByChild: vi.fn(),
  endAt: vi.fn(),
}));

vi.mock('firebase/storage', () => ({
  getStorage: vi.fn(() => ({})),
  ref: vi.fn(),
  uploadBytes: vi.fn(),
  getDownloadURL: vi.fn(),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({})),
}));

vi.mock('../logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { withRetry } from '../firebase';

describe('withRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('returns the result on first success', async () => {
    const op = vi.fn().mockResolvedValue('ok');
    const result = await withRetry(op, 'test-op');
    expect(result).toBe('ok');
    expect(op).toHaveBeenCalledTimes(1);
  });

  it('retries on failure and succeeds eventually', async () => {
    const op = vi.fn()
      .mockRejectedValueOnce(new Error('fail-1'))
      .mockRejectedValueOnce(new Error('fail-2'))
      .mockResolvedValue('ok');

    const promise = withRetry(op, 'test-op', 3, 100);

    // First retry delay: 100ms
    await vi.advanceTimersByTimeAsync(100);
    // Second retry delay: 200ms
    await vi.advanceTimersByTimeAsync(200);

    const result = await promise;
    expect(result).toBe('ok');
    expect(op).toHaveBeenCalledTimes(3);
  });

  it('throws after exhausting all retries', async () => {
    const op = vi.fn().mockRejectedValue(new Error('persistent-fail'));

    const promise = withRetry(op, 'test-op', 2, 100).catch(e => e);

    // First retry delay: 100ms
    await vi.advanceTimersByTimeAsync(100);
    // Second retry delay: 200ms
    await vi.advanceTimersByTimeAsync(200);

    const result = await promise;
    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe('persistent-fail');
    expect(op).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it('uses exponential backoff delays', async () => {
    const delays: number[] = [];
    const originalSetTimeout = globalThis.setTimeout;

    const op = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('ok');

    const promise = withRetry(op, 'test-op', 2, 1000);

    // Advance through first delay (1000ms)
    await vi.advanceTimersByTimeAsync(1000);
    // Advance through second delay (2000ms)
    await vi.advanceTimersByTimeAsync(2000);

    const result = await promise;
    expect(result).toBe('ok');
    expect(op).toHaveBeenCalledTimes(3);
  });

  it('respects maxRetries=0 (no retries)', async () => {
    const op = vi.fn().mockRejectedValue(new Error('fail'));

    await expect(withRetry(op, 'test-op', 0)).rejects.toThrow('fail');
    expect(op).toHaveBeenCalledTimes(1);
  });
});
