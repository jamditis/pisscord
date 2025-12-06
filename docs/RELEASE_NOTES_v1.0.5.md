# Pisscord v1.0.5 Release Notes

## 🤖 Pissbot AI Assistant + Critical Fixes

This release introduces Pissbot, your new AI assistant, along with critical fixes for chat input and screen sharing in the Electron app.

---

## ✨ What's New in v1.0.5

### 🤖 Pissbot AI Assistant (Rebranding)
- **Renamed Gemini AI to Pissbot**
  - AI assistant now branded as "Pissbot"
  - Uses Google Gemini 2.5 Flash model
  - Helpful, concise AI responses
  - Available in the #gemini-ai channel
  - Supports markdown formatting

### 🐛 Critical Bug Fixes

#### 1. **Chat Input Fixed** (CRITICAL)
- **Fixed: Could only paste text, couldn't type in chat**
  - Chat input now has autofocus
  - Typing works normally again
  - No more copy-paste workaround needed!

#### 2. **Screen Share Fixed** (CRITICAL)
- **Fixed: NotSupportedError when screen sharing in Electron**
  - Implemented Electron's desktopCapturer API
  - Screen sharing now works reliably
  - Proper screen source selection
  - No more browser compatibility errors!

#### 3. **API Key Configuration**
- **Fixed: Gemini API key variable mismatch**
  - Environment variable now correctly reads `VITE_GEMINI_API_KEY`
  - Pissbot AI responses work out of the box

### 🎨 UI Improvements
- **Pisscord Logo in Sidebar**
  - Added Pisscord logo to server icon
  - Replaced "PISS" text with actual logo image
  - Darker themed icon for better visual consistency

---

## 📦 Installation

### Fresh Install:
Download and run **`Pisscord Setup 1.0.5.exe`**

### Upgrading from v1.0.4 or earlier:
**Auto-Update** (Recommended):
1. Open Pisscord (any version)
2. Update notification will appear automatically
3. Click "Download in Background"
4. Click "Restart & Install" when ready
5. App updates automatically!

---

## 🔧 What's Included

All features from v1.0.4 plus new improvements:
- ✅ P2P voice/video calling
- ✅ P2P text messaging (real-time sync)
- ✅ **FIXED: Screen sharing (now works in Electron!)**
- ✅ **FIXED: Chat input (typing works normally)**
- ✅ **NEW: Pissbot AI assistant**
- ✅ Persistent voice controls
- ✅ Volume control (0-200%)
- ✅ User profile persistence
- ✅ Custom Pisscord icon with logo
- ✅ System tray integration
- ✅ Auto-updates via GitHub Releases
- ✅ Single instance lock

---

## 📊 Changes from v1.0.4

| Feature | v1.0.4 | v1.0.5 |
|---------|--------|--------|
| All core features | ✅ | ✅ |
| Chat input typing | ❌ | ✅ |
| Screen share in Electron | ❌ | ✅ |
| AI assistant name | "Gemini" | "Pissbot" |
| Sidebar logo | Text only | Logo image |
| API key handling | Broken | Fixed |

---

## 🐛 Known Issues

Same as v1.0.4:
1. **Device changes require reconnect**: Changing mic/speakers/camera requires disconnecting and reconnecting
2. **Volume resets on restart**: Volume slider resets to 100% when app restarts
3. **No message history**: Messages are lost when navigating away from channels
4. **Single connection only**: Can only connect to one person at a time

---

## 🎯 Why This Release Matters

### Screen Sharing Was Broken:
- ❌ Electron apps can't use standard `getDisplayMedia()`
- ❌ Users got NotSupportedError
- ❌ Screen sharing didn't work at all

### Now Fixed with desktopCapturer:
- ✅ Uses Electron's native desktopCapturer API
- ✅ Properly requests screen sources
- ✅ Falls back to standard API in browser
- ✅ Screen sharing works reliably!

### Chat Input Was Broken:
- ❌ Could only paste text
- ❌ Typing didn't work
- ❌ Had to copy text from elsewhere

### Now Fixed with AutoFocus:
- ✅ Input has autofocus
- ✅ Typing works immediately
- ✅ Natural chat experience!

---

## 💡 Technical Details

### Screen Share Implementation:
**Before v1.0.5**:
```javascript
// This didn't work in Electron
const stream = await navigator.mediaDevices.getDisplayMedia({
  video: true,
  audio: false
});
```

**After v1.0.5**:
```javascript
// Now uses Electron's desktopCapturer
if (window.electronAPI?.getDesktopSources) {
  const sources = await window.electronAPI.getDesktopSources();
  const sourceId = sources[0].id;
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: sourceId
      }
    }
  });
}
```

### Chat Input Fix:
- Added `autoFocus` attribute to input element
- Input automatically focuses when channel opens
- No more clicking required!

### Pissbot AI:
- System instruction: "You are Pissbot, a helpful AI assistant. Keep responses concise and use markdown formatting when appropriate."
- Uses Gemini 2.5 Flash for fast, quality responses
- Markdown rendering for formatted replies

---

## 🚀 What's Next

Planned for v1.0.6:
- Message persistence (save chat history)
- Volume persistence (remember settings)
- Device change hot-swapping (no reconnect needed)
- Multi-user voice channels (more than 1-on-1)

See `docs/ROADMAP.md` for full feature roadmap.

---

## 📝 Files Changed

**Modified**:
- `App.tsx` - Screen share implementation, Pissbot rename
- `components/ChatArea.tsx` - Chat input autofocus, Pissbot rename
- `components/Sidebar.tsx` - Pisscord logo added
- `electron.js` - Media permission handler for screen share
- `preload.js` - Added desktopCapturer API bridge
- `services/geminiService.ts` - API key fix, Pissbot system instruction
- `types.ts` - Added getDesktopSources to electronAPI interface

**Added**:
- `public/pisscord-dark.png` - Logo for sidebar
- `pisscord-dark.ico` - Dark themed icon variant

---

## 🆘 Troubleshooting

### "Screen sharing still doesn't work"
**Solution**:
1. Make sure you're on v1.0.5 (check bottom right)
2. Restart the app completely
3. Try screen sharing again
4. If still broken, check logs in Settings → Logs

### "Chat input still doesn't work"
**Solution**:
1. Click directly on the chat input box
2. Should auto-focus when switching channels
3. Try refreshing (Ctrl+R in dev mode)

### "Pissbot doesn't respond"
**Solution**:
1. API key must be configured in `.env.local`
2. Check console for API errors
3. Ensure you have internet connection

---

**This is a critical bug fix release. All users should upgrade immediately!** 🚨

---

**Repository**: https://github.com/jamditis/pisscord
**Issues**: https://github.com/jamditis/pisscord/issues

**Upgrade now to fix screen share and chat input!** 🎉
