# Implementation Plan for Claude

This document provides a detailed, end-to-end plan for stabilizing loading, persistent voice/video with HD screensharing, and unified authentication across web, Android, and desktop builds using Firebase. Follow these steps sequentially unless otherwise noted.

## 1) Baseline and Constraints
- Read `CLAUDE.md`, `GEMINI.md`, and `STYLE_GUIDE.md` before coding.
- Do **not** revert platform abstractions in `services/platform.ts` or the Void UI aesthetic.
- Keep imports free of try/catch wrappers.
- Maintain existing platform feature parity (Web/Electron/Capacitor) and reuse the `Platform` helper for branching.

## 2) Stabilize App Loading
1. **Pre-flight checks**
   - Ensure Firebase config loads exactly once (`services/firebase.ts`) and fails fast with surfaced errors.
   - Validate required environment keys for all platforms; add guardrails/logging for missing values.
2. **Auth-gated boot**
   - Keep the auth gate non-blocking to asset preload; gate only the main UI render.
   - Add explicit loading states for: Firebase init, auth session restore, and peer connection warm-up.
3. **Version/presence readiness**
   - Wait for `getLatestVersion()` + presence listeners before enabling channel navigation.
   - Ensure `onDisconnect()` handlers register even if the first presence write fails (retry with backoff).

## 3) Persistent Voice/Video & HD Screensharing
1. **Connection lifecycle**
   - Audit `App.tsx` connection state machine; remove stale closures by routing async callbacks through refs.
   - Add reconnection logic for WebRTC peer loss (retry offers up to N times with exponential backoff).
2. **Media pipelines**
   - Enforce 1080p (or highest available) constraints for screensharing; gracefully fall back with user feedback.
   - Keep the global audio element mounted during channel switches; verify voice controls in `ChannelList.tsx` stay in sync with `activeVoiceChannelId`.
3. **Resource cleanup**
   - Stop all tracks on channel leave or screen-share stop; release display media tracks separately from cam/mic.
   - Prevent duplicate PeerJS call objects by de-duping on `peerId`.
4. **UX cues**
   - Add visible reconnection toasts/banners; keep sound cues working (`services/sounds.ts`).
   - Confirm speaking indicator and per-user volume survive navigation.

## 4) Unified Credentials (Firebase Auth)
1. **Single profile source**
   - Store displayName, email, and uid in auth; mirror to presence writes and local profile state.
   - Add profile sync on login, profile edit, and channel join; prefer auth displayName when present.
2. **Cross-platform login**
   - Use email/password auth as baseline; ensure Electron/Capacitor webviews pass persistent auth state.
   - Verify `auth.onAuthStateChanged` triggers before peer initialization to attach credentials to presence.
3. **Error handling**
   - Normalize auth errors (weak password, existing email, network) into user-friendly toasts.
   - Block main UI on unauthenticated state; show deterministic loading skeleton during session restore.

## 5) Testing & QA
1. **Automated**
   - Run `npm run lint` and `npm run build` for web; `npm run build:web` if separate config needed.
   - For Electron: `npm run dist` (or `npm run build:electron` if available) in CI-like mode.
   - For Android: `npx cap sync android` then Gradle assemble (document if skipped).
2. **Manual**
   - Web: Login, join voice, switch channels while in call, start/stop screen share (1080p), verify unread indicators.
   - Electron: Repeat tests; verify desktopCapturer prompt and presence removal on quit.
   - Android: Capacitor login persistence, background/foreground call stability, screen share gracefully blocked or supported per platform rules.

## 6) Deliverables & PR Expectations
- Summarize user-visible changes and risk areas in PR description.
- Cite tests executed; call out any platform tests not run and why.
- Keep diff minimal: avoid wholesale refactors while stabilizing.
- Ensure all new files/components include concise comments for platform-specific logic.
