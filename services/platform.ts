/**
 * Platform Abstraction Layer
 *
 * Provides unified APIs across Electron, Capacitor (iOS/Android), and Web.
 * Import this instead of accessing window.electronAPI directly.
 *
 * Web-safe: Capacitor modules are loaded conditionally to support pure browser deployments.
 */

// ============================================================================
// Capacitor Detection & Lazy Loading
// ============================================================================

// Check if Capacitor is available (without importing it)
const hasCapacitor = typeof window !== 'undefined' &&
                     !!(window as any).Capacitor &&
                     typeof (window as any).Capacitor.isNativePlatform === 'function';

// Safely check if running in native platform
const isNativePlatform = hasCapacitor ? (window as any).Capacitor.isNativePlatform() : false;
const capacitorPlatform = hasCapacitor ? (window as any).Capacitor.getPlatform() : 'web';

// Lazy-loaded Capacitor modules (only loaded when actually used on native platforms)
let CapacitorClipboard: any = null;
let CapacitorHaptics: any = null;
let CapacitorApp: any = null;
let CapacitorStatusBar: any = null;

// Load Capacitor modules only when needed and on native platforms
const loadCapacitorModules = async () => {
  if (!isNativePlatform) return;

  try {
    const [clipboard, haptics, app, statusBar] = await Promise.all([
      import('@capacitor/clipboard'),
      import('@capacitor/haptics'),
      import('@capacitor/app'),
      import('@capacitor/status-bar')
    ]);
    CapacitorClipboard = clipboard.Clipboard;
    CapacitorHaptics = { Haptics: haptics.Haptics, ImpactStyle: haptics.ImpactStyle };
    CapacitorApp = app.App;
    CapacitorStatusBar = { StatusBar: statusBar.StatusBar, Style: statusBar.Style };
  } catch (e) {
    console.warn('[Platform] Failed to load Capacitor modules:', e);
  }
};

// Initialize Capacitor modules on native platforms
if (isNativePlatform) {
  loadCapacitorModules();
}

// ============================================================================
// Platform Detection
// ============================================================================

// Detect mobile web browser via user agent (for responsive behavior)
const isMobileUserAgent = typeof navigator !== 'undefined' &&
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// Also check for touch support as a fallback
const hasTouchScreen = typeof window !== 'undefined' &&
  ('ontouchstart' in window || navigator.maxTouchPoints > 0);

// Consider it a mobile device if either native platform OR mobile browser
const isMobileDevice = isNativePlatform || (isMobileUserAgent && hasTouchScreen);

export const Platform = {
  /** Running in Electron desktop app */
  isElectron: typeof window !== 'undefined' && !!(window as any).electronAPI,

  /** Running in Capacitor mobile app */
  isCapacitor: isNativePlatform,

  /** Running in a web browser (not Electron or Capacitor) */
  isWeb: typeof window !== 'undefined' &&
         !(window as any).electronAPI &&
         !isNativePlatform,

  /** Running on iOS (Capacitor native app) */
  isIOS: capacitorPlatform === 'ios',

  /** Running on Android (Capacitor native app) */
  isAndroid: capacitorPlatform === 'android',

  /** Running on any mobile platform (native or mobile web browser) */
  isMobile: isMobileDevice,

  /** Running on native mobile only (Capacitor) */
  isMobileNative: isNativePlatform,

  /** Running on mobile web browser (not native app) */
  isMobileWeb: !isNativePlatform && isMobileUserAgent && hasTouchScreen,

  /** Running on desktop (Electron or web on desktop browser) */
  isDesktop: !isMobileDevice,

  /** Get the current platform name */
  getName(): 'electron' | 'ios' | 'android' | 'web' | 'mobile-web' {
    if ((window as any).electronAPI) return 'electron';
    if (capacitorPlatform === 'ios') return 'ios';
    if (capacitorPlatform === 'android') return 'android';
    if (isMobileUserAgent && hasTouchScreen) return 'mobile-web';
    return 'web';
  }
};

// ============================================================================
// Clipboard
// ============================================================================

export const ClipboardService = {
  async write(text: string): Promise<void> {
    if (Platform.isElectron) {
      (window as any).electronAPI.copyToClipboard(text);
    } else if (Platform.isCapacitor && CapacitorClipboard) {
      await CapacitorClipboard.write({ string: text });
    } else {
      // Web fallback
      await navigator.clipboard.writeText(text);
    }
  },

  async read(): Promise<string> {
    if (Platform.isCapacitor && CapacitorClipboard) {
      const result = await CapacitorClipboard.read();
      return result.value;
    } else {
      // Web/Electron
      return await navigator.clipboard.readText();
    }
  }
};

// ============================================================================
// Logging
// ============================================================================

export const LogService = {
  log(type: 'info' | 'error' | 'webrtc' | 'debug', message: string): void {
    // Console log always
    const prefix = `[${type.toUpperCase()}]`;
    if (type === 'error') {
      console.error(prefix, message);
    } else {
      console.log(prefix, message);
    }

    // File logging in Electron
    if (Platform.isElectron && (window as any).electronAPI?.logToFile) {
      (window as any).electronAPI.logToFile(`${prefix} ${message}`);
    }
  }
};

// ============================================================================
// External Links
// ============================================================================

export const LinkService = {
  openExternal(url: string): void {
    if (Platform.isElectron) {
      (window as any).electronAPI.openExternal(url);
    } else {
      // Capacitor and Web - open in new tab/browser
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }
};

// ============================================================================
// App Updates (Electron only)
// ============================================================================

export const UpdateService = {
  /** Check if updates are supported on this platform */
  isSupported: Platform.isElectron,

  downloadUpdate(): void {
    if (Platform.isElectron) {
      (window as any).electronAPI.downloadUpdate();
    }
  },

  installUpdate(): void {
    if (Platform.isElectron) {
      (window as any).electronAPI.installUpdate();
    }
  },

  onUpdateAvailable(callback: (data: any) => void): void {
    if (Platform.isElectron) {
      (window as any).electronAPI.onUpdateAvailable(callback);
    }
  },

  onUpdateProgress(callback: (data: any) => void): void {
    if (Platform.isElectron) {
      (window as any).electronAPI.onUpdateDownloadProgress(callback);
    }
  },

  onUpdateDownloaded(callback: (data: any) => void): void {
    if (Platform.isElectron) {
      (window as any).electronAPI.onUpdateDownloaded(callback);
    }
  },

  onUpdateError(callback: (message: string) => void): void {
    if (Platform.isElectron) {
      (window as any).electronAPI.onUpdateError(callback);
    }
  }
};

// ============================================================================
// Screen Sharing (Electron only - not available on mobile)
// ============================================================================

export const ScreenShareService = {
  /** Check if screen sharing is supported on this platform */
  isSupported: Platform.isElectron,

  async getSources(): Promise<Array<{ id: string; name: string; thumbnail: string }> | null> {
    if (Platform.isElectron) {
      return await (window as any).electronAPI.getDesktopSources();
    }
    return null;
  }
};

// ============================================================================
// Window Management
// ============================================================================

export const WindowService = {
  showWindow(): void {
    if (Platform.isElectron) {
      (window as any).electronAPI.showWindow();
    }
  }
};

// ============================================================================
// Haptics (Mobile only)
// ============================================================================

export const HapticsService = {
  /** Check if haptics are supported */
  isSupported: Platform.isCapacitor,

  async impact(style: 'light' | 'medium' | 'heavy' = 'medium'): Promise<void> {
    if (!Platform.isCapacitor || !CapacitorHaptics) return;

    const { Haptics, ImpactStyle } = CapacitorHaptics;
    const styleMap = {
      light: ImpactStyle.Light,
      medium: ImpactStyle.Medium,
      heavy: ImpactStyle.Heavy
    };

    await Haptics.impact({ style: styleMap[style] });
  },

  async vibrate(): Promise<void> {
    if (!Platform.isCapacitor || !CapacitorHaptics) return;
    await CapacitorHaptics.Haptics.vibrate();
  },

  async notification(type: 'success' | 'warning' | 'error' = 'success'): Promise<void> {
    if (!Platform.isCapacitor || !CapacitorHaptics) return;
    await CapacitorHaptics.Haptics.notification({ type: type as any });
  }
};

// ============================================================================
// Status Bar (Mobile only)
// ============================================================================

export const StatusBarService = {
  isSupported: Platform.isCapacitor,

  async setDarkStyle(): Promise<void> {
    if (!Platform.isCapacitor || !CapacitorStatusBar) return;
    const { StatusBar, Style } = CapacitorStatusBar;
    await StatusBar.setStyle({ style: Style.Dark });
  },

  async hide(): Promise<void> {
    if (!Platform.isCapacitor || !CapacitorStatusBar) return;
    await CapacitorStatusBar.StatusBar.hide();
  },

  async show(): Promise<void> {
    if (!Platform.isCapacitor || !CapacitorStatusBar) return;
    await CapacitorStatusBar.StatusBar.show();
  }
};

// ============================================================================
// App Lifecycle (Mobile)
// ============================================================================

export const AppLifecycleService = {
  onBackButton(callback: () => void): void {
    if (Platform.isCapacitor && CapacitorApp) {
      CapacitorApp.addListener('backButton', callback);
    }
  },

  onAppStateChange(callback: (state: { isActive: boolean }) => void): void {
    if (Platform.isCapacitor && CapacitorApp) {
      CapacitorApp.addListener('appStateChange', callback);
    }
  },

  async exitApp(): Promise<void> {
    if (Platform.isCapacitor && CapacitorApp) {
      await CapacitorApp.exitApp();
    }
  }
};
