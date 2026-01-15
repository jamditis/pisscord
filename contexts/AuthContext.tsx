/**
 * Authentication Context
 * Provides auth state and methods throughout the app
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { subscribeToAuth, completeEmailLinkSignIn, handleGoogleRedirectResult } from '../services/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  error: null,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let redirectChecked = false;
    let authStateReceived = false;
    let pendingAuthUser: User | null = null;

    // Only set loading false when BOTH redirect check and initial auth state are done
    const maybeFinishLoading = () => {
      if (redirectChecked && authStateReceived && isMounted) {
        setLoading(false);
      }
    };

    // Check for redirect results first (Google or email link)
    const checkRedirects = async () => {
      // Check for Google redirect result (mobile/web flow)
      try {
        const googleUser = await handleGoogleRedirectResult();
        if (googleUser && isMounted) {
          console.log('[Auth] Google redirect sign-in successful');
          setUser(googleUser);
        }
      } catch (err: any) {
        console.error('Google redirect sign-in error:', err);
        if (isMounted) setError(err.message);
      }

      // Check for email link sign-in
      try {
        const emailLinkUser = await completeEmailLinkSignIn();
        if (emailLinkUser && isMounted) {
          console.log('[Auth] Email link sign-in successful');
          setUser(emailLinkUser);
        }
      } catch (err: any) {
        console.error('Email link sign-in error:', err);
        if (isMounted) setError(err.message);
      }

      redirectChecked = true;
      maybeFinishLoading();
    };

    // Subscribe to auth state changes
    const unsubscribe = subscribeToAuth((authUser) => {
      console.log('[Auth] Auth state changed:', authUser ? authUser.email : 'null');
      pendingAuthUser = authUser;
      if (isMounted) {
        setUser(authUser);
      }
      authStateReceived = true;
      maybeFinishLoading();
    });

    // Start redirect check
    checkRedirects();

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
};
