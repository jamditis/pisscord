import { initializeApp } from "firebase/app";
import { 
  getDatabase, 
  ref, 
  get, 
  set, 
  onDisconnect, 
  onValue, 
  remove 
} from "firebase/database";
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

// Re-export type to avoid conflict
export type { PresenceUser as OnlineUser };

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
    lastSeen: Date.now()
  });

  // Automatically remove user when they disconnect (close app/lose internet)
  onDisconnect(userRef).remove();
};

// Also export a way to update presence while online without reconnecting
export const updatePresence = (peerId: string, profile: UserProfile) => {
    const userRef = ref(db, `users/${peerId}`);
    set(userRef, {
      peerId,
      displayName: profile.displayName,
      statusMessage: profile.statusMessage,
      color: profile.color,
      lastSeen: Date.now()
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