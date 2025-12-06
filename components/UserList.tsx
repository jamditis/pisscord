import React from 'react';
import { ConnectionState, PresenceUser } from '../types';

interface UserListProps {
  connectionState: ConnectionState;
  onlineUsers: PresenceUser[];
  myPeerId: string | null;
  onConnectToUser: (peerId: string) => void;
}

export const UserList: React.FC<UserListProps> = ({ connectionState, onlineUsers, myPeerId, onConnectToUser }) => {
  // Filter out self from the main list
  const others = onlineUsers.filter(u => u.peerId !== myPeerId);
  const me = onlineUsers.find(u => u.peerId === myPeerId);

  return (
    <div className="w-60 bg-discord-sidebar hidden lg:flex flex-col p-3 border-l border-discord-dark">
      
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