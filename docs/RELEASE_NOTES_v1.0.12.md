# Release Notes v1.0.12

**Release Date:** December 6, 2025

## 🌟 New Features

### 📞 Group Calls (Mesh Networking)
*   **Multi-User Support:** You can now see and hear multiple people in the "Voice Lounge" channel at once.
*   **Auto-Join:** Clicking a voice channel now automatically connects you to everyone else in that channel.
*   **Dynamic Grid:** The video layout adjusts automatically as people join or leave.

### 📁 File Sharing
*   **Uploads:** Click the `+` button in chat to upload images or files.
*   **Previews:** Images render directly in the chat. Other files appear as downloadable cards.
*   **Persistent Links:** File links are stored in the chat history.

### 🖼️ Profile Pictures
*   **Custom Avatars:** You can now upload a profile picture in **Settings > My Profile**.
*   **Visibility:** Your avatar appears in the User List, Sidebar, Chat, and Voice Stage (when your camera is off).

### 💾 Message Persistence
*   **Chat History:** Messages are now saved to the cloud (Firebase). You won't lose your conversation if you refresh or restart the app.
*   **Real-Time Sync:** Messages sync instantly across all connected clients without relying on P2P data channels.

## 🛠️ Improvements & Fixes

*   **Clickable Links:** URLs in chat messages are now automatically converted to clickable hyperlinks.
*   **Volume Crash Fix:** Fixed a bug where setting remote volume too high could crash the app.
*   **One-Way Audio Fix:** Resolved an issue where the microphone input could become "stale" or silent when answering calls.
*   **Toast Notifications:** Notifications no longer block mouse clicks on buttons underneath them.
*   **Logging:** Added persistent file logging (`pisscord.log`) for better debugging.

## 📝 Setup Notes
*   This update requires the latest `latest.yml` to be present on the update server for auto-updates to trigger.
*   Firebase Storage rules must be set to `allow read, write: if true;` for file uploads to work.
