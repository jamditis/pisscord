![pisscord logo](https://i.imgur.com/cecdoaM.jpeg)

# Pisscord

**Current Version:** v1.5.0 | [Download Latest](https://github.com/jamditis/pisscord/releases/latest) | [Use in Browser](https://web.pisscord.app)

A private, peer-to-peer Discord clone for trusted groups with encrypted messaging, voice/video calling, AI assistance, and real-time presence. Available as a desktop app, Android app, or directly in your web browser.

## 🚀 Features

### Platform Options
- **🌐 Web Browser Version**: Use Pisscord directly in your browser - no download required
- **💻 Desktop App**: Full-featured Windows application with system tray integration
- **📱 Android App**: Native Android app built with Capacitor
- **📱 Mobile Web**: Works on mobile browsers with optimized touch UI

### Security & Privacy
- **🔐 End-to-End Encryption**: AES-256-GCM encryption for all text messages
- **🔒 P2P Encrypted Calls**: Direct peer-to-peer WebRTC connections - no relay servers
- **🔑 Shared Passphrase**: Simple passphrase system for group encryption

### Communication
- **🎥 HD Video & Voice**: Crystal clear communication with advanced media controls
- **🖥️ Screen Sharing**: Share your screen seamlessly without reconnecting
- **📌 Video Spotlight**: Click any video tile to pin/maximize it during calls
- **🗣️ Speaking Indicator**: Green ring shows who's talking in real-time
- **👥 Mesh Networking**: True many-to-many group calls
- **📁 File Sharing**: Drop images and files directly in chat
- **📝 Markdown Chat**: Full markdown support in text channels

### Smart Features
- **🔔 Unread Indicators**: Red dot and bold text show channels with new messages
- **📋 Release Notes**: One-time popup shows what's new after updates
- **🤖 AI Assistant**: Integrated Gemini 2.5 Flash for instant help (Pissbot)
- **👤 Profile Pictures**: Upload custom avatars synced across users
- **📢 Dev Updates**: Live GitHub commit feed in #dev-updates
- **🐛 Bug Reporting**: In-app issue submission to #issues
- **🎨 Custom Profiles**: Personalize with names, statuses, and colors
- **🎛️ Advanced Controls**: Device selection, per-user volume (0-200%), audio processing toggles
- **🔇 Noise Suppression**: Built-in noise suppression, echo cancellation, and auto gain control
- **📱 System Tray**: Minimize to tray - stay connected while multitasking (desktop only)

## 🏗️ Architecture Highlights

### Multi-Platform Support
- **Web Browser**: Pure React/Vite build runs in any modern browser
- **Desktop (Electron)**: Full desktop integration with native features
- **Android (Capacitor)**: Native Android app with full feature parity
- **Mobile Web**: Responsive design with mobile-optimized controls
- **Shared Codebase**: Platform abstraction layer handles differences

### End-to-End Encryption
- **AES-256-GCM**: Military-grade encryption for all text messages
- **PBKDF2 Key Derivation**: 100,000 iterations for secure key generation
- **Shared Salt**: Stored in Firebase so users only need the passphrase
- **Client-side Only**: Messages encrypted before leaving your device

### Persistent Voice State
- **Separated view from connection**: Chat in text channels while remaining in a voice call
- **Persistent Voice Control Panel**: Always-visible controls in sidebar when connected
- **Global audio management**: Audio streams across all views without interruption

### Advanced Media Pipeline
- **Device hot-swapping**: Change mic, speakers, or camera without reconnecting
- **Volume control**: 0-200% adjustable per-user volume with individual sliders
- **Audio processing**: Noise suppression, echo cancellation, auto gain control toggles
- **Track replacement**: Screen sharing uses `RTCRtpSender.replaceTrack()` for seamless transitions

### Desktop Integration
- **System tray support**: Minimize to tray instead of closing
- **Background connections**: Stay in voice calls while app is minimized
- **Auto-update system**: Firebase-based version checking

---

## 🛑 READ THIS FIRST

There are four ways to use Pisscord:
1.  **Web Browser**: Just visit [pisscord-edbca.web.app](https://pisscord-edbca.web.app) - no installation needed
2.  **Desktop App**: Download and install the Windows application
3.  **Android App**: Install the APK on your Android device
4.  **Build from Source**: Compile the code yourself

---

## 🌐 Web Browser Quick Start

1.  **Visit**: Go to [pisscord-edbca.web.app](https://pisscord-edbca.web.app)
2.  **Enter Passphrase**: Get the encryption passphrase from a group member
3.  **Start Chatting**: You're ready to use all features

That's it! The web version works on desktop and mobile browsers.

---

## 🛠️ Instructions for Builders

### Prerequisites
- **Node.js LTS** from [nodejs.org](https://nodejs.org/)
- **Google Gemini API Key** (optional, for AI features)

### Build Desktop App

1.  **Clean Build Directory** (if rebuilding):
    ```bash
    rm -rf dist  # or manually delete the dist folder
    ```

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

3.  **Configure AI (Optional)**:
    Create `.env.local` in project root:
    ```env
    VITE_GEMINI_API_KEY=your_google_gemini_api_key_here
    ```
    Without this, the AI channel will show an error but all other features work.

4.  **Build the Installer**:
    ```bash
    npm run dist
    ```
    *(Takes 1-2 minutes on first build)*

5.  **Find the Installer**:
    - Navigate to the `dist` folder
    - Look for `Pisscord Setup 1.4.4.exe`

### Build Web Version

```bash
npm run build:web    # Creates web build in dist-web/
```

### Build Android App

```bash
npm run build              # Build the web assets first
npx cap sync android       # Sync to Android project
npx cap open android       # Open in Android Studio
```

Then build/run from Android Studio.

### Development Mode

Run in development with hot-reload:
```bash
npm run electron:dev  # Desktop app
npm run dev          # Web browser (localhost:5173)
```

---

## 📦 Instructions for Users

### Desktop Installation

1.  **Download**: Get the `Pisscord Setup 1.4.4.exe` from [releases](https://github.com/jamditis/pisscord/releases/latest)
2.  **Install**: Double-click the installer
    - Windows may show "Unknown Publisher" warning
    - Click "More Info" → "Run Anyway"
3.  **Launch**: Pisscord will open automatically after installation

### Android Installation

1.  **Download**: Get the APK from a trusted source or build from source
2.  **Enable Unknown Sources**: Settings → Security → Allow installation from unknown sources
3.  **Install**: Tap the APK file and follow prompts
4.  **Launch**: Open Pisscord from your app drawer

### First-Time Setup

1.  **Enter Passphrase**: When prompted, enter the encryption passphrase
    - Get this from an existing group member
    - This unlocks message encryption for your device
2.  **Set Your Profile**: Click the gear icon to set your display name and avatar

### Joining Voice Calls

1. Click any voice channel (e.g., "Chillin'")
2. Grant microphone permission when prompted
3. You're now in the voice channel with others

### Using Voice Features

#### Persistent Voice Panel
When connected, you'll see a green **Voice Connected** panel at the bottom of the sidebar with:
- **Mute/Unmute**: Toggle your microphone
- **Video On/Off**: Toggle your camera
- **Volume**: Click volume icon on any user's video tile to adjust their volume (0-200%)
- **Disconnect**: Red phone icon to end call

#### Multitasking While Connected
- Browse any text channel while staying connected
- Voice controls remain accessible in sidebar
- Audio continues playing across all views

### Settings

Click the **gear icon** (⚙️) in bottom left to access:

#### My Profile Tab
- Change display name
- Set custom status message
- Choose avatar color

#### Voice & Video Tab
- Select microphone (Input Device)
- Select speakers (Output Device)
- Select camera (Video Device)
- **Audio Processing**: Toggle noise suppression, echo cancellation, auto gain control
- *Note: Device changes require reconnecting to take effect*

#### Debug Log Tab
- View real-time connection logs
- Troubleshoot WebRTC issues
- See error messages and connection states

### Screen Sharing

While in a call:
1. Click the **desktop icon** (🖥️) in the control bar
2. Select which screen/window to share
3. Click **Share**
4. To stop: Click the desktop icon again OR click "Stop Sharing" in browser bar

### AI Assistant (Pissbot)

1. Click the **#pissbot** channel
2. Type your question
3. Pissbot will respond instantly

*Pissbot is powered by Gemini 2.5 Flash. Requires builder to configure API key.*

---

## 🎯 Tips & Tricks

- **System Tray**: Closing the window minimizes to tray - right-click tray icon to quit
- **Copy Peer ID Fast**: Click your shortened ID (e.g., `#a3f5...`) in bottom left
- **Volume Boost**: Click volume icon on a user's tile and set above 100% for quieter friends
- **Reduce Background Noise**: Enable noise suppression in Settings > Voice & Video
- **Reconnect for Devices**: After changing audio/video devices, disconnect and reconnect
- **Debug Connection Issues**: Check Debug Log in settings for error details

---

## 🔒 Privacy & Security

### Message Encryption
- **AES-256-GCM**: All text messages are encrypted client-side before sending
- **PBKDF2 Key Derivation**: Passphrase converted to encryption key with 100,000 iterations
- **Shared Passphrase**: One passphrase for the whole group - get it from an existing member
- **Can't Read Without Passphrase**: Messages appear as `[Encrypted message]` without correct passphrase

### Voice/Video Privacy
- **P2P Connections**: All voice/video data goes directly between users via WebRTC
- **No Relay Servers**: Calls never pass through Pisscord servers
- **No Recording**: Calls are never recorded or stored anywhere
- **DTLS/SRTP**: WebRTC provides built-in encryption for media streams

### Data Storage
- **Firebase**: Stores encrypted messages, peer IDs, and profile info
- **Local Storage**: Settings, read state, and encryption passphrase stored on your device
- **14-Day Retention**: Messages automatically deleted after 14 days

---

## 📄 License

Private use for trusted groups. Not for commercial distribution.
