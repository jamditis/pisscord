import React from 'react';
import { logger } from '../services/logger';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    logger.error('ErrorBoundary', `${error.name}: ${error.message}`);
    if (errorInfo.componentStack) {
      logger.error('ErrorBoundary', `Component stack: ${errorInfo.componentStack}`);
    }
  }

  handleReload = (): void => {
    window.location.reload();
  };

  handleClearAndReload = (): void => {
    // Clear potentially corrupt localStorage data that could cause crash loops
    try {
      localStorage.removeItem('pisscord_profile');
      localStorage.removeItem('pisscord_devices');
      localStorage.removeItem('pisscord_app_settings');
      localStorage.removeItem('pisscord_unread');
    } catch {
      // localStorage itself might be broken — that's fine, just reload
    }
    window.location.reload();
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: '#0a0a0f',
          color: '#e0e0e0',
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          padding: '2rem',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>:/</div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: '#ff6b6b' }}>
            Something broke
          </h1>
          <p style={{ color: '#888', marginBottom: '1.5rem', maxWidth: '500px', lineHeight: '1.6' }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={this.handleReload}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#5865F2',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.9rem',
              }}
            >
              Reload
            </button>
            <button
              onClick={this.handleClearAndReload}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'transparent',
                color: '#888',
                border: '1px solid #333',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.9rem',
              }}
            >
              Clear data & reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
