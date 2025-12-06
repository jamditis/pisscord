# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pisscord is a private, peer-to-peer Discord clone built with React, TypeScript, Electron, and PeerJS. It enables direct P2P voice/video calling, text chat, and AI assistance via Google's Gemini API, with presence tracking through Firebase Realtime Database.

## Key Architecture

### P2P Communication Layer
- **PeerJS** handles WebRTC signaling and peer-to-peer connections
- Each user receives a unique peer ID on app initialization
- Voice/video calls are established directly between peers (no relay server)
- Track replacement API (`RTCRtpSender.replaceTrack()`) enables screen sharing without reconnection

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

### Electron Shell
- `electron.js`: Simple wrapper with tray support
- Minimize-to-tray behavior (closing window hides, doesn't quit)
- No IPC communication needed - React app runs with `nodeIntegration: true`

### Component Structure
- `App.tsx`: Main state container and WebRTC orchestration
- `VoiceStage.tsx`: Video call UI (renders when viewing voice channel)
- `ChatArea.tsx`: Text/AI chat interface
- `ChannelList.tsx`: Navigation + **persistent voice control panel** (shows when connected)
- `UserList.tsx`: Online users sidebar with direct call buttons
- `UserSettingsModal.tsx`: Tabbed settings (Profile, Voice & Video, Debug Log)
- Modal components handle settings and updates

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
npm run dist             # Build + package Windows installer (.exe in dist/)
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
Three-tab system in `UserSettingsModal.tsx`:

1. **Profile Tab**: Display name, status message, avatar color selection
2. **Voice & Video Tab**:
   - Device enumeration via `navigator.mediaDevices.enumerateDevices()`
   - Dropdowns for mic, speakers, camera selection
   - Warning about reconnection requirement
3. **Debug Log Tab**:
   - Real-time display of app logs from `logs` state array
   - Color-coded by type (info=green, error=red, webrtc=blue)
   - Timestamps and scrollable history (last 50 entries)

## Environment Configuration

### Required for AI Features
Create `.env.local` with:
```
VITE_API_KEY=your_google_gemini_api_key
```
Without this, AI channel will show error message.

### Firebase Configuration
Hardcoded in `services/firebase.ts` - production config already included.

## Build Artifacts

- `dist/`: Vite build output (HTML, JS, CSS bundles)
- `dist/Pisscord Setup 1.0.X.exe`: Windows installer (created by electron-builder)
- Clean `dist/` folder before building to avoid stale artifacts

## TypeScript Configuration

- Target: ES2020 with bundler module resolution
- Strict mode enabled
- `noUnusedLocals` and `noUnusedParameters` disabled (intentional)
- React JSX transform (no need to import React in TSX files)
