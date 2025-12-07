import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { JoinRequest } from '../types';
import { useIsMobile } from '../hooks/useIsMobile';
import { HapticsService } from '../services/platform';

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
  const isMobile = useIsMobile();

  if (requests.length === 0) return null;

  // Mobile layout - bottom sheet style
  if (isMobile) {
    return (
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-20 left-0 right-0 z-50 px-4"
      >
        <div className="bg-gradient-to-b from-[#2a2a4a] to-[#1a1a2e] rounded-2xl shadow-xl border border-white/10 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-xl bg-yellow-500/20 flex items-center justify-center mr-3">
                <i className="fas fa-door-open text-yellow-400"></i>
              </div>
              <span className="text-white font-bold">Join Requests</span>
            </div>
            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-bold">
              {requests.length}
            </span>
          </div>

          {/* Requests */}
          <div className="max-h-48 overflow-y-auto">
            <AnimatePresence>
              {requests.map((request, index) => (
                <motion.div
                  key={request.peerId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center px-4 py-3 border-b border-white/5 last:border-0"
                >
                  {/* Avatar */}
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-white overflow-hidden shrink-0"
                    style={{ backgroundColor: request.photoURL ? 'transparent' : request.color }}
                  >
                    {request.photoURL ? (
                      <img src={request.photoURL} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <i className="fas fa-user"></i>
                    )}
                  </div>

                  {/* Info */}
                  <div className="ml-3 flex-1 min-w-0">
                    <div className="text-white font-medium text-sm truncate">
                      {request.displayName}
                    </div>
                    <div className="text-white/40 text-xs">
                      wants to join
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 ml-2">
                    <motion.button
                      onClick={() => {
                        HapticsService.impact('light');
                        onApprove(request);
                      }}
                      whileTap={{ scale: 0.9 }}
                      className="w-10 h-10 rounded-xl bg-green-500/20 text-green-400 flex items-center justify-center"
                    >
                      <i className="fas fa-check"></i>
                    </motion.button>
                    <motion.button
                      onClick={() => {
                        HapticsService.impact('light');
                        onDeny(request);
                      }}
                      whileTap={{ scale: 0.9 }}
                      className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center"
                    >
                      <i className="fas fa-times"></i>
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="px-4 py-2 bg-white/5">
            <p className="text-white/30 text-xs text-center">
              <i className="fas fa-lock mr-1"></i>
              Approval required
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  // Desktop layout
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
