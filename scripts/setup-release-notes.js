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
const CURRENT_VERSION = "2.1.2";
const DOWNLOAD_URL = `https://github.com/jamditis/pisscord/releases/download/v${CURRENT_VERSION}/Pisscord.Setup.${CURRENT_VERSION}.exe`;

const RELEASE_NOTES = `## What's new in v${CURRENT_VERSION}

Security hardening, reliability fixes, and full logger migration.

### Security
- **XSS fix** — markdown link renderer now blocks javascript: and data: protocol URLs
- **Message validation** — Firebase messages pass through type guards before rendering
- **Non-ASCII URL fix** — transcript caching no longer crashes on URLs with special characters

### Reliability
- **Listener cleanup** — Capacitor and Electron event listeners now properly removed on unmount
- **Voice recording guard** — prevents double-send when timer and stop button fire simultaneously
- **Stale closure fixes** — handleStartCall and recording timer use refs for current values
- **Presence update** — accepting a call now correctly updates your voice channel presence
- **Fetch cancellation** — switching away from #dev-updates cancels pending GitHub API calls
- **Audio context lifecycle** — remote speaking detection no longer destroys/recreates on every stream change

### Quality
- **Full logger migration** — all 28 raw console calls replaced with centralized logger (0 remaining)
- **Dead code removed** — LogService, ConfirmModal, pendingCallRef, unused User interface
- **Type safety** — platform.ts uses proper ElectronUpdateInfo/DownloadProgress types
- **313 tests** across 24 files (up from 293 in v2.1.1, 20 new tests)
- New test coverage: XSS protection, message validation, non-ASCII URLs
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
