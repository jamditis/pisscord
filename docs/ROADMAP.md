# Pisscord Feature Roadmap

This document outlines the planned features and development priorities for Pisscord.

## Current Version: 1.0.1 ✅

### Implemented Features
- ✅ P2P voice/video calling via WebRTC
- ✅ Screen sharing with track replacement
- ✅ Persistent voice control panel
- ✅ Volume control (0-200%)
- ✅ Device selection (mic, speakers, camera)
- ✅ Real-time presence system
- ✅ Text chat channels
- ✅ AI assistant (Gemini integration)
- ✅ Custom user profiles
- ✅ System tray integration
- ✅ Debug logging
- ✅ Auto-update system (Firebase-based)

---

## Phase 1: Core Audio/Video (Priority: CRITICAL)

### 1.1 Push-to-Talk (PTT) 🔥
**Priority**: Critical
**Complexity**: Medium
**Impact**: High

**Description**: Global system-wide hotkey to toggle microphone

**Implementation**:
```typescript
// Use electron globalShortcut
const { globalShortcut } = require('electron');

// In electron.js
app.whenReady().then(() => {
  globalShortcut.register('Alt+Space', () => {
    mainWindow.webContents.send('toggle-ptt');
  });
});

// In App.tsx (via IPC)
useEffect(() => {
  if (window.electronAPI) {
    window.electronAPI.on('toggle-ptt', () => {
      setIsPTTActive(!isPTTActive);
    });
  }
}, []);
```

**Features**:
- Configurable hotkey in settings
- Visual indicator when PTT is active
- "Voice Activity" mode vs "Push to Talk" mode toggle
- Works even when app is minimized to tray

**Files to Modify**:
- `electron.js`: Register global shortcuts
- `App.tsx`: Add PTT state and IPC listener
- `UserSettingsModal.tsx`: Add PTT settings tab
- `types.ts`: Add PTT configuration interface

---

### 1.2 Noise Suppression
**Priority**: High
**Complexity**: High
**Impact**: High

**Description**: Filter out background noise (keyboard, fans, dogs barking)

**Implementation Options**:

**Option A: RNNoise (Web Assembly)**
```typescript
// Use @sapphi-red/web-noise-suppressor
import { createNoiseSuppressor } from '@sapphi-red/web-noise-suppressor';

const suppressor = await createNoiseSuppressor();
const processedStream = await suppressor.process(rawAudioStream);
```

**Option B: Web Audio API (Basic)**
```typescript
const audioContext = new AudioContext();
const source = audioContext.createMediaStreamSource(myStream);
const biquadFilter = audioContext.createBiquadFilter();
biquadFilter.type = "highpass";
biquadFilter.frequency.value = 300; // Cut low-frequency noise
source.connect(biquadFilter);
```

**Features**:
- Toggle on/off in Voice & Video settings
- Adjustable noise gate threshold
- CPU usage indicator (processing is intensive)
- Bypass mode for music/instruments

**Dependencies**:
- `@sapphi-red/web-noise-suppressor` (RNNoise WASM)
- OR custom Web Audio API filters

---

### 1.3 Echo Cancellation & Auto Gain Control
**Priority**: Medium
**Complexity**: Low (browser built-in)
**Impact**: High

**Description**: Automatic volume leveling and echo removal

**Implementation**:
```typescript
const constraints = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    deviceId: deviceSettings.audioInputId
  },
  video: true
};

const stream = await navigator.mediaDevices.getUserMedia(constraints);
```

**Already Partially Implemented**: Browser default constraints
**Enhancement**: Add UI toggles in settings

---

### 1.4 Soundboard
**Priority**: Medium
**Complexity**: Medium
**Impact**: Fun Factor

**Description**: Play short audio clips into voice stream

**Implementation**:
```typescript
// Mix soundboard audio into microphone stream
const audioContext = new AudioContext();
const micSource = audioContext.createMediaStreamSource(myStream);
const destination = audioContext.createMediaStreamDestination();

// Play sound effect
const soundEffect = new Audio('/sounds/airhorn.mp3');
const soundSource = audioContext.createMediaElementSource(soundEffect);
soundSource.connect(destination);
micSource.connect(destination);

// Use destination.stream as the call stream
```

**Features**:
- Grid of sound buttons (9-12 slots)
- Upload custom MP3s
- Volume slider per sound
- Hotkeys for sounds (Ctrl+1, Ctrl+2, etc.)
- "Stop All Sounds" button

**Files to Create**:
- `components/Soundboard.tsx`
- `services/audioMixer.ts`

---

### 1.5 Spatial Audio
**Priority**: Low
**Complexity**: High
**Impact**: Cool Factor

**Description**: Pan user audio left/right based on visual position

**Implementation**:
```typescript
const audioContext = new AudioContext();
const panner = audioContext.createStereoPanner();
panner.pan.value = -1; // -1 = left, 0 = center, 1 = right
remoteAudioSource.connect(panner).connect(audioContext.destination);
```

**Use Cases**:
- In "Voice Lounge", users could drag their avatars
- Audio pans based on horizontal position
- Simulates "sitting around a table"

---

### 1.6 High-Fidelity Music Mode
**Priority**: Medium
**Complexity**: Low
**Impact**: High (for musicians)

**Description**: Disable noise suppression/compression for music streaming

**Implementation**:
```typescript
const musicModeConstraints = {
  audio: {
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false,
    sampleRate: 48000,
    channelCount: 2, // Stereo
    latency: 0
  }
};
```

**Features**:
- "Music Mode" toggle in voice panel
- Warning about potential echo
- Stereo audio support
- Low-latency mode

---

## Phase 2: Video & Streaming

### 2.1 Picture-in-Picture (Pop-out Player)
**Priority**: High
**Complexity**: Low (browser API)
**Impact**: High

**Implementation**:
```typescript
// In VoiceStage.tsx
const handlePiP = async () => {
  if (remoteVideoRef.current) {
    await remoteVideoRef.current.requestPictureInPicture();
  }
};
```

**Features**:
- Button in video controls
- Stays on top while alt-tabbing
- Works for both remote video and screen share

---

### 2.2 60FPS / High Bitrate Streaming
**Priority**: Medium
**Complexity**: Low
**Impact**: High (Discord Nitro killer)

**Implementation**:
```typescript
const call = peer.call(remotePeerId, stream, {
  sdpTransform: (sdp) => {
    // Increase bitrate in SDP
    return sdp.replace(/b=AS:(\d+)/, 'b=AS:4000'); // 4 Mbps
  }
});

// High-quality video constraints
const hdConstraints = {
  video: {
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    frameRate: { ideal: 60 }
  }
};
```

**Features**:
- Quality presets: "Auto", "720p/30", "1080p/60", "4K/60"
- Bandwidth indicator (show user their upload speed)
- Adaptive bitrate based on connection quality

---

### 2.3 Virtual Backgrounds / Blur
**Priority**: Low
**Complexity**: High
**Impact**: Medium

**Implementation Options**:

**Option A: @mediapipe/selfie_segmentation**
```typescript
import { SelfieSegmentation } from '@mediapipe/selfie_segmentation';

const segmenter = new SelfieSegmentation();
// Apply background replacement to video stream
```

**Option B: Simple Blur (CSS)**
```css
video {
  filter: blur(10px);
  background: url('virtual-bg.jpg');
}
```

**Features**:
- Blur background
- Upload custom background image
- Green screen effect

---

## Phase 3: Text Chat & Media

### 3.1 File Transfer 🔥
**Priority**: Critical
**Complexity**: Medium
**Impact**: Very High

**Description**: P2P file sharing via WebRTC Data Channels (no size limits!)

**Implementation**:
```typescript
// Establish data channel
const dataChannel = peerConnection.createDataChannel('fileTransfer');

// Send file in chunks
const chunkSize = 16384; // 16KB chunks
const fileReader = new FileReader();
fileReader.onload = (e) => {
  dataChannel.send(e.target.result);
};

// Receive and reassemble
let receivedChunks = [];
dataChannel.onmessage = (event) => {
  receivedChunks.push(event.data);
};
```

**Features**:
- Drag-and-drop files into chat
- Progress bar for large files
- Support for images, videos, PDFs, ZIPs (any file type)
- No file size limit (P2P advantage!)
- Image preview in chat
- Click to download

**Files to Create**:
- `services/fileTransfer.ts`
- `components/FileUpload.tsx`
- `components/FilePreview.tsx`

---

### 3.2 Rich Text / Markdown
**Priority**: Medium
**Complexity**: Low
**Impact**: Medium

**Implementation**:
```typescript
import ReactMarkdown from 'react-markdown';

<ReactMarkdown>{message.content}</ReactMarkdown>
```

**Features**:
- **Bold**, *Italic*, ~~Strikethrough~~
- `Code inline` and ```code blocks```
- Syntax highlighting for code (using `react-syntax-highlighter`)
- Headings, lists, quotes

---

### 3.3 Message Reactions
**Priority**: Low
**Complexity**: Medium
**Impact**: Medium

**Schema**:
```typescript
interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: number;
  reactions?: {
    [emoji: string]: string[]; // emoji -> array of user IDs
  };
}
```

**Features**:
- Click to add emoji reaction
- Emoji picker
- Display reaction count

---

### 3.4 Reply Threads
**Priority**: Medium
**Complexity**: Medium
**Impact**: High

**Schema**:
```typescript
interface Message {
  replyTo?: string; // ID of parent message
}
```

**Features**:
- Right-click message → "Reply"
- Show quoted message preview
- Thread visualization

---

### 3.5 Typing Indicators
**Priority**: Low
**Complexity**: Low
**Impact**: Medium

**Implementation**:
```typescript
// Send typing event via data channel
dataChannel.send(JSON.stringify({ type: 'typing', userId: myId }));

// Display "User is typing..." with timeout
```

---

### 3.6 Link Previews
**Priority**: Low
**Complexity**: Medium
**Impact**: Medium

**Implementation**:
```typescript
// Use OpenGraph scraper
import { ogs } from 'open-graph-scraper';

const metadata = await ogs({ url: 'https://youtube.com/...' });
// Display thumbnail, title, description
```

**Features**:
- YouTube embeds (play inline)
- Image link previews
- Website metadata cards

---

### 3.7 GIF Picker
**Priority**: Low
**Complexity**: Low
**Impact**: Fun

**Implementation**:
```typescript
// Use Tenor API
const response = await fetch(`https://tenor.googleapis.com/v2/search?q=happy&key=${API_KEY}`);
```

**Features**:
- Search GIFs via Tenor/Giphy
- Recent/favorites
- Send as message

---

## Phase 4: User Experience (QoL)

### 4.1 Rich Presence (Game Activity)
**Priority**: Medium
**Complexity**: Medium
**Impact**: High

**Description**: Show what game/app user is running

**Implementation** (Electron):
```typescript
// In electron.js
const activeWindow = require('active-win');

setInterval(async () => {
  const window = await activeWindow();
  mainWindow.webContents.send('active-app', window.owner.name);
}, 5000);
```

**Features**:
- Detect running games (Steam, Epic, etc.)
- Display "Playing Elden Ring" in status
- Elapsed time counter
- Privacy toggle (hide activity)

**Dependencies**:
- `active-win` (npm package)

---

### 4.2 In-Game Overlay
**Priority**: High
**Complexity**: Very High
**Impact**: Very High

**Description**: Transparent overlay showing who's talking during games

**Implementation Options**:

**Option A: Electron BrowserWindow Overlay**
```typescript
const overlayWindow = new BrowserWindow({
  transparent: true,
  frame: false,
  alwaysOnTop: true,
  skipTaskbar: true,
  webPreferences: { nodeIntegration: true }
});
```

**Option B: External Overlay Tool**
- Use `overwolf` framework
- Inject HTML/CSS into DirectX games

**Features**:
- Show avatars + names of talking users
- Display incoming text messages
- Draggable, resizable
- Hotkey to toggle (Shift+F10)

**Challenges**:
- Compatibility with anti-cheat (VAC, EAC)
- Performance impact
- Multi-monitor support

---

### 4.3 Global Keybinds
**Priority**: High
**Complexity**: Low
**Impact**: High

**Implementation**:
```typescript
// Already started with PTT, extend to:
globalShortcut.register('Ctrl+Shift+M', toggleMute);
globalShortcut.register('Ctrl+Shift+D', toggleDeafen);
```

**Features**:
- Customizable hotkeys
- Visual feedback (system notification)
- Works when minimized

---

### 4.4 Themes
**Priority**: Low
**Complexity**: Medium
**Impact**: Medium

**Implementation**:
```typescript
// Add theme state
const [theme, setTheme] = useState('dark');

// CSS variables in index.html
:root[data-theme="light"] {
  --discord-main: #ffffff;
  --discord-text: #000000;
}
```

**Themes**:
- Dark (current)
- Light
- OLED Black
- Custom CSS injection

---

### 4.5 Custom Notification Sounds
**Priority**: Low
**Complexity**: Low
**Impact**: Low

**Implementation**:
```typescript
const notificationSound = new Audio(userSettings.joinSoundUrl);
notificationSound.play();
```

**Features**:
- Upload custom MP3s
- Preview sounds
- Volume control

---

## Phase 5: Privacy & Security

### 5.1 End-to-End Encryption (E2EE)
**Priority**: High
**Complexity**: Very High
**Impact**: Very High (Marketing)

**Description**: Encrypt voice/text with keys only peers have

**Implementation**:
```typescript
// Use SubtleCrypto API
const keyPair = await crypto.subtle.generateKey(
  { name: "RSA-OAEP", hash: "SHA-256" },
  true,
  ["encrypt", "decrypt"]
);

// Exchange public keys via PeerJS data channel
// Encrypt all audio/text before sending
```

**Challenges**:
- Key exchange protocol
- WebRTC already uses DTLS-SRTP (encryption), but peer can still decrypt
- Need to encrypt *before* RTC layer

---

### 5.2 IP Masking / TURN Proxy Mode
**Priority**: Medium
**Complexity**: Low
**Impact**: High (Privacy-conscious users)

**Description**: Hide user IP addresses via relay server

**Implementation**:
```typescript
const peer = new Peer({
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      {
        urls: 'turn:your-turn-server.com:3478',
        username: 'user',
        credential: 'pass'
      }
    ],
    iceTransportPolicy: 'relay' // Force TURN (hide IP)
  }
});
```

**Trade-offs**:
- Increased latency (traffic goes through server)
- Server costs (bandwidth)
- Privacy vs performance toggle in settings

---

### 5.3 Local-Only Encrypted Logging
**Priority**: Medium
**Complexity**: Medium
**Impact**: Medium

**Description**: Store chat history in encrypted SQLite database

**Implementation**:
```typescript
// Use better-sqlite3 (Electron)
const db = require('better-sqlite3')('pisscord.db', {
  verbose: console.log
});

// Encrypt with AES
const crypto = require('crypto');
const cipher = crypto.createCipher('aes-256-cbc', userPassword);
```

**Features**:
- Password-protected database
- Search old messages
- Export chat logs

---

## Phase 6: Multi-User "Server" Simulation

### 6.1 Offline Messaging (Store & Forward)
**Priority**: High
**Complexity**: Very High
**Impact**: High

**Description**: Messages persist when recipient is offline

**Implementation**:

**Option A: Peer Acts as Relay**
- Online peers store messages for offline users
- When user comes online, fetch missed messages from any peer

**Option B: Firebase Message Queue**
- Send messages to Firebase when peer offline
- Recipient fetches on reconnect
- (Violates pure P2P but solves the problem)

**Schema**:
```json
{
  "messages": {
    "<recipient-peer-id>": [
      { "from": "...", "content": "...", "timestamp": 123 }
    ]
  }
}
```

---

### 6.2 Persistent History Sync
**Priority**: Medium
**Complexity**: Very High
**Impact**: Medium

**Description**: Sync chat history across peers

**Implementation**:
- Each peer stores full message history
- On connect, peers exchange message hashes
- Download missing messages from longest-history peer
- Conflict resolution (CRDT or last-write-wins)

---

### 6.3 Roles & Permissions
**Priority**: Low
**Complexity**: Medium
**Impact**: Medium

**Description**: Admin can kick/ban users, even in P2P

**Implementation**:
```typescript
interface User {
  role: 'admin' | 'moderator' | 'guest';
  permissions: {
    canKick: boolean;
    canBan: boolean;
    canInvite: boolean;
  };
}

// Store in Firebase
const userRoles = {
  '<peer-id-admin>': { role: 'admin' },
  '<peer-id-guest>': { role: 'guest' }
};
```

**Features**:
- Ban list (refuse connections from banned peer IDs)
- Invite-only mode (whitelist)
- Role badges in UI

---

## Recommended Implementation Order

### Sprint 1: Core Usability (2-3 weeks)
1. ✅ **Push-to-Talk** - Essential for gaming
2. ✅ **File Sharing** - High-value P2P feature
3. ✅ **Rich Presence** - Shows off personality

### Sprint 2: Chat Enhancements (1-2 weeks)
4. **Markdown/Code Blocks** - Better text formatting
5. **Typing Indicators** - QoL
6. **Reply Threads** - Organize conversations

### Sprint 3: Audio Quality (2-3 weeks)
7. **Noise Suppression** - Critical for quality
8. **Soundboard** - Fun factor
9. **Music Mode** - For musicians

### Sprint 4: Power User Features (2-3 weeks)
10. **Global Keybinds** - Mute/deafen hotkeys
11. **Picture-in-Picture** - Video pop-out
12. **60FPS Streaming** - Marketing feature

### Sprint 5: Privacy & Polish (3-4 weeks)
13. **E2EE** - Marketing/privacy selling point
14. **Offline Messaging** - Critical gap in P2P
15. **Themes** - Customization

### Sprint 6: Advanced Features (Future)
16. **In-Game Overlay** - Hardest but highest impact
17. **Roles/Permissions** - Multi-user management
18. **Spatial Audio** - Cool factor

---

## Technical Debt to Address

1. **Add TypeScript strict mode** - Currently has `any` types
2. **Extract WebRTC logic** - Move from App.tsx to `services/webrtc.ts`
3. **Add unit tests** - Critical for P2P reliability
4. **Error handling** - Better user-facing error messages
5. **Performance monitoring** - Track CPU/memory usage
6. **Logging** - Structured logging for debugging

---

## Community Feedback Loop

Before implementing any feature:
1. Get feedback from Devin (your beta tester)
2. Prioritize based on actual pain points
3. Ship MVP, iterate based on usage

---

## Competitive Analysis

| Feature | Discord | Zoom | Pisscord |
|---------|---------|------|----------|
| Unlimited file size | ❌ 25MB | ❌ 2GB | ✅ Unlimited (P2P) |
| 60FPS streaming | ❌ Nitro only | ❌ | ✅ Free |
| E2EE | ❌ | ✅ | 🚧 Planned |
| No account required | ❌ | ❌ | ✅ |
| Offline messages | ✅ | ❌ | 🚧 Planned |
| Screen share quality | Medium | High | ✅ High |
| Push-to-Talk | ✅ | ✅ | 🚧 Planned |

**Your Unique Selling Points**:
1. True P2P (no data ever touches a server)
2. Unlimited file sizes
3. No account/login required
4. Free 60FPS/4K streaming
5. Open source (eventually?)

---

## Long-Term Vision

**Year 1**: Feature parity with basic Discord (text, voice, video, files)
**Year 2**: Add privacy features (E2EE, IP masking)
**Year 3**: Gaming-focused features (overlay, rich presence, integrations)

**End Goal**: The go-to P2P communication tool for privacy-conscious gamers and small teams.
