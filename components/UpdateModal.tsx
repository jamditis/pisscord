import React from 'react';
import { Platform, UpdateService, LinkService } from '../services/platform';

interface UpdateModalProps {
  latestVersion: string;
  downloadUrl: string;
  downloading?: boolean;
  progress?: number;
  ready?: boolean;
  onClose: () => void;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({
  latestVersion,
  downloadUrl,
  downloading = false,
  progress = 0,
  ready = false,
  onClose
}) => {
  // Only show auto-update UI on Electron, hide entirely on mobile
  const supportsAutoUpdate = UpdateService.isSupported;

  const handleDownload = () => {
    if (supportsAutoUpdate) {
      console.log('[UPDATE] User clicked download, calling UpdateService.downloadUpdate()');
      UpdateService.downloadUpdate();
    } else if (downloadUrl) {
      LinkService.openExternal(downloadUrl);
    }
  };

  // Fallback to manual download if auto-update fails - direct link to exe
  const handleManualDownload = () => {
    // Direct download URL to the .exe file (no need to navigate GitHub's confusing UI)
    const directDownloadUrl = `https://github.com/jamditis/pisscord/releases/download/v${latestVersion}/Pisscord.Setup.${latestVersion}.exe`;
    LinkService.openExternal(directDownloadUrl);
  };

  const handleInstall = () => {
    if (supportsAutoUpdate) {
      UpdateService.installUpdate();
    }
  };

  // Don't show update modal on mobile - updates come from app stores
  if (Platform.isMobile) {
    return null;
  }
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-discord-sidebar w-full max-w-md rounded-lg shadow-2xl border border-discord-green relative overflow-hidden">
        {/* Header */}
        <div className="bg-discord-green p-4 flex items-center justify-between">
            <h2 className="text-white font-bold text-lg flex items-center">
                <i className="fas fa-arrow-circle-up mr-2"></i> Update Available
            </h2>
            <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
                <i className="fas fa-times"></i>
            </button>
        </div>
        
        {/* Content */}
        <div className="p-6 text-center">
            <div className="w-20 h-20 bg-discord-main rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-rocket text-discord-green text-3xl"></i>
            </div>
            
            <h3 className="text-white text-xl font-bold mb-2">
              {ready ? 'Update Ready!' : `Version ${latestVersion} is out!`}
            </h3>
            <p className="text-discord-muted text-sm mb-6">
                {ready
                  ? 'Update has been downloaded. Restart Pisscord to install.'
                  : downloading
                  ? `Downloading update... ${progress}%`
                  : 'A new version of Pisscord is available. Download it now for the latest features and bug fixes.'}
            </p>

            {/* Progress Bar */}
            {downloading && (
              <div className="mb-4 bg-discord-dark rounded-full h-2 overflow-hidden">
                <div
                  className="bg-discord-green h-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            )}

            <div className="flex flex-col gap-3">
                {ready ? (
                  <button
                    onClick={handleInstall}
                    className="bg-discord-green hover:bg-green-600 text-white font-bold py-3 rounded transition-all flex items-center justify-center"
                  >
                    <i className="fas fa-sync-alt mr-2"></i> Restart & Install
                  </button>
                ) : downloading ? (
                  <button
                    disabled
                    className="bg-discord-main text-discord-muted font-bold py-3 rounded cursor-not-allowed flex items-center justify-center"
                  >
                    <i className="fas fa-spinner fa-spin mr-2"></i> Downloading...
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleDownload}
                      className="bg-discord-green hover:bg-green-600 text-white font-bold py-3 rounded transition-all flex items-center justify-center"
                    >
                      <i className="fas fa-download mr-2"></i>
                      {supportsAutoUpdate ? 'Download in Background' : 'Download Update'}
                    </button>
                    {supportsAutoUpdate && (
                      <button
                        onClick={handleManualDownload}
                        className="bg-discord-main hover:bg-discord-hover text-discord-text font-medium py-2 rounded transition-all flex items-center justify-center text-sm"
                      >
                        <i className="fas fa-external-link-alt mr-2"></i>
                        Manual Download (if auto-update fails)
                      </button>
                    )}
                  </>
                )}
                <button
                    onClick={onClose}
                    className="text-discord-muted hover:text-discord-text text-xs"
                >
                    {ready ? 'Install later' : 'Remind me later'}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};