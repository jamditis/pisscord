import React from 'react';
import { JoinRequest } from '../types';

interface JoinRequestPanelProps {
  requests: JoinRequest[];
  onApprove: (request: JoinRequest) => void;
  onDeny: (request: JoinRequest) => void;
}

export const JoinRequestPanel: React.FC<JoinRequestPanelProps> = ({
  requests,
  onApprove,
  onDeny
}) => {
  if (requests.length === 0) return null;

  return (
    <div className="absolute top-4 right-4 z-50 bg-discord-dark border border-discord-sidebar rounded-lg shadow-xl p-4 max-w-sm">
      <div className="flex items-center mb-3">
        <i className="fas fa-door-open text-yellow-400 mr-2"></i>
        <span className="text-white font-bold text-sm">Join Requests</span>
        <span className="ml-2 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
          {requests.length}
        </span>
      </div>

      <div className="space-y-2 max-h-60 overflow-y-auto">
        {requests.map((request) => (
          <div
            key={request.peerId}
            className="bg-discord-main rounded-lg p-3 flex items-center"
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white overflow-hidden shrink-0"
              style={{ backgroundColor: request.photoURL ? 'transparent' : request.color }}
            >
              {request.photoURL ? (
                <img src={request.photoURL} alt="" className="w-full h-full object-cover" />
              ) : (
                <i className="fas fa-user"></i>
              )}
            </div>

            <div className="ml-3 flex-1 min-w-0">
              <div className="text-white font-medium text-sm truncate">
                {request.displayName}
              </div>
              <div className="text-discord-muted text-xs">
                wants to join
              </div>
            </div>

            <div className="flex items-center space-x-2 ml-2">
              <button
                onClick={() => onApprove(request)}
                className="w-8 h-8 rounded-full bg-green-500 hover:bg-green-600 text-white flex items-center justify-center transition-colors"
                title="Approve"
              >
                <i className="fas fa-check text-sm"></i>
              </button>
              <button
                onClick={() => onDeny(request)}
                className="w-8 h-8 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors"
                title="Deny"
              >
                <i className="fas fa-times text-sm"></i>
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-discord-sidebar">
        <p className="text-discord-muted text-xs text-center">
          <i className="fas fa-lock mr-1"></i>
          This channel requires approval to join
        </p>
      </div>
    </div>
  );
};
