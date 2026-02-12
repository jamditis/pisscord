import React, { useEffect, useRef, useState, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ConnectionState, UserProfile, PresenceUser, Channel, ChannelType } from '../types';
import { useIsMobile } from '../hooks/useIsMobile';
import { useTheme } from '../contexts/ThemeContext';

// Memoized Mobile Video Tile - defined OUTSIDE VoiceStage to prevent recreation
const MobileVideoTile = memo(({
  userId,
  stream,
  user,
  isLocal,
  isSpeaking,
  hasVideo,
  isSpotlighted,
  isSmall,
  isScreenSharing,
  onTap,
  themeGlow,
  themePrimary,
}: {
  userId: string;
  stream: MediaStream | null;
  user: { displayName: string; color: string; photoURL?: string } | undefined;
  isLocal: boolean;
  isSpeaking: boolean;
  hasVideo: boolean;
  isSpotlighted?: boolean;
  isSmall?: boolean;
  isScreenSharing?: boolean;
  onTap?: () => void;
  themeGlow?: string;
  themePrimary?: string;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Attach stream to video element
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !stream) return;

    if (el.srcObject !== stream) {
      el.srcObject = stream;
      // Mobile WebView needs explicit play
      el.play().catch(e => console.log(`Video play error: ${e.message}`));
    }

    return () => {
      // Cleanup: pause and clear srcObject when unmounting
      el.pause();
      el.srcObject = null;
    };
  }, [stream]);

  return (
    <div
      onClick={onTap}
      className={`relative rounded-2xl overflow-hidden ${
        isSmall ? 'w-20 h-20' : 'w-full h-full'
      }`}
      style={{
        background: 'linear-gradient(135deg, #2a2a4a 0%, #1a1a2e 100%)',
        boxShadow: isSpeaking
          ? `0 0 0 3px ${themePrimary || 'rgba(168, 85, 247, 0.8)'}, 0 0 20px ${themeGlow || 'rgba(168, 85, 247, 0.4)'}`
          : '0 4px 20px rgba(0, 0, 0, 0.3)'
      }}
    >
      {hasVideo ? (
        <video
          ref={videoRef}
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
              boxShadow: isSpeaking ? `0 0 0 3px ${themePrimary || 'rgba(168, 85, 247, 0.8)'}` : undefined
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
            {isSpeaking && (
              <i className="fas fa-volume-up ml-2 text-purple-400 text-xs"></i>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

interface VoiceStageProps {
  myStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  connectionState: ConnectionState;
  onToggleVideo: () => void;
  onToggleAudio: () => void;
  onShareScreen: () => void;
  onDisconnect: () => void;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isScreenSharing: boolean;
  myPeerId: string | null;
  userProfile: UserProfile;
  onlineUsers: PresenceUser[];
  userVolumes?: Map<string, number>;
  onUserVolumeChange?: (peerId: string, volume: number) => void;
  // Voice channel quick-join (mobile empty state)
  voiceChannels?: Channel[];
  onJoinVoiceChannel?: (channelId: string) => void;
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

    let audioContext: AudioContext | null = null;

    try {
      audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);

      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.5;
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const THRESHOLD = 20;

      const checkAudio = () => {
        if (!analyserRef.current) return;

        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;

        setIsSpeaking(average > THRESHOLD);
        animationFrameRef.current = requestAnimationFrame(checkAudio);
      };

      checkAudio();
    } catch (err) {
      console.error('Audio activity detection error:', err);
    }

    // Cleanup always runs — whether try succeeded or caught
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      analyserRef.current = null;
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      } else if (audioContext) {
        // If we created one but it wasn't stored in ref (error path)
        audioContext.close();
      }
    };
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
  onDisconnect,
  isVideoEnabled,
  isAudioEnabled,
  isScreenSharing,
  myPeerId,
  userProfile,
  onlineUsers,
  userVolumes,
  onUserVolumeChange,
  voiceChannels,
  onJoinVoiceChannel,
}) => {
  const myVideoRef = useRef<HTMLVideoElement>(null);

  // Spotlight state - null means grid view, peerId means that user is spotlighted, 'self' for local user
  const [spotlightedUser, setSpotlightedUser] = useState<string | null>(null);

  // Volume control popup - which user's volume slider is visible
  const [volumePopupUser, setVolumePopupUser] = useState<string | null>(null);

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
        console.error('Remote audio activity error:', err);
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
        // Mobile WebView requires explicit play() call
        const playPromise = el.play();
        if (playPromise !== undefined) {
          playPromise.catch((e) => {
            console.log(`Local video play failed: ${e.message}`);
          });
        }
      }
    } else {
      remoteVideoRefs.current.set(userId, el);
      if (stream && el.srcObject !== stream) {
        el.srcObject = stream;
        // Mobile WebView requires explicit play() call for remote video
        const playPromise = el.play();
        if (playPromise !== undefined) {
          playPromise.catch((e) => {
            console.log(`Remote video play failed for ${userId}: ${e.message}`);
          });
        }
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
      {/* Volume Control for Remote Users */}
      {!isLocal && onUserVolumeChange && (
        <div className="absolute bottom-2 right-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setVolumePopupUser(volumePopupUser === userId ? null : userId);
            }}
            className="w-8 h-8 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-white transition-colors"
            title="Adjust volume"
          >
            <i className={`fas ${(userVolumes?.get(userId) ?? 100) === 0 ? 'fa-volume-mute' : 'fa-volume-up'} text-xs`}></i>
          </button>
          {volumePopupUser === userId && (
            <div
              className="absolute bottom-10 right-0 bg-discord-dark border border-discord-sidebar rounded-lg p-3 shadow-xl min-w-[180px]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-white text-xs font-bold">Volume</span>
                <span className="text-discord-muted text-xs">{userVolumes?.get(userId) ?? 100}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={Math.min(userVolumes?.get(userId) ?? 100, 100)}
                onChange={(e) => onUserVolumeChange(userId, parseInt(e.target.value))}
                className="w-full h-2 bg-discord-sidebar rounded-lg appearance-none cursor-pointer accent-discord-accent"
              />
              <div className="flex justify-between text-[10px] text-discord-muted mt-1">
                <span>0%</span>
                <span>100%</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // Get all participants for rendering
  const allParticipants = [
    { id: 'self', stream: myStream, isLocal: true, isSpeaking: isLocalSpeaking, hasVideo: isVideoEnabled || isScreenSharing },
    ...Array.from(remoteStreams.entries()).map(([peerId, stream]) => {
      // Check for video tracks - on mobile, tracks may initially report as not enabled
      const videoTracks = stream?.getVideoTracks() || [];
      const hasVideoTrack = videoTracks.length > 0;
      // Consider video available if track exists (don't rely solely on enabled state which can lag)
      const hasVideo = hasVideoTrack;
      return {
        id: peerId,
        stream,
        isLocal: false,
        isSpeaking: remoteSpeaking.get(peerId) || false,
        hasVideo
      };
    })
  ];

  const isMobile = useIsMobile();
  const { colors } = useTheme();

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
        {/* Disconnected — voice channel launcher */}
        {connectionState === ConnectionState.DISCONNECTED && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-50 flex flex-col p-4 overflow-y-auto"
            style={{ background: 'linear-gradient(to bottom, #1a1a2e, #0f0f1a)' }}
          >
            {/* Voice channels section */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: `linear-gradient(135deg, ${colors.primary}30, ${colors.primary}10)` }}
                >
                  <i className="fas fa-headset text-sm" style={{ color: colors.primary }}></i>
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-discord-muted">Join a channel</span>
              </div>
              <div className="flex flex-col gap-2">
                {(voiceChannels || []).map((ch) => {
                  const usersInChannel = onlineUsers.filter(u => u.voiceChannelId === ch.id);
                  return (
                    <motion.button
                      key={ch.id}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => onJoinVoiceChannel?.(ch.id)}
                      className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-colors"
                      style={{
                        background: 'rgba(34, 197, 94, 0.04)',
                        border: '1px solid rgba(34, 197, 94, 0.12)',
                        WebkitTapHighlightColor: 'transparent',
                      }}
                    >
                      <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
                        <i className="fas fa-microphone text-green-500/70"></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-white/90">{ch.name}</div>
                        {usersInChannel.length > 0 ? (
                          <div className="flex items-center gap-1 mt-0.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                            <span className="text-xs text-green-400/80">
                              {usersInChannel.map(u => u.displayName).join(', ')}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-discord-faint">No one here</span>
                        )}
                      </div>
                      <div
                        className="px-3 py-1.5 rounded-lg text-xs font-bold"
                        style={{
                          background: usersInChannel.length > 0
                            ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(34, 197, 94, 0.1))'
                            : 'rgba(255, 255, 255, 0.05)',
                          color: usersInChannel.length > 0 ? '#22c55e' : '#b0b0c0',
                          border: usersInChannel.length > 0 ? '1px solid rgba(34, 197, 94, 0.2)' : '1px solid rgba(255, 255, 255, 0.08)',
                        }}
                      >
                        Join
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Online users section */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                  <i className="fas fa-users text-sm text-discord-muted"></i>
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-discord-muted">
                  Online — {onlineUsers.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {onlineUsers.map((user) => (
                  <div
                    key={user.peerId}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg"
                    style={{
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                    }}
                  >
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                      style={{ background: user.color || colors.primary }}
                    >
                      {(user.displayName || '?')[0].toUpperCase()}
                    </div>
                    <span className="text-xs text-white/70 font-medium">{user.displayName}</span>
                    {user.voiceChannelId && (
                      <i className="fas fa-headset text-[10px] text-green-500/60"></i>
                    )}
                  </div>
                ))}
                {onlineUsers.length === 0 && (
                  <span className="text-xs text-discord-faint">No one online right now</span>
                )}
              </div>
            </div>
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
                        isScreenSharing={p.isLocal && isScreenSharing}
                        onTap={() => toggleSpotlight(p.id)}
                        themeGlow={colors.glow}
                        themePrimary={colors.primary}
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
                          isScreenSharing={p.isLocal && isScreenSharing}
                          onTap={() => toggleSpotlight(p.id)}
                          themeGlow={colors.glow}
                          themePrimary={colors.primary}
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
                        isScreenSharing={p.isLocal && isScreenSharing}
                        onTap={() => toggleSpotlight(p.id)}
                        themeGlow={colors.glow}
                        themePrimary={colors.primary}
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
        
        {/* Connection Overlay if disconnected - prompt to join a voice channel */}
        {connectionState === ConnectionState.DISCONNECTED && (
             <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
                 <div className="text-center max-w-md">
                     <div className="w-24 h-24 bg-gradient-to-br from-discord-accent to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-discord-accent/20 animate-pulse">
                         <i className="fas fa-microphone text-4xl text-white"></i>
                     </div>
                     <h2 className="text-2xl font-bold text-white font-display tracking-wide mb-2">Voice Channels</h2>
                     <p className="text-discord-muted text-sm">
                         Select a voice channel from the sidebar to join and start chatting with others.
                     </p>
                 </div>
             </div>
        )}

        {/* Connecting State */}
        {connectionState === ConnectionState.CONNECTING && (
            <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center flex-col">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-discord-accent mb-6"></div>
                <span className="text-white font-bold font-display tracking-wide text-xl">Establishing Secure Link...</span>
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
      <div className="h-24 bg-discord-header/90 backdrop-blur-md flex items-center justify-center space-x-6 border-t border-white/5 shrink-0 relative z-50 pb-4">
          <button 
             onClick={onToggleAudio}
             className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl transition-all shadow-lg ${isAudioEnabled ? 'bg-white/10 text-white hover:bg-white/20 border border-white/10' : 'bg-red-500/20 text-red-500 border border-red-500/30'}`}
             title={isAudioEnabled ? 'Mute' : 'Unmute'}
          >
             <i className={`fas ${isAudioEnabled ? 'fa-microphone' : 'fa-microphone-slash'}`}></i>
          </button>
          
          <button 
             onClick={onToggleVideo}
             className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl transition-all shadow-lg ${isVideoEnabled ? 'bg-white/10 text-white hover:bg-white/20 border border-white/10' : 'bg-red-500/20 text-red-500 border border-red-500/30'}`}
             title={isVideoEnabled ? 'Stop Video' : 'Start Video'}
          >
             <i className={`fas ${isVideoEnabled ? 'fa-video' : 'fa-video-slash'}`}></i>
          </button>

          <button 
             onClick={onShareScreen}
             className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl transition-all shadow-lg ${isScreenSharing ? 'bg-green-500/20 text-green-500 border border-green-500/30' : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'}`}
             title="Share Screen"
          >
             <i className="fas fa-desktop"></i>
          </button>

          <button 
             onClick={onDisconnect}
             className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl bg-red-500 text-white hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
             title="Disconnect"
          >
             <i className="fas fa-phone-slash"></i>
          </button>
      </div>
    </div>
  );
};