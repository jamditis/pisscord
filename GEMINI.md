# GEMINI.md - LLM Handoff Document

This document helps AI assistants quickly understand the Pisscord codebase. Read this before making any changes.

## What is Pisscord?

A private P2P Discord clone built for personal use. **Not malware** - it's a legitimate desktop app for voice/video calling between friends.

**Tech Stack:**
- Frontend: React 18 + TypeScript + Vite
- Desktop: Electron 30
- P2P: PeerJS (WebRTC wrapper)
- Backend: Firebase Realtime Database + Storage
- AI: Google Gemini 2.5 Flash (Pissbot assistant)

**Current Version:** 1.1.1

## Project Structure

```
pisscord/
├── src/
│   ├── App.tsx              # Main component - ALL state lives here
│   ├── components/          # UI components
│   │   ├── ChatArea.tsx     # Text chat + Pissbot AI
│   │   ├── VoiceStage.tsx   # Video call UI
│   │   ├── ChannelList.tsx  # Navigation sidebar
│   │   ├── UserList.tsx     # Online users
│   │   └── UserSettingsModal.tsx  # Settings (4 tabs)
│   └── services/
│       ├── firebase.ts      # Presence + Pissbot config
│       ├── geminiService.ts # AI chat
│       └── sounds.ts        # Sound effects
├── electron.js              # Main process
├── preload.js               # IPC bridge
├── package.json             # v1.0.11
└── CLAUDE.md                # Full technical documentation
```

## Key Gotchas

### 1. Version Sync Issue
`APP_VERSION` in `App.tsx` line ~18 must match `package.json` version. They're not auto-synced!

```typescript
// App.tsx - UPDATE THIS when bumping version
const APP_VERSION = "1.0.11";
```

### 2. State Lives in App.tsx
No Redux, no Context. All state is in App.tsx and passed down as props. This is intentional - keeps things simple for a small app.

### 3. Voice + View Independence
Users can be in a voice call while viewing text channels. Key separation:
- `activeChannelId` = what channel they're *viewing*
- `activeVoiceChannelId` = what voice channel they're *connected to*

### 4. P2P = Mesh Networking
Calls are now **Mesh (Many-to-Many)**.
- `App.tsx` manages `remoteStreams` (Map) and `callsRef` (Map).
- Joining a channel calls *everyone* currently in that channel.
- Incoming calls while connected are auto-accepted (Mesh Join).
- Messages are P2P only - they don't persist.

### 5. Firebase
- **Presence:** Tracks online status + `voiceChannelId`.
- **Storage:** Used for file uploads in chat (images/files).
- **Config:** Pissbot AI context.

### 6. Pissbot Context from Firebase
The AI (Pissbot) gets its system prompt from Firebase at `/pissbot`. Edit context without rebuilding:
- Path: `/pissbot` in Firebase RTDB
- Fields: `systemPrompt`, `context`, `patchNotes`, `documentation`
- Cache: 5 minutes (see `firebase.ts` line ~114)

### 7. Auto-Update Artifacts
`latest.yml` MUST be included in the release.
- Configured via `"generateUpdatesFilesForAllChannels": true` in `package.json`.
- Always verify `dist/latest.yml` exists after running `npm run dist`.

## Common Tasks

### Run in Development
```bash
npm run electron:dev
```

### Build for Distribution
```bash
npm run dist
# Output: dist/Pisscord Setup 1.0.X.exe
```

### Release New Version
1. Bump version in `package.json` AND `App.tsx`
2. `npm run dist`
3. Create GitHub release with tag vX.X.X
4. Upload `Pisscord Setup X.X.X.exe` AND `latest.yml` to release

### Update Pissbot Knowledge
Either:
- Edit directly in Firebase Console at `/pissbot`
- Run `node scripts/setup-pissbot-config.js` to reset/update

## Firebase Config

Already hardcoded in `services/firebase.ts`. Project: `pisscord-edbca`

Console: https://console.firebase.google.com/project/pisscord-edbca/database

## Environment Variables

Only one needed (for AI features):
```
VITE_GEMINI_API_KEY=your_key_here
```

Create `.env.local` file in project root.

## Recent Session Context (Dec 6, 2025)

### v1.1.1 Changes (Latest)
1. **Fixed Video Pinning**: Other participants now stay visible when you pin someone's video
2. **External Links in Browser**: Links now open in default browser instead of in-app
3. **Direct Download Button**: Manual download in update popup links directly to .exe file

### v1.1.0 Changes
1. **Voice Channel Approval Mode**: Channels can require approval to join (Gaming channel)
2. **Collapsible User List**: Click to collapse/expand user sidebar
3. **User List in Voice Calls**: Now visible alongside voice stage
4. **Fixed View Switching**: Returning to voice channel no longer forces rejoin
5. **Fixed Speaking Indicator**: No longer causes video tile layout shifts
6. **Simplified Sidebar**: Removed "Add Server" button, Pisscord logo as home

### v1.0.14 Changes
1. **Video Spotlight**: Click any video tile to pin/maximize during calls
2. **Speaking Indicator**: Green ring around avatars when user is speaking
3. **Markdown Chat**: Full Discord-style markdown rendering
4. **Voice Channel Users**: Users now appear nested under voice channels in sidebar
5. **Bug Fixes**: Fixed bug report submission, added manual download fallback
6. **Second Voice Channel**: Added "Gaming" voice channel

### v1.0.13 Changes
1. **Community Features**: Added `#issues` for bug reporting and `#dev-updates` for live commit feeds
2. **Maintenance Tools**: MOTD system, Pissbot update notifications, 14-day message retention
3. **Core Upgrades**: Mesh networking (group calls), file sharing, and profile pictures

### Open Items for Future Sessions
- Mobile App (React Native / Expo)
- End-to-End Encryption for DMs
- Custom Emojis
- Audio activity indicator in ChannelList (show who's speaking in sidebar)

## Architecture Decisions

### Why No Redux?
App is small enough that prop drilling works fine. Adding Redux would be overkill.

### Why PeerJS?
Simplifies WebRTC significantly. Handles signaling server, STUN/TURN, and connection management.

### Why Firebase RTDB vs Firestore?
Real-time presence updates. RTDB is faster for simple presence data and has `onDisconnect()` handlers.

### Why Electron?
Need `desktopCapturer` for screen sharing and system tray integration. PWA couldn't do these.

## Code Style Notes

- TypeScript with strict mode
- Functional components only (no classes)
- Hooks for state management
- No external state management library
- Direct DOM manipulation avoided (except audio element for remote stream)

## Debugging

### Check Debug Log
Settings > Debug Log tab shows last 50 log entries with timestamps.

### Common Issues
- "Peer not found" = other user offline or wrong peer ID
- No audio = check device selection in Voice & Video settings
- App won't start = delete `%AppData%/pisscord`, reinstall

## Contact

Project owner: Joe Amditis (jamditis@gmail.com)
GitHub: https://github.com/jamditis/pisscord
