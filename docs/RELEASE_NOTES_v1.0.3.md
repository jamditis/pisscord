# Pisscord v1.0.3 Release Notes

## 📦 Repository Cleanup & Organization

This release focuses on repository organization and preparing for public release.

---

## ✨ What's New in v1.0.3

### 📁 Repository Structure Improvements
- **Organized documentation**: All docs moved to `docs/` folder
  - Release notes
  - Setup guides
  - Testing documentation
  - Roadmap
- **Cleaner root directory**: Only essential files in project root
- **Better navigation**: Easier to find documentation

### 🔒 Privacy Check
- ✅ No personal information exposed in public repository
- ✅ No API keys or secrets committed
- ✅ Safe for public visibility

### 🌐 Public Repository
- Repository is now public at: https://github.com/jamditis/pisscord
- Auto-updates work seamlessly (no 404 errors)
- Users can report issues and contribute

---

## 📦 Installation

### Fresh Install:
Download and run **`Pisscord Setup 1.0.3.exe`**

### Upgrading from v1.0.2:
**Auto-Update** (Recommended):
1. Open Pisscord v1.0.2
2. Update notification will appear automatically
3. Click "Download in Background"
4. Click "Restart & Install" when ready
5. App updates automatically!

---

## 🔧 What's Included

All features from v1.0.2:
- ✅ P2P voice/video calling
- ✅ P2P text messaging (real-time sync)
- ✅ Screen sharing
- ✅ Persistent voice controls
- ✅ Volume control (0-200%)
- ✅ User profile persistence
- ✅ Custom Pisscord icon
- ✅ System tray integration
- ✅ Auto-updates via GitHub Releases

---

## 📊 Changes from v1.0.2

| Feature | v1.0.2 | v1.0.3 |
|---------|--------|--------|
| All core features | ✅ | ✅ |
| Documentation organized | ❌ | ✅ |
| Public repository | ❌ | ✅ |
| Auto-update working | ⚠️ (404) | ✅ |

---

## 🐛 Known Issues

Same as v1.0.2:
1. **Device changes require reconnect**: Changing mic/speakers/camera requires disconnecting and reconnecting
2. **Volume resets on restart**: Volume slider resets to 100% when app restarts
3. **No message history**: Messages are lost when navigating away from channels
4. **Single connection only**: Can only connect to one person at a time

---

## 📁 New Repository Structure

```
pisscord/
├── docs/                          ← All documentation here
│   ├── RELEASE_NOTES_v1.0.1.md
│   ├── RELEASE_NOTES_v1.0.2.md
│   ├── RELEASE_NOTES_v1.0.3.md
│   ├── AUTO_UPDATE_GUIDE.md
│   ├── FIREBASE_SETUP.md
│   ├── ROADMAP.md
│   ├── SCREEN_SHARE_DEBUG.md
│   └── TESTING_GUIDE.md
├── components/                    ← React components
├── services/                      ← Firebase, Gemini
├── App.tsx                        ← Main app
├── electron.js                    ← Electron main process
├── package.json
├── README.md
├── CLAUDE.md                      ← Developer docs
└── pisscord.ico                   ← Custom icon
```

---

## 🚀 What's Next

Planned for v1.0.4:
- Message persistence (save chat history)
- Volume persistence (remember settings)
- Improved error handling
- Performance optimizations

See `docs/ROADMAP.md` for full feature roadmap.

---

## 💡 For Developers

### Documentation:
- **Setup Guide**: `docs/FIREBASE_SETUP.md`
- **Auto-Update Guide**: `docs/AUTO_UPDATE_GUIDE.md`
- **Testing Guide**: `docs/TESTING_GUIDE.md`
- **Developer Docs**: `CLAUDE.md`
- **Roadmap**: `docs/ROADMAP.md`

### Building:
```bash
npm install
npm run dist
```

### Publishing Updates:
1. Update version in `package.json` and `App.tsx`
2. Build: `npm run dist`
3. Create GitHub Release with tag `v1.0.X`
4. Upload ALL files from `dist/` folder
5. Users auto-update!

---

## 📝 Notes

This is a maintenance release focused on repository organization and public accessibility. No functional changes from v1.0.2.

**Upgrade from v1.0.2 to test auto-updates!** 🎉

---

**Repository**: https://github.com/jamditis/pisscord
**Issues**: https://github.com/jamditis/pisscord/issues
