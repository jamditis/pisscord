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
  signInWithCredential,
  getRedirectResult,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { auth } from './firebase';
import { logger } from './logger';
import { Platform } from './platform';

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
 * Handle redirect result on page load.
 * Only relevant if the redirect fallback was used (popup blocked).
 * Errors are logged but not thrown — a failed redirect check shouldn't
 * block the app from showing the login screen.
 */
export const handleGoogleRedirectResult = async (): Promise<User | null> => {
  try {
    const result = await getRedirectResult(auth);
    if (result) {
      logger.info('auth', `Redirect result: signed in as ${result.user.email}`);
      return result.user;
    }
  } catch (error: any) {
    // Don't throw — redirect errors (storage partitioning, stale state)
    // are common on normal page loads and shouldn't surface to the user
    logger.warn('auth', `Redirect result check failed (expected on normal loads): ${error.code}`);
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
 *
 * Platform-specific strategy:
 * - **Capacitor (Android/iOS):** Uses native Google Sign-In via
 *   @codetrix-studio/capacitor-google-auth. Opens the OS account picker,
 *   gets an ID token, then passes it to Firebase via signInWithCredential.
 * - **Electron:** Opens a BrowserWindow to Google's OAuth consent screen
 *   via IPC to the main process. The main process intercepts the redirect
 *   to extract the ID token, then the renderer uses signInWithCredential.
 *   signInWithPopup doesn't work because the popup can't postMessage back
 *   to the file:// origin that Electron uses.
 * - **Web:** Uses signInWithPopup. Falls back to signInWithRedirect only
 *   when the popup is blocked.
 */
export const signInWithGoogle = async (): Promise<User> => {
  // Capacitor: use native Google Sign-In → Firebase credential
  if (Platform.isCapacitor) {
    logger.info('auth', 'Capacitor detected, using native Google Sign-In');
    try {
      const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');
      await GoogleAuth.initialize({
        clientId: '582017997210-u9lhvn9rglcch5pae0nis7668hgfhe14.apps.googleusercontent.com',
        scopes: ['profile', 'email'],
        grantOfflineAccess: true,
      });
      const googleUser = await GoogleAuth.signIn();
      const idToken = googleUser.authentication.idToken;
      if (!idToken) {
        throw new Error('No ID token received from Google Sign-In');
      }
      const credential = GoogleAuthProvider.credential(idToken);
      const result = await signInWithCredential(auth, credential);
      logger.info('auth', `Native Google Sign-In successful: ${result.user.email}`);
      return result.user;
    } catch (error: any) {
      // Log everything we can about the error for debugging
      logger.error('auth', `Native Google Sign-In failed: ${JSON.stringify({
        message: error.message,
        code: error.code,
        stack: error.stack?.slice(0, 200),
        raw: String(error),
      })}`);
      if (error.message?.includes('canceled') || error.message?.includes('cancelled')) {
        throw new Error('Sign-in was cancelled.');
      }
      throw new Error(getAuthErrorMessage(error));
    }
  }

  // Electron: use main process OAuth window → signInWithCredential
  // signInWithPopup fails because the popup can't postMessage back to file:// origin
  if (Platform.isElectron) {
    logger.info('auth', 'Electron detected, using main process Google Sign-In');
    try {
      const { idToken } = await (window as any).electronAPI.googleSignIn();
      const credential = GoogleAuthProvider.credential(idToken);
      const result = await signInWithCredential(auth, credential);
      logger.info('auth', `Electron Google Sign-In successful: ${result.user.email}`);
      return result.user;
    } catch (error: any) {
      if (error.message?.includes('closed') || error.message?.includes('cancelled')) {
        throw new Error('Sign-in was cancelled.');
      }
      logger.error('auth', `Electron Google Sign-In failed: ${error.message}`);
      throw new Error(getAuthErrorMessage(error));
    }
  }

  // Web: use popup with redirect fallback
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    if (error.code === 'auth/popup-blocked' ||
        error.code === 'auth/cancelled-popup-request') {
      logger.warn('auth', 'Popup blocked, falling back to redirect flow');
      await signInWithRedirect(auth, googleProvider);
      throw new Error('Redirecting to Google sign-in...');
    }
    if (error.code === 'auth/popup-closed-by-user') {
      throw new Error('Sign-in was cancelled.');
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
