import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pisscord.app',
  appName: 'Pisscord',
  webDir: 'dist',
  server: {
    // For development, enable this to connect to your local dev server:
    // url: 'http://YOUR_LOCAL_IP:5173',
    // cleartext: true,
    androidScheme: 'https',
  },
  plugins: {
    // Status bar configuration
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#202225',
    },
    // Clipboard plugin (no config needed)
    Clipboard: {},
    // Haptics plugin (no config needed)
    Haptics: {},
    // App lifecycle plugin
    App: {
      // URL scheme for deep linking (optional)
      // appUrlOpen: 'pisscord://'
    },
  },
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    // Scheme for serving content
    scheme: 'pisscord',
    // Background modes (for audio)
    // Note: These are just reminders - actual config is in Xcode
    // - audio (for voice calls)
    // - voip (for incoming calls)
  },
  android: {
    allowMixedContent: true, // Allow WebRTC
    // Flavor for build variants (optional)
    // flavor: 'production',
    // Background color while loading
    backgroundColor: '#202225',
    // WebView settings for better WebRTC support
    webContentsDebuggingEnabled: false, // Set to true for debugging
  },
};

export default config;
