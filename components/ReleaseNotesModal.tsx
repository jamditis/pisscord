import React from 'react';
import { Platform, UpdateService, LinkService } from '../services/platform';
import { useTheme } from '../contexts/ThemeContext';

interface ReleaseNotesModalProps {
  version: string;
  releaseNotes: string;
  downloadUrl?: string;
  onDismiss: () => void;
}

const STORAGE_KEY = 'pisscord_last_seen_version';

/**
 * Check if release notes should be shown for this version
 */
export function shouldShowReleaseNotes(currentVersion: string): boolean {
  try {
    const lastSeen = localStorage.getItem(STORAGE_KEY);
    return lastSeen !== currentVersion;
  } catch {
    return true;
  }
}

/**
 * Mark the current version as seen (don't show again)
 */
export function markVersionAsSeen(version: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, version);
  } catch (error) {
    console.error('[ReleaseNotes] Failed to save version:', error);
  }
}

export const ReleaseNotesModal: React.FC<ReleaseNotesModalProps> = ({
  version,
  releaseNotes,
  downloadUrl,
  onDismiss
}) => {
  const { colors, theme } = useTheme();
  const isWebBrowser = Platform.isWeb || Platform.isMobileWeb;
  const supportsAutoUpdate = UpdateService.isSupported;

  const handleUpdate = () => {
    if (supportsAutoUpdate) {
      // Electron auto-update
      UpdateService.downloadUpdate();
      onDismiss();
    } else if (isWebBrowser) {
      // Web - just refresh
      window.location.reload();
    } else if (downloadUrl) {
      // Mobile or other - open download link
      LinkService.openExternal(downloadUrl);
      onDismiss();
    }
  };

  const handleDismiss = () => {
    markVersionAsSeen(version);
    onDismiss();
  };

  // Parse release notes (simple markdown-like formatting)
  const formatReleaseNotes = (notes: string) => {
    if (!notes) return [<p key="empty" className="text-discord-muted">No release notes available.</p>];
    const lines = notes.split('\n');
    return lines.map((line, index) => {
      // Headers
      if (line.startsWith('### ')) {
        return (
          <h4 key={index} className="text-white font-bold mt-3 mb-1 text-sm">
            {line.replace('### ', '')}
          </h4>
        );
      }
      if (line.startsWith('## ')) {
        return (
          <h3 key={index} className="font-bold mt-4 mb-2" style={{ color: colors.primary }}>
            {line.replace('## ', '')}
          </h3>
        );
      }
      // Bullet points
      if (line.startsWith('- ')) {
        return (
          <li key={index} className="text-discord-text text-sm ml-4 mb-1">
            {line.replace('- ', '')}
          </li>
        );
      }
      // Empty lines
      if (line.trim() === '') {
        return <div key={index} className="h-2" />;
      }
      // Regular text
      return (
        <p key={index} className="text-discord-muted text-sm">
          {line}
        </p>
      );
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div
        className="w-full max-w-lg rounded-lg shadow-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #2f3136 0%, #202225 100%)',
          border: `1px solid ${colors.primary}40`
        }}
      >
        {/* Header */}
        <div
          className="p-4 flex items-center justify-between"
          style={{ background: `linear-gradient(135deg, ${colors.primary}30, transparent)` }}
        >
          <div className="flex items-center">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center mr-3"
              style={{ background: colors.primary }}
            >
              <i className="fas fa-rocket text-white text-lg"></i>
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">What's New</h2>
              <p className="text-discord-muted text-xs">Version {version}</p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-discord-muted hover:text-white transition-colors p-2"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          <div className="prose prose-sm prose-invert">
            {formatReleaseNotes(releaseNotes)}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-discord-dark flex flex-col gap-3">
          {/* Primary action */}
          <button
            onClick={handleUpdate}
            className="w-full py-3 rounded font-bold text-white transition-all flex items-center justify-center hover:opacity-90"
            style={{ background: colors.primary }}
          >
            <i className={`fas ${isWebBrowser ? 'fa-sync-alt' : 'fa-download'} mr-2`}></i>
            {supportsAutoUpdate
              ? 'Update Now'
              : isWebBrowser
              ? 'Refresh to Update'
              : 'Download Update'}
          </button>

          {/* Direct download link for Electron */}
          {supportsAutoUpdate && downloadUrl && (
            <button
              onClick={() => {
                LinkService.openExternal(downloadUrl);
              }}
              className="w-full py-2 rounded text-discord-muted hover:text-white text-sm transition-all flex items-center justify-center"
            >
              <i className="fas fa-external-link-alt mr-2"></i>
              Manual Download
            </button>
          )}

          {/* Dismiss */}
          <button
            onClick={handleDismiss}
            className="text-discord-muted hover:text-white text-xs transition-colors"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
};
