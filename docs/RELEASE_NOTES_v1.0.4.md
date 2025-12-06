# Pisscord v1.0.4 Release Notes

## 🐛 Critical Bug Fix: Multiple Instances

This release fixes a critical bug where users could open multiple instances of the app, causing multiple tray icons and potential connection issues.

---

## ✨ What's Fixed in v1.0.4

### 🔒 Single Instance Lock (CRITICAL FIX)
- **Fixed: Multiple app instances running simultaneously**
  - App now enforces single instance only
  - Trying to open a second instance will:
    - Focus the existing window if it's open
    - Restore from minimized if needed
    - Prevent duplicate tray icons
  - No more 9+ tray icons cluttering the system tray!

### How It Works:
1. First instance starts normally
2. If user tries to open Pisscord again:
   - Second instance detects the first one
   - Focuses the existing window
   - Exits immediately
3. Only ONE instance can run at a time ✅

---

## 📦 Installation

### Fresh Install:
Download and run **`Pisscord Setup 1.0.4.exe`**

### Upgrading from v1.0.3 or earlier:
**Auto-Update** (Recommended):
1. Open Pisscord (any version)
2. Update notification will appear automatically
3. Click "Download in Background"
4. Click "Restart & Install" when ready
5. App updates automatically!

**Note**: After updating, kill any duplicate instances:
- Close all Pisscord windows
- Check Task Manager for duplicate processes
- Restart the app once

---

## 🔧 What's Included

All features from v1.0.3:
- ✅ P2P voice/video calling
- ✅ P2P text messaging (real-time sync)
- ✅ Screen sharing
- ✅ Persistent voice controls
- ✅ Volume control (0-200%)
- ✅ User profile persistence
- ✅ Custom Pisscord icon
- ✅ System tray integration
- ✅ Auto-updates via GitHub Releases
- ✅ **NEW: Single instance lock**

---

## 📊 Changes from v1.0.3

| Feature | v1.0.3 | v1.0.4 |
|---------|--------|--------|
| All core features | ✅ | ✅ |
| Single instance only | ❌ | ✅ |
| No duplicate tray icons | ❌ | ✅ |
| Focus on second launch | ❌ | ✅ |

---

## 🐛 Known Issues

Same as v1.0.3:
1. **Device changes require reconnect**: Changing mic/speakers/camera requires disconnecting and reconnecting
2. **Volume resets on restart**: Volume slider resets to 100% when app restarts
3. **No message history**: Messages are lost when navigating away from channels
4. **Single connection only**: Can only connect to one person at a time

---

## 🆘 Troubleshooting

### "I have multiple instances running from before v1.0.4"
**Solution**:
1. Close all Pisscord windows
2. Open Task Manager (Ctrl+Shift+Esc)
3. Find all "Pisscord" processes
4. End all of them
5. Start Pisscord v1.0.4
6. Only one instance will run ✅

### "App won't open when I double-click"
**This is expected!** If Pisscord is already running:
- It will focus the existing window
- Check your taskbar or system tray
- Right-click tray icon → "Open Pisscord"

---

## 🎯 Why This Fix Matters

### Before v1.0.4:
- Users could accidentally open 5-10 instances
- Each instance had its own tray icon
- Multiple PeerJS connections = confusion
- Wasted system resources
- Hard to tell which instance is which

### After v1.0.4:
- ✅ Only ONE instance ever runs
- ✅ Only ONE tray icon
- ✅ Clear which window is active
- ✅ Better resource management
- ✅ No confusion

---

## 💡 Technical Details

**Implementation**:
- Uses Electron's `app.requestSingleInstanceLock()`
- First instance gets the lock
- Additional launches trigger `second-instance` event
- Event handler focuses the existing window
- Second instance exits gracefully

**User Experience**:
- Double-clicking Pisscord shortcut brings app to front
- No error messages or dialogs
- Seamless behavior like professional apps

---

## 🚀 What's Next

Planned for v1.0.5:
- Message persistence (save chat history)
- Volume persistence (remember settings)
- Improved error handling
- Performance optimizations

See `docs/ROADMAP.md` for full feature roadmap.

---

## 📝 Upgrade Instructions

### For Users with Multiple Instances:

1. **Before upgrading**:
   - Close all Pisscord windows
   - Check Task Manager
   - End all Pisscord processes

2. **Install v1.0.4**:
   - Via auto-update OR
   - Download fresh installer

3. **Verify**:
   - Only one tray icon appears
   - Double-clicking shortcut focuses window (doesn't open new instance)

---

**This is a critical stability fix. All users should upgrade immediately!** 🚨

---

**Repository**: https://github.com/jamditis/pisscord
**Issues**: https://github.com/jamditis/pisscord/issues

**Upgrade now to fix the multiple instance bug!** 🎉
