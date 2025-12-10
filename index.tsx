import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { AuthGate } from './components/AuthGate';
import { Platform, StatusBarService, AppLifecycleService } from './services/platform';

// Initialize mobile-specific features
const initializeMobile = async () => {
  if (Platform.isMobile) {
    // Set dark status bar to match app theme
    await StatusBarService.setDarkStyle();

    // Handle Android back button
    if (Platform.isAndroid) {
      AppLifecycleService.onBackButton(() => {
        // Default behavior: let the app handle navigation
        // Could be customized to show a confirm dialog before exit
        console.log('[Mobile] Back button pressed');
      });
    }

    // Handle app going to background/foreground
    AppLifecycleService.onAppStateChange((state) => {
      console.log('[Mobile] App state changed:', state.isActive ? 'foreground' : 'background');
      // Could pause/resume audio, update presence, etc.
    });

    console.log(`[Mobile] Initialized on ${Platform.getName()}`);
  }
};

// Initialize mobile features before rendering
initializeMobile().catch(console.error);

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AuthProvider>
      <AuthGate>
        <App />
      </AuthGate>
    </AuthProvider>
  </React.StrictMode>
);
