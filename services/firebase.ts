import { initializeApp } from "firebase/app";
import {
  getDatabase,
  ref,
  get,
  set,
  onDisconnect,
  onValue,
  remove,
  push,
  query,
  limitToLast,
  orderByChild,
  endAt
} from "firebase/database";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { getAuth } from "firebase/auth";
import { UserProfile, PresenceUser, Message } from "../types";
import { logger } from "./logger";

// Safe environment variable access for both Vite (browser) and Node.js environments
const getEnvVar = (viteKey: string, nodeKey?: string): string | undefined => {
  // Try Vite's import.meta.env first (browser)
  if (typeof import.meta !== 'undefined' && (import.meta as any).env?.[viteKey]) {
    return (import.meta as any).env[viteKey];
  }
  // Fallback to process.env (Node.js/Electron)
  if (typeof process !== 'undefined' && process.env?.[nodeKey || viteKey]) {
    return process.env[nodeKey || viteKey];
  }
  return undefined;
};

const firebaseConfig = {
  apiKey: getEnvVar('VITE_FIREBASE_API_KEY') || "AIzaSyAHXVi7SSSCOYQswb_MxeydAlNWq86XYXI",
  authDomain: "pisscord-edbca.web.app",
  databaseURL: "https://pisscord-edbca-default-rtdb.firebaseio.com",
  projectId: "pisscord-edbca",
  storageBucket: "pisscord-edbca.firebasestorage.app",
  messagingSenderId: "582017997210",
  appId: "1:582017997210:web:eb7973e480dd6a06c8c223",
  measurementId: "G-QQ77JYN88D"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const storage = getStorage(app);
export const auth = getAuth(app);

// Re-export type to avoid conflict
export type { PresenceUser as OnlineUser };

/**
 * Retry wrapper with exponential backoff for transient Firebase errors.
 * Delays: baseDelay * 2^attempt (e.g. 1s → 2s → 4s for 3 retries).
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  name: string,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        logger.warn('firebase', `${name} failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  logger.error('firebase', `${name} failed after ${maxRetries + 1} attempts`);
  throw lastError;
}

// File Upload Service
export const uploadFile = async (file: File): Promise<string> => {
  const filename = `${Date.now()}-${file.name}`;
  const fileRef = storageRef(storage, `uploads/${filename}`);

  try {
    const snapshot = await uploadBytes(fileRef, file);
    const url = await getDownloadURL(snapshot.ref);
    return url;
  } catch (error) {
    logger.error('firebase', `File upload failed: ${error}`);
    throw error;
  }
};

// Get resized image URL (Firebase Resize Images extension)
// The extension creates thumbnails with _200x200, _400x400, etc. suffixes
export const getResizedImageUrl = (originalUrl: string, size: '200x200' | '400x400' = '200x200'): string => {
  // Firebase extension adds suffix before file extension
  // e.g., uploads/image.jpg -> uploads/image_200x200.jpg
  // If the URL contains the token, we need to handle it carefully

  try {
    const url = new URL(originalUrl);
    const pathMatch = url.pathname.match(/\/o\/(.+?)(\?|$)/);
    if (!pathMatch) return originalUrl;

    const encodedPath = pathMatch[1];
    const decodedPath = decodeURIComponent(encodedPath);

    // Find the last dot for file extension
    const lastDot = decodedPath.lastIndexOf('.');
    if (lastDot === -1) return originalUrl;

    const basePath = decodedPath.substring(0, lastDot);
    const extension = decodedPath.substring(lastDot);
    const resizedPath = `${basePath}_${size}${extension}`;

    // Re-encode and replace in URL
    const newEncodedPath = encodeURIComponent(resizedPath);
    return originalUrl.replace(encodedPath, newEncodedPath);
  } catch (error) {
    logger.warn('firebase', `Failed to generate resized image URL: ${error}`);
    return originalUrl;
  }
};

export interface SystemInfo {
  latestVersion: string;
  downloadUrl: string;
  motd: string;
}

// Check if a new version exists
export const checkForUpdates = async (currentVersion: string): Promise<{ hasUpdate: boolean, url: string, latest: string } | null> => {
  const systemRef = ref(db, 'system');
  try {
    const snapshot = await get(systemRef);
    if (snapshot.exists()) {
      const data = snapshot.val() as SystemInfo;
      if (data.latestVersion !== currentVersion) {
         return { hasUpdate: true, url: data.downloadUrl, latest: data.latestVersion };
      }
    }
  } catch (error) {
    logger.error('firebase', `Update check failed: ${error}`);
  }
  return null;
};

export const checkForMOTD = async (): Promise<string | null> => {
    try {
        const motdRef = ref(db, 'system/motd');
        const snapshot = await get(motdRef);
        return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
        logger.error('firebase', `Failed to check MOTD: ${error}`);
        return null;
    }
};

export const registerPresence = async (peerId: string, profile: UserProfile): Promise<boolean> => {
  const userRef = ref(db, `users/${peerId}`);

  try {
    await withRetry(async () => {
      // Set up cleanup handler FIRST so the user entry can never outlive the connection.
      // If onDisconnect fails, we bail out before writing — no ghost users.
      await onDisconnect(userRef).remove();

      await set(userRef, {
        peerId,
        displayName: profile.displayName,
        statusMessage: profile.statusMessage,
        color: profile.color,
        photoURL: profile.photoURL || null,
        lastSeen: Date.now(),
        voiceChannelId: null
      });
    }, 'registerPresence');
    return true;
  } catch (error) {
    // If set() failed after onDisconnect succeeded, cancel the handler
    try { await onDisconnect(userRef).cancel(); } catch (_) { /* best-effort */ }
    logger.error('firebase', `Failed to register presence for ${peerId}: ${error}`);
    return false;
  }
};

export const updatePresence = async (peerId: string, profile: UserProfile, voiceChannelId: string | null = null): Promise<void> => {
    const userRef = ref(db, `users/${peerId}`);
    try {
      // Re-establish cleanup handler before writing, same as registerPresence
      await onDisconnect(userRef).remove();
      await set(userRef, {
        peerId,
        displayName: profile.displayName,
        statusMessage: profile.statusMessage,
        color: profile.color,
        photoURL: profile.photoURL || null,
        lastSeen: Date.now(),
        voiceChannelId
      });
    } catch (error) {
      logger.error('firebase', `Failed to update presence for ${peerId}: ${error}`);
    }
};

/** Validate that a raw Firebase value looks like a PresenceUser */
function isValidPresenceUser(raw: unknown): raw is PresenceUser {
  if (typeof raw !== 'object' || raw === null) return false;
  const obj = raw as Record<string, unknown>;
  return typeof obj.peerId === 'string' &&
         typeof obj.displayName === 'string' &&
         typeof obj.lastSeen === 'number';
}

/** Validate that a raw Firebase value looks like a Message */
function isValidMessage(raw: unknown): raw is Message {
  if (typeof raw !== 'object' || raw === null) return false;
  const obj = raw as Record<string, unknown>;
  return typeof obj.id === 'string' &&
         typeof obj.sender === 'string' &&
         typeof obj.content === 'string' &&
         typeof obj.timestamp === 'number';
}

export const subscribeToUsers = (
  onUsersUpdate: (users: PresenceUser[]) => void,
  onError?: (error: Error) => void
) => {
  const usersRef = ref(db, 'users');

  return onValue(
    usersRef,
    (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const rawValues = Object.values(data);
        const userList = rawValues.filter(isValidPresenceUser);
        if (userList.length !== rawValues.length) {
          logger.warn('firebase', `Filtered ${rawValues.length - userList.length} invalid presence entries`);
        }
        onUsersUpdate(userList);
      } else {
        onUsersUpdate([]);
      }
    },
    (error) => {
      logger.error('firebase', `User subscription error: ${error.message}`);
      onError?.(error);
    }
  );
};

/**
 * Monitor Firebase connection state.
 * Calls back with true when connected, false when disconnected.
 */
export const subscribeToConnectionState = (
  onConnectionChange: (connected: boolean) => void
): (() => void) => {
  const connectedRef = ref(db, '.info/connected');
  return onValue(connectedRef, (snapshot) => {
    const connected = snapshot.val() === true;
    logger.info('firebase', `Connection state: ${connected ? 'connected' : 'disconnected'}`);
    onConnectionChange(connected);
  });
};

export const removePresence = async (peerId: string): Promise<void> => {
  const userRef = ref(db, `users/${peerId}`);
  try {
    await remove(userRef);
  } catch (error) {
    logger.error('firebase', `Failed to remove presence for ${peerId}: ${error}`);
  }
};

// Pissbot AI Configuration
export interface PissbotConfig {
  systemPrompt: string;
  context: string;
  patchNotes: string;
  documentation: string;
  lastUpdated: number;
}

// Cache for Pissbot config to avoid repeated fetches
let pissbotConfigCache: PissbotConfig | null = null;
let pissbotConfigCacheTime = 0;
const PISSBOT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const getPissbotConfig = async (): Promise<PissbotConfig | null> => {
  // Return cached version if still valid
  if (pissbotConfigCache && Date.now() - pissbotConfigCacheTime < PISSBOT_CACHE_TTL) {
    return pissbotConfigCache;
  }

  try {
    const pissbotRef = ref(db, 'pissbot');
    const snapshot = await get(pissbotRef);
    if (snapshot.exists()) {
      pissbotConfigCache = snapshot.val() as PissbotConfig;
      pissbotConfigCacheTime = Date.now();
      return pissbotConfigCache;
    }
  } catch (error) {
    logger.error('firebase', `Failed to fetch Pissbot config: ${error}`);
  }
  return null;
};

// Clear Pissbot cache (useful for forcing refresh)
export const clearPissbotCache = () => {
  pissbotConfigCache = null;
  pissbotConfigCacheTime = 0;
};

// Release Notes Configuration
export interface ReleaseNotesConfig {
  version: string;
  releaseNotes: string;
  downloadUrl: string;
  lastUpdated: number;
}

// Cache for release notes
let releaseNotesCache: ReleaseNotesConfig | null = null;
let releaseNotesCacheTime = 0;
const RELEASE_NOTES_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const getReleaseNotes = async (): Promise<ReleaseNotesConfig | null> => {
  // Return cached version if still valid
  if (releaseNotesCache && Date.now() - releaseNotesCacheTime < RELEASE_NOTES_CACHE_TTL) {
    return releaseNotesCache;
  }

  try {
    const releaseRef = ref(db, 'system/releaseNotes');
    const snapshot = await get(releaseRef);
    if (snapshot.exists()) {
      releaseNotesCache = snapshot.val() as ReleaseNotesConfig;
      releaseNotesCacheTime = Date.now();
      return releaseNotesCache;
    }
  } catch (error) {
    logger.error('firebase', `Failed to fetch release notes: ${error}`);
  }
  return null;
};

// --- MESSAGING ---

/**
 * Send a message to a channel
 */
export const sendMessage = async (channelId: string, message: Message): Promise<void> => {
  const messagesRef = ref(db, `messages/${channelId}`);
  const newMessageRef = push(messagesRef);
  await withRetry(
    () => set(newMessageRef, message),
    `sendMessage(${channelId})`,
    2, // fewer retries for messages — user can resend manually
    500
  );
};

/**
 * Subscribe to messages in a channel
 */
export const subscribeToMessages = (
  channelId: string,
  onMessageUpdate: (messages: Message[]) => void,
  onError?: (error: Error) => void
) => {
  const messagesRef = ref(db, `messages/${channelId}`);
  const recentMessagesQuery = query(messagesRef, limitToLast(100));

  return onValue(
    recentMessagesQuery,
    (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const rawValues = Object.values(data);
        const messageList = rawValues.filter(isValidMessage);
        if (messageList.length !== rawValues.length) {
          logger.warn('firebase', `Filtered ${rawValues.length - messageList.length} invalid messages in ${channelId}`);
        }
        onMessageUpdate(messageList);
      } else {
        onMessageUpdate([]);
      }
    },
    (error) => {
      logger.error('firebase', `Message subscription error for ${channelId}: ${error.message}`);
      onError?.(error);
    }
  );
};

// Enforce 14-day message retention
export const cleanupOldMessages = async (channelIds: string[]) => {
  const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;
  const cutoff = Date.now() - FOURTEEN_DAYS_MS;

  for (const channelId of channelIds) {
    const messagesRef = ref(db, `messages/${channelId}`);
    const oldMessagesQuery = query(messagesRef, orderByChild('timestamp'), endAt(cutoff));

    try {
      const snapshot = await get(oldMessagesQuery);
      if (snapshot.exists()) {
        const removePromises: Promise<void>[] = [];
        snapshot.forEach((child) => {
          removePromises.push(
            remove(child.ref).catch(err => {
              logger.error('firebase', `Failed to delete message ${child.key}: ${err}`);
            })
          );
        });
        await Promise.all(removePromises);
        logger.info('firebase', `Cleaned up ${snapshot.size} old messages in channel ${channelId}`);
      }
    } catch (error) {
      logger.error('firebase', `Failed to cleanup messages for ${channelId}: ${error}`);
    }
  }
};

/**
 * Transcript Caching
 * Store audio transcripts in Firebase to avoid re-transcribing
 */

// Create a safe key from URL (Firebase keys can't contain . # $ [ ] /)
const urlToKey = (url: string): string => {
  // Use btoa with safe encoding for non-ASCII characters
  return btoa(unescape(encodeURIComponent(url))).replace(/[.#$\[\]/]/g, '_').slice(0, 200);
};

/**
 * Save a transcript to Firebase
 */
export const saveTranscript = async (audioUrl: string, transcript: string): Promise<void> => {
  try {
    const key = urlToKey(audioUrl);
    const transcriptRef = ref(db, `transcripts/${key}`);
    await set(transcriptRef, {
      transcript,
      audioUrl,
      createdAt: Date.now()
    });
    logger.info('firebase', `Transcript cached for: ${audioUrl.slice(0, 50)}...`);
  } catch (error) {
    logger.error('firebase', `Failed to cache transcript: ${error}`);
  }
};

/**
 * Get a cached transcript from Firebase
 */
export const getTranscript = async (audioUrl: string): Promise<string | null> => {
  try {
    const key = urlToKey(audioUrl);
    const transcriptRef = ref(db, `transcripts/${key}`);
    const snapshot = await get(transcriptRef);
    if (snapshot.exists()) {
      const data = snapshot.val();
      logger.info('firebase', `Transcript cache hit for: ${audioUrl.slice(0, 50)}...`);
      return data.transcript;
    }
    return null;
  } catch (error) {
    logger.error('firebase', `Failed to get cached transcript: ${error}`);
    return null;
  }
};

/**
 * Fetch Gemini API key from Firebase Remote Config
 * Stored at system/geminiApiKey in RTDB
 */
let geminiKeyCache: string | null = null;
let geminiKeyCacheTime = 0;
const GEMINI_KEY_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

export const getGeminiApiKey = async (): Promise<string | null> => {
  if (geminiKeyCache && Date.now() - geminiKeyCacheTime < GEMINI_KEY_CACHE_TTL) {
    return geminiKeyCache;
  }

  try {
    const keyRef = ref(db, 'system/geminiApiKey');
    const snapshot = await get(keyRef);
    if (snapshot.exists()) {
      geminiKeyCache = snapshot.val();
      geminiKeyCacheTime = Date.now();
      return geminiKeyCache;
    }
  } catch (error) {
    logger.error('firebase', `Failed to fetch Gemini API key: ${error}`);
  }
  return null;
};