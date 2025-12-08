# Pisscord Project Context

## Project Overview
**Pisscord** is a private, P2P Discord clone built with Electron (Desktop), React (Web/UI), and Capacitor (Mobile). It emphasizes privacy and a "Void/Cyberpunk" aesthetic. It's a family-only server with no public access.

## Tech Stack
- **Frontend:** React 18, Vite, Tailwind CSS (Custom "Void" Palette).
- **Desktop:** Electron 30 (Main process handles updates, tray, screen capture).
- **Mobile:** Capacitor (Android/iOS).
- **Networking:** PeerJS (WebRTC Mesh) + Firebase Realtime Database (Signaling/Presence/Chat Persistence).
- **Storage:** Firebase Storage (File uploads).

## Key Notes
- **No Encryption:** v1.4.6 removed client-side encryption. Messages are stored as plaintext in Firebase (private family server).
- **Pissbot:** AI Agent (Channel '3') powered by Gemini 2.5 Flash.

## Architecture Notes
- **Platform Abstraction:** `services/platform.ts` is the SINGLE source of truth for platform-specific logic (Clipboard, Haptics, App Lifecycle). Do not use `window.electronAPI` directly in components.
- **Audio/Video:**
    - Mobile browsers block autoplay. `App.tsx` handles `NotAllowedError` by showing a "Tap to enable" banner.
    - `AppLifecycleService` manages background state to prevent Android crashes (mutes tracks on minimize).
- **Styling:**
    - Fonts: 'Outfit' (Sans), 'Dela Gothic One' (Display), 'JetBrains Mono' (Code).
    - Colors: Piss Yellow (`#f0e130`), Void Black (`#0a0a0f`).
    - Glassmorphism used heavily in headers and overlays.

## Critical Workflows
1.  **Release Process:**
    - Bump version in `package.json` AND `App.tsx`.
    - **Web:** `npm run build` -> `firebase deploy`.
    - **Desktop:** `npm run dist`.
    - **Mobile:** `npm run cap:sync` -> Android Studio Build.

## Completed Tasks (v1.4.6)
- [x] Removed encryption system (simplified for family server).
- [x] Fix Mobile Audio Autoplay (Added Tap Banner).
- [x] Fix Background Crashes (Added AppLifecycleService).
- [x] Update Desktop UI to match Mobile/Web (Fonts, Colors, Glass).

## Agent Coordination
- **Claude:** Often works on this repo. Check `CLAUDE.md` for shared context.
- **Gemini:** Maintains this file (`GEMINI.md`).
- **Rule:** Do not revert "Void" styling or the `services/platform.ts` abstraction without good reason.
