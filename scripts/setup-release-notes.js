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
const CURRENT_VERSION = "2.1.1";
const DOWNLOAD_URL = `https://github.com/jamditis/pisscord/releases/download/v${CURRENT_VERSION}/Pisscord.Setup.${CURRENT_VERSION}.exe`;

const RELEASE_NOTES = `## What's new in v${CURRENT_VERSION}

This is the consolidated release that v2.1.0 was supposed to be — all features, all fixes, repo cleaned up and verified.

### HD video & audio
- **720p video on desktop, 480p on mobile** — battery-aware resolution defaults
- **48kHz mono audio** — studio-quality voice at half the bandwidth
- **1080p screen share** at 15fps, optimized for text clarity
- **H.264 preferred** — hardware-accelerated codec on all devices
- **ML noise cancellation on mobile** — toggle now works in mobile settings

### Stability
- **Failed messages show a toast** instead of crashing the app
- **Desktop login has a 2-minute timeout** — no more infinite spinners
- **Ghost users eliminated** — onDisconnect fires before presence set
- **Offline banner + reconnection toast** for network state changes
- **Automatic retry with backoff** for messages and presence (3 attempts)
- **PeerJS auto-reconnect** on network/server errors after 2s delay

### Screen sharing
- **Zero-flicker track swap** — replaces video track in-place, no new stream
- **Camera track recovery** — falls back to getUserMedia if ref is lost

### Accessibility
- **WCAG AA contrast** on all muted text across 14 components
- **Visible input borders** in settings fields
- **New color tokens** — \`--text-dim\` at 7.5:1, \`--text-faint\` at 5.5:1

### Test suite
- **293 tests** across 23 files (up from 111 in v2.0.0)
- New coverage: AuthGate, SplashScreen, ThemeContext, GitHub service
- Expanded: firebase, logger, platform, unread, videoEmbed
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
