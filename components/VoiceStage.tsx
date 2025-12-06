import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ConnectionState, UserProfile, PresenceUser } from '../types';

interface VoiceStageProps {
  myStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
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
  userProfile: UserProfile;
  onlineUsers: PresenceUser[];
  onIdCopied?: () => void;
}

// Audio activity detection hook
const useAudioActivity = (stream: MediaStream | null, enabled: boolean = true) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!stream || !enabled) {
      setIsSpeaking(false);
      return;
    }

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      setIsSpeaking(false);
      return;
    }

    try {
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);

      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.5;
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const THRESHOLD = 20; // Adjust sensitivity

      const checkAudio = () => {
        if (!analyserRef.current) return;

        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;

        setIsSpeaking(average > THRESHOLD);
        animationFrameRef.current = requestAnimationFrame(checkAudio);
      };

      checkAudio();

      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }
      };
    } catch (err) {
      console.error('Audio activity detection error:', err);
    }
  }, [stream, enabled]);

  return isSpeaking;
};

export const VoiceStage: React.FC<VoiceStageProps> = ({
  myStream,
  remoteStreams,
  connectionState,
  onToggleVideo,
  onToggleAudio,
  onShareScreen,
  onConnect,
  onDisconnect,
  isVideoEnabled,
  isAudioEnabled,
  isScreenSharing,
  myPeerId,
  userProfile,
  onlineUsers,
  onIdCopied
}) => {
  const myVideoRef = useRef<HTMLVideoElement>(null);
  const [remoteIdInput, setRemoteIdInput] = useState('');

  // Spotlight state - null means grid view, peerId means that user is spotlighted, 'self' for local user
  const [spotlightedUser, setSpotlightedUser] = useState<string | null>(null);

  // Audio activity for local stream
  const isLocalSpeaking = useAudioActivity(myStream, isAudioEnabled);

  // Map to store refs for each remote video
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement | null>>(new Map());

  // Track speaking state for remote users
  const [remoteSpeaking, setRemoteSpeaking] = useState<Map<string, boolean>>(new Map());

  // Effect to attach local stream
  useEffect(() => {
    if (myVideoRef.current && myStream) {
      myVideoRef.current.srcObject = myStream;
    }
  }, [myStream, isScreenSharing, isVideoEnabled]);

  // Effect to attach remote streams
  useEffect(() => {
    remoteStreams.forEach((stream, peerId) => {
        const el = remoteVideoRefs.current.get(peerId);
        if (el && el.srcObject !== stream) {
            el.srcObject = stream;
        }
    });
  }, [remoteStreams]);

  // Effect to track audio activity for remote streams
  useEffect(() => {
    const audioContexts: Map<string, { ctx: AudioContext; animFrame: number }> = new Map();

    remoteStreams.forEach((stream, peerId) => {
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) return;

      try {
        const audioContext = new AudioContext();
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);

        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.5;
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const THRESHOLD = 15;

        const checkAudio = () => {
          analyser.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;

          setRemoteSpeaking(prev => {
            const newMap = new Map(prev);
            newMap.set(peerId, average > THRESHOLD);
            return newMap;
          });

          const animFrame = requestAnimationFrame(checkAudio);
          const existing = audioContexts.get(peerId);
          if (existing) {
            audioContexts.set(peerId, { ...existing, animFrame });
          }
        };

        const animFrame = requestAnimationFrame(checkAudio);
        audioContexts.set(peerId, { ctx: audioContext, animFrame });
      } catch (err) {
        console.error('Remote audio activity detection error:', err);
      }
    });

    return () => {
      audioContexts.forEach(({ ctx, animFrame }) => {
        cancelAnimationFrame(animFrame);
        ctx.close();
      });
    };
  }, [remoteStreams]);

  // Toggle spotlight
  const toggleSpotlight = (userId: string) => {
    setSpotlightedUser(prev => prev === userId ? null : userId);
  };

  const handleConnectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (remoteIdInput.trim()) {
        onConnect(remoteIdInput.trim());
    }
  };

  // Helper to get remote user profile
  const getRemoteUser = (peerId: string) => onlineUsers.find(u => u.peerId === peerId);

  // Calculate grid columns based on participant count (myself + remotes)
  const totalParticipants = 1 + remoteStreams.size;
  const getGridClass = () => {
      if (totalParticipants <= 1) return 'grid-cols-1';
      if (totalParticipants <= 2) return 'grid-cols-1 md:grid-cols-2';
      if (totalParticipants <= 4) return 'grid-cols-2 md:grid-cols-2';
      return 'grid-cols-2 md:grid-cols-3';
  };

  // Render a video tile (reusable component)
  const renderVideoTile = (
    userId: string,
    stream: MediaStream | null,
    user: { displayName: string; color: string; photoURL?: string } | undefined,
    isLocal: boolean,
    isSpeaking: boolean,
    isSpotlighted: boolean,
    hasVideo: boolean,
    isSmall: boolean = false
  ) => (
    <div
      onClick={() => toggleSpotlight(userId)}
      className={`relative bg-discord-dark rounded-lg overflow-hidden shadow-lg group cursor-pointer transition-all duration-300 border border-discord-sidebar ${
        isSmall ? 'w-40 h-24 shrink-0' : 'w-full h-full'
      }`}
      style={{
        boxShadow: isSpeaking ? '0 0 0 4px rgba(34, 197, 94, 0.75), 0 0 20px rgba(34, 197, 94, 0.3)' : undefined
      }}
    >
      {hasVideo ? (
        <video
          ref={el => {
            if (isLocal && myVideoRef.current !== el) {
              (myVideoRef as any).current = el;
            } else if (!isLocal && el) {
              remoteVideoRefs.current.set(userId, el);
            }
          }}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          style={{ transform: isLocal && !isScreenSharing ? 'scaleX(-1)' : 'none' }}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div
            className={`rounded-full flex items-center justify-center overflow-hidden ${isSmall ? 'w-12 h-12' : 'w-24 h-24'}`}
            style={{
              backgroundColor: user?.photoURL ? 'transparent' : (user?.color || '#5865F2'),
              boxShadow: isSpeaking ? '0 0 0 4px rgba(34, 197, 94, 0.75), 0 0 20px rgba(34, 197, 94, 0.3)' : undefined
            }}
          >
            {user?.photoURL ? (
              <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
            ) : (
              <i className={`fas fa-user text-white ${isSmall ? 'text-xl' : 'text-4xl'}`}></i>
            )}
          </div>
        </div>
      )}
      {isSpotlighted && (
        <div className="absolute top-2 right-2 bg-discord-accent px-2 py-1 rounded text-white text-xs font-bold flex items-center">
          <i className="fas fa-thumbtack mr-1"></i> Pinned
        </div>
      )}
      <div className="absolute top-2 left-2 bg-black/60 px-2 py-1 rounded text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity">
        <i className="fas fa-mouse-pointer mr-1"></i> {isSpotlighted ? 'Unpin' : 'Click to pin'}
      </div>
      <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-white text-sm font-bold flex items-center">
        {isLocal ? 'You' : (user?.displayName || userId.substring(0, 5) + '...')}
        {isLocal && isScreenSharing && ' (Screen)'}
        {isLocal && !isAudioEnabled && <i className="fas fa-microphone-slash ml-2 text-red-500 text-xs"></i>}
        {isSpeaking && <i className="fas fa-volume-up ml-2 text-green-500 text-xs animate-pulse"></i>}
      </div>
    </div>
  );

  // Get all participants for rendering
  const allParticipants = [
    { id: 'self', stream: myStream, isLocal: true, isSpeaking: isLocalSpeaking, hasVideo: isVideoEnabled || isScreenSharing },
    ...Array.from(remoteStreams.entries()).map(([peerId, stream]) => ({
      id: peerId,
      stream,
      isLocal: false,
      isSpeaking: remoteSpeaking.get(peerId) || false,
      hasVideo: stream?.getVideoTracks().length > 0 && stream.getVideoTracks()[0].enabled
    }))
  ];

  return (
    <div className="flex-1 bg-black flex flex-col relative overflow-hidden h-full">

      {/* Main Stage - Flexbox layout */}
      <div className="flex-1 p-4 flex flex-col gap-4 overflow-hidden">
        
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
                                         // Use Electron clipboard API if available
                                         if ((window as any).electronAPI?.copyToClipboard) {
                                             (window as any).electronAPI.copyToClipboard(myPeerId);
                                         } else {
                                             navigator.clipboard.writeText(myPeerId);
                                         }
                                         onIdCopied?.();
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

        {/* Spotlight Layout - when someone is pinned */}
        {spotlightedUser ? (
          <div className="flex-1 flex flex-col gap-4 min-h-0">
            {/* Spotlighted user - takes most space */}
            <div className="flex-1 min-h-0">
              {(() => {
                const p = allParticipants.find(x => x.id === spotlightedUser);
                if (!p) return null;
                const user = p.isLocal ? userProfile : getRemoteUser(p.id);
                return renderVideoTile(p.id, p.stream, user, p.isLocal, p.isSpeaking, true, p.hasVideo, false);
              })()}
            </div>
            {/* Other participants - small row at bottom */}
            {allParticipants.filter(p => p.id !== spotlightedUser).length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2 shrink-0">
                {allParticipants.filter(p => p.id !== spotlightedUser).map(p => {
                  const user = p.isLocal ? userProfile : getRemoteUser(p.id);
                  return (
                    <div key={p.id}>
                      {renderVideoTile(p.id, p.stream, user, p.isLocal, p.isSpeaking, false, p.hasVideo, true)}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Grid Layout - normal view without spotlight */
          <div className={`flex-1 grid gap-4 ${getGridClass()}`} style={{ alignContent: 'center' }}>
            {allParticipants.map(p => {
              const user = p.isLocal ? userProfile : getRemoteUser(p.id);
              return (
                <div key={p.id} className="aspect-video">
                  {renderVideoTile(p.id, p.stream, user, p.isLocal, p.isSpeaking, false, p.hasVideo, false)}
                </div>
              );
            })}
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