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
const CURRENT_VERSION = "1.4.6";
const DOWNLOAD_URL = `https://github.com/jamditis/pisscord/releases/download/v${CURRENT_VERSION}/Pisscord.Setup.${CURRENT_VERSION}.exe`;

const RELEASE_NOTES = `## What's New in v${CURRENT_VERSION}

### Simplified Experience
- **Removed encryption** - No more passphrase prompts! Messages are stored securely in your private Firebase database.
- **Cleaner setup** - Just set your name and start chatting

### Mobile Improvements
- **Audio unlock banner** - Tap the yellow banner to enable audio when your browser blocks autoplay
- **Battery saver** - App now mutes mic/camera when minimized to save battery

### Visual Refresh
- **Void/Cyberpunk theme** - New dark aesthetic with glassmorphism effects
- **Updated fonts** - Outfit for body, Dela Gothic One for headers
- **Smoother UI** - More rounded corners and subtle animations
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
