import React, { useEffect, useRef, useState } from 'react';
import { ConnectionState } from '../types';

interface VoiceStageProps {
  myStream: MediaStream | null;
  remoteStream: MediaStream | null;
  connectionState: ConnectionState;
  onToggleVideo: () => void;
  onToggleAudio: () => void;
  onShareScreen: () => void;
  onConnect: (remoteId: string) => void;
  onDisconnect: () => void;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isScreenSharing: boolean;
  myPeerId: string | null;
}

export const VoiceStage: React.FC<VoiceStageProps> = ({
  myStream,
  remoteStream,
  connectionState,
  onToggleVideo,
  onToggleAudio,
  onShareScreen,
  onConnect,
  onDisconnect,
  isVideoEnabled,
  isAudioEnabled,
  isScreenSharing,
  myPeerId
}) => {
  const myVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [remoteIdInput, setRemoteIdInput] = useState('');

  // Effect to attach streams to video elements
  useEffect(() => {
    if (myVideoRef.current && myStream) {
      myVideoRef.current.srcObject = myStream;
    }
  }, [myStream, isScreenSharing]); // Re-run if screen sharing changes the stream track

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const handleConnectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (remoteIdInput.trim()) {
        onConnect(remoteIdInput.trim());
    }
  };

  return (
    <div className="flex-1 bg-black flex flex-col relative overflow-hidden">
      
      {/* Main Stage Grid */}
      <div className="flex-1 p-4 grid grid-cols-1 md:grid-cols-2 gap-4 items-center justify-center">
        
        {/* Connection Overlay if disconnected */}
        {connectionState === ConnectionState.DISCONNECTED && (
             <div className="absolute inset-0 z-50 bg-discord-main/90 flex items-center justify-center p-4">
                 <div className="bg-discord-dark p-6 rounded-lg shadow-2xl max-w-md w-full border border-discord-sidebar">
                      <div className="text-center mb-6">
                         <div className="w-16 h-16 bg-discord-accent rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                             <i className="fas fa-satellite-dish text-3xl text-white"></i>
                         </div>
                         <h2 className="text-2xl font-bold text-white">Secure Link</h2>
                         <p className="text-discord-muted text-sm mt-1">Direct P2P Encrypted Connection</p>
                      </div>

                      {/* Step 1: My ID */}
                      <div className="mb-6 bg-black/20 p-3 rounded border border-white/5">
                         <label className="block text-[10px] font-bold text-discord-muted uppercase mb-2 tracking-wide">
                             Step 1: Your Peer ID
                         </label>
                         <div className="flex gap-2">
                             <div className="flex-1 bg-discord-main border border-black/20 rounded px-3 py-2 text-white font-mono text-sm truncate select-all">
                                 {myPeerId || 'Generating secure ID...'}
                             </div>
                             <button 
                                 onClick={() => {
                                     if(myPeerId) {
                                         navigator.clipboard.writeText(myPeerId); 
                                         alert("ID Copied! Send this to your friend.");
                                     }
                                 }}
                                 className="bg-discord-main hover:bg-discord-sidebar text-white px-3 rounded border border-black/20 transition-colors"
                                 title="Copy to Clipboard"
                             >
                                 <i className="fas fa-copy"></i>
                             </button>
                         </div>
                         <p className="text-[10px] text-discord-muted mt-2">
                             Share this code with your friend so they can call you.
                         </p>
                      </div>

                     <div className="relative flex py-2 items-center mb-6">
                         <div className="flex-grow border-t border-discord-sidebar"></div>
                         <span className="flex-shrink-0 mx-4 text-discord-muted text-[10px] uppercase font-bold">OR Call Them</span>
                         <div className="flex-grow border-t border-discord-sidebar"></div>
                     </div>

                      {/* Step 2: Input Friend ID */}
                      <form onSubmit={handleConnectSubmit}>
                          <div className="mb-4">
                              <label className="block text-[10px] font-bold text-discord-muted uppercase mb-2 tracking-wide">
                                 Step 2: Friend's Peer ID
                              </label>
                              <input 
                                 type="text" 
                                 value={remoteIdInput}
                                 onChange={(e) => setRemoteIdInput(e.target.value)}
                                 className="w-full bg-discord-main border border-black/20 rounded px-3 py-2 text-white outline-none focus:border-discord-accent placeholder-discord-muted/50 font-mono text-sm transition-all focus:ring-1 ring-discord-accent"
                                 placeholder="Paste friend's ID here..."
                              />
                          </div>
                          <button 
                             type="submit"
                             disabled={!remoteIdInput.trim()}
                             className={`w-full font-bold py-2.5 rounded transition-all shadow-lg flex items-center justify-center ${remoteIdInput.trim() ? 'bg-discord-green hover:bg-green-600 text-white cursor-pointer' : 'bg-discord-sidebar text-discord-muted cursor-not-allowed'}`}
                          >
                             <i className="fas fa-phone-alt mr-2"></i> Connect
                          </button>
                      </form>
                 </div>
             </div>
        )}

        {/* Connecting State */}
        {connectionState === ConnectionState.CONNECTING && (
            <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center flex-col">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-discord-accent mb-4"></div>
                <span className="text-white font-bold">Establishing Secure P2P Connection...</span>
            </div>
        )}

        {/* My Video Tile */}
        <div className="relative aspect-video bg-discord-dark rounded-lg overflow-hidden shadow-lg border border-discord-sidebar group">
           {isVideoEnabled || isScreenSharing ? (
              <video 
                ref={myVideoRef} 
                autoPlay 
                playsInline 
                muted 
                className="w-full h-full object-cover transform"
                style={{ transform: isScreenSharing ? 'none' : 'scaleX(-1)' }}
              />
           ) : (
              <div className="w-full h-full flex items-center justify-center">
                  <div className="w-24 h-24 rounded-full bg-discord-accent flex items-center justify-center">
                      <i className="fas fa-user text-4xl text-white"></i>
                  </div>
              </div>
           )}
           <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-white text-sm font-bold flex items-center">
               You {isScreenSharing && '(Screen)'}
               {!isAudioEnabled && <i className="fas fa-microphone-slash ml-2 text-red-500 text-xs"></i>}
           </div>
        </div>

        {/* Remote Video Tile */}
        {connectionState === ConnectionState.CONNECTED && (
          <div className="relative aspect-video bg-discord-dark rounded-lg overflow-hidden shadow-lg border border-discord-sidebar">
             {remoteStream && remoteStream.getVideoTracks().length > 0 ? (
                <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
             ) : (
                <div className="w-full h-full flex items-center justify-center animate-pulse">
                    <div className="w-24 h-24 rounded-full bg-green-600 flex items-center justify-center">
                        <i className="fas fa-user text-4xl text-white"></i>
                    </div>
                </div>
             )}
             <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-white text-sm font-bold">
                 Friend
             </div>
          </div>
        )}
      </div>

      {/* Control Bar */}
      <div className="h-20 bg-discord-dark flex items-center justify-center space-x-4 border-t border-discord-sidebar shrink-0 relative z-50">
          <button 
             onClick={onToggleAudio}
             className={`w-14 h-14 rounded-full flex items-center justify-center text-xl transition-all ${isAudioEnabled ? 'bg-discord-main text-white hover:bg-discord-hover' : 'bg-white text-black'}`}
          >
             <i className={`fas ${isAudioEnabled ? 'fa-microphone' : 'fa-microphone-slash'}`}></i>
          </button>
          
          <button 
             onClick={onToggleVideo}
             className={`w-14 h-14 rounded-full flex items-center justify-center text-xl transition-all ${isVideoEnabled ? 'bg-discord-main text-white hover:bg-discord-hover' : 'bg-white text-black'}`}
          >
             <i className={`fas ${isVideoEnabled ? 'fa-video' : 'fa-video-slash'}`}></i>
          </button>

          <button 
             onClick={onShareScreen}
             className={`w-14 h-14 rounded-full flex items-center justify-center text-xl transition-all ${isScreenSharing ? 'bg-green-500 text-white' : 'bg-discord-main text-white hover:bg-discord-hover'}`}
             title="Share Screen"
          >
             <i className="fas fa-desktop"></i>
          </button>

          <button 
             onClick={onDisconnect}
             className="w-14 h-14 rounded-full flex items-center justify-center text-xl bg-red-500 text-white hover:bg-red-600 transition-all"
          >
             <i className="fas fa-phone-slash"></i>
          </button>
      </div>
    </div>
  );
};