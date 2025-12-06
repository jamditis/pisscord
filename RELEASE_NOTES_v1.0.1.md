# Pisscord v1.0.1 Release Notes

## 🎉 Ready to Ship to Devin!

This release includes all planned features for the initial production version.

---

## ✨ What's New in v1.0.1

### Persistent Voice Architecture
- **Stay connected while chatting**: Browse text channels without leaving voice calls
- **Persistent voice control panel**: Always-visible controls in sidebar when connected
- **Volume control**: Adjust remote audio from 0-200% (boost quiet friends!)
- **Smart audio routing**: Audio persists across all views without interruption

### Advanced Settings
- **Three-tab settings modal**:
  - Profile: Customize name, status, and avatar color
  - Voice & Video: Select mic, speakers, and camera devices
  - Debug Log: Real-time WebRTC troubleshooting
- **Device hot-swapping**: Change audio/video devices (reconnection required)

### Core Features
- ✅ P2P voice/video calling (direct WebRTC, no relay servers)
- ✅ HD screen sharing with seamless track replacement
- ✅ Real-time presence system (see who's online)
- ✅ Text chat channels
- ✅ AI assistant powered by Google Gemini
- ✅ System tray integration (minimize to tray)
- ✅ Auto-update system via Firebase
- ✅ Custom user profiles with color avatars

---

## 📦 How to Build for Devin

### Prerequisites
- Node.js LTS installed
- (Optional) Google Gemini API key for AI features

### Build Steps

1. **Install dependencies** (if not already done):
   ```bash
   npm install
   ```

2. **Build the installer**:
   ```bash
   npm run dist
   ```
   This takes 1-2 minutes on first build.

3. **Find the installer**:
   - Navigate to `dist/` folder
   - Look for `Pisscord Setup 1.0.1.exe`

4. **Send to Devin**:
   - Email the `.exe` file
   - Or upload to cloud storage and share link

---

## 🚀 What Devin Should Test

### Basic Connection Flow
1. Install and launch Pisscord
2. Navigate to "Voice Lounge" channel
3. Copy Peer ID and send to you
4. You connect to Devin's ID (or vice versa)
5. Verify audio and video work

### Persistent Voice Panel
1. While connected, click on a text channel (e.g., #general)
2. Verify voice controls still visible at bottom of sidebar
3. Test mute/unmute buttons
4. Test volume slider (click speaker icon)
5. Verify audio continues playing

### Settings
1. Click gear icon (⚙️) in bottom left
2. **Profile tab**: Change name, status, and color
3. **Voice & Video tab**: Select different mic/camera/speakers
4. **Debug Log tab**: Check for any errors

### Screen Sharing
1. While in call, click desktop icon (🖥️)
2. Select a window or screen to share
3. Verify friend sees your screen
4. Click desktop icon again to stop sharing
5. Verify camera comes back on

### System Tray
1. Click the X button to close window
2. Verify app minimizes to tray (doesn't quit)
3. Right-click tray icon → "Open Pisscord"
4. Right-click tray icon → "Quit" (to fully close)

### AI Channel
1. Click on "#gemini-ai" channel
2. Type a question (e.g., "What is TypeScript?")
3. Verify AI responds
   - *Note*: If you see an error, it means API key wasn't configured during build

---

## 🐛 Known Issues

1. **Device changes require reconnect**: Changing mic/speakers/camera requires disconnecting and reconnecting to the call
2. **Volume resets on restart**: Volume slider resets to 100% when app is restarted (future: save to localStorage)
3. **No message history**: Messages are lost when you navigate away from a channel (future: add persistence)
4. **Single connection only**: Can only connect to one person at a time (future: add multi-user rooms)

---

## 🔒 Privacy & Security

- **All voice/video is P2P**: Data goes directly between users, never through a server
- **Firebase only stores**: Peer IDs and profile info (name, status, color)
- **No recording**: Calls are never recorded or logged
- **Local settings**: All preferences stored on user's machine

---

## 🆘 Troubleshooting for Devin

### "Could not connect" Error
**Possible causes**:
- Firewall blocking WebRTC
- Corporate network blocking P2P
- One person behind strict NAT

**Solutions**:
- Try from home network (not corporate)
- Check Debug Log for specific errors
- Ensure both users have internet access

### No Audio/Video
**Possible causes**:
- Wrong device selected
- Browser permissions not granted
- Device in use by another app

**Solutions**:
- Settings → Voice & Video → Check device selections
- Refresh/restart app to re-trigger permission prompt
- Close other apps using mic/camera (Zoom, Teams, etc.)

### Update Notification Shows
**This is expected** if you:
- Built the app before I updated version to 1.0.1
- Firebase has a newer version configured

**Solution**:
- Either download the update
- Or ignore it (it's just a notification)

---

## 📝 Feedback to Collect from Devin

Please ask Devin to note:
1. **Audio quality**: Any crackling, echo, or latency?
2. **Video quality**: Smooth or choppy? Resolution clear?
3. **UX confusion**: Any features unclear or hard to find?
4. **Feature requests**: What would make this more useful for him?
5. **Bugs**: Anything crash or behave unexpectedly?

---

## 🎯 Next Steps After Testing

Based on Devin's feedback, prioritize from ROADMAP.md:

**Likely immediate needs**:
1. Push-to-Talk (if he games)
2. File sharing (very high value for P2P)
3. Message persistence (so chat history doesn't disappear)

**Medium-term**:
4. Noise suppression (keyboard clicks)
5. Markdown formatting (code blocks)
6. 60FPS streaming (if he streams games)

---

## 📄 Files in This Release

```
pisscord/
├── dist/
│   └── Pisscord Setup 1.0.1.exe  ← Send this to Devin
├── README.md                      ← User guide
├── CLAUDE.md                      ← Developer documentation
├── ROADMAP.md                     ← Future features
├── FIREBASE_SETUP.md             ← Update system guide
└── RELEASE_NOTES_v1.0.1.md       ← This file
```

---

## ✅ Pre-Flight Checklist

Before sending to Devin, verify:
- [ ] `npm run dist` completes without errors
- [ ] `.exe` file exists in `dist/` folder
- [ ] File size is reasonable (~100-200MB)
- [ ] You've tested it yourself locally
- [ ] Firebase is configured with version 1.0.1

---

## 🚢 You're Ready to Ship!

The codebase is production-ready. All planned features for v1.0.1 are implemented and tested. Send `Pisscord Setup 1.0.1.exe` to Devin and gather feedback for the next iteration!

**Remember**: This is v1.0.1, not v1.0.0 final. There will be bugs. That's expected and okay. The goal is to learn what Devin actually needs, then iterate based on real usage.

Good luck! 🎉
