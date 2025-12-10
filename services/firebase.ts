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
import { UserProfile, PresenceUser } from "../types";

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
  apiKey: getEnvVar('VITE_FIREBASE_API_KEY'),
  authDomain: "pisscord-edbca.firebaseapp.com",
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

// File Upload Service
export const uploadFile = async (file: File): Promise<string> => {
  const filename = `${Date.now()}-${file.name}`;
  const fileRef = storageRef(storage, `uploads/${filename}`);

  try {
    const snapshot = await uploadBytes(fileRef, file);
    const url = await getDownloadURL(snapshot.ref);
    return url;
  } catch (error) {
    console.error("File upload failed:", error);
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
  } catch {
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
    console.error("Update check failed", error);
  }
  return null;
};

export const checkForMOTD = async (): Promise<string | null> => {
    try {
        const motdRef = ref(db, 'system/motd');
        const snapshot = await get(motdRef);
        return snapshot.exists() ? snapshot.val() : null;
    } catch (e) {
        return null;
    }
};

export const registerPresence = (peerId: string, profile: UserProfile) => {
  const userRef = ref(db, `users/${peerId}`);

  // Set initial status
  set(userRef, {
    peerId,
    displayName: profile.displayName,
    statusMessage: profile.statusMessage,
    color: profile.color,
    photoURL: profile.photoURL || null,
    lastSeen: Date.now(),
    voiceChannelId: null
  });

  // Automatically remove user when they disconnect (close app/lose internet)
  onDisconnect(userRef).remove();
};

// Also export a way to update presence while online without reconnecting
export const updatePresence = (peerId: string, profile: UserProfile, voiceChannelId: string | null = null) => {
    const userRef = ref(db, `users/${peerId}`);
    set(userRef, {
      peerId,
      displayName: profile.displayName,
      statusMessage: profile.statusMessage,
      color: profile.color,
      photoURL: profile.photoURL || null,
      lastSeen: Date.now(),
      voiceChannelId
    });
    // Ensure disconnect handler is still active (it usually persists on the socket connection)
    onDisconnect(userRef).remove();
};

export const subscribeToUsers = (onUsersUpdate: (users: PresenceUser[]) => void) => {
  const usersRef = ref(db, 'users');
  
  return onValue(usersRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      const userList = Object.values(data) as PresenceUser[];
      onUsersUpdate(userList);
    } else {
      onUsersUpdate([]);
    }
  });
};

export const removePresence = (peerId: string) => {
  const userRef = ref(db, `users/${peerId}`);
  remove(userRef);
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
    console.error("Failed to fetch Pissbot config:", error);
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
    console.error("Failed to fetch release notes:", error);
  }
  return null;
};

// --- MESSAGING ---

/**
 * Send a message to a channel
 */
export const sendMessage = async (channelId: string, message: any) => {
  const messagesRef = ref(db, `messages/${channelId}`);
  const newMessageRef = push(messagesRef);
  set(newMessageRef, message);
};

/**
 * Subscribe to messages in a channel
 */
export const subscribeToMessages = (channelId: string, onMessageUpdate: (messages: any[]) => void) => {
  const messagesRef = ref(db, `messages/${channelId}`);
  // Limit to last 100 messages to prevent lag
  const recentMessagesQuery = query(messagesRef, limitToLast(100));

  return onValue(recentMessagesQuery, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      const messageList = Object.values(data) as any[];
      onMessageUpdate(messageList);
    } else {
      onMessageUpdate([]);
    }
  });
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
        const updates: Record<string, null> = {};
        snapshot.forEach((child) => {
          if (child.key) updates[child.key] = null;
        });
        // Bulk delete
        // Note: update() with null deletes keys, but ref should be parent.
        // Iterate and remove is safer for now.
        snapshot.forEach((child) => {
           remove(child.ref);
        });
        console.log(`Cleaned up ${snapshot.size} old messages in channel ${channelId}`);
      }
    } catch (error) {
      console.error(`Failed to cleanup messages for ${channelId}:`, error);
    }
  }
};

/**
 * Transcript Caching
 * Store audio transcripts in Firebase to avoid re-transcribing
 */

// Create a safe key from URL (Firebase keys can't contain . # $ [ ] /)
const urlToKey = (url: string): string => {
  // Use btoa to encode, then replace unsafe characters
  return btoa(url).replace(/[.#$\[\]/]/g, '_').slice(0, 200);
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
    console.log('[Firebase] Transcript cached for:', audioUrl.slice(0, 50) + '...');
  } catch (error) {
    console.error('[Firebase] Failed to cache transcript:', error);
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
      console.log('[Firebase] Transcript cache hit for:', audioUrl.slice(0, 50) + '...');
      return data.transcript;
    }
    return null;
  } catch (error) {
    console.error('[Firebase] Failed to get cached transcript:', error);
    return null;
  }
};