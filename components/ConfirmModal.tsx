import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useIsMobile } from '../hooks/useIsMobile';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmStyle?: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmStyle = 'primary',
  onConfirm,
  onCancel
}) => {
  const isMobile = useIsMobile();

  if (!isOpen) return null;

  // Mobile layout
  if (isMobile) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex items-end justify-center bg-black/60 backdrop-blur-sm"
          onClick={onCancel}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-gradient-to-b from-[#2a2a4a] to-[#1a1a2e] rounded-t-3xl overflow-hidden pb-[env(safe-area-inset-bottom)]"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-white/20"></div>
            </div>

            {/* Content */}
            <div className="px-6 py-4 text-center">
              <h2 className="text-xl font-bold text-white mb-2">{title}</h2>
              <p className="text-white/60">{message}</p>
            </div>

            {/* Buttons */}
            <div className="px-4 pb-4 space-y-2">
              <motion.button
                onClick={onConfirm}
                whileTap={{ scale: 0.98 }}
                className={`w-full py-3.5 rounded-xl font-medium transition-all ${
                  confirmStyle === 'danger'
                    ? 'bg-red-500 text-white'
                    : 'bg-purple-500 text-white'
                }`}
              >
                {confirmText}
              </motion.button>
              <motion.button
                onClick={onCancel}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3.5 rounded-xl font-medium bg-white/5 text-white/70"
              >
                {cancelText}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // Desktop layout
  const confirmButtonClass = confirmStyle === 'danger'
    ? 'bg-discord-red hover:bg-red-600'
    : 'bg-discord-accent hover:bg-indigo-600';

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative bg-discord-dark rounded-lg shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="p-4 border-b border-discord-sidebar">
          <h2 className="text-xl font-bold text-white">{title}</h2>
        </div>

        {/* Body */}
        <div className="p-4">
          <p className="text-discord-text">{message}</p>
        </div>

        {/* Footer */}
        <div className="p-4 bg-discord-sidebar flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-white hover:underline transition-all"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium text-white rounded transition-all ${confirmButtonClass}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
