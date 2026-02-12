import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Mock the auth context
const mockUseAuth = vi.fn();
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock LoginScreen to avoid rendering full login UI
vi.mock('../LoginScreen', () => ({
  LoginScreen: ({ error }: { error?: string | null }) => (
    <div data-testid="login-screen">{error && <span>{error}</span>}</div>
  ),
}));

// IMPORTANT: AuthGate has `const DEV_BYPASS_AUTH = import.meta.env.DEV && window.location.hostname === 'localhost'`
// This is evaluated at module load time. In vitest, DEV=true and hostname=localhost, so DEV_BYPASS_AUTH=true.
// We need to set hostname to something else BEFORE the module is imported.
// Since vi.mock runs before imports, we set location.hostname here.
beforeAll(() => {
  Object.defineProperty(window, 'location', {
    value: { ...window.location, hostname: 'pisscord.app' },
    writable: true,
  });
});

// Force re-import with new hostname by resetting modules
let AuthGate: typeof import('../AuthGate').AuthGate;

beforeEach(async () => {
  mockUseAuth.mockReset();
  vi.resetModules();
  // Re-import to pick up the mocked hostname
  const mod = await import('../AuthGate');
  AuthGate = mod.AuthGate;
});

describe('AuthGate', () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
  });

  it('shows loading spinner when auth is loading', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true, error: null });

    render(
      <AuthGate>
        <div data-testid="app-content">App</div>
      </AuthGate>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByTestId('app-content')).not.toBeInTheDocument();
  });

  it('shows LoginScreen when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false, error: null });

    render(
      <AuthGate>
        <div data-testid="app-content">App</div>
      </AuthGate>
    );

    expect(screen.getByTestId('login-screen')).toBeInTheDocument();
    expect(screen.queryByTestId('app-content')).not.toBeInTheDocument();
  });

  it('passes error to LoginScreen', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false, error: 'Auth failed' });

    render(
      <AuthGate>
        <div data-testid="app-content">App</div>
      </AuthGate>
    );

    expect(screen.getByText('Auth failed')).toBeInTheDocument();
  });

  it('renders children when user is authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: { uid: 'user-1', email: 'test@test.com' },
      loading: false,
      error: null,
    });

    render(
      <AuthGate>
        <div data-testid="app-content">App</div>
      </AuthGate>
    );

    expect(screen.getByTestId('app-content')).toBeInTheDocument();
    expect(screen.queryByTestId('login-screen')).not.toBeInTheDocument();
  });

  it('prioritizes loading state over user check', () => {
    // Even if user exists, loading=true should show spinner
    mockUseAuth.mockReturnValue({
      user: { uid: 'user-1' },
      loading: true,
      error: null,
    });

    render(
      <AuthGate>
        <div data-testid="app-content">App</div>
      </AuthGate>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByTestId('app-content')).not.toBeInTheDocument();
  });
});
