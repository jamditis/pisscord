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
import { logger } from './logger';

const EMAIL_STORAGE_KEY = 'emailForSignIn';
const EMAIL_EXPIRY_KEY = 'emailForSignIn_expiry';
const EMAIL_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

const googleProvider = new GoogleAuthProvider();

/** Map Firebase auth error codes to user-friendly messages */
function getAuthErrorMessage(error: any): string {
  const code = error?.code;
  switch (code) {
    case 'auth/invalid-email':
      return 'The email address is not valid.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    case 'auth/user-not-found':
      return 'No account found with this email.';
    case 'auth/expired-action-code':
      return 'This sign-in link has expired. Please request a new one.';
    case 'auth/invalid-action-code':
      return 'This sign-in link is invalid or has already been used.';
    case 'auth/network-request-failed':
      return 'Network error. Check your internet connection and try again.';
    case 'auth/popup-blocked':
      return 'Sign-in popup was blocked by the browser. Please allow popups.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in was cancelled.';
    case 'auth/too-many-requests':
      return 'Too many sign-in attempts. Please wait and try again.';
    default:
      return error?.message || 'An authentication error occurred.';
  }
}

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
    logger.error('auth', `Google redirect result error: ${error.code || error.message}`);
    const friendlyMessage = getAuthErrorMessage(error);
    throw new Error(friendlyMessage);
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
  try {
    localStorage.setItem(EMAIL_STORAGE_KEY, email);
    localStorage.setItem(EMAIL_EXPIRY_KEY, String(Date.now() + EMAIL_EXPIRY_MS));
  } catch {
    logger.warn('auth', 'Could not save email to localStorage (incognito mode?)');
  }
};

/**
 * Complete email link sign-in (called when user clicks the magic link)
 */
export const completeEmailLinkSignIn = async (): Promise<User | null> => {
  if (!isSignInWithEmailLink(auth, window.location.href)) {
    return null;
  }

  let email = localStorage.getItem(EMAIL_STORAGE_KEY);

  // Check if email link has expired
  if (email) {
    const expiry = localStorage.getItem(EMAIL_EXPIRY_KEY);
    if (expiry && Date.now() > Number(expiry)) {
      logger.warn('auth', 'Stored email link has expired, clearing');
      localStorage.removeItem(EMAIL_STORAGE_KEY);
      localStorage.removeItem(EMAIL_EXPIRY_KEY);
      email = null;
    }
  }

  if (!email) {
    email = window.prompt('Please enter your email for confirmation');
    if (!email) return null;
  }

  try {
    const result = await signInWithEmailLink(auth, email, window.location.href);
    // Clean up regardless of success
    localStorage.removeItem(EMAIL_STORAGE_KEY);
    localStorage.removeItem(EMAIL_EXPIRY_KEY);
    window.history.replaceState(null, '', window.location.origin);
    return result.user;
  } catch (error: any) {
    // Clean up even on failure to prevent stale data
    localStorage.removeItem(EMAIL_STORAGE_KEY);
    localStorage.removeItem(EMAIL_EXPIRY_KEY);
    window.history.replaceState(null, '', window.location.origin);
    logger.error('auth', `Email link sign-in failed: ${error.code || error.message}`);
    throw new Error(getAuthErrorMessage(error));
  }
};

/**
 * Sign in with Google
 * Uses redirect flow on mobile/web, popup on Electron
 */
export const signInWithGoogle = async (): Promise<User> => {
  if (!Platform.isElectron) {
    await signInWithRedirect(auth, googleProvider);
    throw new Error('Redirecting to Google sign-in...');
  }

  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    if (error.code === 'auth/popup-blocked' ||
        error.code === 'auth/popup-closed-by-user' ||
        error.code === 'auth/cancelled-popup-request') {
      await signInWithRedirect(auth, googleProvider);
      throw new Error('Redirecting to Google sign-in...');
    }
    throw new Error(getAuthErrorMessage(error));
  }
};

/**
 * Sign out current user
 */
export const signOut = async (): Promise<void> => {
  try {
    await firebaseSignOut(auth);
  } catch (error: any) {
    logger.error('auth', `Sign out failed: ${error.message}`);
    throw new Error(getAuthErrorMessage(error));
  }
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
