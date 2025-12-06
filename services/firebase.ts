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
  limitToLast
} from "firebase/database";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { UserProfile, PresenceUser } from "../types";

const firebaseConfig = {
  apiKey: "AIzaSyAHXVi7SSSCOYQswb_MxeydAlNWq86XYXI",
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

export const registerPresence = (peerId: string, profile: UserProfile) => {
  const userRef = ref(db, `users/${peerId}`);
  
  // Set initial status
  set(userRef, {
    peerId,
    displayName: profile.displayName,
    statusMessage: profile.statusMessage,
    color: profile.color,
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

// --- MESSAGING ---
export const sendMessage = (channelId: string, message: any) => {
  const messagesRef = ref(db, `messages/${channelId}`);
  const newMessageRef = push(messagesRef);
  set(newMessageRef, message);
};

export const subscribeToMessages = (channelId: string, onMessageUpdate: (messages: any[]) => void) => {
  const messagesRef = ref(db, `messages/${channelId}`);
  // Limit to last 100 messages to prevent lag
  const recentMessagesQuery = query(messagesRef, limitToLast(100));
  
  return onValue(recentMessagesQuery, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      const messageList = Object.values(data);
      onMessageUpdate(messageList);
    } else {
      onMessageUpdate([]);
    }
  });
};