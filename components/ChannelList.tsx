import React from 'react';
import { motion } from 'framer-motion';
import { Channel, ChannelType, UserProfile, ConnectionState, PresenceUser } from '../types';
import { useIsMobile } from '../hooks/useIsMobile';
import { useTheme } from '../contexts/ThemeContext';
import { GlitchText } from './Visuals';

interface ChannelListProps {
  channels: Channel[];
  activeChannelId: string;
  activeVoiceChannelId: string | null;
  onlineUsers: PresenceUser[];
  onSelectChannel: (id: string) => void;
  connectionState: string;
  peerId: string | null;
  userProfile: UserProfile;
  onCopyId: () => void;
  onOpenSettings: () => void;
  onDisconnect?: () => void;
  isAudioEnabled?: boolean;
  isVideoEnabled?: boolean;
  onToggleAudio?: () => void;
  onToggleVideo?: () => void;
  remoteVolume?: number;
  onVolumeChange?: (volume: number) => void;
  onShowToast?: (type: 'success' | 'error' | 'info' | 'warning', title: string, message?: string) => void;
  unreadChannels?: string[]; // Channel IDs with unread messages
}

export const ChannelList: React.FC<ChannelListProps> = ({
  channels,
  activeChannelId,
  activeVoiceChannelId,
  onlineUsers,
  onSelectChannel,
  connectionState,
  peerId,
  userProfile,
  onCopyId,
  onOpenSettings,
  onDisconnect,
  isAudioEnabled = true,
  isVideoEnabled = true,
  onToggleAudio,
  onToggleVideo,
  remoteVolume = 100,
  onVolumeChange,
  onShowToast,
  unreadChannels = []
}) => {
  // Check if a channel has unread messages
  const hasUnread = (channelId: string) => unreadChannels.includes(channelId);
  // Get users in each voice channel
  const getUsersInVoiceChannel = (channelId: string) => {
    return onlineUsers.filter(u => u.voiceChannelId === channelId);
  };
  const [showVolumeSlider, setShowVolumeSlider] = React.useState(false);
  const isMobile = useIsMobile();
  const { colors, theme } = useTheme();

  // Mobile-optimized channel item component
  const MobileChannelItem: React.FC<{
    channel: Channel;
    isActive: boolean;
    onClick: () => void;
    usersInChannel?: PresenceUser[];
    isUnread?: boolean;
  }> = ({ channel, isActive, onClick, usersInChannel = [], isUnread = false }) => {
    const isVoice = channel.type === ChannelType.VOICE;
    const isAI = channel.type === ChannelType.AI;

    return (
      <motion.button
        onClick={onClick}
        className={`w-full flex items-center px-4 py-3.5 rounded-xl mb-2 transition-all ${
          isActive
            ? theme === 'gold'
              ? 'bg-gradient-to-r from-yellow-400/20 to-yellow-400/10 border border-yellow-400/30'
              : 'bg-gradient-to-r from-purple-500/20 to-purple-500/10 border border-purple-500/30'
            : 'bg-white/5 border border-transparent active:bg-white/10'
        }`}
        whileTap={{ scale: 0.98 }}
        style={{
          boxShadow: isActive ? `0 0 20px ${colors.glowFaint}` : 'none',
        }}
      >
        {/* Icon */}
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center mr-3 ${
            isActive
              ? isVoice
                ? 'bg-green-500/20 text-green-400'
                : theme === 'gold'
                  ? 'bg-yellow-400/20 text-yellow-400'
                  : 'bg-purple-500/20 text-purple-400'
              : 'bg-white/10 text-gray-400'
          }`}
        >
          {isVoice ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
            </svg>
          ) : isAI ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 011 1v3a1 1 0 01-1 1h-1v1a2 2 0 01-2 2H5a2 2 0 01-2-2v-1H2a1 1 0 01-1-1v-3a1 1 0 011-1h1a7 7 0 017-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 012-2M7.5 13A2.5 2.5 0 005 15.5 2.5 2.5 0 007.5 18a2.5 2.5 0 002.5-2.5A2.5 2.5 0 007.5 13m9 0a2.5 2.5 0 00-2.5 2.5 2.5 2.5 0 002.5 2.5 2.5 2.5 0 002.5-2.5 2.5 2.5 0 00-2.5-2.5z"/>
            </svg>
          ) : (
            <span className="text-lg font-bold">#</span>
          )}
        </div>

        {/* Channel Info */}
        <div className="flex-1 text-left">
          <div className={`font-semibold ${isActive ? 'text-white' : 'text-gray-300'}`}>
            {channel.name}
          </div>
          {isVoice && usersInChannel.length > 0 && (
            <div className="text-xs text-gray-500 mt-0.5">
              {usersInChannel.length} {usersInChannel.length === 1 ? 'user' : 'users'} connected
            </div>
          )}
        </div>

        {/* Right side indicators */}
        <div className="flex items-center space-x-2">
          {usersInChannel.length > 0 && (
            <div className="px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-bold">
              {usersInChannel.length}
            </div>
          )}
          {isUnread && !isActive && (
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
          )}
          {isActive && (
            <div className="w-2 h-2 rounded-full" style={{ background: colors.primary }} />
          )}
        </div>
      </motion.button>
    );
  };

  // Mobile layout
  if (isMobile) {
    return (
      <div className="flex-1 flex flex-col min-h-0 px-2">
        {/* Text Channels Section */}
        <div className="mb-4">
          <div className="flex items-center px-2 mb-3">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Text Channels</div>
            <div className="flex-1 h-px bg-gray-700/50 ml-3" />
          </div>
          {channels.filter(c => c.type === ChannelType.TEXT || c.type === ChannelType.AI).map(channel => (
            <MobileChannelItem
              key={channel.id}
              channel={channel}
              isActive={activeChannelId === channel.id}
              onClick={() => onSelectChannel(channel.id)}
              isUnread={hasUnread(channel.id)}
            />
          ))}
        </div>

        {/* Voice Channels Section */}
        <div className="mb-4">
          <div className="flex items-center px-2 mb-3">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Voice Channels</div>
            <div className="flex-1 h-px bg-gray-700/50 ml-3" />
          </div>
          {channels.filter(c => c.type === ChannelType.VOICE).map(channel => (
            <MobileChannelItem
              key={channel.id}
              channel={channel}
              isActive={activeChannelId === channel.id}
              onClick={() => onSelectChannel(channel.id)}
              usersInChannel={getUsersInVoiceChannel(channel.id)}
            />
          ))}
        </div>

        {/* Voice Control Panel (when connected) */}
        {connectionState === ConnectionState.CONNECTED && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-auto mx-2 mb-4 p-4 rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(34, 197, 94, 0.05))',
              border: '1px solid rgba(34, 197, 94, 0.2)',
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse mr-2" />
                <span className="text-green-400 text-sm font-semibold">Voice Connected</span>
              </div>
              <button
                onClick={() => {
                  onDisconnect?.();
                  onShowToast?.('info', 'Disconnected', 'You left the voice channel.');
                }}
                className="p-2 rounded-lg bg-red-500/20 text-red-400 active:bg-red-500/30"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
                </svg>
              </button>
            </div>

            <div className="flex space-x-2">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  onToggleAudio?.();
                  onShowToast?.('info', isAudioEnabled ? 'Muted' : 'Unmuted');
                }}
                className={`flex-1 py-3 rounded-xl font-medium text-sm flex items-center justify-center space-x-2 ${
                  isAudioEnabled
                    ? 'bg-white/10 text-white'
                    : 'bg-red-500/20 text-red-400'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isAudioEnabled ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  )}
                </svg>
                <span>{isAudioEnabled ? 'Mute' : 'Unmute'}</span>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  onToggleVideo?.();
                  onShowToast?.('info', isVideoEnabled ? 'Camera Off' : 'Camera On');
                }}
                className={`flex-1 py-3 rounded-xl font-medium text-sm flex items-center justify-center space-x-2 ${
                  isVideoEnabled
                    ? 'bg-white/10 text-white'
                    : 'bg-red-500/20 text-red-400'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isVideoEnabled ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  )}
                </svg>
                <span>{isVideoEnabled ? 'Video' : 'No Video'}</span>
              </motion.button>
            </div>
          </motion.div>
        )}
      </div>
    );
  }

  // Desktop layout (original)
  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header with glassmorphism */}
      <div
        className="h-12 flex items-center px-4 font-display tracking-wider border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer shrink-0 relative"
        style={{
          background: 'linear-gradient(180deg, rgba(26, 26, 38, 0.95), rgba(18, 18, 26, 0.98))',
        }}
      >
        <div style={{ color: colors.primary, textShadow: `0 0 20px ${colors.glow}` }}>
            <GlitchText text="PISSCORD" className="text-lg font-display tracking-widest" />
        </div>
        <i className="fas fa-chevron-down ml-auto text-xs text-gray-500"></i>
        {/* Gradient glow line */}
        <div
          className="absolute bottom-0 left-0 right-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${colors.glowLight}, transparent)` }}
        />
      </div>

      {/* Channels */}
      <div className="flex-1 overflow-y-auto py-3 space-y-4">
        
        {/* Category: Text Channels */}
        <div>
          <div className="px-4 text-xs font-bold text-discord-muted uppercase hover:text-discord-text cursor-pointer flex items-center">
            <i className="fas fa-chevron-down mr-1"></i>
            Text Channels
          </div>
          <div className="mt-1 px-2 space-y-[2px]">
            {channels.filter(c => c.type === ChannelType.TEXT || c.type === ChannelType.AI).map(channel => {
              const isUnread = hasUnread(channel.id);
              const isActive = activeChannelId === channel.id;
              return (
                <div
                  key={channel.id}
                  onClick={() => onSelectChannel(channel.id)}
                  className={`group px-2 py-1 rounded mx-1 flex items-center cursor-pointer ${
                    isActive ? 'bg-discord-hover text-white' : isUnread ? 'text-white' : 'text-discord-muted hover:bg-discord-hover hover:text-discord-text'
                  }`}
                >
                  {/* Unread indicator bar */}
                  {isUnread && !isActive && (
                    <div className="absolute left-0 w-1 h-4 bg-white rounded-r-full" />
                  )}
                  <i className={`mr-2 text-lg ${channel.type === ChannelType.AI ? 'fas fa-robot' : 'fas fa-hashtag text-sm'}`}></i>
                  <span className={`font-medium truncate ${isUnread && !isActive ? 'font-bold' : ''}`}>{channel.name}</span>
                  {/* Unread dot */}
                  {isUnread && !isActive && (
                    <span className="ml-auto w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Category: Voice Channels */}
        <div>
          <div className="px-4 text-xs font-bold text-discord-muted uppercase hover:text-discord-text cursor-pointer flex items-center">
            <i className="fas fa-chevron-down mr-1"></i>
            Voice Channels
          </div>
          <div className="mt-1 px-2 space-y-[2px]">
            {channels.filter(c => c.type === ChannelType.VOICE).map(channel => {
              const usersInChannel = getUsersInVoiceChannel(channel.id);
              const isActiveVoice = activeVoiceChannelId === channel.id;

              return (
                <div key={channel.id}>
                  {/* Channel Row */}
                  <div
                    onClick={() => onSelectChannel(channel.id)}
                    className={`group px-2 py-1 rounded mx-1 flex items-center cursor-pointer ${
                      activeChannelId === channel.id ? 'bg-discord-hover text-white' : 'text-discord-muted hover:bg-discord-hover hover:text-discord-text'
                    }`}
                  >
                    <i className="fas fa-volume-up mr-2 text-sm"></i>
                    <span className="font-medium truncate">{channel.name}</span>
                    {/* User count badge */}
                    {usersInChannel.length > 0 && (
                      <span className="ml-auto text-[10px] bg-discord-dark px-1.5 py-0.5 rounded-full text-discord-muted">
                        {usersInChannel.length}
                      </span>
                    )}
                  </div>

                  {/* Users in this voice channel */}
                  {usersInChannel.length > 0 && (
                    <div className="ml-6 mt-1 space-y-1">
                      {usersInChannel.map(user => (
                        <div
                          key={user.peerId}
                          className="flex items-center px-2 py-1 rounded text-discord-text hover:bg-discord-hover/50 transition-colors"
                        >
                          <div className="relative">
                            <div
                              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs overflow-hidden"
                              style={{ backgroundColor: user.photoURL ? 'transparent' : (user.color || '#5865F2') }}
                            >
                              {user.photoURL ? (
                                <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <i className="fas fa-user text-[10px]"></i>
                              )}
                            </div>
                            {/* Online indicator */}
                            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-discord-sidebar rounded-full"></div>
                          </div>
                          <span className="ml-2 text-sm truncate">{user.displayName}</span>
                          {/* Show muted icon if user is self and muted */}
                          {user.peerId === peerId && !isAudioEnabled && (
                            <i className="fas fa-microphone-slash ml-auto text-red-500 text-xs"></i>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Persistent Voice Control Panel */}
      {connectionState === ConnectionState.CONNECTED && (
        <div className="bg-discord-dark/80 p-3 border-t border-discord-dark shrink-0">
          <div className="mb-2 flex items-center justify-between">
            <div className="overflow-hidden">
              <div className="text-green-500 text-xs font-bold uppercase flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                Voice Connected
              </div>
              <div className="text-white text-xs truncate">Voice Lounge</div>
            </div>
            <button
              onClick={() => {
                onDisconnect?.();
                onShowToast?.('info', 'Disconnected', 'You left the voice channel.');
              }}
              className="text-white hover:text-red-500 p-1.5 rounded hover:bg-discord-hover transition-colors"
              title="Disconnect"
            >
              <i className="fas fa-phone-slash"></i>
            </button>
          </div>

          {/* Voice Controls */}
          <div className="flex items-center space-x-2 relative">
            <button
              onClick={() => {
                onToggleAudio?.();
                onShowToast?.('info', isAudioEnabled ? 'Muted' : 'Unmuted', isAudioEnabled ? 'Your microphone is now muted.' : 'Your microphone is now on.');
              }}
              className={`flex-1 p-2 rounded text-xs font-medium transition-all ${isAudioEnabled ? 'bg-discord-main hover:bg-discord-hover text-white' : 'bg-red-500 text-white'}`}
              title={isAudioEnabled ? 'Mute' : 'Unmute'}
            >
              <i className={`fas ${isAudioEnabled ? 'fa-microphone' : 'fa-microphone-slash'} mr-1`}></i>
              {isAudioEnabled ? 'Mute' : 'Unmuted'}
            </button>

            <button
              onClick={() => {
                onToggleVideo?.();
                onShowToast?.('info', isVideoEnabled ? 'Camera Off' : 'Camera On', isVideoEnabled ? 'Your camera is now off.' : 'Your camera is now on.');
              }}
              className={`flex-1 p-2 rounded text-xs font-medium transition-all ${isVideoEnabled ? 'bg-discord-main hover:bg-discord-hover text-white' : 'bg-red-500 text-white'}`}
              title={isVideoEnabled ? 'Stop Video' : 'Start Video'}
            >
              <i className={`fas ${isVideoEnabled ? 'fa-video' : 'fa-video-slash'} mr-1`}></i>
              {isVideoEnabled ? 'Video' : 'No Video'}
            </button>

            <div className="relative">
              <button
                onClick={() => setShowVolumeSlider(!showVolumeSlider)}
                className="p-2 rounded bg-discord-main hover:bg-discord-hover text-white transition-colors"
                title="Volume"
              >
                <i className="fas fa-volume-up"></i>
              </button>

              {showVolumeSlider && onVolumeChange && (
                <div className="absolute bottom-full right-0 mb-2 bg-discord-dark border border-discord-sidebar rounded-lg p-3 shadow-xl">
                  <div className="text-xs text-discord-muted mb-2 font-bold uppercase">Volume</div>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={remoteVolume}
                    onChange={(e) => onVolumeChange(Number(e.target.value))}
                    className="w-24 h-2 bg-discord-main rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #5865F2 0%, #5865F2 ${remoteVolume/2}%, #2f3136 ${remoteVolume/2}%, #2f3136 100%)`
                    }}
                  />
                  <div className="text-xs text-white text-center mt-1">{remoteVolume}%</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* User Status Footer */}
      <div className="bg-discord-dark p-2 flex flex-col shrink-0">
        <div className="flex items-center p-1 rounded hover:bg-discord-hover cursor-pointer group">
            <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold relative transition-colors overflow-hidden"
                style={{ backgroundColor: userProfile.photoURL ? 'transparent' : userProfile.color }}
            >
                {userProfile.photoURL ? (
                    <img src={userProfile.photoURL} alt="" className="w-full h-full object-cover" />
                ) : (
                    <i className="fas fa-user"></i>
                )}
                <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-discord-dark bg-green-500"></div>
            </div>
            <div className="ml-2 overflow-hidden flex-1">
                <div className="text-white text-sm font-bold truncate">{userProfile.displayName}</div>
                <div className="text-xs text-discord-muted truncate flex items-center">
                   {peerId ? (
                       <span className="cursor-pointer hover:text-white" onClick={onCopyId} title="Click to copy ID">
                           #{peerId.substring(0,4)}...
                       </span>
                   ) : 'Initializing...'}
                </div>
            </div>
            <div className="flex space-x-1">
                <button
                    onClick={onOpenSettings}
                    className="text-discord-text hover:bg-discord-main p-1.5 rounded transition-colors"
                    title="User Settings"
                >
                    <i className="fas fa-cog"></i>
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};