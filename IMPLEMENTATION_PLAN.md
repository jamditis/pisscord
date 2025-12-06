# Pisscord - Private Family Communication App

## Implementation Plan

A trusted, private Discord-like desktop application for family communication with direct peer-to-peer connections, high-quality audio/video, and seamless file sharing.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     PISSCORD ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐   │
│  │   Desktop    │     │   Desktop    │     │   Desktop    │   │
│  │   Client 1   │◄───►│   Client 2   │◄───►│   Client 3   │   │
│  │  (Electron)  │     │  (Electron)  │     │  (Electron)  │   │
│  └──────┬───────┘     └──────┬───────┘     └──────┬───────┘   │
│         │                    │                    │            │
│         │         WebRTC (P2P Audio/Video)        │            │
│         │              File Transfer              │            │
│         └────────────────┬───────────────────────┘            │
│                          │                                     │
│                          ▼                                     │
│              ┌───────────────────────┐                        │
│              │   Signaling Server    │                        │
│              │   (WebSocket/Node)    │                        │
│              │   - User presence     │                        │
│              │   - WebRTC signaling  │                        │
│              │   - Message relay     │                        │
│              └───────────────────────┘                        │
│                                                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

### Desktop Client (Electron + React)
- **Electron 28+** - Desktop application framework
- **React 18** - UI framework (already familiar from codebase)
- **Tailwind CSS** - Styling (already in use)
- **SQLite (better-sqlite3)** - Local message/file storage
- **WebRTC** - Peer-to-peer audio/video/data
- **simple-peer** - WebRTC wrapper for easier P2P connections

### Signaling Server (Node.js)
- **Node.js + Express** - HTTP server
- **Socket.IO** - WebSocket connections for signaling
- **SQLite** - User registry, channel definitions

### Core Libraries
```json
{
  "electron": "^28.0.0",
  "react": "^18.2.0",
  "socket.io-client": "^4.7.0",
  "simple-peer": "^9.11.1",
  "better-sqlite3": "^9.4.0",
  "tailwindcss": "^3.4.0",
  "electron-builder": "^24.0.0"
}
```

---

## Phase 1: Foundation (MVP)

### 1.1 Project Setup
- [ ] Initialize Electron + React project structure
- [ ] Configure Tailwind CSS with dark/light mode
- [ ] Set up SQLite for local storage
- [ ] Create basic window management

### 1.2 Signaling Server
- [ ] Create Node.js signaling server
- [ ] Implement Socket.IO for real-time events
- [ ] User authentication (simple family tokens)
- [ ] Store user registry and online status

### 1.3 Basic UI Shell
- [ ] Server/channel sidebar
- [ ] User list panel
- [ ] Main chat area
- [ ] Dark/light mode toggle
- [ ] System tray integration

**Deliverable:** App launches, connects to server, shows online users

---

## Phase 2: Text Communication

### 2.1 Text Channels
- [ ] Create/join text channels
- [ ] Real-time message sending via Socket.IO
- [ ] Message persistence (local SQLite)
- [ ] Message history sync on connect
- [ ] Typing indicators

### 2.2 Rich Content
- [ ] Markdown rendering
- [ ] Link preview extraction (Open Graph)
- [ ] Image embedding/preview
- [ ] Emoji picker
- [ ] Code block formatting

### 2.3 Notifications
- [ ] Desktop notifications
- [ ] Unread message badges
- [ ] Sound effects
- [ ] Do Not Disturb mode

**Deliverable:** Full text chat with rich previews

---

## Phase 3: Voice & Video

### 3.1 WebRTC Setup
- [ ] ICE server configuration (STUN/TURN)
- [ ] Peer connection management
- [ ] Signaling flow (offer/answer/ICE candidates)

### 3.2 Voice Channels
- [ ] Join/leave voice channels
- [ ] Audio stream capture and transmission
- [ ] Voice activity detection
- [ ] Push-to-talk option
- [ ] Volume controls per user
- [ ] Mute/deafen controls

### 3.3 Video Calling
- [ ] 1:1 video calls
- [ ] Group video (mesh topology for small family)
- [ ] Camera selection
- [ ] Video quality settings

### 3.4 Screen Sharing
- [ ] Full screen capture
- [ ] Window selection
- [ ] Audio sharing option
- [ ] Viewer controls

**Deliverable:** Full voice/video/screenshare functionality

---

## Phase 4: File Sharing

### 4.1 Direct File Transfer
- [ ] WebRTC data channel file transfer
- [ ] Progress indicators
- [ ] Resume interrupted transfers
- [ ] File type previews

### 4.2 File Management
- [ ] Shared files list per channel
- [ ] Download history
- [ ] Auto-save location setting
- [ ] File size limits (configurable)

**Deliverable:** Fast P2P file sharing

---

## Phase 5: Polish & Distribution

### 5.1 UI/UX Polish
- [ ] Animations and transitions
- [ ] Keyboard shortcuts
- [ ] Accessibility improvements
- [ ] Custom themes

### 5.2 System Integration
- [ ] Auto-start on boot
- [ ] Update mechanism
- [ ] Crash reporting
- [ ] Performance optimization

### 5.3 Build & Distribute
- [ ] Windows installer (NSIS)
- [ ] Code signing (optional)
- [ ] Auto-updater

**Deliverable:** Polished, distributable .exe

---

## Project Structure

```
pisscord/
├── client/                     # Electron desktop app
│   ├── src/
│   │   ├── main/              # Electron main process
│   │   │   ├── main.js        # Entry point
│   │   │   ├── ipc.js         # IPC handlers
│   │   │   ├── tray.js        # System tray
│   │   │   └── updater.js     # Auto-update
│   │   │
│   │   ├── renderer/          # React UI
│   │   │   ├── App.jsx
│   │   │   ├── components/
│   │   │   │   ├── Sidebar/
│   │   │   │   │   ├── ServerList.jsx
│   │   │   │   │   ├── ChannelList.jsx
│   │   │   │   │   └── UserPanel.jsx
│   │   │   │   ├── Chat/
│   │   │   │   │   ├── MessageList.jsx
│   │   │   │   │   ├── MessageInput.jsx
│   │   │   │   │   ├── MessageItem.jsx
│   │   │   │   │   └── LinkPreview.jsx
│   │   │   │   ├── Voice/
│   │   │   │   │   ├── VoiceChannel.jsx
│   │   │   │   │   ├── VoiceControls.jsx
│   │   │   │   │   └── VideoGrid.jsx
│   │   │   │   ├── Settings/
│   │   │   │   │   ├── SettingsModal.jsx
│   │   │   │   │   ├── AudioSettings.jsx
│   │   │   │   │   └── ThemeSettings.jsx
│   │   │   │   └── common/
│   │   │   │       ├── Avatar.jsx
│   │   │   │       ├── Modal.jsx
│   │   │   │       └── Tooltip.jsx
│   │   │   │
│   │   │   ├── hooks/
│   │   │   │   ├── useSocket.js
│   │   │   │   ├── useWebRTC.js
│   │   │   │   ├── useVoice.js
│   │   │   │   └── useTheme.js
│   │   │   │
│   │   │   ├── services/
│   │   │   │   ├── socketService.js
│   │   │   │   ├── webrtcService.js
│   │   │   │   ├── databaseService.js
│   │   │   │   └── notificationService.js
│   │   │   │
│   │   │   ├── store/
│   │   │   │   ├── index.js
│   │   │   │   ├── userSlice.js
│   │   │   │   ├── channelSlice.js
│   │   │   │   └── settingsSlice.js
│   │   │   │
│   │   │   └── styles/
│   │   │       ├── index.css
│   │   │       └── themes.css
│   │   │
│   │   └── preload/
│   │       └── preload.js     # Secure bridge
│   │
│   ├── package.json
│   ├── electron-builder.yml
│   └── tailwind.config.js
│
├── server/                     # Signaling server
│   ├── src/
│   │   ├── index.js           # Entry point
│   │   ├── socket.js          # Socket.IO handlers
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   └── channels.js
│   │   ├── services/
│   │   │   ├── userService.js
│   │   │   └── channelService.js
│   │   └── database/
│   │       ├── init.js
│   │       └── schema.sql
│   │
│   ├── package.json
│   └── .env.example
│
├── shared/                     # Shared types/constants
│   ├── events.js              # Socket event names
│   └── constants.js           # Shared config
│
└── IMPLEMENTATION_PLAN.md     # This file
```

---

## Database Schema

### Server Database (SQLite)
```sql
-- Users (family members)
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    token TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Channels
CREATE TABLE channels (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT CHECK(type IN ('text', 'voice')) NOT NULL,
    position INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Messages (for sync/relay)
CREATE TABLE messages (
    id TEXT PRIMARY KEY,
    channel_id TEXT REFERENCES channels(id),
    user_id TEXT REFERENCES users(id),
    content TEXT,
    attachments TEXT, -- JSON array
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Client Database (SQLite)
```sql
-- Cached messages
CREATE TABLE messages (
    id TEXT PRIMARY KEY,
    channel_id TEXT,
    user_id TEXT,
    content TEXT,
    attachments TEXT,
    created_at DATETIME,
    synced INTEGER DEFAULT 1
);

-- User settings
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT
);

-- File transfers
CREATE TABLE transfers (
    id TEXT PRIMARY KEY,
    filename TEXT,
    size INTEGER,
    sender_id TEXT,
    channel_id TEXT,
    status TEXT,
    progress REAL,
    local_path TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## WebRTC Configuration

### ICE Servers (for NAT traversal)
```javascript
const iceServers = [
  // Free STUN servers
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },

  // For family use, a simple TURN server may not be needed
  // if all on same network. If needed:
  // { urls: 'turn:your-turn-server.com', username: 'x', credential: 'x' }
];
```

### Peer Connection Flow
```
1. User A wants to call User B
2. A creates RTCPeerConnection
3. A creates offer → sends via signaling server
4. B receives offer → creates answer
5. B sends answer via signaling server
6. Both exchange ICE candidates
7. Direct P2P connection established
8. Streams flow directly between A and B
```

---

## Security Considerations

### For Trusted Family Use
- **Simple token auth** - Each family member gets a unique token
- **Local network preferred** - Can run server on home network
- **No encryption at rest** - Trusted environment (optional: add if desired)
- **Direct P2P** - Data doesn't pass through server after connection

### Optional Enhancements
- End-to-end encryption for messages
- Certificate pinning
- Token rotation

---

## Quick Start Commands

### Development
```bash
# Terminal 1: Start signaling server
cd server
npm install
npm run dev

# Terminal 2: Start Electron app
cd client
npm install
npm run dev
```

### Build
```bash
cd client
npm run build        # Build React
npm run dist         # Package Electron
```

---

## Implementation Priority

### Week 1: Core Foundation
1. Set up Electron + React project
2. Create signaling server with Socket.IO
3. Implement basic UI shell with dark/light mode
4. User authentication with tokens

### Week 2: Text Chat
1. Text channels and messaging
2. Message persistence
3. Link previews
4. Notifications

### Week 3: Voice/Video
1. WebRTC voice channels
2. Video calling
3. Screen sharing

### Week 4: Files & Polish
1. File sharing via WebRTC data channels
2. UI polish and animations
3. Windows installer

---

## Getting Started

To begin implementation, we'll start with:

1. **Initialize the project structure**
2. **Set up Electron with React**
3. **Create the signaling server**
4. **Build the basic UI shell**

Ready to proceed with Phase 1?
