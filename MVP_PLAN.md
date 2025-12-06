# Minimal Voice + Screen Share App - 2-Person MVP

## Simplified Scope
**Goal:** Working prototype where 2 people can voice chat and share screens within 1-2 weeks.

---

## Ultra-Minimal Feature Set

### What We're Building
✅ Voice chat (2 people)
✅ Screen sharing (1-way or 2-way)
✅ Simple connection (paste IP/code to connect)
✅ Mute button
✅ Screen share toggle
✅ Basic UI

### What We're NOT Building (Yet)
❌ Text chat
❌ File sharing
❌ User accounts/login
❌ Multiple users (>2)
❌ Channel system
❌ Message history
❌ Server infrastructure

---

## Fastest Path: Pure P2P WebRTC

### Architecture (Simplified)
```
┌─────────────┐         WebRTC          ┌─────────────┐
│   You (PC)  │ ←──────────────────────→ │ Friend (PC) │
└─────────────┘    Direct Connection     └─────────────┘

No server needed!
Just use a free STUN server for NAT traversal
```

### How It Works
1. You open the app, get a connection code
2. Friend opens app, pastes your code
3. Direct WebRTC connection established
4. Voice + screen sharing active

---

## Tech Stack (Absolute Minimum)

```yaml
App Framework: Electron (easiest for .exe packaging)
WebRTC Library: simple-peer (handles all WebRTC complexity)
Signaling: PeerJS Cloud (free, no server needed)
UI: Plain HTML/CSS/JavaScript (no React needed for MVP)

Total Dependencies:
  - electron
  - simple-peer OR peerjs
  - electron-builder (for .exe packaging)
```

---

## Implementation (1-2 Weeks)

### Day 1-2: Project Setup
```bash
# Create project
mkdir pisscord-mvp
cd pisscord-mvp

# Initialize
npm init -y
npm install electron electron-builder peerjs

# Create basic structure
mkdir src
touch src/index.html src/main.js src/renderer.js
```

**File Structure:**
```
pisscord-mvp/
├── src/
│   ├── main.js          # Electron main process
│   ├── index.html       # UI
│   └── renderer.js      # WebRTC logic
├── package.json
└── build/
    └── icon.ico         # App icon
```

### Day 3-4: Basic Electron App
**src/main.js** (Electron bootstrap):
```javascript
const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 400,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  win.loadFile('src/index.html');
}

app.whenReady().then(createWindow);
```

**src/index.html** (Minimal UI):
```html
<!DOCTYPE html>
<html>
<head>
  <title>Voice + Screen Share</title>
  <style>
    body {
      font-family: Arial;
      padding: 20px;
      background: #36393f;
      color: white;
    }
    button {
      padding: 12px 24px;
      font-size: 16px;
      margin: 10px;
      cursor: pointer;
      border: none;
      border-radius: 5px;
    }
    #connectBtn { background: #43b581; color: white; }
    #muteBtn { background: #f04747; color: white; }
    #shareBtn { background: #7289da; color: white; }
    input {
      width: 100%;
      padding: 10px;
      font-size: 14px;
      margin: 10px 0;
      border-radius: 5px;
      border: none;
    }
    #status {
      padding: 10px;
      margin: 10px 0;
      border-radius: 5px;
      background: #2f3136;
    }
  </style>
</head>
<body>
  <h1>🎙️ Voice + Screen Share</h1>

  <div id="status">Status: Disconnected</div>

  <div>
    <h3>Your ID:</h3>
    <input type="text" id="myId" readonly>
    <button onclick="copyId()">Copy ID</button>
  </div>

  <div>
    <h3>Connect to Friend:</h3>
    <input type="text" id="friendId" placeholder="Paste friend's ID">
    <button id="connectBtn" onclick="connect()">Connect</button>
  </div>

  <div>
    <h3>Controls:</h3>
    <button id="muteBtn" onclick="toggleMute()" disabled>🔇 Mute</button>
    <button id="shareBtn" onclick="toggleShare()" disabled>🖥️ Share Screen</button>
  </div>

  <script src="renderer.js"></script>
</body>
</html>
```

### Day 5-7: WebRTC Implementation
**src/renderer.js** (The core logic):
```javascript
const Peer = require('peerjs');

// Initialize PeerJS (free cloud signaling)
const peer = new Peer({
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:global.stun.twilio.com:3478' }
    ]
  }
});

let conn = null;
let call = null;
let localStream = null;
let screenStream = null;
let isMuted = false;

// When peer is ready, show our ID
peer.on('open', (id) => {
  document.getElementById('myId').value = id;
  document.getElementById('status').textContent = `Status: Ready (ID: ${id})`;
});

// Connect to friend
async function connect() {
  const friendId = document.getElementById('friendId').value.trim();
  if (!friendId) return alert('Enter friend ID');

  try {
    // Get microphone access
    localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false
    });

    // Make call
    call = peer.call(friendId, localStream);

    // Receive their audio
    call.on('stream', (remoteStream) => {
      playAudio(remoteStream);
      document.getElementById('status').textContent = 'Status: Connected ✅';
      enableControls();
    });

  } catch (err) {
    alert('Connection failed: ' + err.message);
  }
}

// Answer incoming calls
peer.on('call', async (incomingCall) => {
  call = incomingCall;

  // Get mic access
  localStream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: false
  });

  // Answer with our audio
  call.answer(localStream);

  // Receive their audio
  call.on('stream', (remoteStream) => {
    playAudio(remoteStream);
    document.getElementById('status').textContent = 'Status: Connected ✅';
    enableControls();
  });
});

// Play remote audio
function playAudio(stream) {
  const audio = new Audio();
  audio.srcObject = stream;
  audio.play();
}

// Mute/unmute
function toggleMute() {
  if (!localStream) return;

  const audioTrack = localStream.getAudioTracks()[0];
  audioTrack.enabled = !audioTrack.enabled;
  isMuted = !audioTrack.enabled;

  document.getElementById('muteBtn').textContent = isMuted ? '🔇 Unmute' : '🔇 Mute';
  document.getElementById('muteBtn').style.background = isMuted ? '#43b581' : '#f04747';
}

// Screen share
async function toggleShare() {
  if (screenStream) {
    // Stop sharing
    screenStream.getTracks().forEach(track => track.stop());
    screenStream = null;
    document.getElementById('shareBtn').textContent = '🖥️ Share Screen';
    return;
  }

  try {
    // Start screen share
    screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: false
    });

    // Send screen to friend (create new peer connection)
    const screenCall = peer.call(
      document.getElementById('friendId').value,
      screenStream
    );

    document.getElementById('shareBtn').textContent = '🖥️ Stop Sharing';
    document.getElementById('shareBtn').style.background = '#f04747';

    // Handle when screen share ends
    screenStream.getVideoTracks()[0].onended = () => {
      screenStream = null;
      document.getElementById('shareBtn').textContent = '🖥️ Share Screen';
      document.getElementById('shareBtn').style.background = '#7289da';
    };

  } catch (err) {
    alert('Screen share failed: ' + err.message);
  }
}

// Receive screen share
peer.on('call', (incomingCall) => {
  // If it's a video stream (screen share)
  incomingCall.answer(null); // Don't send anything back

  incomingCall.on('stream', (remoteStream) => {
    const videoTracks = remoteStream.getVideoTracks();
    if (videoTracks.length > 0) {
      // Display screen share
      displayScreen(remoteStream);
    }
  });
});

function displayScreen(stream) {
  // Create video element for screen
  let video = document.getElementById('screenVideo');
  if (!video) {
    video = document.createElement('video');
    video.id = 'screenVideo';
    video.autoplay = true;
    video.style.width = '100%';
    video.style.marginTop = '20px';
    document.body.appendChild(video);
  }
  video.srcObject = stream;
}

// Helper functions
function copyId() {
  const myId = document.getElementById('myId');
  myId.select();
  document.execCommand('copy');
  alert('ID copied to clipboard!');
}

function enableControls() {
  document.getElementById('muteBtn').disabled = false;
  document.getElementById('shareBtn').disabled = false;
}

// Error handling
peer.on('error', (err) => {
  console.error('Peer error:', err);
  alert('Connection error: ' + err.type);
});
```

### Day 8-10: Testing & Polish

**Testing Checklist:**
1. Test on same network (easiest)
2. Test over internet (NAT traversal)
3. Test screen sharing both directions
4. Test mute functionality
5. Test reconnection after disconnect

**Polish Items:**
- Better error messages
- Loading states
- Visual feedback for muted/sharing
- App icon
- Minimize to tray

### Day 11-14: Packaging & Distribution

**package.json** (add build config):
```json
{
  "name": "pisscord",
  "version": "1.0.0",
  "main": "src/main.js",
  "scripts": {
    "start": "electron .",
    "build": "electron-builder"
  },
  "build": {
    "appId": "com.pisscord.app",
    "productName": "Pisscord",
    "win": {
      "target": ["nsis"],
      "icon": "build/icon.ico"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true
    }
  },
  "devDependencies": {
    "electron": "^28.0.0",
    "electron-builder": "^24.9.1"
  },
  "dependencies": {
    "peerjs": "^1.5.2"
  }
}
```

**Build the .exe:**
```bash
npm run build
```

**Result:** `dist/Pisscord Setup 1.0.0.exe` (~80MB)

---

## Deployment Instructions

### For You (App Creator)
1. Build the app: `npm run build`
2. Get the .exe from `dist/` folder
3. Upload to file sharing (Google Drive, Dropbox, etc.)
4. Send download link to friends/family

### For Users (Friends/Family)
1. Download the .exe
2. Run installer (click Next, Next, Install)
3. Open app
4. Copy your ID
5. Send ID to person you want to talk to
6. Paste their ID when they send it
7. Click "Connect"
8. Talk! 🎙️

---

## Limitations of This MVP

### Technical Limitations
- Only works for 2 people at a time
- No encryption (WebRTC is encrypted by default though)
- Requires both people online simultaneously
- No text chat
- No file sharing
- Connection codes are long random strings

### Why These Are Okay for MVP
- Proves the concept works
- Gets you something usable in 2 weeks
- Can iterate from here
- Perfect for 1-on-1 calls with family

---

## Upgrade Path (After MVP)

### Phase 2: Better UX (1 week)
- Shorter/memorable connection codes
- Save favorite contacts
- Auto-reconnect on disconnect
- Better UI/animations

### Phase 3: More Users (1 week)
- Support 3-10 people in call
- Use mesh network topology
- Better audio mixing

### Phase 4: Features (2 weeks)
- Text chat
- File sharing
- Video calls (camera)
- Recording

### Phase 5: Server Mode (1 week)
- Optional server for easier connections
- No more copy-paste IDs
- Message history when offline

---

## Total Cost Estimate

### MVP (2-Person Voice + Screen Share)
- Development time: 1-2 weeks
- Cost: $0 (all free libraries)
- No ongoing costs (pure P2P)

### If You Add a Server Later
- VPS: $5/month (DigitalOcean, Hetzner)
- Domain: $10/year (optional)

---

## Success Criteria

✅ Two people can install the app
✅ Connect without technical knowledge
✅ Voice chat works clearly
✅ Screen sharing works smoothly
✅ Runs on Windows 10/11
✅ .exe file is <100MB
✅ Setup takes <5 minutes

---

## Known Issues & Solutions

### Issue 1: "Friend can't hear me"
**Causes:**
- Firewall blocking UDP
- NAT traversal failed
- Wrong microphone selected

**Solutions:**
- Use TURN server (relay) as fallback
- Add microphone selection in settings
- Test on same WiFi first

### Issue 2: "Connection fails"
**Causes:**
- Both behind strict NAT (rare)
- PeerJS cloud service down

**Solutions:**
- Use multiple STUN servers
- Fallback to Twilio TURN server
- Self-host PeerJS server

### Issue 3: "Screen share is laggy"
**Causes:**
- Slow upload speed
- High resolution screen

**Solutions:**
- Reduce screen share frame rate
- Limit to 720p resolution
- Compress video stream

---

## Comparison: This MVP vs. Full Plan

| Feature | MVP (2 weeks) | Full App (8 weeks) |
|---------|---------------|-------------------|
| Voice chat | ✅ 2 people | ✅ 10+ people |
| Screen share | ✅ Basic | ✅ Advanced |
| Text chat | ❌ | ✅ |
| File sharing | ❌ | ✅ |
| User accounts | ❌ | ✅ |
| Message history | ❌ | ✅ |
| Server needed | ❌ | ✅ (recommended) |
| Development time | 1-2 weeks | 8 weeks |

**Recommendation:** Build MVP first, validate it works, then decide if you want full features.

---

## Next Steps (Start Today!)

### Step 1: Install Prerequisites
```bash
# Install Node.js (nodejs.org)
# Install Git (git-scm.com)
# Install VS Code (code.visualstudio.com)
```

### Step 2: Create Project
```bash
mkdir pisscord-mvp
cd pisscord-mvp
npm init -y
npm install electron electron-builder peerjs
```

### Step 3: Copy Code
- Create files from Day 1-2 section above
- Copy the HTML, JavaScript, and package.json

### Step 4: Test It
```bash
npm start
```

### Step 5: Share & Iterate
- Build the .exe
- Test with a friend
- Fix bugs
- Add features as needed

---

## Conclusion

This MVP approach gets you a **working voice + screen share app in 1-2 weeks** instead of 8 weeks. You can install it on Windows 10/11 and immediately use it with friends/family.

**Key Advantages:**
- No server costs (pure P2P)
- No account creation needed
- Simple connection (paste code)
- Professional-looking .exe installer
- Under 100MB download size

**Perfect For:**
- Quick 1-on-1 calls with family
- Screen sharing for tech support
- Privacy-focused communication
- Learning WebRTC/Electron

Start with this, validate it works for your needs, then expand features if needed! 🚀
