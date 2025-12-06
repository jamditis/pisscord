# Screen Share Debugging Guide

## Updated Code with Debug Logging

I've added comprehensive logging to help diagnose screen sharing issues. Here's what to do:

---

## Step 1: Test Screen Share

1. **Connect to a call** (with Devin or yourself in two windows)
2. **Click the screen share button** (desktop icon)
3. **Open Debug Log** (Settings → Debug Log tab)
4. **Look for error messages**

---

## Step 2: Check Debug Log

### What You Should See (Working):

```
[webrtc] === Screen Share Button Clicked ===
[webrtc] Current state: isScreenSharing=false
[webrtc] Requesting screen share permission...
[webrtc] Screen share permission granted
[webrtc] Screen track: {track-id}, label: Screen 1
[webrtc] Found 2 RTP senders
[webrtc] Video sender found: current track = {camera-track-id}
[webrtc] Replacing camera track with screen track...
[webrtc] ✅ Track replaced successfully!
[webrtc] Creating new stream with screen + 1 audio tracks
```

### What You Might See (Broken):

#### Error 1: No Active Call
```
[error] ERROR: No active call instance!
```
**Solution**: Make sure you're connected to a call first.

---

#### Error 2: No Video Sender
```
[error] ERROR: No video sender found! Senders:
[error]   Sender 0: kind=audio, id={audio-track-id}
```
**Cause**: Call was established without video.

**Solution**:
1. Disconnect the call
2. Make sure camera permission is granted
3. Reconnect
4. Try screen share again

---

#### Error 3: Permission Denied
```
[error] Screen share error: NotAllowedError - Permission denied
[error] User denied screen share permission
```
**Cause**: You clicked "Cancel" on the screen share dialog.

**Solution**: Click screen share button again and select a screen/window.

---

#### Error 4: No peerConnection
```
[error] ERROR: No peerConnection on call instance!
```
**Cause**: Call object doesn't have a peer connection (rare).

**Solution**: Disconnect and reconnect the call.

---

## Step 3: Common Issues

### Issue: "Button doesn't respond"
**Check**:
1. Is the button enabled? (Should not be grayed out during a call)
2. Open browser console (F12) and check for JavaScript errors
3. Check Debug Log for "Screen Share Button Clicked" message

---

### Issue: "Permission dialog doesn't appear"
**Possible causes**:
1. Browser blocked the permission request
2. Running in a non-secure context (must be HTTPS or localhost)

**Solutions**:
- Check browser address bar for blocked permission icon
- In Electron, this should always work (localhost context)
- Try restarting the app

---

### Issue: "Screen share works locally but friend doesn't see it"
**Cause**: Track replacement happened but peer didn't receive the new stream.

**Debug**:
1. Check your Debug Log for "✅ Track replaced successfully!"
2. Ask friend to check their Debug Log for "Received remote stream"
3. If friend doesn't see "Received remote stream", the peer connection is broken

**Solution**:
- Disconnect and reconnect
- Check firewall/NAT settings
- Try from different network

---

### Issue: "Screen share shows black screen"
**Possible causes**:
1. Selected the wrong source (empty window)
2. GPU acceleration issue
3. DRM-protected content (Netflix, etc.)

**Solutions**:
- Try selecting a different window/screen
- Make sure the window you're sharing has visible content
- DRM content cannot be screen shared (browser limitation)

---

## Step 4: Testing Locally (Solo)

You can test screen share with just yourself:

1. **Open two browser windows**:
   - Window A: http://localhost:5173 (if using `npm run electron:dev`)
   - Window B: http://localhost:5173 (another tab)

2. **Connect them**:
   - Copy Peer ID from Window A
   - Paste in Window B and connect

3. **Test screen share**:
   - In Window A, click screen share
   - Select Window B as the source
   - You should see Window B's content in Window A's video

---

## Step 5: Electron-Specific Issues

### Issue: Screen share not available in production build
**Cause**: Electron security restrictions.

**Check** `electron.js`:
```javascript
webPreferences: {
  nodeIntegration: false,
  contextIsolation: true,  // ✅ Good
  preload: path.join(__dirname, 'preload.js')
}
```

**Verify** permissions in `package.json` (build section):
```json
"build": {
  "protocols": [
    {
      "name": "Pisscord",
      "schemes": ["pisscord"]
    }
  ]
}
```

---

## Step 6: Browser Console Debug

If screen share fails silently:

1. **Open DevTools**: Press `F12` or `Ctrl+Shift+I`
2. **Go to Console tab**
3. **Click screen share button**
4. **Look for red error messages**

Common errors:
- `NotAllowedError`: Permission denied
- `NotFoundError`: No screen available
- `AbortError`: User cancelled
- `InvalidStateError`: Track already stopped

---

## Step 7: PeerJS Debug Mode

PeerJS logs are already enabled (`debug: 1`). Check console for:

```
[PeerJS] Creating RTCPeerConnection
[PeerJS] Set remote session description
[PeerJS] Adding stream
```

If you don't see these, the peer connection isn't established properly.

---

## Quick Diagnostic Checklist

Run through this:

- [ ] **Connected to call?** (Green "Voice Connected" panel visible)
- [ ] **Camera working?** (You see your video)
- [ ] **Screen share button enabled?** (Desktop icon clickable)
- [ ] **Permission granted?** (Screen picker dialog appeared)
- [ ] **Check Debug Log** (Settings → Debug Log)
- [ ] **Look for errors** (Red text in debug log)
- [ ] **Check browser console** (F12 → Console tab)
- [ ] **Try reconnecting** (Disconnect and connect again)

---

## Expected Debug Log Flow

### Starting Call:
```
[webrtc] === Getting Local Media Stream ===
[webrtc] ✅ Got media stream with 1 video tracks and 1 audio tracks
[webrtc] Video track: {id}, label: Integrated Camera, enabled: true
[webrtc] ✅ Stored camera track in myVideoTrack.current
[info] PeerJS initialized with ID: {peer-id}
[webrtc] Received remote stream
[info] Call connected
```

### Starting Screen Share:
```
[webrtc] === Screen Share Button Clicked ===
[webrtc] Current state: isScreenSharing=false
[webrtc] Requesting screen share permission...
[webrtc] Screen share permission granted
[webrtc] Screen track: {id}, label: Screen 1
[webrtc] Found 2 RTP senders
[webrtc] Video sender found: current track = {camera-track-id}
[webrtc] Replacing camera track with screen track...
[webrtc] ✅ Track replaced successfully!
[webrtc] Creating new stream with screen + 1 audio tracks
```

### Stopping Screen Share:
```
[webrtc] Stopping screen share manually...
[webrtc] Swapping Screen -> Camera
[webrtc] Stopping screen track: {screen-track-id}
[webrtc] Replacing with camera track: {camera-track-id}
[webrtc] ✅ Stopped screen share successfully
```

---

## Still Not Working?

If screen share still fails after checking everything above:

1. **Export Debug Log**:
   - Settings → Debug Log
   - Copy all text
   - Save to file

2. **Check these details**:
   - What error message appears in Debug Log?
   - Does permission dialog appear?
   - Are you in a call when clicking screen share?
   - What browser/Electron version?
   - Windows version?

3. **Known Limitations**:
   - Electron version <12 has buggy screen share support
   - Some Windows 11 builds block screen capture
   - Antivirus can block screen capture APIs
   - Corporate VPNs can interfere with WebRTC

---

## Testing Commands

### Test in Development:
```bash
npm run electron:dev
```

### Test Production Build:
```bash
npm run dist
# Then run the .exe
```

### Enable Verbose Logging:
In `electron.js`, add:
```javascript
app.commandLine.appendSwitch('enable-logging');
app.commandLine.appendSwitch('v', '1');
```

---

## What to Report

If you find the issue, report:

1. **Exact error message** from Debug Log
2. **Browser console errors** (if any)
3. **Reproduction steps**:
   - When does it fail?
   - Does it fail every time?
   - Development or production build?

4. **Environment**:
   - Windows version
   - Electron version (`package.json`)
   - Two machines or localhost test?

---

## Next Steps

With the enhanced logging, you should now be able to:

1. ✅ See exactly where screen share fails
2. ✅ Get clear error messages (alerts + debug log)
3. ✅ Track the entire flow from button click to success/failure
4. ✅ Diagnose peer connection issues

Try screen sharing now and check the Debug Log. The error message will tell you exactly what's wrong!
