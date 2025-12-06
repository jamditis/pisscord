import React from 'react';

interface UpdateModalProps {
  latestVersion: string;
  downloadUrl: string;
  onClose: () => void;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({ latestVersion, downloadUrl, onClose }) => {
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
            
            <h3 className="text-white text-xl font-bold mb-2">Version {latestVersion} is out!</h3>
            <p className="text-discord-muted text-sm mb-6">
                A new version of Pisscord is available. Please download and install it to ensure you can connect with your friends.
            </p>

            <div className="flex flex-col gap-3">
                <a 
                    href={downloadUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="bg-discord-green hover:bg-green-600 text-white font-bold py-3 rounded transition-all flex items-center justify-center"
                >
                    <i className="fas fa-download mr-2"></i> Download Update
                </a>
                <button 
                    onClick={onClose}
                    className="text-discord-muted hover:text-discord-text text-xs"
                >
                    Remind me later
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};