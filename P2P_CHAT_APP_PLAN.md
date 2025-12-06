# Private P2P Chat Application - Implementation Plan

## Project Overview
A simplified, privacy-focused Discord alternative for small trusted groups (family/friends). Direct peer-to-peer communication without central servers, packaged as a standalone Windows executable.

---

## Core Requirements

### Must-Have Features (Discord Essentials)
1. **Voice Channels** - Real-time voice communication
2. **Text Channels** - Organized text chat with history
3. **Direct Messages** - Private 1-on-1 conversations
4. **File Sharing** - Send/receive files and images
5. **User Presence** - Online/offline/away status
6. **Notifications** - Desktop alerts for messages
7. **User Profiles** - Display names, avatars, status

### Excluded Features (Bloat Removal)
- ❌ Multiple servers
- ❌ Server discovery
- ❌ Nitro/monetization
- ❌ Bots/integrations
- ❌ Video streaming (Phase 1)
- ❌ Screen sharing (Phase 1)
- ❌ Rich presence/games

---

## Technical Architecture

### 1. Network Architecture: Hybrid P2P Approach

**Why Not Pure P2P?**
- NAT traversal complexity (most home routers block incoming connections)
- Peer discovery challenges
- Message delivery when recipients are offline

**Recommended: Hybrid Model**
```
┌─────────────────────────────────────────────────────────┐
│  Architecture: Self-Hosted Signaling Server + P2P Data  │
└─────────────────────────────────────────────────────────┘

Components:
1. Lightweight Signaling Server (one person hosts)
   - Facilitates peer discovery
   - Handles NAT traversal (STUN/TURN)
   - Stores offline messages temporarily
   - User authentication

2. P2P Direct Connections
   - Voice/video via WebRTC
   - File transfers via direct connections
   - Text messages (with server fallback)
```

**Alternative: Fully Server-Based (Simpler)**
```
One person runs a small server on their PC or cheap VPS ($5/month)
- Easier NAT traversal
- Guaranteed message delivery
- Simpler implementation
- Still private (you control the server)
```

### 2. Technology Stack

#### Desktop Application
**Primary Recommendation: Electron + React**
```yaml
Why Electron:
  ✓ Cross-platform (Windows, Mac, Linux)
  ✓ Single codebase
  ✓ Native packaging to .exe
  ✓ Built-in notification support
  ✓ Easy file system access

Framework: React + TypeScript
UI Library: Tailwind CSS + shadcn/ui
State Management: Zustand or Redux Toolkit
```

**Alternative: Tauri (Lighter, Rust-based)**
```yaml
Pros:
  - Much smaller binary size (~3MB vs 100MB)
  - Better performance
  - Modern tech stack
Cons:
  - Steeper learning curve
  - Less mature ecosystem
```

#### Backend/Server
**Node.js + Express + Socket.io**
```yaml
Real-time: Socket.io (WebSocket wrapper)
Voice: simple-peer or mediasoup (WebRTC)
Database: SQLite (embedded) or PostgreSQL (if VPS)
File Storage: Local filesystem
Authentication: JWT tokens
```

#### Voice/Video
**WebRTC (via simple-peer or PeerJS)**
```yaml
Advantages:
  - Industry standard for real-time media
  - Built into browsers/Electron
  - Low latency
  - P2P when possible

Implementation: simple-peer library
Fallback: TURN server for NAT traversal
```

---

## Detailed Implementation Plan

### Phase 1: Foundation (Weeks 1-2)

#### Week 1: Project Setup & Basic UI
**Tasks:**
1. Initialize Electron + React project
   ```bash
   npm create electron-vite@latest pisscord-app
   cd pisscord-app
   npm install
   ```

2. Set up project structure
   ```
   pisscord-app/
   ├── src/
   │   ├── main/           # Electron main process
   │   ├── renderer/       # React UI
   │   │   ├── components/
   │   │   ├── pages/
   │   │   ├── hooks/
   │   │   └── stores/
   │   └── preload/        # Electron preload scripts
   ├── server/             # Optional signaling server
   └── resources/          # Icons, assets
   ```

3. Create basic UI layout (Discord-like)
   ```
   ┌─────────────────────────────────────┐
   │  Sidebar  │  Channel List  │  Chat  │
   ├───────────┼────────────────┼────────┤
   │  Users    │  # general     │ Msgs   │
   │  (list)   │  # random      │        │
   │           │  🔊 Voice 1    │        │
   │           │  🔊 Voice 2    │        │
   └───────────┴────────────────┴────────┘
   ```

4. Implement basic routing and navigation

**Deliverable:** Clickable UI mockup with navigation

#### Week 2: Authentication & User Management
**Tasks:**
1. Create simple server (Express + Socket.io)
   ```javascript
   // Basic server structure
   const express = require('express');
   const http = require('http');
   const socketIo = require('socket.io');

   const app = express();
   const server = http.createServer(app);
   const io = socketIo(server);
   ```

2. Implement user authentication
   - Simple username + password (hashed with bcrypt)
   - JWT token generation
   - Persistent sessions

3. User registration flow
   - First-time setup wizard
   - Avatar upload (or default avatars)
   - Display name selection

4. Connection management
   - Auto-reconnect on disconnect
   - Presence system (online/offline/away)

**Deliverable:** Users can register, login, see who's online

---

### Phase 2: Text Chat (Weeks 3-4)

#### Week 3: Real-Time Messaging
**Tasks:**
1. Socket.io event handlers
   ```javascript
   // Client sends
   socket.emit('message', { channel, content, attachments });

   // Server broadcasts
   io.to(channelId).emit('newMessage', messageData);
   ```

2. Message data structure
   ```typescript
   interface Message {
     id: string;
     channelId: string;
     authorId: string;
     content: string;
     timestamp: Date;
     attachments?: Attachment[];
     replyTo?: string;
   }
   ```

3. Text channel components
   - Message list with auto-scroll
   - Message input with formatting
   - Emoji picker
   - Message editing/deletion

4. Message persistence (SQLite)
   ```sql
   CREATE TABLE messages (
     id TEXT PRIMARY KEY,
     channel_id TEXT,
     author_id TEXT,
     content TEXT,
     timestamp INTEGER,
     edited_at INTEGER,
     deleted BOOLEAN DEFAULT 0
   );
   ```

**Deliverable:** Full text chat functionality

#### Week 4: Rich Features
**Tasks:**
1. File/image sharing
   - Drag-and-drop upload
   - Image preview in chat
   - File download with progress

2. Message reactions
3. @mentions and notifications
4. Message search
5. Markdown support (bold, italic, code blocks)

**Deliverable:** Feature-complete text chat

---

### Phase 3: Voice Communication (Weeks 5-6)

#### Week 5: WebRTC Setup
**Tasks:**
1. Integrate simple-peer or mediasoup
   ```bash
   npm install simple-peer
   ```

2. Set up STUN/TURN server
   - Use free STUN: `stun:stun.l.google.com:19302`
   - Set up TURN (coturn on VPS or Raspberry Pi)

3. Implement voice channel joining
   ```javascript
   // Join voice channel
   socket.emit('joinVoice', channelId);

   // Establish peer connections
   peers.forEach(peer => createPeerConnection(peer));
   ```

4. Audio capture and playback
   ```javascript
   navigator.mediaDevices.getUserMedia({ audio: true })
     .then(stream => {
       localStream = stream;
       peer.addStream(stream);
     });
   ```

**Deliverable:** Basic voice chat (1-on-1)

#### Week 6: Multi-User Voice
**Tasks:**
1. Mesh network topology (for small groups <10)
   ```
   Everyone connects directly to everyone else
   User A ←→ User B
     ↓         ↓
   User C ←→ User D
   ```

2. Voice channel UI
   - Visual indicators for who's speaking
   - Mute/deafen buttons
   - Volume controls per user
   - Push-to-talk option

3. Audio quality settings
   - Bitrate selection
   - Noise suppression
   - Echo cancellation

**Deliverable:** Working voice channels for small groups

---

### Phase 4: Polish & Packaging (Weeks 7-8)

#### Week 7: UX Improvements
**Tasks:**
1. Settings panel
   - Audio input/output selection
   - Keybinds (push-to-talk, mute)
   - Theme customization
   - Notification preferences

2. Desktop notifications
   ```javascript
   new Notification('New Message', {
     body: 'John: Hey everyone!',
     icon: 'path/to/icon.png'
   });
   ```

3. System tray integration
   - Minimize to tray
   - Unread message indicator

4. Keyboard shortcuts
   - Ctrl+K: Quick channel switcher
   - Ctrl+/: Search
   - Ctrl+Shift+M: Mute

**Deliverable:** Polished user experience

#### Week 8: Building & Distribution
**Tasks:**
1. Configure Electron Builder
   ```json
   {
     "build": {
       "appId": "com.pisscord.app",
       "productName": "Pisscord",
       "win": {
         "target": ["nsis"],
         "icon": "resources/icon.ico"
       }
     }
   }
   ```

2. Create installer (NSIS for Windows)
   - Auto-update mechanism (optional)
   - Desktop shortcut
   - Start menu entry

3. Build and test
   ```bash
   npm run build:win
   ```

4. Create setup guide for server
   - Docker compose file (easiest)
   - Manual setup instructions
   - Port forwarding guide

**Deliverable:** Installable .exe file

---

## Server Hosting Options

### Option 1: One Friend Hosts on Their PC
```yaml
Requirements:
  - Windows 10/11 PC that stays on
  - Router port forwarding (port 3000, 3001)
  - Dynamic DNS (free from No-IP or DuckDNS)

Pros: Free, full control
Cons: Reliability depends on their PC/internet
```

### Option 2: Cheap VPS ($5-10/month)
```yaml
Providers:
  - DigitalOcean Droplet: $6/month
  - Vultr: $5/month
  - Linode: $5/month
  - Hetzner: €4.51/month (cheapest)

Specs Needed: 1GB RAM, 1 CPU core
Setup: Ubuntu + Docker + docker-compose
```

### Option 3: Raspberry Pi at Home
```yaml
Hardware: Raspberry Pi 4 (4GB) ~$55
Setup: Install Ubuntu Server + Docker
Pros: One-time cost, low power usage
Cons: Initial setup complexity
```

---

## Development Roadmap Timeline

```
Month 1: Foundation + Text Chat
├── Week 1: Project setup, UI mockup
├── Week 2: Auth, user management
├── Week 3: Real-time messaging
└── Week 4: Rich text features

Month 2: Voice + Polish
├── Week 5: WebRTC integration, basic voice
├── Week 6: Multi-user voice, quality settings
├── Week 7: UX polish, notifications
└── Week 8: Build, package, test, deploy

Total: 8 weeks (2 months) for MVP
```

---

## Estimated Costs

### One-Time Costs
- Development: FREE (DIY)
- Raspberry Pi (optional): $55
- Domain name (optional): $12/year

### Ongoing Costs
**Scenario A: Self-hosted (Friend's PC or RPi)**
- Cost: $0/month
- Reliability: Medium

**Scenario B: VPS Hosting**
- Server: $5-10/month
- Reliability: High
- Recommended for: Groups >5 people

### TURN Server (for NAT traversal)
- Free STUN servers available
- TURN: Self-host on same VPS (included in cost)

---

## Technical Challenges & Solutions

### Challenge 1: NAT Traversal
**Problem:** Most routers block incoming connections
**Solutions:**
1. STUN server (reveals public IP)
2. TURN server (relays traffic when P2P fails)
3. UPnP/NAT-PMP (automatic port forwarding)

### Challenge 2: Message Delivery When Offline
**Problem:** Pure P2P can't deliver to offline users
**Solution:** Server stores messages temporarily
```javascript
// Pseudocode
if (recipientOnline) {
  sendDirectly(message);
} else {
  storeOnServer(message);
  deliverWhenOnline();
}
```

### Challenge 3: Voice Quality in Groups
**Problem:** Mesh topology doesn't scale beyond ~10 users
**Solution:** For this use case (family/friends), mesh is perfect
**Alternative:** SFU (Selective Forwarding Unit) for larger groups

### Challenge 4: File Size Limits
**Problem:** Large files over P2P can be slow
**Solutions:**
1. Compress images/videos before sending
2. Chunk large files
3. Set reasonable limits (e.g., 100MB max)

---

## Security Considerations

### 1. End-to-End Encryption (Optional Phase 2)
```javascript
// Signal Protocol or simple NaCl encryption
const encrypted = encrypt(message, recipientPublicKey);
socket.emit('message', encrypted);
```

### 2. Server Security
- HTTPS/WSS (SSL certificates via Let's Encrypt)
- Rate limiting (prevent spam)
- Input validation (prevent XSS/injection)

### 3. Privacy Features
- Message history retention settings
- Option to delete all messages
- No telemetry/tracking

---

## Recommended Tech Stack (Final)

```yaml
Desktop App:
  Framework: Electron 28+
  UI: React 18 + TypeScript
  Styling: Tailwind CSS
  State: Zustand
  Build: electron-builder

Server:
  Runtime: Node.js 20+
  Framework: Express
  Real-time: Socket.io
  Database: SQLite (or PostgreSQL)
  Voice: simple-peer + coturn

Voice/Video:
  Protocol: WebRTC
  Library: simple-peer
  STUN: Google's free STUN
  TURN: Self-hosted coturn

Deployment:
  Server: Docker + docker-compose
  Hosting: Hetzner VPS ($5/mo)
  Domain: Namecheap ($10/yr)
```

---

## MVP Feature Checklist

### Core Features (Must Have)
- [x] User authentication (username/password)
- [x] Text channels (unlimited)
- [x] Real-time messaging
- [x] Direct messages (1-on-1)
- [x] Voice channels (multi-user)
- [x] File/image sharing
- [x] User presence (online/offline/away)
- [x] Desktop notifications
- [x] Message history
- [x] User profiles (avatar, display name)

### Nice-to-Have (Phase 2)
- [ ] Screen sharing
- [ ] Video calls
- [ ] Message reactions/emojis
- [ ] Rich embeds (link previews)
- [ ] Code syntax highlighting
- [ ] Voice activity detection
- [ ] Mobile app (React Native)

### Excluded (Intentionally)
- ❌ Multiple servers
- ❌ Permissions/roles (everyone is admin)
- ❌ Bots/webhooks
- ❌ Server discovery
- ❌ Monetization

---

## Getting Started (Next Steps)

### Immediate Actions
1. **Choose hosting approach:**
   - Friend's PC (free, less reliable)
   - VPS (recommended, $5/mo)
   - Raspberry Pi (one-time $55)

2. **Set up development environment:**
   ```bash
   # Install Node.js 20+
   # Install Git
   # Install VS Code

   # Create project
   npm create electron-vite@latest pisscord
   cd pisscord
   npm install
   ```

3. **Start with UI mockup:**
   - Build the Discord-like layout
   - No backend yet, just static UI
   - Get feedback from family/friends

4. **Set up basic server:**
   ```bash
   mkdir pisscord-server
   cd pisscord-server
   npm init -y
   npm install express socket.io cors
   ```

### Learning Resources
- **Electron:** electronjs.org/docs
- **WebRTC:** webrtc.org/getting-started
- **Socket.io:** socket.io/docs
- **React:** react.dev

---

## Success Metrics

### Technical Goals
- Voice latency: <150ms
- Message delivery: <500ms
- App startup time: <3s
- Installer size: <150MB
- Concurrent users: 10-20

### User Experience Goals
- Setup time: <5 minutes
- Zero configuration for end users
- Works behind NAT without manual setup
- Reliable voice quality
- Intuitive UI (family-friendly)

---

## Risk Mitigation

### Risk 1: Development Complexity
**Mitigation:** Start with text-only MVP, add voice later

### Risk 2: NAT/Firewall Issues
**Mitigation:** Use TURN server relay as fallback

### Risk 3: Server Downtime
**Mitigation:**
- Use reliable VPS provider
- Implement auto-restart (PM2)
- Health monitoring

### Risk 4: User Adoption
**Mitigation:**
- Simple installation (double-click .exe)
- Clear setup guide with screenshots
- Demo video showing features

---

## Cost-Benefit Analysis

### DIY vs. Just Use Discord
**Why Build This?**
✓ Complete privacy (you own the data)
✓ No ads, tracking, or algorithmic feeds
✓ Customizable to your exact needs
✓ Learning experience
✓ One-time effort, long-term ownership

**Why Not?**
✗ Initial development time (2 months)
✗ Ongoing maintenance
✗ Small hosting cost ($5/mo or hardware)

**Recommendation:** Worth it if:
- You value privacy highly
- You enjoy building software
- Your group is <20 people
- You want features Discord lacks

---

## Conclusion

This plan provides a comprehensive roadmap to build a private, Discord-like chat application in ~8 weeks. The hybrid P2P approach balances simplicity with functionality, while the Electron + React stack ensures a polished desktop experience.

**Key Success Factors:**
1. Start simple (text chat first)
2. Iterate based on user feedback
3. Use proven technologies (WebRTC, Socket.io)
4. Focus on core features (no bloat)
5. Prioritize reliability over features

**Next Step:** Set up the development environment and build the UI mockup (Week 1 tasks).
