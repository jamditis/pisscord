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
- Current Version: v1.1.0 (Released December 6, 2025)
- Built with: Electron 30, React 18, TypeScript, Vite, Firebase
- P2P Architecture: Uses PeerJS for WebRTC mesh networking
- Real-time presence: Firebase Realtime Database
- File storage: Firebase Storage

Core Features:
- Mesh networking for group voice/video calls (many-to-many)
- Real-time text messaging with Firebase persistence
- Screen sharing via Electron's desktopCapturer
- Video spotlight/pinning - click any video tile to maximize
- Speaking indicators - green ring shows who's talking
- Discord-style markdown in chat (bold, italic, code, headers, lists)
- AI assistant (you!) powered by Google Gemini 2.5 Flash
- User profiles with custom names, status, colors, and profile pictures
- File sharing - drag & drop images/files in chat
- Voice channel approval mode - some channels require approval to join
- Collapsible user list sidebar
- System tray integration for background operation
- Auto-updates via GitHub Releases + electron-updater

Channels:
- #general - Main chat
- #links - Share links
- #dev-updates - Live GitHub commit feed (read-only)
- #issues - Bug reports and feature requests
- #pissbot - Chat with me!
- Voice Lounge - Open voice channel
- Gaming - Voice channel requiring approval to join (lock icon)

Technical Architecture:
- Main process: electron.js (handles window, tray, IPC)
- Renderer: React app with TypeScript
- Services: firebase.ts (presence, messages, files), geminiService.ts (AI), sounds.ts (audio), github.ts (dev feed)
- Components: Sidebar, ChannelList, ChatArea, VoiceStage, UserList, JoinRequestPanel`,

  patchNotes: `v1.1.0 (December 6, 2025):
- Voice channel approval mode - channels can require approval to join
- Collapsible user list sidebar
- User list now visible in voice channels
- Fixed view switching bug (no more forced rejoin)
- Fixed users disappearing from sidebar on profile update
- Fixed speaking indicator layout shift
- Cleaner video spotlight/pinning layout
- Simplified server sidebar (removed Add Server button)
- Pissbot channel moved to bottom of text channels

v1.0.14 (December 6, 2025):
- Video spotlight - click any tile to pin/maximize
- Speaking indicators with green ring
- Full markdown rendering in chat
- Users nested under voice channels in sidebar
- Added Gaming voice channel
- Fixed bug report submission and auto-updater

v1.0.13 (December 6, 2025):
- Mesh networking for group calls
- File sharing in chat
- Profile pictures
- Community channels (#issues, #dev-updates)
- MOTD system
- 14-day message retention`,

  documentation: `How to Connect:
1. Open the app - you'll see your Peer ID in the bottom left
2. Click on Voice Lounge or Gaming channel
3. If channel is empty, you'll join and wait for others
4. If others are in the channel, you'll auto-connect (or request approval for Gaming)
5. Use the control bar to mute, toggle video, share screen, or disconnect

Voice Channel Approval:
- Gaming channel has a lock icon - requires approval when occupied
- Click to join and your request is sent to users in the channel
- They'll see approve/deny buttons to let you in

Video Controls:
- Click any video tile to pin/spotlight it
- Green ring shows who's currently speaking
- Collapse user list for more video space

Troubleshooting:
- "Peer not found": Check if friend is online
- No audio: Check Voice & Video settings, try reconnecting
- App won't start: Delete %AppData%/pisscord and reinstall
- Check Debug Log in Settings for detailed error messages

Tips:
- Collapse user list by clicking the chevron for more video space
- Right-click anywhere for quick actions menu
- Copy your Peer ID by clicking the ID in the bottom left
- Check Settings > About to manually check for updates`,

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
