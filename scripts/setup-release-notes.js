/**
 * Setup Release Notes in Firebase
 *
 * Run this script to update the release notes that appear to users
 * when they launch a new version of the app.
 *
 * Usage: node scripts/setup-release-notes.js
 */

import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set } from 'firebase/database';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: "pisscord-edbca.firebaseapp.com",
  databaseURL: "https://pisscord-edbca-default-rtdb.firebaseio.com",
  projectId: "pisscord-edbca",
  storageBucket: "pisscord-edbca.firebasestorage.app",
  messagingSenderId: "582017997210",
  appId: "1:582017997210:web:8e2a1bb4f38c2c8e8c3f3a"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// UPDATE THESE FOR EACH RELEASE
const CURRENT_VERSION = "1.4.0";
const DOWNLOAD_URL = `https://github.com/jamditis/pisscord/releases/download/v${CURRENT_VERSION}/Pisscord.Setup.${CURRENT_VERSION}.exe`;

const RELEASE_NOTES = `## What's New in v${CURRENT_VERSION}

### Web Browser Version
- **Pisscord Web** - Use Pisscord directly in your browser, no download required!
- Works on desktop and mobile browsers
- Same features as the desktop app
- Refresh the page to get updates

### End-to-End Encryption
- **AES-256-GCM encryption** for all text messages
- Messages encrypted on your device before leaving
- Only your group (with the shared passphrase) can read messages
- Voice and video remain P2P encrypted via WebRTC

### Unread Message Indicators
- Channels with unread messages show a red dot
- Unread channels appear bold in the channel list
- Per-user tracking - your read state is yours alone

### Release Notes Popup
- See what's new when you update
- One-time popup per version
- Direct links to download or refresh

### Other Improvements
- Better mobile web browser detection
- Platform-specific update buttons (Refresh for web, Download for desktop)
- Updated website and user guide with accurate security info
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
