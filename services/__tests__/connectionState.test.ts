import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockOnValue, mockRef } = vi.hoisted(() => ({
  mockOnValue: vi.fn().mockReturnValue(vi.fn()),
  mockRef: vi.fn().mockReturnValue({}),
}));

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
}));

vi.mock('firebase/database', () => ({
  getDatabase: vi.fn(() => ({})),
  ref: mockRef,
  get: vi.fn(),
  set: vi.fn(),
  push: vi.fn(),
  remove: vi.fn(),
  onValue: mockOnValue,
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

import { subscribeToConnectionState } from '../firebase';

describe('subscribeToConnectionState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('subscribes to .info/connected', () => {
    const callback = vi.fn();
    subscribeToConnectionState(callback);
    expect(mockRef).toHaveBeenCalled();
    expect(mockOnValue).toHaveBeenCalled();
  });

  it('returns an unsubscribe function', () => {
    const unsub = subscribeToConnectionState(vi.fn());
    expect(typeof unsub).toBe('function');
  });

  it('calls callback with true when snapshot value is true', () => {
    let capturedCallback: any;
    mockOnValue.mockImplementation((ref: any, cb: any) => {
      capturedCallback = cb;
      return vi.fn();
    });

    const callback = vi.fn();
    subscribeToConnectionState(callback);

    // Simulate Firebase sending connected=true
    capturedCallback({ val: () => true });
    expect(callback).toHaveBeenCalledWith(true);
  });

  it('calls callback with false when snapshot value is false', () => {
    let capturedCallback: any;
    mockOnValue.mockImplementation((ref: any, cb: any) => {
      capturedCallback = cb;
      return vi.fn();
    });

    const callback = vi.fn();
    subscribeToConnectionState(callback);

    capturedCallback({ val: () => false });
    expect(callback).toHaveBeenCalledWith(false);
  });

  it('calls callback with false when snapshot value is null', () => {
    let capturedCallback: any;
    mockOnValue.mockImplementation((ref: any, cb: any) => {
      capturedCallback = cb;
      return vi.fn();
    });

    const callback = vi.fn();
    subscribeToConnectionState(callback);

    capturedCallback({ val: () => null });
    expect(callback).toHaveBeenCalledWith(false);
  });
});
