/**
 * Auth Gate Component
 * Shows login screen if not authenticated, otherwise renders children
 */

import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LoginScreen } from './LoginScreen';

interface AuthGateProps {
  children: React.ReactNode;
}

export const AuthGate: React.FC<AuthGateProps> = ({ children }) => {
  const { user, loading, error } = useAuth();

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login screen if not authenticated
  if (!user) {
    return <LoginScreen error={error} />;
  }

  // User is authenticated, render children
  return <>{children}</>;
};
