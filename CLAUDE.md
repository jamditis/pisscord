# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pisscord is a private, multi-platform Discord clone built with React, TypeScript, and PeerJS. It enables direct P2P voice/video calling, encrypted text chat, screen sharing, and AI assistance via Pissbot (powered by Google's Gemini 2.5 Flash), with presence tracking through Firebase Realtime Database.

**Platforms:** Desktop (Electron), Web Browser, Android (Capacitor), Mobile Web
**Current Version:** 1.4.2
**Latest Release:** https://github.com/jamditis/pisscord/releases/tag/v1.4.2

## Key Architecture

### Multi-Platform Architecture
- **Platform Abstraction Layer** (`services/platform.ts`): Unified API for Electron, Capacitor, and Web
- **Lazy Loading**: Capacitor modules loaded dynamically to avoid bundling issues
- **Build Configurations**:
  - `npm run dist` - Desktop (Electron) installer
  - `npm run build:web` - Web browser build
  - `npx cap sync android` - Android (Capacitor) build
- **Platform Detection**: `Platform.isElectron`, `Platform.isCapacitor`, `Platform.isWeb`, `Platform.isMobileWeb`

### End-to-End Encryption
- **AES-256-GCM** encryption for all text messages (`services/encryption.ts`)
- **PBKDF2 Key Derivation**: 100,000 iterations for secure key generation
- **Shared Salt**: Stored in Firebase (`system/encryptionSalt`) - users only need passphrase
- **Passphrase Modal**: First-time users enter group passphrase to unlock encryption
- **Decryption on Read**: Messages decrypted client-side when displayed
- Old unencrypted messages remain readable (graceful fallback)

### P2P Communication Layer
- **PeerJS** handles WebRTC signaling and peer-to-peer connections
- Each user receives a unique peer ID on app initialization
- Voice/video calls are established directly between peers (no relay server)
- **P2P data channels** enable real-time text messaging between connected peers
- Track replacement API (`RTCRtpSender.replaceTrack()`) enables screen sharing without reconnection
- **Platform-specific screen sharing**: Electron desktopCapturer, Web getDisplayMedia

### State Management
- All state lives in `App.tsx` (no Redux/Context)
- Connection state machine: `DISCONNECTED -> CONNECTING -> CONNECTED -> ERROR`
- **Separated view from connection state**:
  - `activeChannelId`: which channel user is viewing (can be text while in voice call)
  - `activeVoiceChannelId`: which voice channel user is connected to (independent of view)
- Media streams stored separately: `myStream` (local) and `remoteStream` (remote)
- Volume control: `remoteVolume` state (0-200%) applied to global audio element

### Firebase Integration
- **Presence system** (`services/firebase.ts`): Users register their peer ID + profile on connect
- `onDisconnect()` handlers automatically remove users when they close the app
- Real-time subscription updates online user list across all clients
- Update system: Centralized version check against `system/latestVersion` in Firebase
- **Encrypted Messages**: Messages encrypted before sending, decrypted on receive
- **Encryption Salt**: Shared salt stored in `system/encryptionSalt`
- **Release Notes**: Version-specific notes stored in `system/releaseNotes`

### Unread Message System
- **Per-user tracking** via localStorage (`services/unread.ts`)
- Each user's read state is independent - not shared
- `markChannelAsRead()` called when user views a channel
- `hasUnreadMessages()` checks if channel has new messages since last read
- Red dot and bold text indicators in `ChannelList.tsx`
- Background subscriptions to all channels detect new messages in real-time

### Release Notes Popup
- **One-time display** per version (`components/ReleaseNotesModal.tsx`)
- Version seen tracked in localStorage
- Fetches notes from Firebase `system/releaseNotes`
- Platform-aware buttons: "Refresh" for web, "Download" for desktop
- Script: `scripts/setup-release-notes.js` updates Firebase notes

### Electron Shell
- `electron.js`: Main process with tray support and auto-updater
- **Single instance lock** prevents multiple app instances
- Minimize-to-tray behavior (closing window hides, doesn't quit)
- IPC bridge via `preload.js` for secure communication (context isolation enabled)
- **Auto-updater** checks GitHub Releases for new versions every 4 hours
- Screen capture permissions granted for `desktopCapturer` API

### Component Structure
- `App.tsx`: Main state container and WebRTC orchestration
- `VoiceStage.tsx`: Video call UI (renders when viewing voice channel)
- `ChatArea.tsx`: Text/AI chat interface
- `ChannelList.tsx`: Navigation + **persistent voice control panel** + **unread indicators**
- `UserList.tsx`: Online users sidebar with direct call buttons
- `UserSettingsModal.tsx`: Tabbed settings (Profile, Voice & Video, Debug Log, About)
- `PassphraseModal.tsx`: First-time encryption passphrase entry
- `ReleaseNotesModal.tsx`: Version update popup with platform-aware actions
- Modal components handle settings and updates

### Services Layer
- `services/platform.ts`: Platform abstraction (Electron/Capacitor/Web detection, update service, link service)
- `services/encryption.ts`: AES-256-GCM encryption/decryption with PBKDF2 key derivation
- `services/unread.ts`: Per-user unread message tracking via localStorage
- `services/firebase.ts`: Firebase integration with encryption support
- `services/geminiService.ts`: Pissbot AI integration with Firebase-loaded context
- `services/sounds.ts`: Sound effects with preloading

### Persistent Voice Architecture
**Key Feature**: Users can browse text channels while remaining in a voice call

#### How it Works
1. **Global Audio Element**: `<audio ref={remoteAudioRef}>` in App.tsx persists across view changes
2. **Persistent Control Panel**: `ChannelList.tsx` shows voice controls when `connectionState === CONNECTED`
3. **View Independence**: Switching to text channels doesn't unmount audio/video elements
4. **Volume Management**: Audio element volume controlled via `remoteVolume` state (0-200%)

#### Voice Control Panel Features
- Live connection status indicator (green pulsing dot)
- Mute/unmute toggle with visual feedback
- Video on/off toggle
- Volume slider (0-200%, supports boosting quiet audio)
- Disconnect button
- Always visible in sidebar when connected, regardless of active channel

## Common Development Commands

### Development
```bash
npm install              # Install dependencies
npm run dev              # Start Vite dev server (http://localhost:5173)
npm run electron:dev     # Launch Electron with hot-reload
```

### Building
```bash
npm run build            # Compile TypeScript + build Vite bundle to dist/
npm run build:web        # Build for web browser deployment
npm run dist             # Build + package Windows installer (.exe in dist/)
npx cap sync android     # Sync web build to Android project
npx cap open android     # Open Android project in Android Studio
```

### TypeScript
```bash
npx tsc --noEmit         # Type check without emitting files
```

## Critical Implementation Details

### WebRTC Track Management
- Original camera track stored in `myVideoTrack.current` ref
- Screen share swaps video track via `replaceTrack()` without renegotiating call
- Browser's native "Stop Sharing" button triggers `screenTrack.onended` handler
- Always revert to original camera track, never create new getUserMedia stream during screen share

### Audio Output Routing
- Remote audio uses persistent `<audio>` element (`remoteAudioRef`) in App.tsx
- Element exists globally to maintain audio across view changes
- Volume controlled via `element.volume = remoteVolume / 100` (supports 0-200%)
- `setSinkId()` applies user-selected output device when changed
- Remote stream assigned directly to `srcObject`, not recreated
- Volume changes are instant (no reconnection needed)

### Call Lifecycle
1. Peer A calls `peer.call(remotePeerId, localStream)`
2. Peer B receives `peer.on('call')` event, calls `call.answer(localStream)`
3. Both peers receive `call.on('stream')` with remote MediaStream
4. `cleanupCall()` stops all tracks, closes call, resets state

### Profile & Device Persistence
- User profile (name, status, color) saved to `localStorage` as `pisscord_profile`
- Device IDs (mic, speakers, camera) saved as `pisscord_devices`
- Changing devices requires reconnecting to apply (not hot-swapped)
- Volume preference persists in component state (resets to 100% on app restart)

### Settings Modal Architecture
Four-tab system in `UserSettingsModal.tsx`:

1. **Profile Tab**: Display name, status message, avatar color selection
2. **Voice & Video Tab**:
   - Device enumeration via `navigator.mediaDevices.enumerateDevices()`
   - Dropdowns for mic, speakers, camera selection
   - Warning about reconnection requirement
3. **Debug Log Tab**:
   - Real-time display of app logs from `logs` state array
   - Color-coded by type (info=green, error=red, webrtc=blue)
   - Timestamps and scrollable history (last 50 entries)
4. **About Tab**:
   - App version display
   - Feature list
   - "Check for Updates" button for manual update checks
   - GitHub repository link

## Environment Configuration

### Required for Pissbot AI Features
Create `.env.local` with:
```
VITE_GEMINI_API_KEY=your_google_gemini_api_key
```
Without this, Pissbot (AI channel) will show error message. Pissbot uses Gemini 2.5 Flash model with comprehensive context about Pisscord features and limitations.

### Firebase Configuration
Hardcoded in `services/firebase.ts` - production config already included.

## Build Artifacts

- `dist/`: Vite build output (HTML, JS, CSS bundles)
- `dist/Pisscord Setup 1.0.X.exe`: Windows installer (created by electron-builder)
- `dist/Pisscord Setup 1.0.X.exe.blockmap`: Update manifest for auto-updater
- `public/`: Static assets copied to dist/ during build (logo images)
- Clean `dist/` folder before building to avoid stale artifacts

## Auto-Update System

- Built with `electron-updater` package
- Checks GitHub Releases for new versions
- Manual check available via Settings → About → Check for Updates
- Downloads updates in background, installs on app restart
- Single instance lock prevents conflicts during updates

## Git Workflow

**IMPORTANT: Always use feature branches for development.**

1. **Never commit directly to `master`** - master branch should only contain stable, tested releases
2. **Create feature branches** for all new work:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Test thoroughly** before merging to master
4. **Merge to master only after confirming stable build**:
   ```bash
   git checkout master
   git merge feature/your-feature-name
   ```
5. **Delete feature branch** after successful merge

### Branch Naming Conventions
- `feature/` - New features (e.g., `feature/group-calls`)
- `fix/` - Bug fixes (e.g., `fix/audio-playback`)
- `release/` - Release preparation (e.g., `release/v1.0.8`)

## Release Workflow

**IMPORTANT: Follow these steps for every new release.**

1. **Build the release**:
   ```bash
   npm run dist
   ```

2. **Create and push git tag**:
   ```bash
   git tag v1.0.X
   git push origin v1.0.X
   ```

3. **Create GitHub release**:
   ```bash
   gh release create v1.0.X --title "Pisscord v1.0.X" --notes "Release notes here"
   gh release upload v1.0.X "dist/Pisscord Setup 1.0.X.exe" "dist/latest.yml"
   ```

4. **Update the website** (REQUIRED for every release):
   - Location: `@website/index.html`
   - Update version number displayed
   - Update download link to new release
   - Update changelog if applicable

## TypeScript Configuration

- Target: ES2020 with bundler module resolution
- Strict mode enabled
- `noUnusedLocals` and `noUnusedParameters` disabled (intentional)
- React JSX transform (no need to import React in TSX files)

## Recent Changes (v1.1.0 - v1.4.0)

### v1.4.0 (2025-12-08)
- **Web Browser Version:** Pisscord now runs directly in web browsers (no download needed)
- **End-to-End Encryption:** AES-256-GCM encryption for all text messages
- **Unread Message Indicators:** Red dot and bold text for channels with unread messages
- **Release Notes Popup:** One-time modal showing what's new per version
- **Passphrase Modal:** Simple passphrase entry for group encryption
- **Per-user Read State:** Each user's unread state is independent
- **Mobile Web Support:** Optimized touch UI for mobile browsers

### v1.3.1 (2025-12-06)
- **Removed Voice Channel Approval:** Simplified voice channel joining
- **Renamed Voice Lounge to Chillin':** Channel name update
- **Website Updates:** Improved landing page and user guides

### v1.3.0 (2025-12-06)
- **Android App:** Native Android app via Capacitor
- **Platform Abstraction Layer:** Unified API for Electron, Capacitor, and Web
- **Platform Detection:** Accurate detection of Electron, Capacitor, Web, Mobile Web
- **Theme Customization:** Gold and Purple theme options
- **Mobile User Guide:** Added comprehensive mobile user documentation
- **Mobile UI/UX:** Themed splash screen, status bar padding, animations
- **Security Fix:** Rotated Firebase API key, moved to environment variables

### v1.1.1 (2025-12-06)
- **Bug Fixes:** Various UX improvements
- **Pissbot Config:** Updated AI context

### v1.1.0 (2025-12-06)
- **Voice Channel Approval Mode:** Channels can require approval to join when occupied
- **Collapsible User List:** User sidebar can be collapsed/expanded in voice and text channels
- **User List in Voice Calls:** User sidebar now visible alongside voice stage
- **Bugfix:** Voice channel view switching no longer forces rejoin
- **Bugfix:** Profile updates preserve voice channel state (users don't disappear)
- **Bugfix:** Speaking indicator uses box-shadow instead of ring (no layout shift)
- **Bugfix:** Video spotlight layout rewritten with cleaner flexbox approach
- **UI:** Removed "Add Server" button, Pisscord logo replaces home icon
- **UI:** Pissbot channel moved to bottom of text channels

### v1.0.14 (2025-12-06)
- **Video Spotlight:** Click any video tile to pin/maximize it during calls
- **Speaking Indicator:** Green ring around avatars when user is speaking (Web Audio API activity detection)
- **Markdown Chat:** Full Discord-style markdown rendering (bold, italic, code, headers, lists, links)
- **Voice Channel Users:** Users now appear nested under voice channels in sidebar
- **Second Voice Channel:** Added "Gaming" voice channel
- **Bugfix:** Fixed bug report submission error (Firebase rejects undefined values)
- **Bugfix:** Added manual download fallback for auto-updater
- **Bugfix:** Fixed profile picture sync to Firebase presence

### v1.0.13 (2025-12-06)
- **Mesh Networking:** True many-to-many group calls (replaces 1:1 calling)
- **File Sharing:** Drag & drop images/files in chat with Firebase Storage
- **Profile Pictures:** Upload custom avatars synced across users
- **Community Channels:** Added #issues for bug reporting, #dev-updates for GitHub commit feed
- **MOTD System:** Message of the day displayed on app launch
- **Message Retention:** 14-day automatic message cleanup

### v1.0.12 (2025-12-06)
- **Major Refactor:** Converted to mesh networking architecture
- **Firebase Storage:** Integrated file upload and sharing
- **Bug Reports:** In-app bug submission to Firebase

### v1.0.11 (2025-12-06)
- **Bugfix:** Fixed version mismatch - APP_VERSION in App.tsx now syncs with package.json
- **Feature:** Pissbot context now loaded from Firebase (editable without rebuilding)
- **Firebase:** Added `/pissbot` config path for dynamic AI context

### v1.0.10 (2025-12-06)
- **Bugfix:** Fixed critical startup error - `createWindow` function needed `async` keyword for `await` usage

### v1.0.9 (2025-12-06)
- **Sound Effects:** Added audio feedback for user join/leave, mute/unmute, incoming/outgoing calls
- **Toast Notifications:** Replaced browser alerts with clean toast notifications
- **Context Menu:** Right-click anywhere for quick actions (copy peer ID, mute, settings, disconnect)
- **Confirmation Modals:** Native-looking dialogs for important actions (incoming calls, disconnect)
- **Dev Mode Improvements:** Auto-detect Vite dev server port (scans 5173-5180), better `app.isPackaged` detection

### Components Added (v1.0.9+)
- `components/Toast.tsx` - Toast notification system with auto-dismiss
- `components/ContextMenu.tsx` - Right-click context menu with `useContextMenu` hook
- `components/ConfirmModal.tsx` - Confirmation dialogs with callbacks
- `services/sounds.ts` - Sound effects service with preloading and volume control

### Sound Files (public/assets/)
- `user_join_sound.mp3` / `user_leave_sound.mp3`
- `mic_muted_sound.mp3` / `mic_unmuted_sound.mp3`
- `incoming_call_sound.mp3` / `outgoing_call_sound.mp3`

## Firebase Usage

### Current Firebase Paths
- `users/` - Presence system (online users, peer IDs, profiles)
- `messages/{channelId}/` - Encrypted chat messages
- `system/latestVersion` - Version checking for auto-updates
- `system/releaseNotes` - Version-specific release notes
- `system/encryptionSalt` - Shared salt for message encryption
- `system/motd` - Message of the day
- `pissbot/` - Dynamic AI context configuration
- `joinRequests/{channelId}/` - Voice channel join requests
- Location: `services/firebase.ts`

### Firebase Free Tier Limits (Spark Plan)
| Service | Free Limit |
|---------|------------|
| Realtime Database | 1 GB stored, 10 GB/month download |
| Cloud Firestore | 1 GB stored, 50K reads/day, 20K writes/day |
| Authentication | Unlimited users |
| Cloud Storage | 5 GB stored, 1 GB/day download |
| Cloud Functions | 2M invocations/month |

### Future Features
1. **Friends/Contacts List** - Save favorite peer IDs with names
2. **Call History** - Log calls in Firebase (who, when, duration)
3. **Push Notifications** - Firebase Cloud Messaging for mobile

### Pissbot Firebase Config

Pissbot's AI context is now fetched from Firebase instead of being hardcoded. This allows updating the AI's knowledge without rebuilding the app.

**Firebase Path:** `/pissbot`

**Structure:**
```json
{
  "systemPrompt": "Personality and role instructions",
  "context": "App info, features, current version",
  "patchNotes": "Recent version changes",
  "documentation": "User guides and troubleshooting",
  "lastUpdated": 1733513000000
}
```

**To Update Pissbot:**
1. Go to Firebase Console: https://console.firebase.google.com/project/pisscord-edbca/database/pisscord-edbca-default-rtdb/data/pissbot
2. Edit any field directly in the console
3. Changes take effect within 5 minutes (cache TTL)

**Setup Script:** `node scripts/setup-pissbot-config.js` - Initializes or resets Pissbot config

**Code Flow:**
1. `geminiService.ts` calls `getPissbotConfig()` from firebase.ts
2. Config is cached for 5 minutes to reduce Firebase reads
3. If Firebase unavailable, falls back to minimal hardcoded prompt
4. System instruction built from: systemPrompt + context + patchNotes + documentation
