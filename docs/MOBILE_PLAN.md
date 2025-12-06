# Pisscord Mobile Version Plan

## Platform Strategy: Progressive Web App (PWA) First

**Rationale**: The codebase is already 90% mobile-ready. A PWA approach allows:
- Reuse of existing React components and services
- Single codebase for web + mobile
- Faster time to market
- Easy upgrade path to React Native later if needed

---

## Architecture Analysis

### Code Reuse Summary

| Layer | Reusable | Changes Needed |
|-------|----------|----------------|
| Firebase services | ✅ 100% | None |
| PeerJS/WebRTC | ✅ 100% | None |
| Gemini AI service | ✅ 100% | None |
| Types/interfaces | ✅ 100% | None |
| App.tsx logic | ✅ 90% | Remove Electron checks, add mobile nav |
| Components | ⚠️ 60% | Major layout restructuring |
| Styling | ⚠️ 40% | Add mobile breakpoints |

### Current Layout Issues for Mobile

- Fixed sidebars total 312px (Sidebar 72px + ChannelList 240px)
- On 320px mobile screen, only 8px content space remains
- UserList is hidden on mobile (`hidden lg:flex`) with no alternative
- Settings modal is too large (max-w-4xl = 896px)

---

## Phase 1: Mobile-Responsive Web Layout

### 1.1 Navigation Redesign
- Replace fixed sidebars (312px) with bottom tab navigation
- Sidebar icons → bottom nav bar (Home, Channels, Users, Settings)
- ChannelList → slide-out drawer or full-screen view
- UserList → modal/drawer (currently hidden on mobile)

### 1.2 Responsive Breakpoints
Add mobile-first Tailwind classes:
```
sm: 640px  - Phone landscape
md: 768px  - Tablet portrait
lg: 1024px - Current desktop breakpoints
```

### 1.3 Component Updates

| Component | Change |
|-----------|--------|
| `App.tsx` | Add mobile nav state, conditional layout |
| `Sidebar.tsx` | Convert to bottom nav on mobile |
| `ChannelList.tsx` | Drawer or full-screen mode |
| `UserList.tsx` | Modal on mobile (remove `hidden lg:flex`) |
| `VoiceStage.tsx` | Full-screen video, bottom controls |
| `UserSettingsModal.tsx` | Full-screen on mobile |

---

## Phase 2: Touch Optimizations

### 2.1 Touch Targets
- Minimum 44x44px for all buttons (Apple HIG)
- Larger spacing between interactive elements
- Add `touch-action: manipulation` to prevent zoom delays

### 2.2 Mobile Video UX
- Full-screen mode for active call
- Swipe gestures for mute/video toggle
- Picture-in-Picture for browsing while in call
- Volume: Use hardware buttons (no slider needed)

### 2.3 Input Handling
- Native keyboard handling for chat
- Auto-scroll to input on focus
- Haptic feedback for call actions

---

## Phase 3: PWA Configuration

### 3.1 Service Worker
- Cache static assets for offline shell
- Background sync for presence
- Push notifications for incoming calls

### 3.2 Manifest
```json
{
  "name": "Pisscord",
  "short_name": "Pisscord",
  "display": "standalone",
  "orientation": "portrait",
  "theme_color": "#5865F2",
  "background_color": "#202225",
  "icons": [
    { "src": "/logo192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/logo512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### 3.3 iOS Considerations
- Add `apple-touch-icon`
- `apple-mobile-web-app-capable` meta tag
- Handle iOS audio autoplay restrictions

---

## Phase 4: Platform-Specific Adaptations

### 4.1 Features to Disable on Mobile
- **Screen sharing**: Not supported on iOS web, limited on Android
- **Device selection dropdowns**: Mobile has fewer options (use system defaults)
- **Auto-updater**: Replace with "new version available" banner

### 4.2 Features to Enhance
- **Push notifications**: Firebase Cloud Messaging for call alerts
- **Background audio**: Keep call audio playing when app backgrounded
- **Deep links**: `pisscord://call/{peerId}` for direct calling

### 4.3 Permission Handling
- Progressive permission requests (mic/camera on first call only)
- Clear permission denied UX with retry option

---

## Phase 5: Testing & Deployment

### 5.1 Device Testing Matrix
- iOS Safari 15+
- Android Chrome 90+
- Tablet layouts (iPad, Android tablets)

### 5.2 Deployment
- Host PWA on existing domain or subdomain (`m.pisscord.app`)
- Add install prompts for home screen
- Analytics for mobile usage patterns

---

## Known Limitations

1. **iOS Screen Sharing**: Apple blocks `getDisplayMedia()` in Safari - no workaround possible
2. **Background Calls on iOS**: iOS aggressively kills background WebRTC connections - needs foreground service workarounds
3. **Push for Incoming Calls**: Requires backend service for reliable call notifications (Firebase Cloud Functions recommended)

---

## Optional Future Path: React Native

If a fully native experience is required later:

### What to Rebuild
- All UI components using React Native primitives
- Navigation using React Navigation
- Video rendering using `react-native-webrtc`

### What to Reuse
- Firebase services (Firebase SDK works directly)
- Business logic patterns from App.tsx
- Types and interfaces
- Could extract shared logic to npm package

### Pros of React Native
- True native performance
- Better background call handling
- Access to native APIs (contacts, etc.)
- App Store/Play Store distribution

### Cons
- Separate codebase to maintain
- Longer development time
- More complex build/deploy pipeline

---

## Implementation Priority

1. **MVP**: Responsive layout + touch targets (2-3 weeks work)
2. **V1**: PWA manifest + service worker (1 week)
3. **V1.1**: Push notifications for calls (requires backend work)
4. **V2**: Consider React Native if native features needed

---

## Files Requiring Changes

### High Priority
- `App.tsx` - Mobile navigation state, responsive layout wrapper
- `components/Sidebar.tsx` - Bottom nav conversion
- `components/ChannelList.tsx` - Drawer implementation
- `index.html` - Add viewport meta, PWA manifest link

### Medium Priority
- `components/VoiceStage.tsx` - Full-screen mode, touch controls
- `components/UserList.tsx` - Modal implementation
- `components/UserSettingsModal.tsx` - Full-screen on mobile

### New Files Needed
- `public/manifest.json` - PWA manifest
- `public/sw.js` - Service worker
- `components/MobileNav.tsx` - Bottom navigation component
- `components/Drawer.tsx` - Slide-out drawer component
