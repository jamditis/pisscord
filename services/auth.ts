/**
 * Firebase Authentication Service
 * Provides Email Link (passwordless) and Google Sign-In authentication
 */

import {
  signInWithEmailLink,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { auth } from './firebase';
import { Platform } from './platform';

const EMAIL_STORAGE_KEY = 'emailForSignIn';

const googleProvider = new GoogleAuthProvider();

/**
 * Handle redirect result on page load (for mobile/web Google sign-in)
 */
export const handleGoogleRedirectResult = async (): Promise<User | null> => {
  try {
    const result = await getRedirectResult(auth);
    if (result) {
      return result.user;
    }
  } catch (error: any) {
    console.error('Google redirect result error:', error);
    throw error;
  }
  return null;
};

/**
 * Get action code settings for email link sign-in
 */
const getActionCodeSettings = () => ({
  url: window.location.origin,
  handleCodeInApp: true,
});

/**
 * Send email link for passwordless sign-in
 */
export const sendEmailLink = async (email: string): Promise<void> => {
  const actionCodeSettings = getActionCodeSettings();
  await sendSignInLinkToEmail(auth, email, actionCodeSettings);
  // Save email for when user clicks the link
  localStorage.setItem(EMAIL_STORAGE_KEY, email);
};

/**
 * Complete email link sign-in (called when user clicks the magic link)
 */
export const completeEmailLinkSignIn = async (): Promise<User | null> => {
  if (!isSignInWithEmailLink(auth, window.location.href)) {
    return null;
  }

  let email = localStorage.getItem(EMAIL_STORAGE_KEY);

  if (!email) {
    // User opened link on different device - prompt for email
    email = window.prompt('Please enter your email for confirmation');
    if (!email) return null;
  }

  const result = await signInWithEmailLink(auth, email, window.location.href);
  localStorage.removeItem(EMAIL_STORAGE_KEY);

  // Clean up URL
  window.history.replaceState(null, '', window.location.origin);

  return result.user;
};

/**
 * Sign in with Google
 * Uses redirect flow on mobile/web (more reliable), popup on Electron desktop
 */
export const signInWithGoogle = async (): Promise<User> => {
  // Use redirect flow on mobile and web browsers (popup often fails)
  // Only use popup on Electron where it works reliably
  if (!Platform.isElectron) {
    await signInWithRedirect(auth, googleProvider);
    // User will be redirected to Google, then back to app
    // Result handled by handleGoogleRedirectResult on page load
    throw new Error('Redirecting to Google sign-in...');
  }

  // Electron desktop - use popup
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    // Fallback to redirect if popup fails for any reason
    if (error.code === 'auth/popup-blocked' ||
        error.code === 'auth/popup-closed-by-user' ||
        error.code === 'auth/cancelled-popup-request') {
      await signInWithRedirect(auth, googleProvider);
      throw new Error('Redirecting to Google sign-in...');
    }
    throw error;
  }
};

/**
 * Sign out current user
 */
export const signOut = async (): Promise<void> => {
  await firebaseSignOut(auth);
};

/**
 * Subscribe to auth state changes
 */
export const subscribeToAuth = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

/**
 * Get current user
 */
export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

export type { User };
