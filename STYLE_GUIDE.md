# Pisscord Mobile Style Guide

This document defines the design system used in the Pisscord mobile app (Capacitor/Android). Use this as a reference when adapting the design to the desktop Electron app.

---

## Color Palette

### Primary Colors
| Name | Hex | Usage |
|------|-----|-------|
| **Piss Gold** | `#f0e130` | Primary accent, active states, branding |
| **Purple** | `#a855f7` / `#6366f1` | Secondary accent, AI/bot elements, buttons |
| **Green (Live)** | `#22c55e` | Connected state, success, live indicators |
| **Red** | `#ef4444` | Disconnect, errors, danger actions |

### Background Colors
| Name | Hex | Usage |
|------|-----|-------|
| **Dark Base** | `#16162a` | Main background, input areas |
| **Dark Gradient Start** | `#1a1a2e` | Gradient top |
| **Dark Gradient End** | `#0f0f1a` | Gradient bottom (modals) |
| **Discord Dark** | `#202225` | Legacy desktop background |
| **Discord Sidebar** | `#2f3136` | Desktop sidebar |
| **Discord Main** | `#36393f` | Desktop main content |

### Text Colors
| Name | Value | Usage |
|------|-------|-------|
| **Primary** | `text-white` | Headers, important text |
| **Secondary** | `text-white/80` | Body text, messages |
| **Muted** | `text-white/50` | Labels, timestamps |
| **Subtle** | `text-white/30` | Placeholders, hints |
| **Inactive** | `#6b7280` | Inactive nav items |

### Transparency Levels
```css
/* Backgrounds */
bg-white/5      /* Subtle container background */
bg-white/10     /* Hover state, input backgrounds */
bg-white/[0.02] /* Very subtle section dividers */

/* Borders */
border-white/5   /* Subtle dividers */
border-white/10  /* Input borders, cards */
border-white/20  /* Emphasized borders */

/* Accent backgrounds */
bg-purple-500/10  /* AI message background */
bg-purple-500/20  /* Active tab, selected state */
bg-green-500/10   /* Success state background */
bg-green-500/20   /* Connected indicator */
bg-red-500/20     /* Danger/disconnect background */
```

---

## Typography

### Font Sizes
| Class | Size | Usage |
|-------|------|-------|
| `text-lg` | 18px | Screen titles, headers |
| `text-sm` | 14px | Body text, messages |
| `text-xs` | 12px | Labels, timestamps, badges |
| `text-[10px]` | 10px | Nav labels, micro text |

### Font Weights
```css
font-bold      /* Headers, usernames */
font-semibold  /* Sub-headers */
font-medium    /* Button text, labels */
```

### Text Styles
```css
/* Headers */
.header-title {
  font-semibold text-lg tracking-wide
  color: #f0e130; /* Piss Gold */
}

/* Section labels */
.section-label {
  text-xs font-bold text-white/40 uppercase tracking-wider
}

/* Timestamps */
.timestamp {
  text-[10px] text-white/30
}
```

---

## Spacing & Layout

### Safe Area Insets
```css
/* Status bar padding (Android) */
paddingTop: '3.5rem'  /* 56px - clears status bar on most devices */

/* Bottom nav padding */
paddingBottom: '5rem' /* 80px - content padding */
pb-20                 /* Scrollable content bottom */
pb-24                 /* Input area bottom (96px) */
```

### Standard Padding
```css
px-4  /* Horizontal screen padding (16px) */
px-3  /* Tighter horizontal (12px) */
py-3  /* Vertical section padding */
py-4  /* Larger vertical padding */
```

### Border Radius
```css
rounded-xl   /* 12px - Cards, buttons, inputs */
rounded-2xl  /* 16px - Large cards, avatars */
rounded-full /* Pills, badges, circular elements */
```

---

## Components

### Navigation Bar (Bottom)
```css
/* Container */
.nav-container {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 50;
  height: 4rem; /* 64px */
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

/* Background - Glassmorphism */
.nav-background {
  background: linear-gradient(to top, rgba(10, 10, 15, 0.95), rgba(18, 18, 26, 0.85));
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(24px);
}

/* Active indicator pill */
.nav-active-pill {
  width: 3rem;
  height: 0.25rem;
  border-radius: 9999px;
  background: #f0e130; /* or #22c55e for live */
  box-shadow: 0 0 12px rgba(240, 225, 48, 0.5);
}

/* Nav icon colors */
active: #f0e130 (gold) or #22c55e (green when live)
inactive: #6b7280
```

### Headers (Screen)
```css
/* Glassmorphism header */
.screen-header {
  position: relative;
  padding: 1rem 1.25rem;
  padding-top: 3.5rem; /* Status bar clearance */
  background: linear-gradient(to bottom, rgba(18, 18, 26, 0.98), rgba(18, 18, 26, 0.92));
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

/* Subtle glow line */
.header-glow-line {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(240, 225, 48, 0.2), transparent);
}
```

### Cards & Containers
```css
/* Standard card */
.card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 1rem; /* rounded-2xl */
  padding: 1rem;
}

/* Highlighted card (current user, selected) */
.card-highlighted {
  background: linear-gradient(to right, rgba(168, 85, 247, 0.15), rgba(168, 85, 247, 0.05));
  border: 1px solid rgba(168, 85, 247, 0.2);
}

/* Interactive card */
.card-interactive {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: background-color 0.15s ease;
}
.card-interactive:active {
  background: rgba(255, 255, 255, 0.1);
}
```

### Buttons
```css
/* Primary button */
.btn-primary {
  background: linear-gradient(to right, #a855f7, #6366f1);
  color: white;
  font-weight: 500;
  padding: 0.75rem 1rem;
  border-radius: 0.75rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

/* Secondary button */
.btn-secondary {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.7);
  padding: 0.75rem 1rem;
  border-radius: 0.75rem;
}

/* Danger button */
.btn-danger {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #ef4444;
}

/* Icon button */
.btn-icon {
  width: 2.75rem; /* 44px - touch target */
  height: 2.75rem;
  border-radius: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Touch feedback */
.btn:active {
  transform: scale(0.95);
}
/* Or with framer-motion */
whileTap={{ scale: 0.95 }}
```

### Inputs
```css
/* Text input */
.input {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.75rem;
  padding: 0.75rem 1rem;
  color: white;
  font-size: 16px; /* Prevents iOS zoom */
}

.input::placeholder {
  color: rgba(255, 255, 255, 0.3);
}

.input:focus {
  border-color: rgba(168, 85, 247, 0.5);
  outline: none;
}
```

### Avatars
```css
/* Standard avatar */
.avatar {
  width: 2.75rem; /* 44px */
  height: 2.75rem;
  border-radius: 9999px;
  overflow: hidden;
}

/* Large avatar */
.avatar-lg {
  width: 5rem; /* 80px */
  height: 5rem;
  border-radius: 1rem;
}

/* Status indicator */
.avatar-status {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 1rem;
  height: 1rem;
  border-radius: 9999px;
  border: 2px solid #1a1a2e;
  background: #22c55e; /* Online */
}
```

### Badges
```css
/* Count badge */
.badge {
  background: #ef4444;
  color: white;
  font-size: 10px;
  font-weight: 700;
  padding: 0 0.375rem;
  min-width: 1rem;
  height: 1rem;
  border-radius: 9999px;
  box-shadow: 0 0 8px rgba(239, 68, 68, 0.5);
}

/* Label badge */
.badge-label {
  background: rgba(168, 85, 247, 0.3);
  color: #c4b5fd;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  padding: 0.125rem 0.375rem;
  border-radius: 9999px;
}
```

---

## Animations

### Framer Motion Presets
```tsx
/* Fade in */
initial={{ opacity: 0 }}
animate={{ opacity: 1 }}
exit={{ opacity: 0 }}

/* Slide up (modals, bottom sheets) */
initial={{ y: '100%' }}
animate={{ y: 0 }}
exit={{ y: '100%' }}
transition={{ type: 'spring', damping: 25, stiffness: 300 }}

/* Scale in */
initial={{ opacity: 0, scale: 0.95 }}
animate={{ opacity: 1, scale: 1 }}
exit={{ opacity: 0, scale: 0.95 }}

/* Slide from right (view transitions) */
initial={{ opacity: 0, x: 20 }}
animate={{ opacity: 1, x: 0 }}
exit={{ opacity: 0, x: -20 }}

/* Staggered list items */
transition={{ delay: index * 0.05 }}

/* Button press */
whileTap={{ scale: 0.95 }}
/* or for smaller buttons */
whileTap={{ scale: 0.9 }}
```

### CSS Animations
```css
/* Pulse (live indicators) */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
.animate-pulse {
  animation: pulse 2s infinite;
}

/* Fade in */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Slide up */
@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
```

---

## Modals & Overlays

### Full Screen Modal (Mobile)
```tsx
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
  className="fixed inset-0 z-[100] bg-gradient-to-b from-[#1a1a2e] to-[#0f0f1a] flex flex-col"
>
  {/* Header with status bar padding */}
  <div style={{ paddingTop: '3.5rem' }}>...</div>

  {/* Scrollable content */}
  <div className="flex-1 overflow-y-auto px-4 py-4">...</div>
</motion.div>
```

### Bottom Sheet
```tsx
<motion.div
  initial={{ y: '100%' }}
  animate={{ y: 0 }}
  exit={{ y: '100%' }}
  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
  className="w-full bg-gradient-to-b from-[#2a2a4a] to-[#1a1a2e] rounded-t-3xl"
>
  {/* Drag handle */}
  <div className="flex justify-center pt-3 pb-2">
    <div className="w-10 h-1 rounded-full bg-white/20" />
  </div>

  {/* Content */}
  ...
</motion.div>
```

### Backdrop
```css
.backdrop {
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
}
```

---

## Iconography

### Icon Library
Using **Font Awesome 6** (`fas` prefix for solid icons)

### Common Icons
| Icon | Class | Usage |
|------|-------|-------|
| Channels | `fa-hashtag` | Text channels |
| Voice | `fa-microphone` | Voice channels, mic |
| Video | `fa-video` | Camera toggle |
| Users | `fa-users` | User list |
| Settings | `fa-cog` | Settings |
| Back | `fa-arrow-left` | Navigation back |
| Close | `fa-times` | Close/dismiss |
| Check | `fa-check` | Confirm, success |
| Send | `fa-paper-plane` | Send message |
| Upload | `fa-plus` | Add attachment |
| Lock | `fa-lock` | Approval required |
| Bug | `fa-bug` | Bug report |
| Star | `fa-star` | Feature request |

### Icon Sizing
```css
text-sm   /* 14px - inline icons */
text-lg   /* 18px - nav icons */
text-xl   /* 20px - header icons */
text-2xl  /* 24px - empty state icons */
```

---

## Touch & Interaction

### Touch Targets
- Minimum touch target: **44x44px** (`w-11 h-11` or `min-h-[44px] min-w-[44px]`)
- Nav buttons: **56x56px** for comfortable tapping

### Haptic Feedback
```tsx
import { HapticsService } from '../services/platform';

// Light - button taps, navigation
HapticsService.impact('light');

// Medium - confirmations, significant actions
HapticsService.impact('medium');

// Heavy - errors, warnings (use sparingly)
HapticsService.impact('heavy');
```

### Disable Tap Highlight
```css
-webkit-tap-highlight-color: transparent;
```

---

## Responsive Breakpoints

### Mobile Detection
```tsx
import { useIsMobile } from '../hooks/useIsMobile';

const isMobile = useIsMobile(); // true if width <= 768px
```

### CSS Media Queries
```css
@media (max-width: 768px) {
  /* Mobile styles */
}

@media (max-width: 640px) {
  /* Small mobile */
}

@media (max-height: 500px) and (orientation: landscape) {
  /* Landscape phone */
}
```

---

## Z-Index Scale

| Layer | Z-Index | Usage |
|-------|---------|-------|
| Base content | 0 | Normal content |
| Floating elements | 10 | Tooltips, dropdowns |
| Navigation | 50 | Bottom nav bar |
| Modals | 90 | Confirm dialogs |
| Full-screen modals | 100 | Settings, forms |
| Toasts | 110 | Notifications |

---

## Desktop Adaptation Notes

When adapting to desktop:

1. **Remove safe area padding** - Desktop doesn't need status bar clearance
2. **Replace bottom nav with sidebar** - Use the existing ChannelList sidebar pattern
3. **Increase information density** - Can show more content per screen
4. **Add hover states** - Desktop has mouse, add `:hover` styles
5. **Keyboard shortcuts** - Add Ctrl/Cmd+K, Escape, etc.
6. **Context menus** - Use right-click menus instead of action sheets
7. **Resizable panels** - Allow users to resize sidebars
8. **Multi-panel views** - Can show chat + users + voice simultaneously

### Shared Components
These components already have both mobile and desktop layouts:
- `ChatArea.tsx`
- `UserList.tsx`
- `VoiceStage.tsx`
- `ChannelList.tsx`
- `UserSettingsModal.tsx`
- `ConfirmModal.tsx`
- `Toast.tsx`
- `ContextMenu.tsx`

Look for `if (isMobile) { ... }` patterns in these files.
