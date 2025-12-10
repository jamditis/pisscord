/**
 * Authentication Context
 * Provides auth state and methods throughout the app
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { subscribeToAuth, completeEmailLinkSignIn } from '../services/auth';

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
    // Check for email link sign-in on mount
    const handleEmailLink = async () => {
      try {
        const emailLinkUser = await completeEmailLinkSignIn();
        if (emailLinkUser) {
          setUser(emailLinkUser);
          setLoading(false);
          return true;
        }
      } catch (err: any) {
        console.error('Email link sign-in error:', err);
        setError(err.message);
      }
      return false;
    };

    // Subscribe to auth state
    const unsubscribe = subscribeToAuth((authUser) => {
      setUser(authUser);
      setLoading(false);
    });

    // Handle email link if present
    handleEmailLink();

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
};
