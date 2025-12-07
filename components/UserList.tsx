import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ConnectionState, PresenceUser } from '../types';
import { useIsMobile } from '../hooks/useIsMobile';
import { useTheme } from '../contexts/ThemeContext';

interface UserListProps {
  connectionState: ConnectionState;
  onlineUsers: PresenceUser[];
  myPeerId: string | null;
  onConnectToUser: (peerId: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

// Mobile user card component
const MobileUserCard: React.FC<{
  user: PresenceUser;
  isMe?: boolean;
  onConnect?: () => void;
  themeColors: { primary: string; glow: string; glowLight: string; glowFaint: string };
}> = ({ user, isMe, onConnect, themeColors }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileTap={!isMe ? { scale: 0.98 } : undefined}
      onClick={!isMe ? onConnect : undefined}
      className="flex items-center p-3 rounded-xl mb-2 transition-all"
      style={isMe ? {
        background: `linear-gradient(to right, ${themeColors.glowFaint}, transparent)`,
        border: `1px solid ${themeColors.glowLight}`,
      } : {
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
      }}
    >
      {/* Avatar with status */}
      <div className="relative">
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center text-white overflow-hidden shadow-lg"
          style={{ backgroundColor: user.photoURL ? 'transparent' : (user.color || '#5865F2') }}
        >
          {user.photoURL ? (
            <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
          ) : (
            <i className="fas fa-user text-lg"></i>
          )}
        </div>
        <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-[#1a1a2e] ${
          isMe ? 'bg-green-500' : 'bg-green-500'
        }`}></div>
      </div>

      {/* User info */}
      <div className="ml-3 flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-white font-medium text-sm truncate">{user.displayName}</span>
          {isMe && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full uppercase font-bold"
              style={{
                background: themeColors.glowLight,
                color: themeColors.primary,
              }}
            >
              You
            </span>
          )}
        </div>
        <div className="text-xs text-white/50 truncate">
          {user.statusMessage || (isMe ? 'Online' : 'Tap to call')}
        </div>
      </div>

      {/* Call button for others */}
      {!isMe && (
        <div className="ml-2 w-9 h-9 rounded-full bg-green-500/20 flex items-center justify-center">
          <i className="fas fa-phone-alt text-green-400 text-sm"></i>
        </div>
      )}
    </motion.div>
  );
};

export const UserList: React.FC<UserListProps> = ({
  connectionState,
  onlineUsers,
  myPeerId,
  onConnectToUser,
  isCollapsed = false,
  onToggleCollapse
}) => {
  const isMobile = useIsMobile();
  const { colors } = useTheme();

  // Filter out self from the main list
  const others = onlineUsers.filter(u => u.peerId !== myPeerId);
  const me = onlineUsers.find(u => u.peerId === myPeerId);

  // Mobile layout
  if (isMobile) {
    return (
      <div className="flex-1 flex flex-col bg-gradient-to-b from-[#1a1a2e] to-[#16162a] overflow-hidden">
        {/* Header - with top padding for status bar */}
        <div className="px-4 pb-2" style={{ paddingTop: '3.5rem' }}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Online Users</h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/50 bg-white/5 px-2 py-1 rounded-full">
                {onlineUsers.length} online
              </span>
            </div>
          </div>
        </div>

        {/* User list */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {/* Current user */}
          {me && (
            <div className="mb-4">
              <div className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2 px-1">
                Your Profile
              </div>
              <MobileUserCard user={me} isMe themeColors={colors} />
            </div>
          )}

          {/* Other users */}
          <div>
            <div className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2 px-1">
              Other Users — {others.length}
            </div>

            {others.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8"
              >
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
                  <i className="fas fa-user-friends text-2xl text-white/20"></i>
                </div>
                <p className="text-white/40 text-sm">No one else is online</p>
                <p className="text-white/25 text-xs mt-1">Invite friends to join!</p>
              </motion.div>
            ) : (
              <AnimatePresence mode="popLayout">
                {others.map((user, index) => (
                  <motion.div
                    key={user.peerId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <MobileUserCard
                      user={user}
                      onConnect={() => onConnectToUser(user.peerId)}
                      themeColors={colors}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>

          {/* P2P status indicator */}
          {connectionState === ConnectionState.CONNECTED && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-3 rounded-xl bg-green-500/10 border border-green-500/20"
            >
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-green-400 text-sm font-medium">P2P Connection Active</span>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    );
  }

  // Collapsed view - just a toggle button
  if (isCollapsed) {
    return (
      <div className="bg-discord-sidebar flex flex-col items-center py-3 border-l border-discord-dark">
        <button
          onClick={onToggleCollapse}
          className="w-10 h-10 rounded-full bg-discord-main hover:bg-discord-hover text-discord-text hover:text-white transition-colors flex items-center justify-center"
          title="Show Users"
        >
          <i className="fas fa-users"></i>
        </button>
        <div className="mt-2 text-discord-muted text-xs font-bold">
          {onlineUsers.length}
        </div>
      </div>
    );
  }

  return (
    <div className="w-60 bg-discord-sidebar hidden lg:flex flex-col p-3 border-l border-discord-dark relative">

      {/* Collapse button */}
      {onToggleCollapse && (
        <button
          onClick={onToggleCollapse}
          className="absolute top-3 right-3 w-6 h-6 rounded bg-discord-main hover:bg-discord-hover text-discord-muted hover:text-white transition-colors flex items-center justify-center z-10"
          title="Hide Users"
        >
          <i className="fas fa-chevron-right text-xs"></i>
        </button>
      )}

      {/* ME */}
      {me && (
        <div className="mb-4">
            <div className="text-xs font-bold text-discord-muted uppercase mb-2">
                Identified As
            </div>
            <div className="flex items-center p-2 rounded bg-discord-hover/50 cursor-default opacity-100">
                <div className="relative">
                    <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white overflow-hidden"
                        style={{ backgroundColor: me.photoURL ? 'transparent' : (me.color || '#5865F2') }}
                    >
                        {me.photoURL ? (
                            <img src={me.photoURL} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <i className="fas fa-user"></i>
                        )}
                    </div>
                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-discord-sidebar rounded-full"></div>
                </div>
                <div className="ml-3 overflow-hidden">
                    <div className="text-white font-medium text-sm truncate">{me.displayName}</div>
                    {me.statusMessage && (
                         <div className="text-[10px] text-discord-muted truncate">{me.statusMessage}</div>
                    )}
                </div>
            </div>
        </div>
      )}

      <div className="text-xs font-bold text-discord-muted uppercase mb-2">
        Online — {others.length}
      </div>
      
      {others.length === 0 && (
          <div className="text-discord-muted text-xs italic px-2">
              No one else is online.
          </div>
      )}

      {others.map((user) => (
          <div 
            key={user.peerId} 
            onClick={() => onConnectToUser(user.peerId)}
            className="group flex items-center p-2 rounded hover:bg-discord-hover cursor-pointer transition-colors"
            title="Click to Connect"
          >
             <div className="relative">
                 <div 
                    className="w-8 h-8 group-hover:bg-discord-green transition-colors rounded-full flex items-center justify-center text-white overflow-hidden"
                    style={{ backgroundColor: user.photoURL ? 'transparent' : (user.color || '#72767d') }}
                 >
                     {user.photoURL ? (
                         <>
                            <img src={user.photoURL} alt="" className="w-full h-full object-cover group-hover:opacity-20" />
                            <i className="fas fa-phone-alt text-xs opacity-0 group-hover:opacity-100 absolute z-10 text-white"></i>
                         </>
                     ) : (
                         <>
                            <i className="fas fa-phone-alt text-xs opacity-0 group-hover:opacity-100 absolute"></i>
                            <i className="fas fa-user text-sm group-hover:opacity-0 transition-opacity"></i>
                         </>
                     )}
                 </div>
                 <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-discord-sidebar rounded-full"></div>
             </div>
             <div className="ml-3 overflow-hidden">
                 <div className="text-discord-text group-hover:text-white font-medium text-sm truncate">{user.displayName}</div>
                 <div className="text-[10px] text-discord-muted group-hover:text-discord-text/80 truncate">
                     {user.statusMessage || "Click to call"}
                 </div>
             </div>
          </div>
      ))}
      
      {/* Connection Status Indicator */}
      {connectionState === ConnectionState.CONNECTED && (
         <div className="mt-auto bg-green-500/10 border border-green-500/20 rounded p-2 text-center">
             <span className="text-green-500 text-xs font-bold uppercase">
                 <i className="fas fa-link mr-1"></i> P2P Active
             </span>
         </div>
      )}
    </div>
  );
};