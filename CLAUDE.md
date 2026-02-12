# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚨 Handoff Note / Status (v2.1.0)
**Current State:** v2.1.0 on `feature/hardening-v2.1.0` branch. Stabilization and hardening across all subsystems.
**Last Updated:** 2026-02-11

### Recent Work (v2.1.0 - Stabilization & Hardening)
- **sendMessage crash prevention:** `addMessage` is now async with try/catch. Failed Firebase writes show an error toast instead of crashing.
- **Electron auth timeout:** `google-sign-in` IPC handler has 120s global timeout + 60s `executeJavaScript` timeout via `Promise.race`. Closes window and rejects cleanly on timeout.
- **Ghost user prevention:** `registerPresence` and `updatePresence` now call `onDisconnect().remove()` BEFORE `set()`. If `set()` fails, the `onDisconnect` handler is cancelled. No more ghost users.
- **Firebase connection monitoring:** `subscribeToConnectionState` is now wired up in App.tsx. Shows "Database offline" banner when Firebase disconnects, "Reconnected" toast when back.
- **Screen share anti-flicker:** `startScreenShareWithStream` and `stopScreenShare` now swap tracks in-place on the existing `MediaStream` using `removeTrack()/addTrack()` instead of creating new streams. No `setMyStream()` call = no React re-render = zero flicker.
- **Camera track recovery:** If `myVideoTrack.current` is null when stopping screen share, the app recovers by calling `getUserMedia({ video: true })` and replacing across all peer connections.
- **Track cleanup by ID:** Screen track cleanup uses `track.id` comparison (stored in `screenTrackIdRef`) instead of `track.label`, which can be ambiguous.
- **setSinkId guard:** Only calls `setSinkId()` when the device actually changes (checks `el.sinkId` first). Prevents audio pops on re-renders.
- **srcObject guard:** Only reassigns `<audio>.srcObject` when the stream reference changes.
- **PeerJS error recovery:** `network` and `server-error` types now trigger `peer.reconnect()` after 2s delay.
- **Firebase retry utility:** `withRetry<T>()` with exponential backoff (1s → 2s → 4s). Applied to `registerPresence` and `sendMessage`.
- **Logging standardization:** App.tsx `log()` now routes through centralized `logger` module. Debug tab state fed from logger's subscriber pattern.
- **Z-index scale:** Named tiers in Tailwind config: `splash(9999)`, `context(300)`, `toast(200)`, `modal(30)`, `alert(60)`, `navigation(50)`, `overlay(20)`, `content(10)`. All 14 component files updated.
- **Safe-area CSS:** `.safe-top` and `.safe-bottom` now use `max()` with fallback minimums.
- **Font preloading:** `<link rel="preload" as="style">` with `onload` swap for FOUT prevention.
- **Volume slider cap:** Per-user volume slider maxed at 100% (was 200% but clamped to 100% at the audio element).
- **Test suite:** 153 tests across 18 files — new tests for retry utility, connection state, ghost user prevention.
- **Files changed:** `App.tsx`, `services/firebase.ts`, `services/logger.ts`, `electron.js`, `index.html`, `index.css`, `components/VoiceStage.tsx`, 12 component files (z-index updates), 3 new/expanded test files.

### Recent Work (Accessibility & Contrast Pass)
- **Color token overhaul:** `--text-dim` bumped `#9898a8` → `#b0b0c0` (~7.5:1 contrast). New `--text-faint: #8888a0` (~5.5:1) for tertiary text. Both defined in `index.css` and `index.html` Tailwind config.
- **14 component files updated:** Replaced all `text-white/30` (~1.9:1, fails AA), `text-white/40` (~2.5:1, fails AA), `text-gray-400/500` (~3.6:1, borderline) with semantic `text-discord-muted` and `text-discord-faint` tokens.
- **Desktop settings inputs:** Display Name and Status fields changed from `border-none` to `border border-white/10` with `focus:border-purple-500/50` — they were invisible as inputs before.
- **Files changed:** `index.css`, `index.html`, `ChatArea.tsx`, `ChannelList.tsx`, `UserList.tsx`, `App.tsx`, `UserSettingsModal.tsx`, `VoiceStage.tsx`, `ReportIssueModal.tsx`, `ContextMenu.tsx`, `ServerDropdown.tsx`, `QuickEmojiPicker.tsx`, `AuthGate.tsx`, `LoginScreen.tsx`, `SplashScreen.tsx`.
- **Verification:** Zero remaining `text-white/(20|25|30|40)` or `text-gray-[345]00` in any .tsx file. TypeScript clean. 153 tests pass.

### Action Items for Next Session
- **Mobile viewport review with Playwright:** Open app at 390x844 viewport and audit all mobile views (chat, channels, settings, voice) for remaining contrast/accessibility issues. Desktop pass is complete.
- Smoke test Electron sign-in on a clean install
- Smoke test web sign-in on `web.pisscord.app`
- Remaining v2.1.0 plan items: `npm run build:web && firebase deploy`, `npm run dist` for Electron, manual mobile test on Android via Capacitor
- Consider merging `feature/hardening-v2.1.0` to `master` after mobile review passes

### Previous Work (v2.0.5 - Auth Fix)
- **Electron Google Sign-In Fixed:** IPC handler opens web app in BrowserWindow for OAuth from https:// origin.
- **Three-platform auth:** Capacitor (native), Electron (BrowserWindow), Web (`signInWithPopup`) — all converge on `signInWithCredential`.

### Previous Work (v2.0.0 - Production Hardening)
- **Centralized Logging:** `services/logger.ts` replaces scattered console calls with structured `[TIMESTAMP] [LEVEL] [MODULE]` output, in-memory buffer (200 entries), debug log tab integration
- **React Error Boundary:** `components/ErrorBoundary.tsx` catches render errors with fallback UI + global `window.onerror`/`onunhandledrejection` handlers
- **Type Safety:** Fixed 13+ `any` types across firebase.ts, App.tsx, types.ts, geminiService.ts — PeerJS refs typed, Message/PresenceUser validated at boundaries
- **Auth Race Condition Fixed:** `AuthContext.tsx` now defers auth state until redirect check completes, preventing infinite login loop
- **Firebase Operations Hardened:** `sendMessage` awaited, `registerPresence`/`updatePresence` async with error handling, `subscribeToUsers` has error callback, batch cleanup
- **Memory Leaks Fixed:** Audio cache reuse in sounds.ts, AudioContext cleanup in VoiceStage.tsx, isMountedRef guards in App.tsx async ops
- **Gemini Service Fixed:** Removed hardcoded API key fallback, added Firebase Remote Config path, AbortController for timeouts
- **Test Suite:** 141 unit tests across 16 files (Vitest + Testing Library), expanded to 153 in v2.1.0. Playwright E2E smoke tests
- **Auth Error Handling:** Specific error messages per Firebase error code, email link expiry, useAuth throws outside provider

### Action Items for Next Session
- Smoke test Electron sign-in on a clean install
- Smoke test web sign-in on `web.pisscord.app` (may need a few minutes for Google OAuth propagation)
- Do not revert the mobile layout fixes or the `services/platform.ts` abstraction

## 🐛 Known Issues (v1.4.8 Backlog)

**Sound Effects (Browser Limitation):**
- Startup/launch sound doesn't play during splash (browser blocks autoplay without user interaction)
- This is expected behavior - user must tap/click first to unlock audio
- **Location:** `services/sounds.ts` and call sites in `App.tsx`, `VoiceStage.tsx`

**Voice Channel Join Defaults:** ✅ FIXED
- Users now join voice channels **muted and with camera off** by default
- Changed `isVideoEnabled` and `isAudioEnabled` initial state to `false` in `App.tsx:132-133`
- Tracks are disabled immediately after `getLocalStream()` at `App.tsx:516-519`

**Auth & Stability:** ✅ FIXED in v2.0.0 / v2.0.5
- Auth race condition (infinite login loop) fixed in `contexts/AuthContext.tsx`
- Firebase operations hardened with async/await and error handling
- Memory leaks fixed across audio, WebRTC, and async operations
- Error boundary added to catch render crashes
- **Electron sign-in fixed (v2.0.5):** `signInWithPopup` can't work from `file://` origin. New IPC flow opens web app in BrowserWindow.
- **OAuth client config fixed (v2.0.5):** Added `web.app` and `web.pisscord.app` to authorized origins/redirects in Google Cloud Console

**Bug: Battery Saving Feature Interrupts Active Voice Calls:** ✅ FIXED
- App used to go to sleep/pause when minimized, breaking active voice calls
- **Fix:** Added `activeVoiceChannelIdRef` to track voice call state in async callbacks
- When app goes to background:
  - If in voice call: Keep audio enabled, only disable video (saves battery, call continues)
  - If not in call: Disable both audio and video (original behavior)
- Also added `document.visibilitychange` listener for mobile web browsers
- **Location:** `App.tsx:186` (ref), `App.tsx:266-301` (lifecycle handlers)

**Upgrade to Gemini 2.5 Flash:**
- Currently using `gemini-2.0-flash` for Pissbot and transcription
- Attempted upgrade to `gemini-2.5-flash` caused "API connection error" in Pissbot channel
- Transcription worked fine with 2.5, but chat with systemInstruction failed
- **Next steps:** Investigate if issue is with systemInstruction config format for 2.5
- **Location:** `services/geminiService.ts`
- **Priority:** Low - 2.0 Flash works fine, 2.5 just has better reasoning

**Feature Idea: #dev Channel with AI Error Translation:**
- Password-protected developer channel that captures console logs/errors
- Sends errors to Pissbot for translation into user-friendly language
- Displays translated errors as dynamic toast notifications
- **Safeguards needed:**
  - Rate limiting (max N requests per minute)
  - Chunking/truncation for long error messages
  - Token budget to prevent overloads
  - Deduplication of repeated errors
- **Implementation notes:**
  - Hook into `console.error` and `window.onerror`
  - Queue errors with debounce before sending to Gemini
  - Cache translations for identical errors

## Project Overview

Pisscord is a private, multi-platform Discord clone built with React, TypeScript, and PeerJS. It enables direct P2P voice/video calling, text chat, screen sharing, and AI assistance via Pissbot (powered by Google's Gemini 2.5 Flash), with presence tracking through Firebase Realtime Database.

**Platforms:** Desktop (Electron), Web Browser, Android (Capacitor), Mobile Web
**Current Version:** 2.1.0
**Latest Release:** https://github.com/jamditis/pisscord/releases/tag/v2.1.0

## Key Architecture

### Multi-Platform Architecture
- **Platform Abstraction Layer** (`services/platform.ts`): Unified API for Electron, Capacitor, and Web
- **Lazy Loading**: Capacitor modules loaded dynamically to avoid bundling issues
- **Build Configurations**:
  - `npm run dist` - Desktop (Electron) installer
  - `npm run build:web` - Web browser build
  - `npx cap sync android` - Android (Capacitor) build
- **Platform Detection**: `Platform.isElectron`, `Platform.isCapacitor`, `Platform.isWeb`, `Platform.isMobileWeb`

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
- Volume control: `remoteVolume` state (master) + `userVolumes` Map for per-user control (0-200%)
- **Stale Closure Pattern**: `connectionStateRef` used to avoid stale state in async callbacks (peer.on('call'))

### Firebase Integration
- **Presence system** (`services/firebase.ts`): Users register their peer ID + profile on connect
- `onDisconnect()` handlers automatically remove users when they close the app
- Real-time subscription updates online user list across all clients
- Update system: Centralized version check against `system/latestVersion` in Firebase
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
- `ChatArea.tsx`: Text/AI chat interface with file uploads
- `ChannelList.tsx`: Navigation + **persistent voice control panel** + **unread indicators** + **collapsible**
- `UserList.tsx`: Online users sidebar (shows voice channel indicator when users are in voice) + **collapsible**
- `UserSettingsModal.tsx`: Tabbed settings (Profile, Voice & Video, Appearance, Debug Log, About)
- `ReleaseNotesModal.tsx`: Version update popup with platform-aware actions
- `ServerDropdown.tsx`: PISSCORD header dropdown menu with external links
- `ResizeHandle.tsx`: Drag handle for resizable sidebars
- `VoiceMessageButton.tsx`: Record and send voice messages with MediaRecorder API
- `AudioMessage.tsx`: Audio player with waveform, playback controls, and Gemini transcription
- `MarkdownToolbar.tsx`: Formatting help popup for chat messages
- `QuickEmojiPicker.tsx`: Compact emoji picker with categories and recent emojis

### Hooks
- `hooks/useIsMobile.ts`: Mobile device detection
- `hooks/useResizablePanel.ts`: Drag-to-resize with localStorage persistence

### Services Layer
- `services/logger.ts`: Structured logging with levels (debug/info/warn/error), module tagging, 200-entry buffer for debug log tab
- `services/platform.ts`: Platform abstraction (Electron/Capacitor/Web detection, update service, link service)
- `services/unread.ts`: Per-user unread message tracking via localStorage
- `services/firebase.ts`: Firebase integration (presence, messaging, file uploads, transcript caching)
- `services/geminiService.ts`: Pissbot AI + audio transcription via Gemini 2.0 Flash (multimodal)
- `services/sounds.ts`: Sound effects with preloading and audio cache reuse
- `services/auth.ts`: Firebase Auth with email link + Google sign-in, specific error messages per failure code

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
- Per-user volume control (click volume icon on video tiles, 0-200%)
- Disconnect button
- Always visible in sidebar when connected, regardless of active channel

### Audio Processing
- **Noise Suppression**: Browser-native noise suppression via `MediaTrackConstraints`
- **Echo Cancellation**: Reduces echo/feedback in calls
- **Auto Gain Control**: Normalizes microphone volume automatically
- All three toggleable in Settings > Voice & Video
- Settings persisted in `localStorage` as part of `pisscord_devices`
- Applied via `getUserMedia()` audio constraints when starting/joining calls

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

### Testing
```bash
npm test                 # Run all unit tests (vitest)
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report (services, components, contexts, hooks)
npm run test:e2e         # Playwright E2E smoke tests (requires dev server)
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
- **Per-user volume**: `userVolumes` Map tracks individual user volumes (0-200%)
- `setSinkId()` applies user-selected output device when changed
- Remote stream assigned directly to `srcObject`, not recreated
- Volume changes are instant (no reconnection needed)

### Audio Input Processing
- `getLocalStream()` applies audio constraints from device settings:
  - `noiseSuppression`: Reduces background noise (breathing, typing, fans)
  - `echoCancellation`: Prevents echo/feedback loops
  - `autoGainControl`: Normalizes microphone volume
- All enabled by default, toggleable in settings
- Changes require reconnecting to apply (constraints set at stream creation)

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
Five-tab system in `UserSettingsModal.tsx`:

1. **Profile Tab**: Display name, status message, avatar color selection
2. **Voice & Video Tab**:
   - Device enumeration via `navigator.mediaDevices.enumerateDevices()`
   - Dropdowns for mic, speakers, camera selection
   - **Audio Processing toggles**: Noise suppression, echo cancellation, auto gain control
   - Warning about reconnection requirement
3. **Appearance Tab**:
   - Theme selection (coming soon)
   - **Privacy & Security section**: Shows private family server status
4. **Debug Log Tab**:
   - Real-time display of app logs from `logs` state array
   - Color-coded by type (info=green, error=red, webrtc=blue)
   - Timestamps and scrollable history (last 50 entries)
5. **About Tab**:
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

## Recent Changes (v1.1.0 - v2.1.0)

### v2.1.0 (2026-02-11) — Stabilization & Hardening
- **Crash Prevention:** `sendMessage` wrapped in async try/catch with error toast, Electron auth IPC has 120s timeout
- **Ghost User Prevention:** `onDisconnect().remove()` called before `set()` in registerPresence/updatePresence
- **Firebase Connection Monitoring:** Offline indicator banner, reconnection toast
- **Screen Share Anti-Flicker:** In-place track swap on existing MediaStream (no new stream = no re-render)
- **Camera Track Recovery:** Falls back to `getUserMedia()` if camera track ref is lost during screen share
- **Track Cleanup by ID:** Uses `track.id` instead of `track.label` for reliable screen track identification
- **Audio Output Guard:** `setSinkId()` only fires when device actually changes; `srcObject` guard on audio elements
- **PeerJS Error Recovery:** `network`/`server-error` types trigger automatic `peer.reconnect()` after 2s
- **Firebase Retry Utility:** `withRetry<T>()` with exponential backoff applied to `registerPresence` and `sendMessage`
- **Logging Standardization:** App.tsx `log()` routes through centralized `logger` module with subscriber pattern
- **Z-Index Scale:** Named tiers in Tailwind config across 14 components (splash, context, toast, modal, alert, navigation, overlay, content)
- **Safe-Area CSS:** `.safe-top`/`.safe-bottom` with `max()` fallback minimums
- **Font Preloading:** `<link rel="preload" as="style">` with onload swap
- **Volume Slider Cap:** Per-user slider maxed at 100% (was 200% but clamped)
- **Test Suite:** 153 tests across 18 files (12 new tests for retry, connection state, ghost prevention)
- **Files:** App.tsx, services/firebase.ts, electron.js, index.html, index.css, VoiceStage.tsx, 12 components, 3 test files

### v2.0.5 (2026-02-10) — Auth Fix
- **Electron Google Sign-In Fixed:** Replaced broken `signInWithPopup` (fails from `file://` origin) with IPC-based flow that opens deployed web app in a `BrowserWindow`, runs popup auth from `https://` origin, extracts ID token via `executeJavaScript`, passes to renderer for `signInWithCredential`
- **Google OAuth Client Config Fixed:** Added missing authorized JS origins (`pisscord-edbca.web.app`, `web.pisscord.app`) and redirect URIs (`/__/auth/handler` for both) in Google Cloud Console — was only configured for `firebaseapp.com`
- **Three-Platform Auth:** Capacitor (native OS sign-in), Electron (web app BrowserWindow), Web (`signInWithPopup`) — all converge on `signInWithCredential`
- **Files:** `electron.js`, `preload.js`, `services/auth.ts`

### v2.0.0 (2026-02-10) — Production Hardening
- **Centralized Logging:** `services/logger.ts` with structured output, 200-entry in-memory buffer, debug/info/warn/error levels
- **React Error Boundary:** `components/ErrorBoundary.tsx` wraps app with fallback UI, global error handlers
- **Type Safety Overhaul:** 13+ `any` types replaced with proper types (PeerJS refs, Message, PresenceUser, Electron API)
- **Auth Race Condition Fixed:** Infinite login loop caused by redirect/auth listener race condition resolved
- **Firebase Operations Hardened:** All writes awaited, async error handling, batch cleanup, connection state monitoring
- **Memory Leak Fixes:** Audio cache reuse, AudioContext cleanup, isMountedRef guards, AbortController for fetches
- **Gemini Service Security:** Removed hardcoded API key fallback, Firebase Remote Config integration
- **Test Suite (111 tests):** Vitest + Testing Library across services, components, hooks, contexts
- **E2E Tests:** Playwright smoke tests (app loads, title check, UI renders, no console errors)
- **Auth Error Messages:** Specific messages for each Firebase Auth error code, email link expiry cleanup

### v1.5.0 (2025-12-09)
- **Voice Messages:** Record and send voice messages with VoiceMessageButton component
- **Audio Transcription:** Voice messages and audio files automatically transcribed via Gemini 2.0 Flash
- **Transcript Caching:** Transcripts stored in Firebase `/transcripts` to avoid duplicate API calls
- **Audio Player:** Waveform audio player with playback controls (480px wide, 30 bars)
- **File Upload Metadata:** All files now show size badge and extension label
- **Resizable Sidebars:** Channel and user lists can be resized via drag handles
- **Collapsible Sidebars:** Click arrows to collapse/expand sidebars
- **Server Dropdown Menu:** PISSCORD header now has dropdown with Product Page, User Guide, Latest Release, Contact links
- **Quick Emoji Picker:** Compact emoji picker with categories and recent emojis
- **Markdown Toolbar:** Formatting help popup for chat messages
- **Mobile Safe Areas:** Fixed mobile layout cutoff with `env(safe-area-inset-*)`
- **Dynamic Viewport:** Updated CSS to use `100dvh` for proper mobile browser support
- **Simplified Voice:** Removed direct calls - voice channels are now the only way to make voice/video calls
- **Voice Join Defaults:** Users now join voice channels muted with camera off by default

### v1.4.7 (2025-12-08)
- **UI Parity**: Desktop UI now matches Mobile/Web with full Void/Cyberpunk aesthetic
- **New Sounds**: Replaced all sound effects with UIAlert sound set
- **Fixed Splash Screen**: Animation no longer repeats during app initialization
- **Fixed Release Notes Modal**: Now properly dismisses when clicking "Refresh" on web
- **Scanlines**: CRT effect properly layered (doesn't obscure video content)

### v1.4.6 (2025-12-08)
- **Removed Encryption**: Simplified messaging by removing client-side encryption (private family server doesn't need it)
- **Mobile Audio Unlock**: Added "Tap to enable audio" banner when mobile browsers block autoplay
- **App Lifecycle Handling**: Mutes mic/camera when app is backgrounded to save battery
- **Desktop UI Update**: Refreshed Desktop UI to match Pisscord branding (Void palette, glassmorphism)

### v1.4.5 (2025-12-08)
- **Auto-Answer Calls**: Removed confirmation popup for incoming voice calls - all calls auto-answer in trusted private server
- **Android App Icons**: Fixed app icon to display Pisscord purple logo instead of default Capacitor icon
- **Build Fixes**: Fixed Android APK build (reduced bloat from 446MB to 5.5MB)
- **Gradle Compatibility**: Downgraded AGP to 8.2.2 and Gradle to 8.5 for Capacitor plugin compatibility

### v1.4.4 (2025-12-08)
- **Audio Processing Controls**: Noise suppression, echo cancellation, auto gain control toggles in Settings > Voice & Video
- **Per-User Volume Control**: Click volume icon on any user's video tile to adjust their volume (0-200%)
- **Bugfix: Voice Channel Approval**: Fixed popup appearing incorrectly when joining public voice channels (stale closure fix using `connectionStateRef`)
- **Bugfix: Mobile Nav Links**: Fixed navigation to mobile user guide in docs
- **GitHub Action**: Auto-updates Firebase `system/latestVersion` when releases are published

### v1.4.0 (2025-12-08)
- **Web Browser Version:** Pisscord now runs directly in web browsers (no download needed)
- **Unread Message Indicators:** Red dot and bold text for channels with unread messages
- **Release Notes Popup:** One-time modal showing what's new per version
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
- `messages/{channelId}/` - Chat messages
- `transcripts/{base64Key}` - Cached audio transcriptions from Gemini
- `system/latestVersion` - Version checking for auto-updates
- `system/releaseNotes` - Version-specific release notes
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

**To Update Pissbot (recommended):**
1. Edit `scripts/setup-pissbot-config.js` with new version info, features, etc.
2. Run: `node scripts/setup-pissbot-config.js`
3. Changes take effect within 5 minutes (cache TTL)

**Alternative: Manual Firebase Console:**
1. Go to: https://console.firebase.google.com/project/pisscord-edbca/database/pisscord-edbca-default-rtdb/data/pissbot
2. Edit any field directly in the console

**Conversation Memory:**
- Pissbot receives the last 20 messages as conversation context
- This allows follow-up questions like "what did you just say?" or "tell me more"
- Conversation history is per-session (resets when page refreshes)

**Code Flow:**
1. `geminiService.ts` calls `getPissbotConfig()` from firebase.ts
2. Config is cached for 5 minutes to reduce Firebase reads
3. `ChatArea.tsx` passes last 20 messages as conversation history
4. If Firebase unavailable, falls back to minimal hardcoded prompt
5. System instruction built from: systemPrompt + context + patchNotes + documentation

---

## Multi-machine workflow

This repo is developed across multiple machines (MacBook, work Windows PC, home Windows PC). GitHub is the source of truth.

**Before switching machines:**
```bash
git add . && git commit -m "WIP" && git push
```

**After switching machines:**
```bash
git pull
```
