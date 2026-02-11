import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock firebase/auth before importing auth service
vi.mock('firebase/auth', () => ({
  signInWithEmailLink: vi.fn(),
  sendSignInLinkToEmail: vi.fn().mockResolvedValue(undefined),
  isSignInWithEmailLink: vi.fn().mockReturnValue(false),
  signInWithPopup: vi.fn(),
  signInWithRedirect: vi.fn(),
  getRedirectResult: vi.fn().mockResolvedValue(null),
  GoogleAuthProvider: vi.fn(),
  signOut: vi.fn().mockResolvedValue(undefined),
  onAuthStateChanged: vi.fn(),
  getAuth: vi.fn(() => ({})),
}));

vi.mock('../firebase', () => ({
  auth: {},
}));

vi.mock('../platform', () => ({
  Platform: { isElectron: false },
}));

vi.mock('../logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { sendEmailLink, completeEmailLinkSignIn, signOut, handleGoogleRedirectResult, subscribeToAuth, getCurrentUser } from '../auth';
import { isSignInWithEmailLink, signInWithEmailLink, getRedirectResult } from 'firebase/auth';

describe('auth service', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('sendEmailLink', () => {
    it('stores email and expiry in localStorage', async () => {
      await sendEmailLink('test@example.com');
      expect(localStorage.getItem('emailForSignIn')).toBe('test@example.com');
      expect(localStorage.getItem('emailForSignIn_expiry')).toBeTruthy();
    });
  });

  describe('completeEmailLinkSignIn', () => {
    it('returns null when URL is not a sign-in link', async () => {
      vi.mocked(isSignInWithEmailLink).mockReturnValue(false);
      const result = await completeEmailLinkSignIn();
      expect(result).toBeNull();
    });

    it('uses stored email when available', async () => {
      vi.mocked(isSignInWithEmailLink).mockReturnValue(true);
      localStorage.setItem('emailForSignIn', 'stored@example.com');
      localStorage.setItem('emailForSignIn_expiry', String(Date.now() + 60000));

      const mockUser = { email: 'stored@example.com', uid: '123' };
      vi.mocked(signInWithEmailLink).mockResolvedValue({ user: mockUser } as any);

      const result = await completeEmailLinkSignIn();
      expect(result).toEqual(mockUser);
      // Should clean up localStorage
      expect(localStorage.getItem('emailForSignIn')).toBeNull();
      expect(localStorage.getItem('emailForSignIn_expiry')).toBeNull();
    });

    it('clears expired email from storage', async () => {
      vi.mocked(isSignInWithEmailLink).mockReturnValue(true);
      localStorage.setItem('emailForSignIn', 'expired@example.com');
      localStorage.setItem('emailForSignIn_expiry', String(Date.now() - 1000)); // expired

      // Mock window.prompt for fallback
      vi.stubGlobal('prompt', vi.fn().mockReturnValue(null));

      const result = await completeEmailLinkSignIn();
      expect(result).toBeNull();
      expect(localStorage.getItem('emailForSignIn')).toBeNull();

      vi.unstubAllGlobals();
    });

    it('cleans up localStorage even on failure', async () => {
      vi.mocked(isSignInWithEmailLink).mockReturnValue(true);
      localStorage.setItem('emailForSignIn', 'fail@example.com');
      localStorage.setItem('emailForSignIn_expiry', String(Date.now() + 60000));

      vi.mocked(signInWithEmailLink).mockRejectedValue({ code: 'auth/invalid-action-code', message: 'bad' });

      await expect(completeEmailLinkSignIn()).rejects.toThrow();
      expect(localStorage.getItem('emailForSignIn')).toBeNull();
    });
  });

  describe('handleGoogleRedirectResult', () => {
    it('returns null when no redirect result', async () => {
      vi.mocked(getRedirectResult).mockResolvedValue(null);
      const result = await handleGoogleRedirectResult();
      expect(result).toBeNull();
    });

    it('returns user on successful redirect', async () => {
      const mockUser = { email: 'google@example.com', uid: '456' };
      vi.mocked(getRedirectResult).mockResolvedValue({ user: mockUser } as any);

      const result = await handleGoogleRedirectResult();
      expect(result).toEqual(mockUser);
    });

    it('returns null and logs warning on redirect failure', async () => {
      vi.mocked(getRedirectResult).mockRejectedValue({
        code: 'auth/network-request-failed',
        message: 'network error',
      });

      const result = await handleGoogleRedirectResult();
      expect(result).toBeNull();
    });
  });

  describe('signOut', () => {
    it('resolves successfully', async () => {
      await expect(signOut()).resolves.toBeUndefined();
    });
  });
});
