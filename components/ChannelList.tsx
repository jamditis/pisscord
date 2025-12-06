import React from 'react';
import { Channel, ChannelType, UserProfile, ConnectionState } from '../types';

interface ChannelListProps {
  channels: Channel[];
  activeChannelId: string;
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
}

export const ChannelList: React.FC<ChannelListProps> = ({
  channels,
  activeChannelId,
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
  onShowToast
}) => {
  const [showVolumeSlider, setShowVolumeSlider] = React.useState(false);
  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="h-12 shadow-sm flex items-center px-4 font-bold text-white border-b border-discord-dark hover:bg-discord-hover transition-colors cursor-pointer shrink-0">
        <span>Pisscord Server</span>
        <i className="fas fa-chevron-down ml-auto text-xs"></i>
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
            {channels.filter(c => c.type === ChannelType.TEXT || c.type === ChannelType.AI).map(channel => (
              <div
                key={channel.id}
                onClick={() => onSelectChannel(channel.id)}
                className={`group px-2 py-1 rounded mx-1 flex items-center cursor-pointer ${
                  activeChannelId === channel.id ? 'bg-discord-hover text-white' : 'text-discord-muted hover:bg-discord-hover hover:text-discord-text'
                }`}
              >
                <i className={`mr-2 text-lg ${channel.type === ChannelType.AI ? 'fas fa-robot' : 'fas fa-hashtag text-sm'}`}></i>
                <span className="font-medium truncate">{channel.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Category: Voice Channels */}
        <div>
          <div className="px-4 text-xs font-bold text-discord-muted uppercase hover:text-discord-text cursor-pointer flex items-center">
            <i className="fas fa-chevron-down mr-1"></i>
            Voice Channels
          </div>
          <div className="mt-1 px-2 space-y-[2px]">
            {channels.filter(c => c.type === ChannelType.VOICE).map(channel => (
              <div
                key={channel.id}
                onClick={() => onSelectChannel(channel.id)}
                className={`group px-2 py-1 rounded mx-1 flex items-center cursor-pointer ${
                  activeChannelId === channel.id ? 'bg-discord-hover text-white' : 'text-discord-muted hover:bg-discord-hover hover:text-discord-text'
                }`}
              >
                <i className="fas fa-volume-up mr-2 text-sm"></i>
                <span className="font-medium truncate">{channel.name}</span>
                {/* Visual indicator if connected to voice, but looking at this item */}
                {connectionState === ConnectionState.CONNECTED && activeChannelId !== channel.id && (
                     <div className="ml-auto w-2 h-2 bg-green-500 rounded-full"></div>
                )}
              </div>
            ))}
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
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold relative transition-colors"
                style={{ backgroundColor: userProfile.color }}
            >
                <i className="fas fa-user"></i>
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