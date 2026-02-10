import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import React from 'react';

// Track the auth state callback so we can fire it manually
let authStateCallback: ((user: any) => void) | null = null;

vi.mock('../../services/auth', () => ({
  subscribeToAuth: vi.fn((cb: (user: any) => void) => {
    authStateCallback = cb;
    return () => { authStateCallback = null; };
  }),
  completeEmailLinkSignIn: vi.fn().mockResolvedValue(null),
  handleGoogleRedirectResult: vi.fn().mockResolvedValue(null),
}));

vi.mock('../../services/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { AuthProvider, useAuth } from '../AuthContext';
import { handleGoogleRedirectResult } from '../../services/auth';

// Test component that displays auth state
const AuthDisplay = () => {
  const { user, loading, error } = useAuth();
  return (
    <div>
      <div data-testid="loading">{String(loading)}</div>
      <div data-testid="user">{user ? user.email : 'null'}</div>
      <div data-testid="error">{error || 'none'}</div>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authStateCallback = null;
  });

  it('starts in loading state', async () => {
    render(
      <AuthProvider>
        <AuthDisplay />
      </AuthProvider>
    );
    expect(screen.getByTestId('loading').textContent).toBe('true');
  });

  it('finishes loading when both redirect check and auth state resolve', async () => {
    render(
      <AuthProvider>
        <AuthDisplay />
      </AuthProvider>
    );

    // Simulate auth state change (the initial null from Firebase)
    await act(async () => {
      authStateCallback?.(null);
    });

    // Wait for redirect checks to finish (they're mocked to resolve immediately)
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    expect(screen.getByTestId('user').textContent).toBe('null');
  });

  it('shows user when auth state fires with a user', async () => {
    render(
      <AuthProvider>
        <AuthDisplay />
      </AuthProvider>
    );

    const mockUser = { email: 'test@example.com', uid: '123' };

    await act(async () => {
      authStateCallback?.(mockUser);
    });

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    expect(screen.getByTestId('user').textContent).toBe('test@example.com');
  });

  it('does not overwrite redirect user with initial null from auth listener', async () => {
    // This is the core race condition test.
    // Scenario: getRedirectResult returns a user, but onAuthStateChanged fires null first.
    const redirectUser = { email: 'redirect@example.com', uid: '456' };
    vi.mocked(handleGoogleRedirectResult).mockResolvedValue(redirectUser as any);

    render(
      <AuthProvider>
        <AuthDisplay />
      </AuthProvider>
    );

    // Auth listener fires null BEFORE redirect check completes
    // (in real life, onAuthStateChanged fires synchronously with null during init)
    await act(async () => {
      authStateCallback?.(null);
    });

    // Wait for redirect check to complete and resolve
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    // The redirect user should win over the initial null
    expect(screen.getByTestId('user').textContent).toBe('redirect@example.com');
  });

  it('shows error when redirect fails', async () => {
    vi.mocked(handleGoogleRedirectResult).mockRejectedValue(new Error('Redirect failed'));

    render(
      <AuthProvider>
        <AuthDisplay />
      </AuthProvider>
    );

    await act(async () => {
      authStateCallback?.(null);
    });

    await waitFor(() => {
      expect(screen.getByTestId('error').textContent).toBe('Redirect failed');
    });
  });

  it('useAuth throws when used outside provider', () => {
    // Suppress React error boundary output
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const BadComponent = () => {
      useAuth();
      return null;
    };

    expect(() => render(<BadComponent />)).toThrow('useAuth must be used within an AuthProvider');
  });
});
