/**
 * Authentication Context
 *
 * Provides auth state throughout the app.
 * Handles the race condition between onAuthStateChanged and getRedirectResult.
 */

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User } from 'firebase/auth';
import { subscribeToAuth, completeEmailLinkSignIn, handleGoogleRedirectResult } from '../services/auth';
import { logger } from '../services/logger';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};

const AUTH_TIMEOUT_MS = 10_000;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track whether each signal has arrived
  const redirectCheckedRef = useRef(false);
  const authStateReceivedRef = useRef(false);
  // Store the auth listener's value without applying it until redirects are done
  const pendingAuthUserRef = useRef<User | null>(null);

  useEffect(() => {
    let isMounted = true;

    const finishLoading = () => {
      if (isMounted) setLoading(false);
    };

    /**
     * Only finalize auth state when BOTH signals have arrived.
     * The redirect check takes priority — if it found a user, that wins.
     */
    const maybeResolve = () => {
      if (!redirectCheckedRef.current || !authStateReceivedRef.current) return;
      if (!isMounted) return;

      // At this point, both the redirect check and the initial auth state
      // have resolved. The user state may have already been set by the
      // redirect handler (if a redirect user was found) or by a subsequent
      // auth listener call. Either way, loading is done.
      finishLoading();
    };

    // 1) Check for redirect results first
    const checkRedirects = async () => {
      logger.info('auth', 'Checking for redirect results...');

      try {
        const googleUser = await handleGoogleRedirectResult();
        if (googleUser && isMounted) {
          logger.info('auth', `Google redirect sign-in successful: ${googleUser.email}`);
          setUser(googleUser);
        }
      } catch (err: any) {
        logger.error('auth', `Google redirect error: ${err.message}`);
        if (isMounted) setError(err.message);
      }

      try {
        const emailLinkUser = await completeEmailLinkSignIn();
        if (emailLinkUser && isMounted) {
          logger.info('auth', `Email link sign-in successful: ${emailLinkUser.email}`);
          setUser(emailLinkUser);
        }
      } catch (err: any) {
        logger.error('auth', `Email link error: ${err.message}`);
        if (isMounted) setError(err.message);
      }

      redirectCheckedRef.current = true;

      // Now apply the pending auth state if no redirect user was set
      // The auth listener may have fired with a real user while we were awaiting
      if (pendingAuthUserRef.current !== null && isMounted) {
        setUser(pendingAuthUserRef.current);
      }

      maybeResolve();
    };

    // 2) Subscribe to auth state changes
    const unsubscribe = subscribeToAuth((authUser) => {
      logger.info('auth', `Auth state changed: ${authUser ? authUser.email : 'null'}`);
      pendingAuthUserRef.current = authUser;
      authStateReceivedRef.current = true;

      if (redirectCheckedRef.current && isMounted) {
        // Redirect check is done — safe to apply auth state directly
        setUser(authUser);
        finishLoading();
      }
      // If redirect check hasn't completed yet, DON'T call setUser.
      // The initial null from onAuthStateChanged fires before getRedirectResult
      // resolves, so applying it would overwrite the redirect user.
      maybeResolve();
    });

    checkRedirects();

    // 3) Safety timeout — if both checks stall, stop loading after 10s
    const timeout = setTimeout(() => {
      if (isMounted && loading) {
        logger.warn('auth', 'Auth initialization timed out after 10s');
        finishLoading();
      }
    }, AUTH_TIMEOUT_MS);

    return () => {
      isMounted = false;
      unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
};
