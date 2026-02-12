/**
 * Setup Release Notes in Firebase
 *
 * Run this script to update the release notes that appear to users
 * when they launch a new version of the app.
 *
 * Usage: node scripts/setup-release-notes.js
 */

require('dotenv').config({ path: '.env.local' });
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
const CURRENT_VERSION = "2.1.0";
const DOWNLOAD_URL = `https://github.com/jamditis/pisscord/releases/download/v${CURRENT_VERSION}/Pisscord.Setup.${CURRENT_VERSION}.exe`;

const RELEASE_NOTES = `## What's New in v${CURRENT_VERSION}

### HD video & audio
- **720p video on desktop, 480p on mobile** — sharper picture with battery-aware defaults
- **48kHz audio** — studio-quality voice at half the bandwidth (mono for voice calls)
- **1080p screen share** — optimized for text clarity at 15fps
- **H.264 preferred** — hardware-accelerated codec for smoother video on all devices
- **ML noise cancellation** — now available on mobile settings too

### Crash prevention & stability
- **Messages won't crash the app** — failed sends show an error toast instead of breaking the UI
- **Desktop login won't hang** — sign-in window has a 2-minute timeout with clean fallback
- **Ghost users gone** — closing the app removes you from the online list immediately
- **Network recovery** — offline banner when disconnected, reconnection toast when back
- **Automatic retry** — messages and presence retry up to 3 times with backoff

### Screen sharing
- **No more flicker** — track swapped in-place instead of creating a new stream
- **Camera recovery** — grabs a fresh camera track if the original gets lost

### Accessibility
- **Higher contrast text** — all muted text bumped to WCAG AA ratios across 14 components
- **Visible input fields** — settings inputs now have borders so you can tell they're editable

### Under the hood
- **181 tests** across 19 test files (up from 111 in v2.0.0)
- Extracted webrtcUtils module for AV constraint building and codec preference
- Z-index system standardized, safe-area CSS updated, font preloading added
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
