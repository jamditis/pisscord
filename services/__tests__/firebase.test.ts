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
  removePresence,
  updatePresence,
  checkForMOTD,
  getResizedImageUrl,
  cleanupOldMessages,
  saveTranscript,
  getTranscript,
  subscribeToUsers,
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

    it('throws when set fails after retries', async () => {
      // sendMessage uses withRetry (2 retries + initial = 3 attempts)
      mockSet.mockRejectedValue(new Error('Write denied'));
      vi.useFakeTimers();
      const promise = sendMessage('general', {} as any).catch(e => e);
      // Advance through retry delays (500ms, then 1000ms)
      await vi.advanceTimersByTimeAsync(500);
      await vi.advanceTimersByTimeAsync(1000);
      const result = await promise;
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('Write denied');
      vi.useRealTimers();
      mockSet.mockResolvedValue(undefined); // reset for other tests
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

    it('returns false when set fails after retries', async () => {
      // registerPresence uses withRetry (3 retries + initial = 4 attempts)
      mockSet.mockRejectedValue(new Error('Permission denied'));
      vi.useFakeTimers();
      const promise = registerPresence('peer-123', {
        displayName: 'Test',
        statusMessage: '',
        avatarColor: '#ff0000',
      } as any);
      // Advance through retry delays (1s, 2s, 4s)
      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(2000);
      await vi.advanceTimersByTimeAsync(4000);
      const result = await promise;
      expect(result).toBe(false);
      vi.useRealTimers();
      mockSet.mockResolvedValue(undefined); // reset
    });

    it('calls onDisconnect BEFORE set (ghost user prevention)', async () => {
      const callOrder: string[] = [];
      mockOnDisconnect.mockReturnValue({
        remove: vi.fn().mockImplementation(() => {
          callOrder.push('onDisconnect');
          return Promise.resolve();
        }),
        cancel: vi.fn().mockResolvedValue(undefined),
      });
      mockSet.mockImplementation(() => {
        callOrder.push('set');
        return Promise.resolve();
      });

      await registerPresence('peer-456', {
        displayName: 'Ghost Test',
        statusMessage: '',
        color: '#ff0000',
      } as any);

      expect(callOrder[0]).toBe('onDisconnect');
      expect(callOrder[1]).toBe('set');
    });

    it('cancels onDisconnect if set fails', async () => {
      const mockCancel = vi.fn().mockResolvedValue(undefined);
      mockOnDisconnect.mockReturnValue({
        remove: vi.fn().mockResolvedValue(undefined),
        cancel: mockCancel,
      });
      // Make set fail on all attempts (withRetry will retry)
      mockSet.mockRejectedValue(new Error('Write denied'));
      vi.useFakeTimers();

      const promise = registerPresence('peer-789', {
        displayName: 'Cancel Test',
        statusMessage: '',
        color: '#ff0000',
      } as any);

      // Advance through all retry delays
      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(2000);
      await vi.advanceTimersByTimeAsync(4000);

      const result = await promise;
      expect(result).toBe(false);
      // onDisconnect.cancel should have been called to clean up
      expect(mockCancel).toHaveBeenCalled();
      vi.useRealTimers();
      mockSet.mockResolvedValue(undefined); // reset
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

  describe('removePresence', () => {
    it('removes the user ref from Firebase', async () => {
      await removePresence('peer-123');
      expect(mockRef).toHaveBeenCalled();
      expect(mockRemove).toHaveBeenCalled();
    });

    it('does not throw when remove fails', async () => {
      mockRemove.mockRejectedValueOnce(new Error('Permission denied'));
      await expect(removePresence('peer-123')).resolves.toBeUndefined();
    });
  });

  describe('updatePresence', () => {
    it('updates user presence with voice channel', async () => {
      await updatePresence('peer-123', {
        displayName: 'Test',
        statusMessage: 'Online',
        color: '#ff0000',
      } as any, 'voice-1');
      expect(mockSet).toHaveBeenCalled();
      // Verify the data includes voiceChannelId
      const setCall = mockSet.mock.calls[0][1];
      expect(setCall.voiceChannelId).toBe('voice-1');
      expect(setCall.displayName).toBe('Test');
    });

    it('sets voiceChannelId to null by default', async () => {
      await updatePresence('peer-123', {
        displayName: 'Test',
        statusMessage: '',
        color: '#ff0000',
      } as any);
      const setCall = mockSet.mock.calls[0][1];
      expect(setCall.voiceChannelId).toBeNull();
    });

    it('calls onDisconnect before set', async () => {
      const callOrder: string[] = [];
      mockOnDisconnect.mockReturnValue({
        remove: vi.fn().mockImplementation(() => {
          callOrder.push('onDisconnect');
          return Promise.resolve();
        }),
      });
      mockSet.mockImplementation(() => {
        callOrder.push('set');
        return Promise.resolve();
      });

      await updatePresence('peer-123', {
        displayName: 'Test',
        statusMessage: '',
        color: '#ff0000',
      } as any);

      expect(callOrder[0]).toBe('onDisconnect');
      expect(callOrder[1]).toBe('set');
    });

    it('does not throw when set fails', async () => {
      mockSet.mockRejectedValueOnce(new Error('Write denied'));
      await expect(updatePresence('peer-123', {
        displayName: 'Test',
        statusMessage: '',
        color: '#ff0000',
      } as any)).resolves.toBeUndefined();
    });
  });

  describe('checkForMOTD', () => {
    it('returns MOTD string when it exists', async () => {
      mockGet.mockResolvedValueOnce({
        exists: () => true,
        val: () => 'Welcome to Pisscord!',
      });
      const motd = await checkForMOTD();
      expect(motd).toBe('Welcome to Pisscord!');
    });

    it('returns null when MOTD does not exist', async () => {
      mockGet.mockResolvedValueOnce({
        exists: () => false,
        val: () => null,
      });
      const motd = await checkForMOTD();
      expect(motd).toBeNull();
    });

    it('returns null on error', async () => {
      mockGet.mockRejectedValueOnce(new Error('Network error'));
      const motd = await checkForMOTD();
      expect(motd).toBeNull();
    });
  });

  describe('getResizedImageUrl', () => {
    it('inserts size suffix before file extension', () => {
      const original = 'https://firebasestorage.googleapis.com/v0/b/bucket/o/uploads%2Fimage.jpg?alt=media&token=abc';
      const resized = getResizedImageUrl(original, '200x200');
      expect(resized).toContain('_200x200');
      expect(resized).toContain('.jpg');
    });

    it('supports 400x400 size', () => {
      const original = 'https://firebasestorage.googleapis.com/v0/b/bucket/o/uploads%2Fphoto.png?alt=media';
      const resized = getResizedImageUrl(original, '400x400');
      expect(resized).toContain('_400x400');
    });

    it('returns original URL for non-Firebase URLs', () => {
      const original = 'https://example.com/image.jpg';
      const result = getResizedImageUrl(original);
      expect(result).toBe(original);
    });

    it('returns original URL for URLs without extension', () => {
      const original = 'https://firebasestorage.googleapis.com/v0/b/bucket/o/uploads%2Fnoext?alt=media';
      const result = getResizedImageUrl(original);
      expect(result).toBe(original);
    });

    it('defaults to 200x200 when size not specified', () => {
      const original = 'https://firebasestorage.googleapis.com/v0/b/bucket/o/uploads%2Fimage.jpg?alt=media';
      const resized = getResizedImageUrl(original);
      expect(resized).toContain('_200x200');
    });

    it('returns original URL for invalid URLs', () => {
      const result = getResizedImageUrl('not-a-url');
      expect(result).toBe('not-a-url');
    });
  });

  describe('cleanupOldMessages', () => {
    it('removes messages older than 14 days', async () => {
      const mockChildRef = { ref: {} };
      const mockSnapshot = {
        exists: () => true,
        size: 2,
        forEach: (cb: (child: any) => void) => {
          cb({ key: 'msg-old-1', ref: mockChildRef.ref });
          cb({ key: 'msg-old-2', ref: mockChildRef.ref });
        },
      };
      mockGet.mockResolvedValueOnce(mockSnapshot);

      await cleanupOldMessages(['general']);
      expect(mockRemove).toHaveBeenCalledTimes(2);
    });

    it('does nothing when no old messages exist', async () => {
      mockGet.mockResolvedValueOnce({
        exists: () => false,
      });

      await cleanupOldMessages(['general']);
      expect(mockRemove).not.toHaveBeenCalled();
    });

    it('processes multiple channels', async () => {
      mockGet.mockResolvedValue({ exists: () => false });

      await cleanupOldMessages(['general', 'pissbot', 'dev-updates']);
      expect(mockGet).toHaveBeenCalledTimes(3);
    });

    it('continues processing other channels if one fails', async () => {
      mockGet
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce({ exists: () => false });

      await cleanupOldMessages(['failing-channel', 'good-channel']);
      expect(mockGet).toHaveBeenCalledTimes(2);
    });
  });

  describe('saveTranscript', () => {
    it('saves transcript to Firebase', async () => {
      await saveTranscript('https://example.com/audio.mp3', 'Hello world');
      expect(mockSet).toHaveBeenCalled();
      const savedData = mockSet.mock.calls[0][1];
      expect(savedData.transcript).toBe('Hello world');
      expect(savedData.audioUrl).toBe('https://example.com/audio.mp3');
      expect(savedData.createdAt).toBeTypeOf('number');
    });

    it('does not throw when save fails', async () => {
      mockSet.mockRejectedValueOnce(new Error('Write denied'));
      await expect(saveTranscript('url', 'text')).resolves.toBeUndefined();
    });
  });

  describe('getTranscript', () => {
    it('returns cached transcript when it exists', async () => {
      mockGet.mockResolvedValueOnce({
        exists: () => true,
        val: () => ({ transcript: 'Cached transcript', audioUrl: 'url', createdAt: 123 }),
      });

      const result = await getTranscript('https://example.com/audio.mp3');
      expect(result).toBe('Cached transcript');
    });

    it('returns null when transcript not found', async () => {
      mockGet.mockResolvedValueOnce({
        exists: () => false,
        val: () => null,
      });

      const result = await getTranscript('https://example.com/missing.mp3');
      expect(result).toBeNull();
    });

    it('returns null on error', async () => {
      mockGet.mockRejectedValueOnce(new Error('Network error'));
      const result = await getTranscript('url');
      expect(result).toBeNull();
    });
  });

  describe('subscribeToUsers', () => {
    it('sets up an onValue listener on users ref', () => {
      subscribeToUsers(vi.fn());
      expect(mockOnValue).toHaveBeenCalled();
    });

    it('filters out invalid presence entries', () => {
      let capturedCallback: any;
      mockOnValue.mockImplementation((ref: any, onSuccess: any) => {
        capturedCallback = onSuccess;
        return vi.fn();
      });

      const onUpdate = vi.fn();
      subscribeToUsers(onUpdate);

      // Simulate snapshot with mix of valid and invalid entries
      capturedCallback({
        val: () => ({
          'peer-1': { peerId: 'peer-1', displayName: 'User 1', lastSeen: 1000, color: '#fff', statusMessage: '' },
          'peer-2': { peerId: 'peer-2' }, // invalid — missing displayName and lastSeen
          'peer-3': null, // invalid
        }),
      });

      const users = onUpdate.mock.calls[0][0];
      expect(users).toHaveLength(1);
      expect(users[0].peerId).toBe('peer-1');
    });

    it('calls callback with empty array when no users', () => {
      let capturedCallback: any;
      mockOnValue.mockImplementation((ref: any, onSuccess: any) => {
        capturedCallback = onSuccess;
        return vi.fn();
      });

      const onUpdate = vi.fn();
      subscribeToUsers(onUpdate);

      capturedCallback({ val: () => null });
      expect(onUpdate).toHaveBeenCalledWith([]);
    });

    it('calls error callback on subscription error', () => {
      mockOnValue.mockImplementation((ref: any, onSuccess: any, onError: any) => {
        onError(new Error('Subscription failed'));
        return vi.fn();
      });

      const onUpdate = vi.fn();
      const onError = vi.fn();
      subscribeToUsers(onUpdate, onError);

      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
