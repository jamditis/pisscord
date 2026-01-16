/**
 * Setup Release Notes in Firebase
 *
 * Run this script to update the release notes that appear to users
 * when they launch a new version of the app.
 *
 * Usage: node scripts/setup-release-notes.js
 */

require('dotenv').config();
const { initializeApp } = require('firebase/app');
const { getDatabase, ref, set } = require('firebase/database');

if (!process.env.VITE_FIREBASE_API_KEY) {
  console.error('Error: VITE_FIREBASE_API_KEY environment variable is not set.');
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

// UPDATE THESE FOR EACH RELEASE
const CURRENT_VERSION = "1.5.0";
const DOWNLOAD_URL = `https://github.com/jamditis/pisscord/releases/download/v${CURRENT_VERSION}/Pisscord.Setup.${CURRENT_VERSION}.exe`;

const RELEASE_NOTES = `## What's New in v${CURRENT_VERSION}

### Voice Messages & AI Transcription
- **Voice Messages** - Record and send voice messages with the new microphone button
- **AI Transcription** - Voice messages & audio files automatically transcribed via Gemini 2.0 Flash
- **Transcript Caching** - Transcripts stored in Firebase to avoid duplicate API calls
- **Waveform Player** - Enhanced audio player with 480px wide waveform

### New UI Features
- **Resizable Sidebars** - Drag handles to resize channel and user lists
- **Collapsible Sidebars** - Click arrows to collapse/expand
- **Server Dropdown** - PISSCORD header has dropdown with useful links
- **Quick Emoji Picker** - Compact picker with categories and recent emojis
- **Markdown Toolbar** - Formatting help popup for chat messages

### Mobile Improvements
- **Fixed Safe Areas** - No more layout cutoff on mobile
- **Dynamic Viewport** - Uses 100dvh for proper mobile browser support

### Simplified Voice
- Voice channels are now the only way to make voice/video calls
- Join muted with camera off by default
`;

async function setupReleaseNotes() {
  console.log(`Setting up release notes for v${CURRENT_VERSION}...`);

  const releaseNotesRef = ref(db, 'system/releaseNotes');

  await set(releaseNotesRef, {
    version: CURRENT_VERSION,
    releaseNotes: RELEASE_NOTES,
    downloadUrl: DOWNLOAD_URL,
    lastUpdated: Date.now()
  });

  console.log('Release notes updated successfully!');
  console.log(`Version: ${CURRENT_VERSION}`);
  console.log(`Download URL: ${DOWNLOAD_URL}`);
  process.exit(0);
}

setupReleaseNotes().catch(error => {
  console.error('Failed to set up release notes:', error);
  process.exit(1);
});
