import React from 'react';

interface ScreenSource {
  id: string;
  name: string;
  thumbnail: string;
}

interface ScreenPickerModalProps {
  sources: ScreenSource[];
  onSelect: (source: ScreenSource) => void;
  onClose: () => void;
}

export const ScreenPickerModal: React.FC<ScreenPickerModalProps> = ({
  sources,
  onSelect,
  onClose
}) => {
  // Separate screens and windows
  const screens = sources.filter(s => s.id.startsWith('screen:'));
  const windows = sources.filter(s => s.id.startsWith('window:'));

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-discord-main w-full max-w-2xl max-h-[80vh] rounded-lg shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-discord-dark flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Choose what to share</h2>
          <button
            onClick={onClose}
            className="text-discord-muted hover:text-white p-1"
          >
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Screens Section */}
          {screens.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-bold text-discord-muted uppercase mb-3">
                <i className="fas fa-desktop mr-2"></i>
                Entire Screen
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {screens.map(source => (
                  <button
                    key={source.id}
                    onClick={() => onSelect(source)}
                    className="bg-discord-dark rounded-lg p-3 hover:bg-discord-hover border-2 border-transparent hover:border-discord-accent transition-all group text-left"
                  >
                    <div className="aspect-video bg-black rounded overflow-hidden mb-2">
                      <img
                        src={source.thumbnail}
                        alt={source.name}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <p className="text-white text-sm font-medium truncate group-hover:text-discord-accent">
                      {source.name}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Windows Section */}
          {windows.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-discord-muted uppercase mb-3">
                <i className="fas fa-window-maximize mr-2"></i>
                Application Window
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {windows.map(source => (
                  <button
                    key={source.id}
                    onClick={() => onSelect(source)}
                    className="bg-discord-dark rounded-lg p-3 hover:bg-discord-hover border-2 border-transparent hover:border-discord-accent transition-all group text-left"
                  >
                    <div className="aspect-video bg-black rounded overflow-hidden mb-2">
                      <img
                        src={source.thumbnail}
                        alt={source.name}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <p className="text-white text-xs font-medium truncate group-hover:text-discord-accent">
                      {source.name}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {sources.length === 0 && (
            <div className="text-center py-8 text-discord-muted">
              <i className="fas fa-exclamation-circle text-4xl mb-3"></i>
              <p>No screen sources available</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-discord-dark">
          <button
            onClick={onClose}
            className="w-full bg-discord-dark hover:bg-discord-hover text-white py-2 rounded font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
