# Pisscord Mobile Setup Guide

This guide walks you through setting up iOS and Android builds for Pisscord using Capacitor.

## Prerequisites

### For iOS
- macOS with Xcode installed (from App Store)
- Xcode Command Line Tools: `xcode-select --install`
- Apple Developer account ($99/year for distribution)
- CocoaPods: `sudo gem install cocoapods`

### For Android
- Android Studio (https://developer.android.com/studio)
- Android SDK (installed via Android Studio)
- Java JDK 17+

---

## Quick Start

### 1. Build the Web App
```bash
npm run build
```

### 2. Add Platforms (First Time Only)

**iOS:**
```bash
npm run cap:add:ios
```

**Android:**
```bash
npm run cap:add:android
```

### 3. Sync Changes to Native Projects
After any web code changes:
```bash
npm run cap:sync
```

### 4. Open in IDE

**iOS (Xcode):**
```bash
npm run cap:ios
```

**Android (Android Studio):**
```bash
npm run cap:android
```

---

## iOS Configuration

### Info.plist Permissions
When you open the iOS project in Xcode, add these to `Info.plist`:

```xml
<key>NSCameraUsageDescription</key>
<string>Pisscord needs camera access for video calls</string>

<key>NSMicrophoneUsageDescription</key>
<string>Pisscord needs microphone access for voice calls</string>

<key>UIBackgroundModes</key>
<array>
    <string>audio</string>
    <string>voip</string>
</array>
```

### Background Audio
To keep voice calls running when the app is in background:
1. In Xcode, select your project
2. Go to "Signing & Capabilities"
3. Click "+ Capability"
4. Add "Background Modes"
5. Check "Audio, AirPlay, and Picture in Picture"
6. Check "Voice over IP"

### App Icons
Place your icons in `ios/App/App/Assets.xcassets/AppIcon.appiconset/`

Required sizes:
- 20x20, 29x29, 40x40, 60x60, 76x76, 83.5x83.5
- @2x and @3x versions

### TestFlight Distribution (For Friends & Family)
1. In Xcode: Product → Archive
2. Window → Organizer → Distribute App
3. Choose "App Store Connect" → "Upload"
4. Go to App Store Connect (appstoreconnect.apple.com)
5. Add testers to TestFlight (up to 100 external testers)
6. They'll receive email invites to download via TestFlight app

---

## Android Configuration

### AndroidManifest.xml Permissions
These should be auto-added, but verify in `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

### App Icons
Place icons in `android/app/src/main/res/`:
- `mipmap-mdpi/ic_launcher.png` (48x48)
- `mipmap-hdpi/ic_launcher.png` (72x72)
- `mipmap-xhdpi/ic_launcher.png` (96x96)
- `mipmap-xxhdpi/ic_launcher.png` (144x144)
- `mipmap-xxxhdpi/ic_launcher.png` (192x192)

### Generate Signed APK
1. In Android Studio: Build → Generate Signed Bundle / APK
2. Choose APK
3. Create new keystore or use existing
4. Build release APK

### Direct APK Distribution
Share the signed APK directly with friends:
- Located at `android/app/release/app-release.apk`
- Users may need to enable "Install from Unknown Sources"

---

## Development Workflow

### Live Reload (Development)
For faster development with live reload:

1. Find your local IP: `ipconfig getifaddr en0` (Mac)
2. Edit `capacitor.config.ts`:
```typescript
server: {
  url: 'http://YOUR_LOCAL_IP:5173',
  cleartext: true,
},
```
3. Start dev server: `npm run dev`
4. Run app on device/simulator

### Testing on Device

**iOS Simulator:**
```bash
npm run cap:ios
# Then in Xcode: Product → Run (or Cmd+R)
```

**Android Emulator:**
```bash
npm run cap:android
# Then in Android Studio: Run → Run 'app'
```

**Real Devices:**
- iOS: Connect device, trust computer, select device in Xcode
- Android: Enable USB debugging, connect device, select in Android Studio

---

## Troubleshooting

### WebRTC Not Working
- Ensure permissions are granted
- Check that `allowMixedContent: true` is set for Android
- Test on real device (simulators may have issues)

### Audio Cuts Out in Background (iOS)
- Verify Background Modes are enabled
- Add `audio` and `voip` to UIBackgroundModes

### Build Fails
```bash
# Clean and rebuild
npm run build
npx cap sync
# Then rebuild in Xcode/Android Studio
```

### CocoaPods Issues (iOS)
```bash
cd ios/App
pod deintegrate
pod install
```

---

## Updating the App

When you make changes to the web code:

```bash
# 1. Build web assets
npm run build

# 2. Sync to native projects
npx cap sync

# 3. Rebuild in Xcode/Android Studio
```

---

## Version Checklist

Before each release:
- [ ] Update version in `package.json`
- [ ] Run `npm run build && npx cap sync`
- [ ] Test on iOS simulator/device
- [ ] Test on Android emulator/device
- [ ] Test voice calls between platforms
- [ ] Archive and upload to TestFlight (iOS)
- [ ] Generate signed APK (Android)
