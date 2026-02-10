import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { AuthGate } from './components/AuthGate';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Platform, StatusBarService, AppLifecycleService } from './services/platform';
import { logger } from './services/logger';

// Global error handlers — catch errors outside React's lifecycle
window.onerror = (message, source, lineno, colno, error) => {
  logger.error('global', `Unhandled error: ${message} at ${source}:${lineno}:${colno}`);
  if (error?.stack) {
    logger.error('global', `Stack: ${error.stack}`);
  }
};

window.onunhandledrejection = (event: PromiseRejectionEvent) => {
  const reason = event.reason;
  const message = reason instanceof Error ? reason.message : String(reason);
  logger.error('global', `Unhandled promise rejection: ${message}`);
};

// Initialize mobile-specific features
const initializeMobile = async () => {
  if (Platform.isMobile) {
    await StatusBarService.setDarkStyle();

    if (Platform.isAndroid) {
      AppLifecycleService.onBackButton(() => {
        logger.debug('mobile', 'Back button pressed');
      });
    }

    AppLifecycleService.onAppStateChange((state) => {
      logger.debug('mobile', `App state changed: ${state.isActive ? 'foreground' : 'background'}`);
    });

    logger.info('mobile', `Initialized on ${Platform.getName()}`);
  }
};

initializeMobile().catch(err => {
  logger.error('mobile', `Mobile init failed: ${err.message}`);
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <AuthGate>
          <App />
        </AuthGate>
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
