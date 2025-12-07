import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ConnectionState, UserProfile, PresenceUser } from '../types';
import { ClipboardService, HapticsService, Platform } from '../services/platform';
import { useIsMobile } from '../hooks/useIsMobile';

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

  // Set video ref and attach stream
  const setVideoRef = useCallback((el: HTMLVideoElement | null, userId: string, stream: MediaStream | null, isLocal: boolean) => {
    if (!el) return;

    if (isLocal) {
      (myVideoRef as any).current = el;
      if (stream && el.srcObject !== stream) {
        el.srcObject = stream;
      }
    } else {
      remoteVideoRefs.current.set(userId, el);
      if (stream && el.srcObject !== stream) {
        el.srcObject = stream;
      }
    }
  }, []);

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
          ref={el => setVideoRef(el, userId, stream, isLocal)}
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

  const isMobile = useIsMobile();

  // Mobile Video Tile Component
  const MobileVideoTile: React.FC<{
    userId: string;
    stream: MediaStream | null;
    user: { displayName: string; color: string; photoURL?: string } | undefined;
    isLocal: boolean;
    isSpeaking: boolean;
    hasVideo: boolean;
    isSpotlighted?: boolean;
    isSmall?: boolean;
  }> = ({ userId, stream, user, isLocal, isSpeaking, hasVideo, isSpotlighted, isSmall }) => (
    <motion.div
      onClick={() => toggleSpotlight(userId)}
      whileTap={{ scale: 0.98 }}
      className={`relative rounded-2xl overflow-hidden ${
        isSmall ? 'w-20 h-20' : 'w-full h-full'
      }`}
      style={{
        background: 'linear-gradient(135deg, #2a2a4a 0%, #1a1a2e 100%)',
        boxShadow: isSpeaking
          ? '0 0 0 3px rgba(168, 85, 247, 0.8), 0 0 20px rgba(168, 85, 247, 0.4)'
          : '0 4px 20px rgba(0, 0, 0, 0.3)'
      }}
    >
      {hasVideo ? (
        <video
          ref={el => setVideoRef(el, userId, stream, isLocal)}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          style={{ transform: isLocal && !isScreenSharing ? 'scaleX(-1)' : 'none' }}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div
            className={`rounded-full flex items-center justify-center overflow-hidden ${
              isSmall ? 'w-12 h-12' : 'w-20 h-20'
            }`}
            style={{
              backgroundColor: user?.photoURL ? 'transparent' : (user?.color || '#a855f7'),
              boxShadow: isSpeaking ? '0 0 0 3px rgba(168, 85, 247, 0.8)' : undefined
            }}
          >
            {user?.photoURL ? (
              <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
            ) : (
              <i className={`fas fa-user text-white ${isSmall ? 'text-lg' : 'text-3xl'}`}></i>
            )}
          </div>
        </div>
      )}

      {/* Pinned indicator */}
      {isSpotlighted && (
        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-purple-500/80 flex items-center justify-center">
          <i className="fas fa-thumbtack text-white text-xs"></i>
        </div>
      )}

      {/* Name badge */}
      {!isSmall && (
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
          <div className="bg-black/50 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center">
            <span className="text-white text-xs font-medium">
              {isLocal ? 'You' : (user?.displayName || 'Unknown')}
            </span>
            {isLocal && !isAudioEnabled && (
              <i className="fas fa-microphone-slash ml-2 text-red-400 text-xs"></i>
            )}
            {isSpeaking && (
              <i className="fas fa-volume-up ml-2 text-purple-400 text-xs animate-pulse"></i>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );

  // Mobile control button component
  const MobileControlButton: React.FC<{
    onClick: () => void;
    active?: boolean;
    danger?: boolean;
    icon: string;
    label: string;
  }> = ({ onClick, active, danger, icon, label }) => (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.9 }}
      className={`flex flex-col items-center justify-center gap-1 ${
        danger
          ? 'text-red-400'
          : active
            ? 'text-white'
            : 'text-white/50'
      }`}
    >
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
        danger
          ? 'bg-red-500/20 border border-red-500/30'
          : active
            ? 'bg-purple-500/20 border border-purple-500/30'
            : 'bg-white/5 border border-white/10'
      }`}>
        <i className={`fas ${icon} text-xl`}></i>
      </div>
      <span className="text-[10px] font-medium">{label}</span>
    </motion.button>
  );

  // Mobile layout
  if (isMobile) {
    return (
      <div className="flex-1 bg-gradient-to-b from-[#1a1a2e] to-[#0f0f1a] flex flex-col relative overflow-hidden h-full">
        {/* Connection Overlay if disconnected */}
        {connectionState === ConnectionState.DISCONNECTED && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-50 bg-[#1a1a2e]/95 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-gradient-to-b from-[#2a2a4a] to-[#1a1a2e] p-6 rounded-3xl shadow-2xl max-w-sm w-full border border-white/10"
            >
              <div className="text-center mb-6">
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                  className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg"
                >
                  <i className="fas fa-satellite-dish text-3xl text-white"></i>
                </motion.div>
                <h2 className="text-2xl font-bold text-white">Connect</h2>
                <p className="text-white/50 text-sm mt-1">Secure P2P Connection</p>
              </div>

              {/* Your ID */}
              <div className="mb-4 bg-white/5 p-4 rounded-2xl border border-white/10">
                <label className="block text-xs font-bold text-white/40 uppercase mb-2 tracking-wide">
                  Your Peer ID
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white font-mono text-sm truncate">
                    {myPeerId || 'Generating...'}
                  </div>
                  <motion.button
                    onClick={async () => {
                      if (myPeerId) {
                        await ClipboardService.write(myPeerId);
                        HapticsService.impact('light');
                        onIdCopied?.();
                      }
                    }}
                    whileTap={{ scale: 0.95 }}
                    className="w-11 h-11 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center"
                  >
                    <i className="fas fa-copy text-purple-400"></i>
                  </motion.button>
                </div>
                <p className="text-[10px] text-white/30 mt-2">Share with friends</p>
              </div>

              <div className="flex items-center gap-4 my-4">
                <div className="flex-1 h-px bg-white/10"></div>
                <span className="text-white/30 text-xs uppercase">or call</span>
                <div className="flex-1 h-px bg-white/10"></div>
              </div>

              {/* Connect to friend */}
              <form onSubmit={handleConnectSubmit}>
                <div className="mb-4">
                  <input
                    type="text"
                    value={remoteIdInput}
                    onChange={(e) => setRemoteIdInput(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500/50 placeholder-white/30 font-mono text-sm"
                    placeholder="Paste friend's ID..."
                  />
                </div>
                <motion.button
                  type="submit"
                  disabled={!remoteIdInput.trim()}
                  whileTap={{ scale: 0.98 }}
                  className={`w-full font-bold py-3.5 rounded-xl flex items-center justify-center transition-all ${
                    remoteIdInput.trim()
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg'
                      : 'bg-white/5 text-white/30 border border-white/10'
                  }`}
                >
                  <i className="fas fa-phone-alt mr-2"></i> Connect
                </motion.button>
              </form>
            </motion.div>
          </motion.div>
        )}

        {/* Connecting State */}
        {connectionState === ConnectionState.CONNECTING && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-50 bg-[#1a1a2e]/95 flex items-center justify-center flex-col"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-16 h-16 rounded-full border-4 border-purple-500/30 border-t-purple-500 mb-4"
            ></motion.div>
            <span className="text-white font-medium">Connecting...</span>
          </motion.div>
        )}

        {/* Video Area */}
        <div className="flex-1 p-3 overflow-hidden">
          <AnimatePresence mode="wait">
            {spotlightedUser ? (
              /* Spotlight mode */
              <motion.div
                key="spotlight"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col h-full gap-3"
              >
                {/* Main video */}
                <div className="flex-1 min-h-0">
                  {(() => {
                    const p = allParticipants.find(x => x.id === spotlightedUser);
                    if (!p) {
                      setSpotlightedUser(null);
                      return null;
                    }
                    const user = p.isLocal ? userProfile : getRemoteUser(p.id);
                    return (
                      <MobileVideoTile
                        userId={p.id}
                        stream={p.stream}
                        user={user}
                        isLocal={p.isLocal}
                        isSpeaking={p.isSpeaking}
                        hasVideo={p.hasVideo}
                        isSpotlighted
                      />
                    );
                  })()}
                </div>

                {/* Other participants */}
                {allParticipants.filter(p => p.id !== spotlightedUser).length > 0 && (
                  <div className="flex gap-2 overflow-x-auto py-1 shrink-0">
                    {allParticipants.filter(p => p.id !== spotlightedUser).map(p => {
                      const user = p.isLocal ? userProfile : getRemoteUser(p.id);
                      return (
                        <MobileVideoTile
                          key={p.id}
                          userId={p.id}
                          stream={p.stream}
                          user={user}
                          isLocal={p.isLocal}
                          isSpeaking={p.isSpeaking}
                          hasVideo={p.hasVideo}
                          isSmall
                        />
                      );
                    })}
                  </div>
                )}
              </motion.div>
            ) : (
              /* Grid mode */
              <motion.div
                key="grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`grid gap-3 h-full ${
                  totalParticipants <= 1
                    ? 'grid-cols-1'
                    : totalParticipants <= 2
                      ? 'grid-cols-1'
                      : 'grid-cols-2'
                }`}
                style={{ alignContent: 'center' }}
              >
                {allParticipants.map(p => {
                  const user = p.isLocal ? userProfile : getRemoteUser(p.id);
                  return (
                    <div key={p.id} className={totalParticipants <= 2 ? 'aspect-video' : 'aspect-square'}>
                      <MobileVideoTile
                        userId={p.id}
                        stream={p.stream}
                        user={user}
                        isLocal={p.isLocal}
                        isSpeaking={p.isSpeaking}
                        hasVideo={p.hasVideo}
                      />
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Mobile Control Bar */}
        <div className="px-4 pb-6 pt-3 shrink-0 bg-gradient-to-t from-[#0f0f1a] to-transparent">
          <div className="flex items-center justify-center gap-4">
            <MobileControlButton
              onClick={onToggleAudio}
              active={isAudioEnabled}
              icon={isAudioEnabled ? 'fa-microphone' : 'fa-microphone-slash'}
              label={isAudioEnabled ? 'Mute' : 'Unmute'}
            />

            <MobileControlButton
              onClick={onToggleVideo}
              active={isVideoEnabled}
              icon={isVideoEnabled ? 'fa-video' : 'fa-video-slash'}
              label={isVideoEnabled ? 'Stop' : 'Video'}
            />

            <MobileControlButton
              onClick={onShareScreen}
              active={isScreenSharing}
              icon="fa-desktop"
              label="Share"
            />

            <MobileControlButton
              onClick={onDisconnect}
              danger
              icon="fa-phone-slash"
              label="Leave"
            />
          </div>
        </div>
      </div>
    );
  }

  // Desktop layout
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
                                 onClick={async () => {
                                     if(myPeerId) {
                                         await ClipboardService.write(myPeerId);
                                         if (Platform.isMobile) {
                                             HapticsService.impact('light');
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
            <div className="flex-1 min-h-0" key={`spotlight-${spotlightedUser}`}>
              {(() => {
                const p = allParticipants.find(x => x.id === spotlightedUser);
                if (!p) {
                  // User left, clear spotlight
                  setSpotlightedUser(null);
                  return null;
                }
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
                    <div key={`small-${p.id}`}>
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
                <div key={`grid-${p.id}`} className="aspect-video">
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