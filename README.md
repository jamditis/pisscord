![pisscord logo](https://i.imgur.com/cecdoaM.jpeg)

# Pisscord

**Current Version:** v1.1.0 | [Download Latest](https://github.com/jamditis/pisscord/releases/latest)

A private, peer-to-peer Discord clone for trusted groups with enterprise-grade voice/video calling, AI assistance, and real-time presence.

## 🚀 Features

- **🔒 P2P Encrypted Calls**: Direct peer-to-peer WebRTC connections - no relay servers
- **🎥 HD Video & Voice**: Crystal clear communication with advanced media controls
- **🖥️ Screen Sharing**: Share your screen seamlessly without reconnecting
- **📌 Video Spotlight**: Click any video tile to pin/maximize it during calls
- **🗣️ Speaking Indicator**: Green ring shows who's talking in real-time
- **👥 Mesh Networking**: True many-to-many group calls
- **📁 File Sharing**: Drop images and files directly in chat
- **🤖 AI Assistant**: Integrated Gemini 2.5 Flash for instant help
- **📝 Markdown Chat**: Full markdown support in text channels
- **👤 Profile Pictures**: Upload custom avatars synced across users
- **📢 Dev Updates**: Live GitHub commit feed in #dev-updates
- **🐛 Bug Reporting**: In-app issue submission to #issues
- **🎨 Custom Profiles**: Personalize with names, statuses, and colors
- **🎛️ Advanced Controls**: Device selection, volume adjustment (0-200%)
- **📱 System Tray**: Minimize to tray - stay connected while multitasking

## 🏗️ Architecture Highlights

### Persistent Voice State
- **Separated view from connection**: Chat in text channels while remaining in a voice call
- **Persistent Voice Control Panel**: Always-visible controls in sidebar when connected
- **Global audio management**: Audio streams across all views without interruption

### Advanced Media Pipeline
- **Device hot-swapping**: Change mic, speakers, or camera without reconnecting
- **Volume control**: 0-200% adjustable remote audio volume
- **Track replacement**: Screen sharing uses `RTCRtpSender.replaceTrack()` for seamless transitions

### Desktop Integration
- **System tray support**: Minimize to tray instead of closing
- **Background connections**: Stay in voice calls while app is minimized
- **Auto-update system**: Firebase-based version checking

---

## 🛑 READ THIS FIRST

There are two roles:
1.  **The Builder (YOU)**: Turn this code into a program
2.  **The User (YOUR FRIEND)**: Just run the program you give them

---

## 🛠️ Instructions for Builders

### Prerequisites
- **Node.js LTS** from [nodejs.org](https://nodejs.org/)
- **Google Gemini API Key** (optional, for AI features)

### Build Steps

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
    VITE_API_KEY=your_google_gemini_api_key_here
    ```
    Without this, the AI channel will show an error but all other features work.

4.  **Build the Installer**:
    ```bash
    npm run dist
    ```
    *(Takes 1-2 minutes on first build)*

5.  **Find the Installer**:
    - Navigate to the `dist` folder
    - Look for `Pisscord Setup 1.0.X.exe`

### Development Mode

Run in development with hot-reload:
```bash
npm run electron:dev
```

---

## 📦 Instructions for Users

### Installation

1.  **Download**: Get the `Pisscord Setup 1.0.X.exe` file from your friend
2.  **Install**: Double-click the installer
    - Windows may show "Unknown Publisher" warning
    - Click "More Info" → "Run Anyway"
3.  **Launch**: Pisscord will open automatically after installation

### Connecting to Friends

#### Option 1: Someone Calls You
1. Open Pisscord
2. Click the **gear icon** (⚙️) in bottom left → Copy your Peer ID
3. Send your Peer ID to your friend
4. Accept the incoming call notification

#### Option 2: You Call Someone
1. Navigate to **Voice Lounge** channel
2. Ask your friend for their Peer ID
3. Paste their ID in the "Friend's Peer ID" field
4. Click **Connect**

### Using Voice Features

#### Persistent Voice Panel
When connected, you'll see a green **Voice Connected** panel at the bottom of the sidebar with:
- **Mute/Unmute**: Toggle your microphone
- **Video On/Off**: Toggle your camera
- **Volume**: Click speaker icon to adjust friend's volume (0-200%)
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
- *Note: Changes require reconnecting to take effect*

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

### AI Assistant

1. Click the **#gemini-ai** channel
2. Type your question
3. Gemini will respond instantly

*Requires builder to configure API key*

---

## 🎯 Tips & Tricks

- **System Tray**: Closing the window minimizes to tray - right-click tray icon to quit
- **Copy Peer ID Fast**: Click your shortened ID (e.g., `#a3f5...`) in bottom left
- **Volume Boost**: Set remote volume above 100% for quieter friends
- **Reconnect for Devices**: After changing audio/video devices, disconnect and reconnect
- **Debug Connection Issues**: Check Debug Log in settings for error details

---

## 🔒 Privacy & Security

- **Zero Server Storage**: All voice/video data goes directly peer-to-peer
- **Firebase Usage**: Only stores peer IDs and profile info (name, status, color)
- **No Recording**: Calls are never recorded or stored anywhere
- **Local First**: All settings stored locally on your machine

---

## 📄 License

Private use for trusted groups. Not for commercial distribution.
