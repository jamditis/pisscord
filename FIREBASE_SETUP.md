# Firebase Setup Guide

This guide explains how to set up and manage the Firebase Realtime Database for Pisscord's update system and presence tracking.

## Initial Setup (Already Done)

The Firebase project is already configured in `services/firebase.ts` with:
- Project: `pisscord-edbca`
- Database: `pisscord-edbca-default-rtdb.firebaseio.com`

## Database Structure

Your Firebase Realtime Database should have this structure:

```json
{
  "system": {
    "latestVersion": "1.0.1",
    "downloadUrl": "https://github.com/jamditis/pisscord/releases/download/v1.0.1/Pisscord-Setup-1.0.1.exe",
    "motd": "Welcome to Pisscord!"
  },
  "users": {
    "<peer-id-1>": {
      "peerId": "<peer-id-1>",
      "displayName": "ShadowNinja",
      "statusMessage": "Gaming",
      "color": "#5865F2",
      "lastSeen": 1234567890
    },
    "<peer-id-2>": {
      "peerId": "<peer-id-2>",
      "displayName": "CyberWolf",
      "statusMessage": "Coding",
      "color": "#3ba55c",
      "lastSeen": 1234567891
    }
  }
}
```

## Managing Updates

### Step 1: Build New Version

1. Update version in `App.tsx`:
   ```typescript
   const APP_VERSION = "1.0.2"; // Increment this
   ```

2. Update version in `package.json`:
   ```json
   {
     "version": "1.0.2"
   }
   ```

3. Build the installer:
   ```bash
   npm run dist
   ```

4. Find the installer in `dist/Pisscord Setup 1.0.2.exe`

### Step 2: Upload Installer

**Option A: GitHub Releases (Recommended)**

1. Go to https://github.com/jamditis/pisscord/releases
2. Click "Create a new release"
3. Tag: `v1.0.2`
4. Title: `Pisscord v1.0.2`
5. Upload `Pisscord Setup 1.0.2.exe`
6. Click "Publish release"
7. Copy the download URL (right-click the .exe → Copy link address)

**Option B: Cloud Storage**
- Upload to Google Drive, Dropbox, or any CDN
- Get a direct download link

### Step 3: Update Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select the `pisscord-edbca` project
3. Navigate to **Realtime Database** in the left sidebar
4. Click on the `system` node
5. Update the values:

```json
{
  "latestVersion": "1.0.2",
  "downloadUrl": "https://github.com/jamditis/pisscord/releases/download/v1.0.2/Pisscord-Setup-1.0.2.exe",
  "motd": "Optional: New features in v1.0.2!"
}
```

6. Click "Add" or "Update"

### Step 4: Test Update Flow

1. Open an older version of Pisscord (v1.0.1)
2. You should see the update modal appear
3. Click "Download Update"
4. Install and verify

## Database Rules (Security)

### Current Rules
Your database should have these security rules:

```json
{
  "rules": {
    "system": {
      ".read": true,
      ".write": false
    },
    "users": {
      ".read": true,
      "$userId": {
        ".write": "auth == null || auth.uid == $userId"
      }
    }
  }
}
```

**Explanation**:
- `system`: Everyone can read (for updates), only admins can write via Firebase Console
- `users`: Everyone can read (for presence), users can only write their own data

### Setting Rules

1. Go to Firebase Console → Realtime Database
2. Click the **Rules** tab
3. Paste the rules above
4. Click **Publish**

## Monitoring

### Check Active Users

1. Firebase Console → Realtime Database
2. Navigate to `users/`
3. See all currently connected users in real-time
4. Users automatically disappear when they close the app (`onDisconnect()` handler)

### View Update Stats

Unfortunately, Firebase Realtime Database doesn't track download counts automatically. To track this:

**Option 1: Use GitHub Releases**
- GitHub shows download counts for each release
- Go to Releases → Click on a release → See download stats

**Option 2: Add Analytics**
- Modify `UpdateModal.tsx` to log to Firebase Analytics when users click "Download"

## Troubleshooting

### Users Not Seeing Update Notification

**Possible causes**:
1. Firebase rules don't allow read access to `system/`
2. User's internet is blocking Firebase
3. Version string format mismatch (e.g., "1.0.1" vs "v1.0.1")

**Debug**:
- Check Debug Log in user settings
- Look for Firebase connection errors
- Verify `system/latestVersion` is accessible publicly

### Presence Not Working

**Possible causes**:
1. Firebase rules block write access to `users/`
2. PeerJS not initializing (check console for errors)
3. User offline or behind strict firewall

**Debug**:
- Check `users/` in Firebase Console - should populate in real-time
- Verify `onDisconnect()` is being set (check browser dev tools console)

## Best Practices

1. **Version Format**: Use semantic versioning (1.0.1, 1.1.0, 2.0.0)
2. **Download URLs**: Use HTTPS and ensure they're permanent (GitHub releases are stable)
3. **Testing**: Always test update flow before announcing to users
4. **Rollback**: Keep previous versions available in case new version has critical bugs
5. **Changelog**: Document what changed in each version (consider adding to `motd`)

## Advanced: Custom Update Server

If you want more control, you can replace Firebase with your own server:

1. Create a simple JSON endpoint:
   ```json
   {
     "latestVersion": "1.0.2",
     "downloadUrl": "https://your-cdn.com/installer.exe",
     "changelog": "- Fixed bugs\n- Added features"
   }
   ```

2. Modify `services/firebase.ts`:
   ```typescript
   export const checkForUpdates = async (currentVersion: string) => {
     const response = await fetch('https://your-api.com/version.json');
     const data = await response.json();
     // ... rest of logic
   }
   ```

## Quick Reference

| Task | Location |
|------|----------|
| Update version | `App.tsx` line 13, `package.json` |
| Build installer | `npm run dist` |
| Upload release | GitHub Releases or cloud storage |
| Update Firebase | Console → Realtime Database → `system/` |
| Check rules | Console → Realtime Database → Rules tab |
| Monitor users | Console → Realtime Database → `users/` |
