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
}

export const ChannelList: React.FC<ChannelListProps> = ({ 
  channels, 
  activeChannelId, 
  onSelectChannel,
  connectionState,
  peerId,
  userProfile,
  onCopyId,
  onOpenSettings
}) => {
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