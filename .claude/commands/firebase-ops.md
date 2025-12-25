# Firebase Operations Skill

Manage Pisscord's Firebase Realtime Database operations including Pissbot AI configuration, release notes, system settings, and data maintenance.

## When to Activate

- User asks to "update Pissbot", "change AI config", or "edit the bot"
- User mentions "release notes", "version update", or "system config"
- User asks about Firebase structure, data cleanup, or database operations
- User wants to add new Firebase features or paths

## Mental Model

Pisscord uses Firebase Realtime Database as a **coordination layer**, not a traditional database:

```
Firebase RTDB
├── users/           # Presence system (ephemeral)
│   └── {peerId}/    # Auto-removed on disconnect
├── messages/        # Chat persistence
│   └── {channelId}/ # 14-day retention
├── transcripts/     # Audio transcription cache
│   └── {base64Key}/ # Keyed by audio URL
├── system/          # App-wide configuration
│   ├── latestVersion
│   ├── releaseNotes
│   └── motd
└── pissbot/         # AI configuration
    ├── systemPrompt
    ├── context
    ├── patchNotes
    └── documentation
```

Key principle: **Read from Firebase, write via scripts**. The app reads config; developers update via `scripts/` directory.

## Pissbot Configuration

### Structure

```javascript
{
  systemPrompt: "You are Pissbot, the AI assistant...",  // Personality
  context: "Pisscord v1.5.1 is a private Discord clone...", // Current app info
  patchNotes: "### Recent Changes\n- v1.5.1: ...",  // Version history
  documentation: "## How to Use\n...",  // User help
  lastUpdated: 1703520000000  // Timestamp for cache invalidation
}
```

### Updating Pissbot

**Preferred method:** Edit and run the setup script.

**Location:** `scripts/setup-pissbot-config.js`

**Key sections to update:**

```javascript
// 1. Update version references in 'context'
context: `
Pisscord v1.5.2 is a private, multi-platform Discord clone...
// Update version number here ^
`,

// 2. Add new patch notes at the top
patchNotes: `
### v1.5.2 (${new Date().toISOString().split('T')[0]})
- New feature description
- Bug fix description

### v1.5.1 (2025-12-09)
// ... keep previous notes
`,

// 3. Update documentation if UI changed
documentation: `
## Getting Started
...
`
```

**Run the script:**
```bash
node scripts/setup-pissbot-config.js
```

**Verify update:**
- Changes take effect within 5 minutes (cache TTL)
- Test in #pissbot channel: "What version are you?"
- Force refresh: Clear browser cache or wait

### Cache Behavior

```typescript
// In services/firebase.ts
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Cache is per-browser-session
// Hard refresh or new tab will fetch fresh config
```

## Release Notes Management

### Structure

```javascript
{
  version: "1.5.2",
  notes: "### What's New\n- Feature 1\n- Feature 2",
  downloadUrl: "https://github.com/jamditis/pisscord/releases/tag/v1.5.2",
  timestamp: 1703520000000
}
```

### Updating Release Notes

**Location:** `scripts/setup-release-notes.js`

**Update these constants:**
```javascript
const CURRENT_VERSION = '1.5.2';
const RELEASE_NOTES = `
### What's New in v1.5.2

**New Features:**
- Feature description

**Bug Fixes:**
- Fix description

**Improvements:**
- Improvement description
`;
```

**Run the script:**
```bash
node scripts/setup-release-notes.js
```

### User Experience

When users update to a new version:
1. App checks `system/latestVersion` against local `APP_VERSION`
2. If mismatch AND new version not seen before → Show `ReleaseNotesModal`
3. Modal fetches notes from `system/releaseNotes`
4. User dismisses → version stored in localStorage `pisscord_version_seen`

## System Configuration

### Latest Version

**Path:** `system/latestVersion`

**Used for:** Update detection in desktop app

**Updated by:** GitHub Action on release publish (`.github/workflows/update-firebase-version.yml`)

**Manual update (if needed):**
```bash
# Using Firebase CLI
firebase database:set /system/latestVersion '"1.5.2"' --project pisscord-edbca

# Or via curl with database secret
curl -X PUT \
  "https://pisscord-edbca-default-rtdb.firebaseio.com/system/latestVersion.json?auth=DATABASE_SECRET" \
  -d '"1.5.2"'
```

### Message of the Day (MOTD)

**Path:** `system/motd`

**Structure:**
```javascript
{
  message: "Welcome to Pisscord! 🎉",
  enabled: true,
  timestamp: 1703520000000
}
```

**Used for:** App-wide announcements shown on login

## Presence System

### How It Works

1. User connects → Registers at `users/{peerId}`
2. `onDisconnect()` handler set to remove entry
3. Other clients subscribe to `users/` for real-time updates
4. User closes app → Firebase auto-removes their entry

### Data Structure

```javascript
// users/{peerId}
{
  peerId: "abc123",
  displayName: "Username",
  status: "Available",
  color: "#8b5cf6",
  avatarUrl: "https://...",  // Optional
  currentChannel: "voice-general",  // If in voice
  timestamp: 1703520000000
}
```

### Debugging Presence

```bash
# View all online users (Firebase CLI)
firebase database:get /users --project pisscord-edbca

# View specific user
firebase database:get /users/PEER_ID --project pisscord-edbca
```

**Common issues:**
- "Ghost users" that don't disappear → Browser crashed before `onDisconnect()` fired
- Solution: Users are cleaned up when they reconnect with same peer ID

## Transcript Caching

### Purpose

Avoid re-transcribing the same audio file multiple times (saves Gemini API quota).

### How It Works

```typescript
// Key generation
const cacheKey = btoa(audioUrl); // Base64 encode URL

// Check cache first
const cached = await get(ref(db, `transcripts/${cacheKey}`));
if (cached) return cached.val().transcript;

// If not cached, transcribe and store
const transcript = await transcribeAudio(audioUrl);
await set(ref(db, `transcripts/${cacheKey}`), {
  transcript,
  audioUrl,
  timestamp: Date.now()
});
```

### Potential Issues

- **Cache key collisions:** URLs with special characters may produce same base64
- **No expiration:** Transcripts persist forever
- **Size growth:** Each transcript is ~100-1000 bytes

### Cleanup (if needed)

```bash
# Delete all transcripts older than 30 days
firebase database:get /transcripts --project pisscord-edbca | \
  jq 'to_entries | map(select(.value.timestamp < (now - 2592000) * 1000)) | .[].key' | \
  xargs -I {} firebase database:remove /transcripts/{} --project pisscord-edbca
```

## Message Retention

### Current Policy

Messages older than 14 days are deleted by the `deleteOldMessages()` function.

**Location:** `services/firebase.ts`

```typescript
const RETENTION_DAYS = 14;
const cutoff = Date.now() - (RETENTION_DAYS * 24 * 60 * 60 * 1000);
// Query and delete messages with timestamp < cutoff
```

**Triggered:** On each message send (opportunistic cleanup)

### Adjusting Retention

To change retention period:
```typescript
// In services/firebase.ts
const RETENTION_DAYS = 30; // Change from 14 to 30
```

## Firebase Security Rules

**Location:** Firebase Console or `firebase.json`

**Current rules (implied from code):**
```json
{
  "rules": {
    "users": {
      ".read": true,
      ".write": true
    },
    "messages": {
      ".read": true,
      ".write": true
    },
    "system": {
      ".read": true,
      ".write": false  // Write via admin/scripts only
    },
    "pissbot": {
      ".read": true,
      ".write": false  // Write via admin/scripts only
    },
    "transcripts": {
      ".read": true,
      ".write": true
    }
  }
}
```

**Recommendation:** Add validation rules:
```json
{
  "rules": {
    "messages": {
      "$channelId": {
        "$messageId": {
          ".validate": "newData.hasChildren(['sender', 'content', 'timestamp'])"
        }
      }
    }
  }
}
```

## Adding New Firebase Features

### Process

1. **Define path structure** in CLAUDE.md documentation
2. **Add TypeScript types** in `types.ts`
3. **Create service functions** in `services/firebase.ts`:
   ```typescript
   export const getNewFeature = async (): Promise<NewFeatureType> => {
     const snapshot = await get(ref(database, 'newFeature'));
     return snapshot.val();
   };

   export const setNewFeature = async (data: NewFeatureType): Promise<void> => {
     await set(ref(database, 'newFeature'), data);
   };
   ```
4. **Add setup script** if config-style data: `scripts/setup-new-feature.js`
5. **Update Firebase rules** if needed

### Example: Adding a "Maintenance Mode" Feature

```typescript
// 1. Type in types.ts
export interface MaintenanceConfig {
  enabled: boolean;
  message: string;
  estimatedEnd?: number;
}

// 2. Service functions in firebase.ts
export const getMaintenanceStatus = async (): Promise<MaintenanceConfig | null> => {
  const snapshot = await get(ref(database, 'system/maintenance'));
  return snapshot.val();
};

// 3. Setup script: scripts/setup-maintenance.js
const admin = require('firebase-admin');
// ... initialization

await admin.database().ref('system/maintenance').set({
  enabled: true,
  message: 'Pisscord is undergoing maintenance. Back soon!',
  estimatedEnd: Date.now() + 3600000 // 1 hour
});
```

## Common Operations Reference

| Task | Command |
|------|---------|
| Update Pissbot config | `node scripts/setup-pissbot-config.js` |
| Update release notes | `node scripts/setup-release-notes.js` |
| View online users | Firebase Console → `users/` |
| Clear test messages | Firebase Console → `messages/{channel}` → Delete |
| Check latestVersion | Firebase Console → `system/latestVersion` |
| Deploy web build | `npx firebase deploy --only hosting` |

## Example Usage

User: "Update Pissbot to know about the new voice message feature"

Claude should:
1. Open `scripts/setup-pissbot-config.js`
2. Add voice message info to `context` section
3. Update version number if applicable
4. Run `node scripts/setup-pissbot-config.js`
5. Verify in #pissbot channel

---
Created: 2025-12-25
Version: 1.0
Author: Claude Code Analysis
