import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted to declare mocks that need to exist before vi.mock factories run
const { mockSet, mockPush, mockGet, mockOnValue, mockRemove, mockOnDisconnect, mockRef, mockQuery } = vi.hoisted(() => ({
  mockSet: vi.fn().mockResolvedValue(undefined),
  mockPush: vi.fn().mockReturnValue({ key: 'mock-key' }),
  mockGet: vi.fn(),
  mockOnValue: vi.fn().mockReturnValue(vi.fn()), // returns unsubscribe
  mockRemove: vi.fn().mockResolvedValue(undefined),
  mockOnDisconnect: vi.fn().mockReturnValue({ remove: vi.fn().mockResolvedValue(undefined) }),
  mockRef: vi.fn().mockReturnValue({}),
  mockQuery: vi.fn().mockReturnValue({}),
}));

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
}));

vi.mock('firebase/database', () => ({
  getDatabase: vi.fn(() => ({})),
  ref: mockRef,
  get: mockGet,
  set: mockSet,
  push: mockPush,
  remove: mockRemove,
  onValue: mockOnValue,
  onDisconnect: mockOnDisconnect,
  query: mockQuery,
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

import {
  sendMessage,
  subscribeToMessages,
  registerPresence,
  getPissbotConfig,
  checkForUpdates,
  subscribeToConnectionState,
  clearPissbotCache,
} from '../firebase';

describe('firebase service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearPissbotCache(); // reset the 5-minute cache between tests
  });

  describe('sendMessage', () => {
    it('pushes a message to the channel ref', async () => {
      const message = {
        id: 'msg-1',
        senderId: 'user-1',
        senderName: 'Test User',
        content: 'Hello world',
        timestamp: Date.now(),
      };

      await sendMessage('general', message as any);
      expect(mockPush).toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalled();
    });

    it('throws when set fails', async () => {
      mockSet.mockRejectedValueOnce(new Error('Write denied'));
      await expect(sendMessage('general', {} as any)).rejects.toThrow('Write denied');
    });
  });

  describe('subscribeToMessages', () => {
    it('sets up an onValue listener', () => {
      const callback = vi.fn();
      subscribeToMessages('general', callback);
      expect(mockOnValue).toHaveBeenCalled();
    });

    it('returns an unsubscribe function', () => {
      const unsub = subscribeToMessages('general', vi.fn());
      expect(typeof unsub).toBe('function');
    });
  });

  describe('registerPresence', () => {
    it('registers user presence and returns true on success', async () => {
      const result = await registerPresence('peer-123', {
        displayName: 'Test',
        statusMessage: '',
        avatarColor: '#ff0000',
      } as any);
      expect(mockSet).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('returns false when set fails', async () => {
      mockSet.mockRejectedValueOnce(new Error('Permission denied'));
      const result = await registerPresence('peer-123', {
        displayName: 'Test',
        statusMessage: '',
        avatarColor: '#ff0000',
      } as any);
      expect(result).toBe(false);
    });
  });

  describe('getPissbotConfig', () => {
    it('returns config from firebase', async () => {
      const mockConfig = {
        systemPrompt: 'You are Pissbot',
        context: 'Test',
        patchNotes: null,
        documentation: null,
        lastUpdated: Date.now(),
      };

      mockGet.mockResolvedValue({
        exists: () => true,
        val: () => mockConfig,
      });

      const config = await getPissbotConfig();
      expect(config).toEqual(mockConfig);
    });

    it('returns null when config does not exist', async () => {
      mockGet.mockResolvedValue({
        exists: () => false,
        val: () => null,
      });

      const config = await getPissbotConfig();
      expect(config).toBeNull();
    });

    it('returns cached config on subsequent calls', async () => {
      const mockConfig = { systemPrompt: 'cached', context: '', patchNotes: '', documentation: '', lastUpdated: 0 };
      mockGet.mockResolvedValue({ exists: () => true, val: () => mockConfig });

      await getPissbotConfig(); // first call fetches
      await getPissbotConfig(); // second call should use cache

      expect(mockGet).toHaveBeenCalledTimes(1); // only called once
    });
  });

  describe('checkForUpdates', () => {
    it('returns update info when newer version exists', async () => {
      mockGet.mockResolvedValue({
        exists: () => true,
        val: () => ({ latestVersion: '2.1.0', downloadUrl: 'https://example.com/dl' }),
      });

      const result = await checkForUpdates('2.0.0');
      expect(result).toEqual({
        hasUpdate: true,
        url: 'https://example.com/dl',
        latest: '2.1.0',
      });
    });

    it('returns null when version matches', async () => {
      mockGet.mockResolvedValue({
        exists: () => true,
        val: () => ({ latestVersion: '2.0.0', downloadUrl: 'https://example.com/dl' }),
      });

      const result = await checkForUpdates('2.0.0');
      expect(result).toBeNull();
    });

    it('returns null when fetch fails', async () => {
      mockGet.mockRejectedValue(new Error('Network error'));
      const result = await checkForUpdates('2.0.0');
      expect(result).toBeNull();
    });
  });

  describe('subscribeToConnectionState', () => {
    it('sets up a listener on .info/connected', () => {
      const callback = vi.fn();
      subscribeToConnectionState(callback);
      expect(mockRef).toHaveBeenCalled();
      expect(mockOnValue).toHaveBeenCalled();
    });

    it('returns an unsubscribe function', () => {
      const unsub = subscribeToConnectionState(vi.fn());
      expect(typeof unsub).toBe('function');
    });
  });
});
