# Component Development Skill

Scaffold new Pisscord components following established patterns. This skill encodes the architectural decisions and UI conventions used throughout the codebase.

## When to Activate

- User asks to "create a new component", "add a modal", "build a panel"
- User describes a UI feature that requires a new component
- User wants to refactor existing UI into a component

## Mental Model

Pisscord components follow a **dual-layout architecture**:
- Every visual component must render differently for mobile vs desktop
- Mobile: Full-screen layouts, bottom sheets, large touch targets (44px minimum)
- Desktop: Windowed modals, hover effects, compact layouts

Components are **stateless by preference** - state lives in `App.tsx` and flows down via props. Only use local state for UI-only concerns (hover states, input values, animation states).

## Component Categories

### 1. Modal Components
Full-screen overlays for settings, confirmations, or focused interactions.

**Pattern:**
```tsx
interface MyModalProps {
  isOpen: boolean;
  onClose: () => void;
  // ... data props
}

export function MyModal({ isOpen, onClose, ...props }: MyModalProps) {
  const isMobile = useIsMobile();
  const { colors } = useTheme();

  if (!isOpen) return null;

  if (isMobile) {
    return (
      <motion.div
        className="fixed inset-0 z-[100] bg-black/60"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          className="fixed bottom-0 left-0 right-0 rounded-t-3xl"
          style={{ backgroundColor: colors.surface }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Mobile content */}
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="rounded-lg max-w-md w-full mx-4"
        style={{ backgroundColor: colors.surface }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Desktop content */}
      </motion.div>
    </motion.div>
  );
}
```

### 2. Panel Components
Sidebar or inline content areas (ChannelList, UserList style).

**Pattern:**
```tsx
interface MyPanelProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  // ... data props
}

export function MyPanel({ isCollapsed, onToggleCollapse, ...props }: MyPanelProps) {
  const isMobile = useIsMobile();
  const { colors } = useTheme();
  const { width, isResizing, handleMouseDown } = useResizablePanel({
    defaultWidth: 240,
    minWidth: 180,
    maxWidth: 400,
    storageKey: 'myPanelWidth',
    side: 'left'
  });

  if (isMobile) {
    return (
      <div
        className="h-full overflow-y-auto"
        style={{ backgroundColor: colors.background }}
      >
        {/* Mobile card-based layout */}
      </div>
    );
  }

  if (isCollapsed) {
    return (
      <div className="w-12 flex flex-col items-center py-4">
        <button onClick={onToggleCollapse}>
          <i className="fas fa-chevron-right" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex" style={{ width }}>
      <div className="flex-1 overflow-y-auto">
        {/* Desktop content */}
      </div>
      <ResizeHandle isResizing={isResizing} onMouseDown={handleMouseDown} side="right" />
    </div>
  );
}
```

### 3. Control Components
Buttons, toggles, inputs with consistent styling.

**Pattern:**
```tsx
interface IconButtonProps {
  icon: string;
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
  tooltip?: string;
}

export function IconButton({ icon, onClick, active, danger, disabled, tooltip }: IconButtonProps) {
  const { colors } = useTheme();

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      disabled={disabled}
      title={tooltip}
      className={`
        w-10 h-10 rounded-full flex items-center justify-center
        transition-colors duration-200
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
      style={{
        backgroundColor: active
          ? (danger ? '#ef4444' : colors.primary)
          : colors.surfaceHover,
        color: active ? 'white' : colors.text
      }}
    >
      <i className={`fas ${icon}`} />
    </motion.button>
  );
}
```

### 4. List Item Components
Repeatable items for channels, users, messages.

**Pattern:**
```tsx
interface MyListItemProps {
  item: MyItemType;
  isActive?: boolean;
  hasUnread?: boolean;
  onClick: () => void;
}

export const MyListItem = memo(function MyListItem({
  item, isActive, hasUnread, onClick
}: MyListItemProps) {
  const { colors } = useTheme();

  return (
    <motion.div
      whileHover={{ backgroundColor: colors.surfaceHover }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`
        flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer
        ${isActive ? 'ring-2' : ''}
      `}
      style={{
        backgroundColor: isActive ? colors.surfaceHover : 'transparent',
        ringColor: colors.primary
      }}
    >
      {hasUnread && (
        <span className="w-2 h-2 rounded-full bg-red-500" />
      )}
      {/* Item content */}
    </motion.div>
  );
});
```

## Required Imports

Every component should consider these imports:
```tsx
import { useState, useEffect, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useIsMobile } from '../hooks/useIsMobile';
import { useTheme } from '../contexts/ThemeContext';
```

Optional imports based on component type:
```tsx
// For resizable panels
import { useResizablePanel } from '../hooks/useResizablePanel';
import { ResizeHandle } from './ResizeHandle';

// For Firebase operations
import { uploadFile, sendMessage } from '../services/firebase';

// For platform-specific features
import { Platform, HapticsService } from '../services/platform';

// For sounds
import { playSound } from '../services/sounds';
```

## Integration with App.tsx

After creating a component:

1. **Add state** (if component needs controlled state):
```tsx
// In App.tsx state declarations
const [showMyModal, setShowMyModal] = useState(false);
```

2. **Add render**:
```tsx
// In App.tsx return, inside AnimatePresence
<MyModal
  isOpen={showMyModal}
  onClose={() => setShowMyModal(false)}
  // ...other props
/>
```

3. **Add trigger** (button, menu item, etc.):
```tsx
onClick={() => setShowMyModal(true)}
```

## Theme Colors Reference

Always use `useTheme()` colors, never hardcode:
```tsx
const { colors, theme } = useTheme();

// Available colors:
colors.background    // Main background
colors.surface       // Card/panel backgrounds
colors.surfaceHover  // Hover states
colors.primary       // Brand color (gold or purple)
colors.primaryHover  // Primary hover
colors.text          // Main text
colors.textMuted     // Secondary text
colors.border        // Borders
colors.glow          // Glow effects
```

## Animation Standards

Use these Framer Motion patterns:

**Fade in/out:**
```tsx
initial={{ opacity: 0 }}
animate={{ opacity: 1 }}
exit={{ opacity: 0 }}
```

**Slide up (mobile sheets):**
```tsx
initial={{ y: '100%' }}
animate={{ y: 0 }}
exit={{ y: '100%' }}
transition={{ type: 'spring', damping: 25, stiffness: 300 }}
```

**Scale (desktop modals):**
```tsx
initial={{ opacity: 0, scale: 0.95 }}
animate={{ opacity: 1, scale: 1 }}
exit={{ opacity: 0, scale: 0.95 }}
```

**Button feedback:**
```tsx
whileHover={{ scale: 1.05 }}
whileTap={{ scale: 0.95 }}
```

## Checklist Before Component is Complete

- [ ] Has TypeScript interface for props
- [ ] Uses `useIsMobile()` for responsive layout
- [ ] Uses `useTheme()` for all colors
- [ ] Has Framer Motion animations
- [ ] Mobile layout uses safe area insets where needed
- [ ] Desktop layout has proper z-index (modals: 100+)
- [ ] Click-outside-to-close for modals/dropdowns
- [ ] Memoized if it's a list item rendered many times
- [ ] No hardcoded colors or sizes

## Example Usage

User: "Create a new modal for viewing user profiles"

Claude should:
1. Create `components/UserProfileModal.tsx`
2. Define `UserProfileModalProps` interface
3. Implement mobile (bottom sheet) and desktop (centered modal) layouts
4. Add state and render in `App.tsx`
5. Export from component file

---
Created: 2025-12-25
Version: 1.0
Author: Claude Code Analysis
