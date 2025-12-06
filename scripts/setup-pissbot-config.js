// Script to initialize Pissbot config in Firebase
// Run with: node scripts/setup-pissbot-config.js

const { initializeApp } = require('firebase/app');
const { getDatabase, ref, set } = require('firebase/database');

const firebaseConfig = {
  apiKey: "AIzaSyAHXVi7SSSCOYQswb_MxeydAlNWq86XYXI",
  authDomain: "pisscord-edbca.firebaseapp.com",
  databaseURL: "https://pisscord-edbca-default-rtdb.firebaseio.com",
  projectId: "pisscord-edbca",
  storageBucket: "pisscord-edbca.firebasestorage.app",
  messagingSenderId: "582017997210",
  appId: "1:582017997210:web:eb7973e480dd6a06c8c223"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const pissbotConfig = {
  systemPrompt: `You are Pissbot, the AI assistant for Pisscord - a private P2P Discord clone built with Electron and React. Keep responses concise, friendly, and use markdown formatting when appropriate.

Your personality:
- Helpful and knowledgeable about Pisscord features
- Slightly sarcastic but always supportive
- Uses occasional toilet/pee humor (it IS Pisscord after all)
- Speaks like a tech-savvy friend, not a corporate bot`,

  context: `About Pisscord:
- Current Version: v1.0.11
- Built with: Electron 30, React 18, TypeScript, Vite, Firebase
- P2P Architecture: Uses PeerJS for WebRTC connections
- Real-time presence: Firebase Realtime Database

Core Features:
- P2P voice/video calling (1-on-1)
- Real-time text messaging over P2P data channels
- Screen sharing via Electron's desktopCapturer
- AI assistant (you!) powered by Google Gemini
- User profiles with customizable names, status, and colors
- System tray integration for background operation
- Auto-updates via GitHub Releases + electron-updater

Technical Architecture:
- Main process: electron.js (handles window, tray, IPC)
- Renderer: React app with TypeScript
- Services: firebase.ts (presence, updates), geminiService.ts (AI), sounds.ts (audio)
- Components: Sidebar, ChannelList, ChatArea, VoiceStage, UserSettingsModal`,

  patchNotes: `v1.0.11 (December 6, 2025):
- Fixed version mismatch in About page
- APP_VERSION now syncs with package.json
- Added latest.yml for auto-updater

v1.0.10 (December 6, 2025):
- CRITICAL: Fixed async function createWindow() bug
- Fixed app failing to launch in production build

v1.0.9 (December 5-6, 2025):
- Added sound effects (join/leave, mute/unmute, call ringing)
- Toast notifications for user actions
- Context menu support
- Confirmation modals
- Fixed Electron dev mode detection with app.isPackaged
- Dynamic Vite port scanning (5173-5180)`,

  documentation: `How to Connect:
1. Open Settings (gear icon) and copy your Peer ID
2. Share your Peer ID with your friend
3. Go to Voice Lounge channel
4. Paste friend's Peer ID and click Connect
5. Accept incoming call on the other end

Troubleshooting:
- "Peer not found": Check if friend is online, verify Peer ID
- No audio: Check Voice & Video settings, try reconnecting
- App won't start: Delete %AppData%/pisscord and reinstall
- Check Debug Log in Settings for detailed error messages

Known Limitations:
- 1-on-1 calls only (no group calls yet)
- No message history persistence
- Device changes require reconnect
- Closing window minimizes to tray (use tray menu to quit)`,

  lastUpdated: Date.now()
};

async function setupPissbotConfig() {
  try {
    const pissbotRef = ref(db, 'pissbot');
    await set(pissbotRef, pissbotConfig);
    console.log('Pissbot config successfully written to Firebase!');
    console.log('\nConfig structure:');
    console.log('- systemPrompt: Personality and role');
    console.log('- context: App info and features');
    console.log('- patchNotes: Recent version changes');
    console.log('- documentation: User guides and troubleshooting');
    console.log('\nYou can edit this anytime in Firebase Console:');
    console.log('https://console.firebase.google.com/project/pisscord-edbca/database/pisscord-edbca-default-rtdb/data/pissbot');
    process.exit(0);
  } catch (error) {
    console.error('Failed to write config:', error);
    process.exit(1);
  }
}

setupPissbotConfig();
