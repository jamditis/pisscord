/**
 * Platform Abstraction Layer
 *
 * Provides unified APIs across Electron, Capacitor (iOS/Android), and Web.
 * Import this instead of accessing window.electronAPI directly.
 */

import { Capacitor } from '@capacitor/core';
import { Clipboard } from '@capacitor/clipboard';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';

// ============================================================================
// Platform Detection
// ============================================================================

export const Platform = {
  /** Running in Electron desktop app */
  isElectron: typeof window !== 'undefined' && !!(window as any).electronAPI,

  /** Running in Capacitor mobile app */
  isCapacitor: Capacitor.isNativePlatform(),

  /** Running in a web browser (not Electron or Capacitor) */
  isWeb: typeof window !== 'undefined' &&
         !(window as any).electronAPI &&
         !Capacitor.isNativePlatform(),

  /** Running on iOS (Capacitor) */
  isIOS: Capacitor.getPlatform() === 'ios',

  /** Running on Android (Capacitor) */
  isAndroid: Capacitor.getPlatform() === 'android',

  /** Running on any mobile platform */
  isMobile: Capacitor.isNativePlatform(),

  /** Running on desktop (Electron or web on desktop browser) */
  isDesktop: !Capacitor.isNativePlatform(),

  /** Get the current platform name */
  getName(): 'electron' | 'ios' | 'android' | 'web' {
    if ((window as any).electronAPI) return 'electron';
    if (Capacitor.getPlatform() === 'ios') return 'ios';
    if (Capacitor.getPlatform() === 'android') return 'android';
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
    } else if (Platform.isCapacitor) {
      await Clipboard.write({ string: text });
    } else {
      // Web fallback
      await navigator.clipboard.writeText(text);
    }
  },

  async read(): Promise<string> {
    if (Platform.isCapacitor) {
      const result = await Clipboard.read();
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
    if (!Platform.isCapacitor) return;

    const styleMap = {
      light: ImpactStyle.Light,
      medium: ImpactStyle.Medium,
      heavy: ImpactStyle.Heavy
    };

    await Haptics.impact({ style: styleMap[style] });
  },

  async vibrate(): Promise<void> {
    if (!Platform.isCapacitor) return;
    await Haptics.vibrate();
  },

  async notification(type: 'success' | 'warning' | 'error' = 'success'): Promise<void> {
    if (!Platform.isCapacitor) return;
    await Haptics.notification({ type: type as any });
  }
};

// ============================================================================
// Status Bar (Mobile only)
// ============================================================================

export const StatusBarService = {
  isSupported: Platform.isCapacitor,

  async setDarkStyle(): Promise<void> {
    if (!Platform.isCapacitor) return;
    await StatusBar.setStyle({ style: Style.Dark });
  },

  async hide(): Promise<void> {
    if (!Platform.isCapacitor) return;
    await StatusBar.hide();
  },

  async show(): Promise<void> {
    if (!Platform.isCapacitor) return;
    await StatusBar.show();
  }
};

// ============================================================================
// App Lifecycle (Mobile)
// ============================================================================

export const AppLifecycleService = {
  onBackButton(callback: () => void): void {
    if (Platform.isCapacitor) {
      App.addListener('backButton', callback);
    }
  },

  onAppStateChange(callback: (state: { isActive: boolean }) => void): void {
    if (Platform.isCapacitor) {
      App.addListener('appStateChange', callback);
    }
  },

  async exitApp(): Promise<void> {
    if (Platform.isCapacitor) {
      await App.exitApp();
    }
  }
};
