# Multi-Platform Build Skill

Orchestrate Pisscord builds across Desktop (Electron), Web Browser, and Android (Capacitor) platforms. This skill encodes build pipeline knowledge and platform-specific requirements.

## When to Activate

- User asks to "build", "compile", or "package" the app
- User mentions specific platform: "desktop build", "web build", "android apk"
- User reports build errors or asks about build configuration
- User wants to "test on" a specific platform

## Mental Model

Pisscord builds follow a **shared-core, platform-shell** architecture:

```
                    Source (React + TypeScript)
                              │
                              ▼
                         Vite Build
                              │
            ┌─────────────────┼─────────────────┐
            ▼                 ▼                 ▼
    ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
    │ Desktop Shell │ │   Web Host    │ │ Native Shell  │
    │  (Electron)   │ │   (Static)    │ │  (Capacitor)  │
    └───────────────┘ └───────────────┘ └───────────────┘
            │                 │                 │
            ▼                 ▼                 ▼
        .exe file        dist-web/          .apk file
```

**Key insight:** The same React app runs everywhere, but each platform has different entry points, capabilities, and build processes.

## Build Commands Reference

| Platform | Dev Command | Build Command | Output |
|----------|-------------|---------------|--------|
| Desktop | `npm run electron:dev` | `npm run dist` | `dist/*.exe` |
| Web | `npm run dev:web` | `npm run build:web` | `dist-web/` |
| Android | N/A (use web dev) | `npm run cap:sync` | `android/` project |

## Desktop Build (Electron)

### Development

```bash
npm run electron:dev
# Starts Vite on port 5173, then launches Electron pointing to it
# Hot reload works for React, Electron main process requires restart
```

### Production Build

```bash
# Full pipeline
npm run dist

# This runs:
# 1. npm run build (TypeScript + Vite → dist/)
# 2. electron-builder --win --x64 (package → installer)
```

### Output Files

```
dist/
├── index.html           # Vite bundle entry
├── assets/              # JS, CSS, images
├── Pisscord Setup X.X.X.exe    # NSIS installer
├── Pisscord Setup X.X.X.exe.blockmap  # Delta update manifest
├── latest.yml           # Auto-updater config
└── win-unpacked/        # Portable version (no install)
```

### Configuration Files

| File | Purpose |
|------|---------|
| `electron.js` | Main process (window, tray, IPC, updates) |
| `preload.js` | IPC bridge for renderer process |
| `vite.config.ts` | Vite config with `base: './'` for Electron |
| `package.json` → `build` | electron-builder configuration |
| `installer.nsh` | NSIS installer customization |

### Common Issues

**"Cannot find module" after build:**
```bash
# Clean and rebuild
rm -rf dist node_modules
npm install
npm run dist
```

**"App won't start after install":**
- Check `electron.js` for syntax errors
- Verify `preload.js` path is correct
- Look in `%APPDATA%/Pisscord/logs/` for error logs

**"Auto-update not working":**
- Verify `latest.yml` was uploaded to GitHub release
- Check version in `package.json` matches tag
- Ensure `electron-updater` can reach GitHub API

## Web Build

### Development

```bash
npm run dev:web
# Starts Vite with web-specific config on port 5173
# Uses vite.config.web.ts
```

### Production Build

```bash
npm run build:web

# This runs:
# 1. TypeScript compilation
# 2. Vite build with web config → dist-web/
# 3. mv dist-web/index.web.html dist-web/index.html
```

### Output Structure

```
dist-web/
├── index.html           # Main entry (renamed from index.web.html)
├── assets/
│   ├── index-[hash].js  # Main bundle
│   ├── react-vendor-[hash].js    # React chunk
│   ├── firebase-vendor-[hash].js # Firebase chunk
│   ├── peer-vendor-[hash].js     # PeerJS chunk
│   └── *.css            # Styles
└── [static assets]      # Fonts, images
```

### Configuration

| File | Purpose |
|------|---------|
| `vite.config.web.ts` | Web-specific Vite config |
| `index.web.html` | Web entry point (no Electron dependencies) |

**Key differences from desktop config:**
```typescript
// vite.config.web.ts
export default defineConfig({
  base: '/',  // Absolute paths for web server
  build: {
    outDir: 'dist-web',
    rollupOptions: {
      input: 'index.web.html',
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'firebase-vendor': ['firebase/app', 'firebase/database', ...],
          'peer-vendor': ['peerjs']
        }
      }
    }
  }
});
```

### Deployment

```bash
# Firebase Hosting
npx firebase deploy --only hosting

# Or manual upload to any static host
# dist-web/ is a standard static site
```

### Common Issues

**"process is not defined":**
- Fixed by `define: { 'process.env': {} }` in Vite config
- Some npm packages expect Node.js environment

**"Module not found" for Capacitor packages:**
- Capacitor packages are dynamically imported
- Web build should exclude them from optimization:
```typescript
optimizeDeps: {
  exclude: ['@capacitor/core', '@capacitor/clipboard', ...]
}
```

**Large bundle size:**
- Check for accidental Electron imports
- Verify code splitting is working (check for vendor chunks)
- Use `npm run build:web -- --report` for bundle analysis

## Android Build (Capacitor)

### Initial Setup

```bash
# First time only
npx cap add android
# Creates android/ directory with Gradle project
```

### Development Workflow

```bash
# 1. Build web assets
npm run build

# 2. Sync to Android project
npx cap sync android
# Copies dist/ to android/app/src/main/assets/public/

# 3. Open in Android Studio
npx cap open android
```

### Building APK

**In Android Studio:**
1. Build → Build Bundle(s) / APK(s) → Build APK(s)
2. Output: `android/app/build/outputs/apk/debug/app-debug.apk`

**Via command line:**
```bash
cd android
./gradlew assembleDebug
# or for release:
./gradlew assembleRelease
```

### Configuration Files

| File | Purpose |
|------|---------|
| `capacitor.config.ts` | Capacitor settings (app ID, plugins) |
| `android/app/build.gradle` | Android build config |
| `android/gradle.properties` | Gradle settings |
| `android/app/src/main/AndroidManifest.xml` | Permissions, activities |

### Required Permissions

In `AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
```

### Common Issues

**"Capacitor plugin not found":**
```bash
# Rebuild native project
npx cap sync android
# If still failing, delete and recreate:
rm -rf android
npx cap add android
npx cap sync android
```

**"Build fails with Gradle error":**
```bash
# Clean Gradle cache
cd android
./gradlew clean
cd ..
npx cap sync android
```

**"APK too large" (was 446MB, fixed to 5.5MB):**
- Check for duplicate assets
- Verify `dist/` not included multiple times
- Remove sourcemaps from production build

**"WebRTC not working on Android":**
- Ensure `android:usesCleartextTraffic="true"` or use HTTPS
- Check `capacitor.config.ts` has `androidScheme: 'https'`
- Verify permissions are granted at runtime

### Icon Generation

```bash
# Generate all Android icon sizes
node scripts/generate-android-icons.js

# Source: public/pisscord-purple.png
# Output: android/app/src/main/res/mipmap-*/ic_launcher*.png
```

## Build Verification Checklist

Before any release:

### All Platforms
- [ ] `npx tsc --noEmit` passes (no TypeScript errors)
- [ ] Version updated in `package.json`
- [ ] `.env.local` has required API keys

### Desktop
- [ ] `npm run dist` completes without errors
- [ ] Installer runs and app launches
- [ ] Auto-updater can find current version

### Web
- [ ] `npm run build:web` completes without errors
- [ ] `dist-web/index.html` exists (not `index.web.html`)
- [ ] Local preview works: `npx serve dist-web`

### Android
- [ ] `npm run cap:sync` completes without errors
- [ ] APK builds in Android Studio
- [ ] App installs and runs on device/emulator

## Parallel Build Script

For building all platforms at once:

```bash
#!/bin/bash
# scripts/build-all.sh

set -e  # Exit on error

echo "🔍 Type checking..."
npx tsc --noEmit

echo "🖥️ Building desktop..."
npm run build

echo "🌐 Building web..."
npm run build:web

echo "📱 Syncing Android..."
npx cap sync android

echo "✅ All builds complete!"
echo ""
echo "Next steps:"
echo "  Desktop: npm run dist"
echo "  Web: npx firebase deploy --only hosting"
echo "  Android: npx cap open android → Build APK"
```

## Environment Variables

Required in `.env.local`:
```bash
VITE_FIREBASE_API_KEY=your_firebase_key
VITE_GEMINI_API_KEY=your_gemini_key
```

**Note:** These are bundled into the build. For production:
- Firebase API key is restricted by domain in Firebase Console
- Gemini API key should have usage limits set

## Troubleshooting Decision Tree

```
Build failed?
│
├─ TypeScript error?
│  └─ Fix type errors, then rebuild
│
├─ "Cannot resolve" error?
│  └─ npm install, then rebuild
│
├─ Platform-specific error?
│  │
│  ├─ Desktop: Check electron.js syntax
│  │
│  ├─ Web: Check vite.config.web.ts
│  │
│  └─ Android: npx cap sync, check Gradle
│
└─ Mysterious failure?
   └─ rm -rf dist dist-web node_modules
      npm install
      Rebuild
```

## Example Usage

User: "Build the app for web deployment"

Claude should:
1. Run `npx tsc --noEmit` to verify no type errors
2. Run `npm run build:web`
3. Verify `dist-web/index.html` exists
4. Optionally run `npx serve dist-web` for local preview
5. Provide deployment command: `npx firebase deploy --only hosting`

---
Created: 2025-12-25
Version: 1.0
Author: Claude Code Analysis
