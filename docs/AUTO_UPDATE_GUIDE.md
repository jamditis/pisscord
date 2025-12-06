# Auto-Update Enhancement Guide

## Current Update Method (Manual)

**How it works now:**
1. User sees update notification modal in app
2. User clicks "Download Update"
3. Browser downloads new `.exe` installer
4. User closes app and runs installer
5. Installer replaces old version

**User friction:** 3-4 manual steps

---

## Option 1: Electron Auto-Updater (Recommended for Production)

### Overview
- Uses `electron-updater` package
- Downloads and installs updates automatically
- Requires hosting update manifest files
- Zero user interaction (besides "Restart Now" button)

### Implementation

#### 1. Install Dependencies
```bash
npm install electron-updater
```

#### 2. Update package.json
```json
{
  "build": {
    "publish": [
      {
        "provider": "github",
        "owner": "jamditis",
        "repo": "pisscord"
      }
    ]
  }
}
```

#### 3. Modify electron.js
```javascript
const { app, BrowserWindow } = require('electron');
const { autoUpdater } = require('electron-updater');

// Configure auto-updater
autoUpdater.setFeedURL({
  provider: 'github',
  owner: 'jamditis',
  repo: 'pisscord',
  private: false
});

// Check for updates on startup
app.whenReady().then(() => {
  createWindow();

  // Check for updates every hour
  setInterval(() => {
    autoUpdater.checkForUpdates();
  }, 60 * 60 * 1000);

  // Check immediately on startup
  autoUpdater.checkForUpdates();
});

// Events
autoUpdater.on('update-available', (info) => {
  console.log('Update available:', info.version);
  mainWindow.webContents.send('update-available', info);
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('Update downloaded:', info.version);
  mainWindow.webContents.send('update-downloaded', info);
});

// Auto-install on quit
autoUpdater.on('update-downloaded', () => {
  autoUpdater.quitAndInstall();
});
```

#### 4. Update App.tsx
```typescript
useEffect(() => {
  // Listen for update events from Electron
  if (window.electronAPI) {
    window.electronAPI.on('update-available', (info: any) => {
      setUpdateInfo({
        url: '', // Not needed, auto-downloads
        latest: info.version
      });
      setShowUpdateModal(true);
    });

    window.electronAPI.on('update-downloaded', () => {
      // Show "Restart to Update" button
      alert('Update downloaded! Restart Pisscord to install.');
    });
  }
}, []);
```

#### 5. Publish Release with Auto-Update Files

When you run `npm run dist`, it will generate:
```
dist/
├── Pisscord Setup 1.0.1.exe       ← User installer
├── latest.yml                      ← Update manifest
└── Pisscord-1.0.1-full.nupkg      ← Delta update package
```

**Upload ALL files to GitHub Releases**:
1. Go to https://github.com/jamditis/pisscord/releases
2. Create release `v1.0.1`
3. Upload:
   - `Pisscord Setup 1.0.1.exe`
   - `latest.yml`
   - Any `.nupkg` files

#### 6. User Experience
1. User opens Pisscord v1.0.0
2. App silently downloads v1.0.1 in background
3. Notification: "Update ready! Restart to install."
4. User clicks "Restart Now"
5. App closes and reopens on v1.0.1

**User friction:** 1 click

---

## Option 2: In-App Background Download (Medium Effort)

### Overview
- Download `.exe` in background using Electron's `net` module
- Prompt user to quit and install when ready
- Doesn't require GitHub Releases infrastructure

### Implementation

```javascript
// In electron.js
const { net } = require('electron');
const fs = require('fs');
const path = require('path');

function downloadUpdate(url) {
  const tempPath = path.join(app.getPath('temp'), 'Pisscord-Update.exe');
  const file = fs.createWriteStream(tempPath);

  const request = net.request(url);
  request.on('response', (response) => {
    response.pipe(file);

    file.on('finish', () => {
      file.close();
      // Notify renderer process
      mainWindow.webContents.send('update-ready', tempPath);
    });
  });

  request.end();
}

// When user clicks "Download Update" in UpdateModal
ipcMain.on('download-update', (event, url) => {
  downloadUpdate(url);
});

// When download complete
ipcMain.on('install-update', (event, installerPath) => {
  const { shell } = require('electron');
  shell.openPath(installerPath);
  app.quit();
});
```

**User Experience:**
1. User sees update modal
2. Clicks "Download in Background"
3. Download happens (show progress bar)
4. When ready: "Update Ready! Click to Install"
5. Installer opens, app quits
6. User clicks through installer

**User friction:** 2-3 clicks

---

## Option 3: Keep Current Method (Simplest)

### Overview
- Current Firebase + UpdateModal approach
- User manually downloads from browser
- **No code changes needed**
- Good enough for small user base

### User Experience
1. User sees update modal
2. Clicks "Download Update"
3. Browser downloads `.exe`
4. User opens Downloads folder
5. Runs installer

**User friction:** 3-4 clicks

**Pros:**
- ✅ Already implemented
- ✅ No additional dependencies
- ✅ Works with any hosting (GitHub, CDN, etc.)
- ✅ Simple to understand and debug

**Cons:**
- ❌ Requires manual download
- ❌ User might forget to install

---

## Recommendation

### For Now (v1.0.1 → v1.0.2):
**Keep Option 3** (current method)
- Simple
- Works reliably
- Good for 1-10 users (Devin + small group)

### For Production (v1.1.0+):
**Implement Option 1** (electron-updater)
- Industry standard
- Used by Discord, Slack, VS Code
- Fully automatic
- Worth the setup effort once you have 50+ users

### Quick Win (Optional):
**Add Option 2** (background download)
- Medium effort (1-2 hours)
- Better UX than current
- Doesn't require GitHub Releases setup

---

## Implementation Priority

```
Now (v1.0.1):  ✅ Current method (Firebase + manual download)
                  ↓
Sprint 2:      🔧 Background download (Option 2)
                  ↓
Sprint 4:      🚀 Full auto-updater (Option 1)
```

---

## Testing Auto-Updates

1. **Build v1.0.0**:
   ```bash
   # In package.json, set version to 1.0.0
   npm run dist
   ```

2. **Install v1.0.0** on test machine

3. **Build v1.0.1**:
   ```bash
   # In package.json, set version to 1.0.1
   npm run dist
   ```

4. **Upload v1.0.1** to GitHub Releases

5. **Open v1.0.0** and verify:
   - Update notification appears
   - Download works
   - Installation succeeds
   - User data preserved

---

## Common Issues

### Issue: "Update not detected"
**Cause:** Firebase not updated or version string mismatch
**Fix:**
- Verify Firebase `system/latestVersion` = "1.0.1"
- Check App.tsx `APP_VERSION` = "1.0.1"

### Issue: "Update downloads but won't install"
**Cause:** Windows SmartScreen blocking unsigned installer
**Fix:**
- Sign the installer with code signing certificate (costs $200-400/year)
- OR users click "More Info" → "Run Anyway"

### Issue: "User data lost after update"
**Cause:** Installer is deleting app data folder
**Fix:**
- User data is in `AppData/Roaming/Pisscord` (separate from install dir)
- Should be preserved automatically
- If not, add to NSIS config:
  ```json
  "nsis": {
    "deleteAppDataOnUninstall": false
  }
  ```

---

## Code Signing (Future Enhancement)

### Why Code Sign?
- ✅ Windows won't show scary warnings
- ✅ Auto-updates work more reliably
- ✅ Looks professional
- ✅ Required for macOS

### How to Code Sign

1. **Buy certificate** ($200-400/year):
   - Sectigo
   - DigiCert
   - SSL.com

2. **Add to electron-builder config**:
   ```json
   "win": {
     "certificateFile": "./cert.pfx",
     "certificatePassword": "your-password",
     "signingHashAlgorithms": ["sha256"],
     "sign": "./customSign.js"
   }
   ```

3. **Sign during build**:
   ```bash
   npm run dist
   ```

**Cost/Benefit:**
- 💰 $200-400/year
- ✅ Much better user experience
- ✅ Required if you reach 100+ users

---

## Summary

**For Devin (v1.0.0 → v1.0.1):**
- ✅ Current method works fine
- ✅ Just run new installer over old one
- ✅ May see prompt to uninstall old version (click "Yes")
- ✅ User data will be preserved

**For future improvements:**
- Sprint 2: Add background download
- Sprint 4: Add full auto-updater
- When popular: Buy code signing certificate
