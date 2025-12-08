// Script to initialize Pissbot config in Firebase
// Run with: node scripts/setup-pissbot-config.js
// Requires VITE_FIREBASE_API_KEY environment variable

require('dotenv').config();
const { initializeApp } = require('firebase/app');
const { getDatabase, ref, set } = require('firebase/database');

if (!process.env.VITE_FIREBASE_API_KEY) {
  console.error('Error: VITE_FIREBASE_API_KEY environment variable is not set.');
  console.error('Create a .env file with: VITE_FIREBASE_API_KEY=your_key_here');
  process.exit(1);
}

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
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
- Current Version: v1.4.2 (Released December 8, 2025)
- Built with: Electron 30, React 18, TypeScript, Vite, Firebase
- P2P Architecture: Uses PeerJS for WebRTC mesh networking
- Real-time presence: Firebase Realtime Database
- File storage: Firebase Storage

Platforms:
- Windows Desktop (Electron) - Full featured with auto-updates
- Web Browser (web.pisscord.app) - Works on any device, no download required
- Android (Capacitor APK) - Native mobile app

Core Features:
- Mesh networking for group voice/video calls (many-to-many)
- End-to-end encryption (AES-256-GCM) for all text messages
- Real-time text messaging with Firebase persistence
- Screen sharing via Electron's desktopCapturer (desktop) or getDisplayMedia (web)
- Video spotlight/pinning - click any video tile to maximize
- Speaking indicators - green ring shows who's talking
- Discord-style markdown in chat (bold, italic, code, headers, lists)
- AI assistant (you!) powered by Google Gemini 2.5 Flash
- User profiles with custom names, status, colors, and profile pictures
- File sharing - drag & drop images/files in chat
- Theme customization - Gold and Purple color themes
- Unread message indicators - red dot and bold text for new messages
- Collapsible user list sidebar
- System tray integration for background operation (desktop)
- Auto-updates via GitHub Releases + electron-updater (desktop)

Channels:
- #general - Main chat
- #links - Share links
- #dev-updates - Live GitHub commit feed (read-only)
- #issues - Bug reports and feature requests
- #pissbot - Chat with me!
- Chillin' - Open voice channel
- Gaming - Open voice channel

Technical Architecture:
- Main process: electron.js (handles window, tray, IPC)
- Renderer: React app with TypeScript
- Platform layer: services/platform.ts (abstracts Electron/Capacitor/Web differences)
- Encryption: services/encryption.ts (AES-256-GCM with PBKDF2 key derivation)
- Services: firebase.ts (presence, messages, files), geminiService.ts (AI), sounds.ts (audio), github.ts (dev feed)
- Components: Sidebar, ChannelList, ChatArea, VoiceStage, UserList, PassphraseModal`,

  patchNotes: `v1.4.2 (December 8, 2025):
- Passphrase modal now shows for ALL users on launch (required for encryption)
- Previously new computers could skip encryption setup unintentionally

v1.4.1 (December 8, 2025):
- Purple app icons for taskbar, tray, and installer
- Auto-close installer - automatically closes running Pisscord before updating
- Sidebar logo fix - now properly fills circle area and respects theme

v1.4.0 (December 8, 2025):
- Web Browser Version - access Pisscord at web.pisscord.app (no download!)
- End-to-End Encryption - AES-256-GCM encryption for all text messages
- Passphrase system - enter group passphrase on first launch to unlock encryption
- Unread message indicators - red dot and bold text for channels with new messages
- Release notes popup - see what's new after each update
- Mobile web support - optimized touch UI for mobile browsers

v1.3.0 (December 6, 2025):
- Android App - native Android app via Capacitor
- Theme Customization - Gold and Purple color themes
- Removed voice channel approval system
- Renamed Voice Lounge to Chillin'

v1.1.0 (December 6, 2025):
- Collapsible user list sidebar
- Video spotlight/pinning
- Speaking indicators with green ring
- Full markdown rendering in chat`,

  documentation: `How to Access Pisscord:
- Web Browser: Go to web.pisscord.app (or pisscord-edbca.web.app)
- Windows Desktop: Download from GitHub releases
- Android: Download APK from GitHub releases

First Time Setup:
1. Enter the group passphrase when prompted (required for encryption)
2. Set your display name and profile in Settings
3. Click a voice channel to join, or text channel to chat

Voice/Video Controls:
- Click any video tile to pin/spotlight it
- Green ring shows who's currently speaking
- Collapse user list by clicking the chevron for more video space
- Use control bar to mute, toggle video, share screen, or disconnect

Encryption:
- All messages are encrypted with AES-256-GCM
- You need the passphrase to read/send encrypted messages
- If you entered wrong passphrase, go to Settings and reset

Troubleshooting:
- "Peer not found": Check if friend is online
- No audio: Check Voice & Video settings, try reconnecting
- Can't read messages: Make sure you entered the correct passphrase
- Desktop app won't start: Delete %AppData%/pisscord and reinstall
- Check Debug Log in Settings for detailed error messages

Tips:
- Right-click anywhere for quick actions menu
- Copy your Peer ID by clicking the ID in the bottom left
- Desktop: Check Settings > About to manually check for updates
- Web/Mobile: Refresh the page to get latest version`,

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
