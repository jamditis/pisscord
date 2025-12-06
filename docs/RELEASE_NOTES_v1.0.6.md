# Pisscord v1.0.6 Release Notes

**Release Date:** December 6, 2025

## What's New

### Screen Sharing Source Picker
You can now choose which screen or application window to share! When you click "Share Screen" during a call, a new picker modal appears showing:
- All available monitors (Screen 1, Screen 2, etc.)
- Individual application windows with live thumbnails
- Easy-to-click selection interface

### Improved Clipboard Support
The "Copy ID" button now works reliably across all scenarios. Your peer ID is copied to the clipboard with a single click.

## Bug Fixes

### Fixed: Screen Sharing Not Working
- **Issue:** Screen sharing would fail silently or not capture the correct source
- **Cause:** Electron 30+ moved `desktopCapturer` to main process only for security
- **Solution:** Implemented IPC communication between renderer and main process for screen capture

### Fixed: Copy ID Button Not Working
- **Issue:** Clicking "Copy ID" did nothing
- **Cause:** Clipboard API not accessible from renderer with `contextIsolation: true`
- **Solution:** Added IPC handler for clipboard operations

### Fixed: Text Cursor Not Visible
- **Issue:** When typing in text fields, the cursor (caret) was invisible
- **Solution:** Added CSS to ensure white caret color in all input fields

## Known Limitations

### Windows Capture Restrictions
Some application windows cannot be captured on Windows due to OS-level restrictions:
- Windows using hardware acceleration (browsers, some games)
- Windows with DRM/protected content
- Certain system windows (Razer software, etc.)

**Workaround:** Use "Entire Screen" sharing instead of individual window sharing for maximum compatibility.

## Technical Changes

### New Files
- `components/ScreenPickerModal.tsx` - New UI component for source selection

### Modified Files
- `electron.js` - Added IPC handlers for `get-desktop-sources` and `copy-to-clipboard`
- `preload.js` - Updated to use IPC instead of direct module access
- `App.tsx` - Refactored screen sharing logic, added picker modal integration
- `components/VoiceStage.tsx` - Updated copy button to use new clipboard API
- `types.ts` - Added `copyToClipboard` to electronAPI interface
- `index.html` - Added CSS for cursor visibility

### Architecture Notes
In Electron 30+, certain APIs (`desktopCapturer`, `clipboard`) are no longer available in preload scripts when using `contextIsolation: true`. All such APIs now go through IPC handlers in the main process, with the preload script exposing thin wrappers via `contextBridge`.

## Upgrade Instructions

1. Download `Pisscord Setup 1.0.6.exe`
2. Run the installer (it will update your existing installation)
3. Launch Pisscord

## Full Changelog

```
v1.0.6: Fix screen sharing, add source picker, improve clipboard

Features:
- Add screen source picker modal for selecting which screen/window to share
- Screen sharing now shows all available screens and application windows
- Improved error messages for uncapturable windows (Windows limitation)

Fixes:
- Fix screen sharing by moving desktopCapturer to main process via IPC
- Fix clipboard copy by using IPC to main process
- Fix text cursor visibility in input fields (white caret)
- Copy ID button now works reliably in Electron

Technical:
- Add ScreenPickerModal.tsx component
- Add IPC handlers for get-desktop-sources and copy-to-clipboard
- Update preload.js to use IPC instead of direct module access
- Add copyToClipboard to electronAPI interface
```
