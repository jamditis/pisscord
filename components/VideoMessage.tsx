import React from 'react';

interface VideoMessageProps {
  url: string;
  name: string;
  size?: number;
}

const formatFileSize = (bytes?: number): string => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

const getFileExtension = (fileName: string): string => {
  const parts = fileName.split('.');
  if (parts.length < 2) return 'VIDEO';
  return parts[parts.length - 1].toUpperCase();
};

export const VideoMessage: React.FC<VideoMessageProps> = ({ url, name, size }) => {
  return (
    <div className="w-full max-w-full sm:max-w-lg">
      <div className="bg-discord-dark/60 rounded-lg overflow-hidden border border-discord-dark">
        <video
          controls
          preload="metadata"
          playsInline
          className="w-full max-h-80 bg-black"
        >
          <source src={url} />
        </video>

        {/* File info bar */}
        <div className="flex items-center px-3 py-2 gap-2">
          <div className="w-8 h-8 rounded bg-purple-500/20 flex items-center justify-center shrink-0">
            <span className="text-[9px] font-bold text-purple-400">{getFileExtension(name)}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm text-discord-link font-medium truncate" title={name}>
              {name}
            </div>
            {size && (
              <div className="text-[10px] text-discord-muted">
                {formatFileSize(size)}
              </div>
            )}
          </div>
          <a
            href={url}
            download={name}
            className="p-2 rounded hover:bg-discord-hover text-discord-muted hover:text-white transition-colors shrink-0"
            title="Download"
          >
            <i className="fas fa-download text-xs" />
          </a>
        </div>
      </div>
    </div>
  );
};
