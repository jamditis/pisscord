# Complete Testing Guide - Test Before Sending to Devin

This guide walks you through testing **ALL** Pisscord features locally before releasing to users.

---

## Setup: Test with Yourself (Two Instances)

You can test everything with just one computer!

### Method 1: Two Browser Windows (Development)

1. **Start dev server**:
   ```bash
   npm run electron:dev
   ```

2. **Open two Electron windows**:
   - Window A: Opens automatically
   - Window B: Open Pisscord again from Start Menu or run `electron .` in another terminal

3. **Get Peer IDs**:
   - Window A: Go to Voice Lounge, copy your Peer ID
   - Window B: Go to Voice Lounge, copy your Peer ID

4. **Connect them**:
   - In Window A: Paste Window B's Peer ID, click Connect
   - Window B: Accept the incoming call
   - **OR** vice versa

5. **Now you can test!**

### Method 2: Two Computers (Production Build)

1. Build: `npm run dist`
2. Install on Computer A and Computer B
3. Connect them using Peer IDs

### Method 3: Virtual Machine

1. Install Pisscord on Windows
2. Create Windows VM (VirtualBox, VMware)
3. Install Pisscord in VM
4. Connect between host and VM

---

## Testing Checklist

### ✅ 1. Voice Call (Core Feature)

**Test**: Basic audio communication

**Steps**:
1. Connect two instances (see Setup above)
2. **Speak** in Window A
3. **Listen** in Window B - should hear your voice
4. **Speak** in Window B
5. **Listen** in Window A - should hear your voice

**Check**:
- [ ] Audio is clear (no crackling)
- [ ] Volume is reasonable
- [ ] Low latency (<1 second delay)
- [ ] No echo (unless both windows have speakers on)

**Debug**:
- Settings → Debug Log → Check for audio errors
- Browser console (F12) → Check for WebRTC errors

---

### ✅ 2. Video Call

**Test**: Video streaming

**Steps**:
1. Connect two instances
2. **Enable camera** in both windows
3. **Look at Window A** → Should see Window B's video
4. **Look at Window B** → Should see Window A's video

**Check**:
- [ ] Video is smooth (not choppy)
- [ ] Video is mirrored correctly
- [ ] Resolution is decent
- [ ] Frame rate acceptable

**Debug**:
- If video is black: Check camera permissions
- If video is frozen: Check Debug Log for errors

---

### ✅ 3. Mute/Unmute

**Test**: Toggle microphone

**Steps**:
1. During call, click **Mute** button in sidebar
2. Speak → Other window should NOT hear you
3. Click **Unmute**
4. Speak → Other window should hear you

**Check**:
- [ ] Mute button visual feedback (red when muted)
- [ ] Audio actually stops
- [ ] Unmute restores audio

---

### ✅ 4. Video On/Off

**Test**: Toggle camera

**Steps**:
1. During call, click **Video** button in sidebar
2. Camera turns off → Other window sees placeholder
3. Click **Video** again
4. Camera turns on → Other window sees you

**Check**:
- [ ] Button shows correct state
- [ ] Camera actually stops (light turns off)
- [ ] Other person sees placeholder when off
- [ ] Video returns when enabled

---

### ✅ 5. Volume Control ⭐ NEW

**Test**: Adjust remote audio volume

**Steps**:
1. During call, click **Speaker icon** in sidebar
2. **Slider appears**
3. Drag to 50%
4. Other person speaks → Should be quieter
5. Drag to 150%
6. Other person speaks → Should be louder

**Check**:
- [ ] Slider appears when clicking speaker
- [ ] Volume changes immediately
- [ ] 0% = silent
- [ ] 100% = normal
- [ ] 200% = boost (for quiet friends)

---

### ✅ 6. Screen Share ⭐ NOW DEBUGGABLE

**Test**: Share screen/window

**Steps**:
1. During call, click **Desktop icon**
2. **Permission dialog appears**
3. Select a window or screen
4. Click **Share**
5. **In the other window**: Should see your screen
6. Click **Desktop icon** again to stop

**Check**:
- [ ] Permission dialog appears
- [ ] Can select window or screen
- [ ] Other person sees screen share
- [ ] Screen share is smooth
- [ ] Stopping returns to camera

**Debug** (if not working):
1. Click screen share button
2. **Settings → Debug Log**
3. Look for error messages in **RED**
4. See `SCREEN_SHARE_DEBUG.md` for detailed troubleshooting

**Common Issues**:
- "No video sender found" → Reconnect the call
- "Permission denied" → Click screen share again, don't cancel
- Black screen → Select a different window

---

### ✅ 7. Persistent Voice Panel ⭐ NEW

**Test**: Voice controls persist across channels

**Steps**:
1. Connect to a call
2. **Navigate to #general** text channel
3. **Check sidebar bottom** → Should see "Voice Connected" panel
4. Click mute/video buttons from panel
5. Should still work while in text channel

**Check**:
- [ ] Panel visible in sidebar when connected
- [ ] Panel shows in ALL channels (not just voice)
- [ ] Mute/video/volume buttons work
- [ ] Disconnect button works
- [ ] Audio continues playing in text channels

---

### ✅ 8. Text Chat

**Test**: Send messages

**Steps**:
1. Go to **#general** channel
2. Type a message
3. Press Enter
4. Message appears

**Check**:
- [ ] Message appears with your name
- [ ] Timestamp is correct
- [ ] Can send multiple messages
- [ ] Messages stay when switching channels (currently doesn't persist - known limitation)

---

### ✅ 9. AI Chat

**Test**: Gemini AI assistant (requires API key)

**Steps**:
1. Go to **#gemini-ai** channel
2. Type: "What is TypeScript?"
3. Press Enter
4. AI should respond

**Check**:
- [ ] AI responds within 3-5 seconds
- [ ] Response is relevant
- [ ] Can ask follow-up questions

**If API key not configured**:
- [ ] Shows error message (expected)

---

### ✅ 10. User Profile

**Test**: Customize profile

**Steps**:
1. Click **Gear icon** (⚙️) in sidebar
2. Go to **My Profile** tab
3. Change display name
4. Change status message
5. Select a different color
6. Click **Done**

**Check**:
- [ ] Name updates in sidebar
- [ ] Color changes avatar background
- [ ] Settings persist after restarting app

---

### ✅ 11. Device Selection

**Test**: Change audio/video devices

**Steps**:
1. Click **Gear icon** → **Voice & Video** tab
2. Change **Microphone**
3. Change **Speakers**
4. Change **Camera**
4. Click **Done**
5. **Disconnect and reconnect** to call

**Check**:
- [ ] Devices listed in dropdowns
- [ ] Changes take effect after reconnect
- [ ] Warning message shows (reconnect required)

---

### ✅ 12. Debug Log

**Test**: View connection logs

**Steps**:
1. Click **Gear icon** → **Debug Log** tab
2. Should see logs with timestamps
3. Color-coded: Green (info), Red (error), Blue (webrtc)

**Check**:
- [ ] Logs appear in real-time
- [ ] Errors are red
- [ ] WebRTC events are blue
- [ ] Scrollable if many logs

---

### ✅ 13. System Tray

**Test**: Minimize to tray

**Steps**:
1. Click **X** button (close window)
2. App minimizes to system tray (bottom-right)
3. Right-click tray icon
4. Click **Open Pisscord**
5. App reopens

**Check**:
- [ ] Closing window doesn't quit app
- [ ] Tray icon appears
- [ ] Can reopen from tray
- [ ] "Quit" from tray actually closes app
- [ ] If in call, audio continues in tray

---

### ✅ 14. Online Presence

**Test**: See who's online

**Steps**:
1. Open two instances
2. Both should show online in **User List** (right sidebar)
3. Close one instance
4. Should disappear from other instance's list

**Check**:
- [ ] Own peer ID shows
- [ ] Other users appear
- [ ] Users disappear when they close app
- [ ] Can click user to connect (if in voice channel view)

---

### ✅ 15. Auto-Update (After v1.0.2 Released) ⭐ NEW

**Test**: Automatic update flow

**Requires**:
- v1.0.1 installed
- v1.0.2 published to GitHub Releases

**Steps**:
1. Open Pisscord v1.0.1
2. Wait 3 seconds
3. Update modal should appear
4. Click **"Download in Background"**
5. **Progress bar** shows 0% → 100%
6. When complete: **"Restart & Install"** button
7. Click it
8. App closes, installs, reopens on v1.0.2

**Check**:
- [ ] Update notification appears
- [ ] Progress bar updates
- [ ] Download completes
- [ ] Restart button appears
- [ ] App restarts on new version
- [ ] User data preserved

**Debug**:
- Settings → Debug Log → Look for update events
- If no update appears: Check GitHub Release exists

---

## Performance Testing

### Test 1: CPU Usage

**Steps**:
1. Open Task Manager
2. Start a call
3. Check CPU usage

**Expected**:
- Idle: <5% CPU
- Voice call: 10-20% CPU
- Video call: 20-40% CPU
- Screen share: 30-50% CPU

**If higher**: Check Debug Log for errors

---

### Test 2: Memory Usage

**Expected**:
- Startup: ~150MB
- After 10 minutes: <300MB
- After 1 hour: <500MB

**If memory keeps growing**: Memory leak (report issue)

---

### Test 3: Network Usage

**Tools**: Task Manager → Performance → Wi-Fi

**Expected**:
- Voice only: ~100 KB/s upload + download
- Voice + Video: ~500 KB/s to 2 MB/s
- Screen share: 1-5 MB/s (depends on quality)

---

## Build Testing

### Development Build
```bash
npm run electron:dev
```
**Test**: All features above

### Production Build
```bash
npm run dist
```
**Install**: `dist/Pisscord Setup 1.0.1.exe`

**Test**:
- [ ] Installer works
- [ ] App launches
- [ ] All features work same as dev
- [ ] System tray works
- [ ] Uninstall/reinstall works

---

## Testing Scenarios

### Scenario 1: Normal Call Flow
1. User A opens app
2. Copies Peer ID
3. Sends to User B
4. User B pastes ID and connects
5. Call establishes
6. Voice/video works
7. User A disconnects
8. Call ends cleanly

---

### Scenario 2: Multi-tasking
1. Start call
2. Navigate to #general
3. Voice continues
4. Mute from sidebar panel
5. Send text messages
6. Go back to Voice Lounge
7. Video still shows

---

### Scenario 3: Screen Share Workflow
1. In call
2. Click screen share
3. Select browser window
4. Friend sees browser
5. Navigate in browser
6. Friend sees changes
7. Stop screen share
8. Camera returns

---

### Scenario 4: Settings Change
1. In call
2. Open settings
3. Change name
4. Change color
5. Close settings
6. Name/color update in sidebar
7. Call continues

---

## Regression Testing (After Changes)

Before sending to Devin, test these critical paths:

**Must work**:
- [ ] Can establish call
- [ ] Audio works both ways
- [ ] Video works both ways
- [ ] Screen share works
- [ ] Disconnect works
- [ ] Settings persist
- [ ] Auto-update detects new version

**Should work**:
- [ ] Mute/unmute
- [ ] Volume control
- [ ] Persistent voice panel
- [ ] System tray
- [ ] Debug log shows info

**Nice to have**:
- [ ] AI chat (if API key configured)
- [ ] Text chat
- [ ] Online presence

---

## Test Matrix

| Feature | Dev Build | Prod Build | Two PCs | Notes |
|---------|-----------|------------|---------|-------|
| Voice call | ✅ | ✅ | ✅ | Test with headphones |
| Video call | ✅ | ✅ | ✅ | Check both cameras |
| Screen share | ✅ | ✅ | ✅ | **Use Debug Log** |
| Mute/unmute | ✅ | ✅ | ✅ | Visual feedback |
| Volume control | ✅ | ✅ | ✅ | Try 0%, 100%, 200% |
| Persistent panel | ✅ | ✅ | ✅ | Check all channels |
| Text chat | ✅ | ✅ | ❌ | Local only |
| AI chat | ✅ | ✅ | ❌ | Need API key |
| Settings | ✅ | ✅ | ✅ | Persist after restart |
| System tray | ✅ | ✅ | ✅ | Close vs Quit |
| Auto-update | ❌ | ✅ | ✅ | Need v1.0.2 release |

---

## Quick Pre-Release Checklist

Before sending to Devin:

- [ ] `npm run dist` completes without errors
- [ ] Install `.exe` on your machine
- [ ] Test voice call (two windows)
- [ ] Test screen share (check Debug Log)
- [ ] Test volume control
- [ ] Test persistent voice panel
- [ ] Settings persist after restart
- [ ] Upload to GitHub Releases
- [ ] Download from GitHub and test
- [ ] All features still work

**Estimated testing time**: 15-20 minutes

---

## Automated Testing (Future)

For future releases, consider adding:
- Unit tests for WebRTC logic
- Integration tests for call flow
- E2E tests with Playwright

**For now**: Manual testing is fine for v1.0.1

---

## What to Document for Devin

After testing, note:
- **What works perfectly** ✅
- **What has issues** ⚠️
- **What to test carefully** 🧪
- **Known limitations** ⚠️

Example:
```
✅ Voice/video: Perfect
✅ Volume control: Works great
🧪 Screen share: Test carefully, check Debug Log if issues
⚠️ Text chat: Messages don't persist (known limitation)
```

---

## You're Ready!

With this guide, you can:
1. ✅ Test all features locally
2. ✅ Debug issues (especially screen share)
3. ✅ Validate before releasing
4. ✅ Confidently send to Devin

**Start with**: Voice call + screen share (core features)
**Then test**: Volume control + persistent panel (new features)
**Finally check**: Settings + tray + debug log

Good luck! 🚀
