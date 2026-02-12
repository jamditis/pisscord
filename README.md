![pisscord logo](https://i.imgur.com/cecdoaM.jpeg)

# Pisscord

[![GitHub release](https://img.shields.io/github/v/release/jamditis/pisscord)](https://github.com/jamditis/pisscord/releases/latest)
[![GitHub stars](https://img.shields.io/github/stars/jamditis/pisscord)](https://github.com/jamditis/pisscord/stargazers)
[![GitHub issues](https://img.shields.io/github/issues/jamditis/pisscord)](https://github.com/jamditis/pisscord/issues)
[![GitHub last commit](https://img.shields.io/github/last-commit/jamditis/pisscord)](https://github.com/jamditis/pisscord/commits)
[![Update Firebase Version](https://github.com/jamditis/pisscord/actions/workflows/update-firebase-version.yml/badge.svg)](https://github.com/jamditis/pisscord/actions/workflows/update-firebase-version.yml)

**Current version:** v2.1.2 | [Download latest](https://github.com/jamditis/pisscord/releases/latest) | [Use in browser](https://web.pisscord.app)

A private, peer-to-peer Discord clone for trusted groups with encrypted messaging, voice/video calling, AI assistance, and real-time presence. Available as a desktop app, Android app, or directly in your web browser.

## Features

### Platform options
- **Web browser version**: Use Pisscord directly in your browser — no download required
- **Desktop app**: Full-featured Windows application with system tray integration
- **Android app**: Native Android app built with Capacitor
- **Mobile web**: Works on mobile browsers with optimized touch UI

### Security and privacy
- **XSS-hardened markdown**: Link protocol validation blocks javascript: and data: URIs
- **Message boundary validation**: Firebase messages filtered through type guards before rendering
- **P2P encrypted calls**: Direct peer-to-peer WebRTC connections — no relay servers

### Communication
- **HD video and voice**: Crystal clear communication with advanced media controls
- **Screen sharing**: Share your screen without reconnecting
- **Video spotlight**: Click any video tile to pin/maximize it during calls
- **Speaking indicator**: Green ring shows who's talking in real-time
- **Mesh networking**: True many-to-many group calls
- **File sharing**: Drop images and files directly in chat
- **Markdown chat**: Full markdown support in text channels

### Smart features
- **Unread indicators**: Red dot and bold text show channels with new messages
- **Release notes**: One-time popup shows what's new after updates
- **AI assistant**: Integrated Gemini 2.5 Flash for instant help (Pissbot)
- **Profile pictures**: Upload custom avatars synced across users
- **Dev updates**: Live GitHub commit feed in #dev-updates
- **Bug reporting**: In-app issue submission to #issues
- **Custom profiles**: Personalize with names, statuses, and colors
- **Advanced controls**: Device selection, per-user volume, audio processing toggles
- **Noise suppression**: Built-in noise suppression, echo cancellation, and auto gain control
- **ML noise cancellation**: RNNoise WASM-powered pipeline for keyboard, fan, and background chatter removal
- **System tray**: Minimize to tray — stay connected while multitasking (desktop only)

## Architecture highlights

### Multi-platform support
- **Web browser**: Pure React/Vite build runs in any modern browser
- **Desktop (Electron)**: Full desktop integration with native features
- **Android (Capacitor)**: Native Android app with full feature parity
- **Mobile web**: Responsive design with mobile-optimized controls
- **Shared codebase**: Platform abstraction layer handles differences

### Persistent voice state
- **Separated view from connection**: Chat in text channels while remaining in a voice call
- **Persistent voice control panel**: Always-visible controls in sidebar when connected
- **Global audio management**: Audio streams across all views without interruption

### Advanced media pipeline
- **Device hot-swapping**: Change mic, speakers, or camera without reconnecting
- **Volume control**: Per-user volume with individual sliders
- **Audio processing**: Noise suppression, echo cancellation, auto gain control toggles
- **Track replacement**: Screen sharing uses `RTCRtpSender.replaceTrack()` for seamless transitions

### Desktop integration
- **System tray support**: Minimize to tray instead of closing
- **Background connections**: Stay in voice calls while app is minimized
- **Auto-update system**: Firebase-based version checking

---

## Read this first

There are four ways to use Pisscord:
1.  **Web browser**: Just visit [web.pisscord.app](https://web.pisscord.app) — no installation needed
2.  **Desktop app**: Download and install the Windows application
3.  **Android app**: Install the APK on your Android device
4.  **Build from source**: Compile the code yourself

---

## Web browser quick start

1.  **Visit**: Go to [web.pisscord.app](https://web.pisscord.app)
2.  **Sign in**: Use Google or email magic link to authenticate
3.  **Start chatting**: You're ready to use all features

That's it! The web version works on desktop and mobile browsers.

---

## Instructions for builders

### Prerequisites
- **Node.js LTS** from [nodejs.org](https://nodejs.org/)
- **Google Gemini API key** (optional, for AI features)

### Build desktop app

1.  **Clean build directory** (if rebuilding):
    ```bash
    rm -rf dist  # or manually delete the dist folder
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Configure AI (optional)**:
    Create `.env.local` in project root:
    ```env
    VITE_GEMINI_API_KEY=your_google_gemini_api_key_here
    ```
    Without this, the AI channel will show an error but all other features work.

4.  **Build the installer**:
    ```bash
    npm run dist
    ```
    *(Takes 1-2 minutes on first build)*

5.  **Find the installer**:
    - Navigate to the `dist` folder
    - Look for `Pisscord Setup 2.1.2.exe`

### Build web version

```bash
npm run build:web    # Creates web build in dist-web/
```

### Build Android app

```bash
npm run build              # Build the web assets first
npx cap sync android       # Sync to Android project
npx cap open android       # Open in Android Studio
```

Then build/run from Android Studio.

### Development mode

Run in development with hot-reload:
```bash
npm run electron:dev  # Desktop app
npm run dev          # Web browser (localhost:5173)
```

---

## Instructions for users

### Desktop installation

1.  **Download**: Get the `Pisscord Setup 2.1.2.exe` from [releases](https://github.com/jamditis/pisscord/releases/latest)
2.  **Install**: Double-click the installer
    - Windows may show "Unknown Publisher" warning
    - Click "More Info" then "Run Anyway"
3.  **Launch**: Pisscord will open automatically after installation

### Android installation

1.  **Download**: Get the APK from a trusted source or build from source
2.  **Enable unknown sources**: Settings > Security > Allow installation from unknown sources
3.  **Install**: Tap the APK file and follow prompts
4.  **Launch**: Open Pisscord from your app drawer

### First-time setup

1.  **Sign in**: Use Google sign-in or email magic link to authenticate
2.  **Set your profile**: Click the gear icon to set your display name and avatar

### Joining voice calls

1. Click any voice channel (e.g., "Chillin'")
2. Grant microphone permission when prompted
3. You're now in the voice channel with others

### Using voice features

#### Persistent voice panel
When connected, you'll see a green **Voice Connected** panel at the bottom of the sidebar with:
- **Mute/Unmute**: Toggle your microphone
- **Video On/Off**: Toggle your camera
- **Volume**: Click volume icon on any user's video tile to adjust their volume
- **Disconnect**: Red phone icon to end call

#### Multitasking while connected
- Browse any text channel while staying connected
- Voice controls remain accessible in sidebar
- Audio continues playing across all views

### Settings

Click the **gear icon** in bottom left to access:

#### My profile tab
- Change display name
- Set custom status message
- Choose avatar color

#### Voice and video tab
- Select microphone (input device)
- Select speakers (output device)
- Select camera (video device)
- **Audio processing**: Toggle noise suppression, echo cancellation, auto gain control
- **Advanced noise cancellation**: ML-powered removal of keyboard, fan, and background noise
- *Note: Device changes require reconnecting to take effect*

#### Debug log tab
- View real-time connection logs
- Troubleshoot WebRTC issues
- See error messages and connection states

### Screen sharing

While in a call:
1. Click the **desktop icon** in the control bar
2. Select which screen/window to share
3. Click **Share**
4. To stop: Click the desktop icon again or click "Stop Sharing" in browser bar

### AI assistant (Pissbot)

1. Click the **#pissbot** channel
2. Type your question
3. Pissbot will respond instantly

*Pissbot is powered by Gemini 2.5 Flash. Requires builder to configure API key.*

---

## Tips and tricks

- **System tray**: Closing the window minimizes to tray — right-click tray icon to quit
- **Copy peer ID fast**: Click your shortened ID (e.g., `#a3f5...`) in bottom left
- **Per-user volume**: Click volume icon on a user's tile to adjust their level
- **Reduce background noise**: Enable noise suppression in Settings > Voice & Video
- **Reconnect for devices**: After changing audio/video devices, disconnect and reconnect
- **Debug connection issues**: Check Debug Log in settings for error details

---

## Privacy and security

### Text messages
- **Private server**: Pisscord runs on a private Firebase instance for trusted groups only
- **14-day retention**: Messages automatically deleted after 14 days
- **XSS protection**: Markdown renderer validates link protocols to block script injection

### Voice/video privacy
- **P2P connections**: All voice/video data goes directly between users via WebRTC
- **No relay servers**: Calls never pass through Pisscord servers
- **No recording**: Calls are never recorded or stored anywhere
- **DTLS/SRTP**: WebRTC provides built-in encryption for media streams

### Data storage
- **Firebase**: Stores encrypted messages, peer IDs, and profile info
- **Local storage**: Settings, read state, and encryption passphrase stored on your device
- **14-day retention**: Messages automatically deleted after 14 days

---

## License

Private use for trusted groups. Not for commercial distribution.
