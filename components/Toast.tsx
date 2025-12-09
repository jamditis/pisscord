import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useIsMobile } from '../hooks/useIsMobile';
import { playSound } from '../services/sounds';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const duration = toast.duration || 3500; // Default 3.5 seconds
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, duration - 300);

    const dismissTimer = setTimeout(() => {
      onDismiss(toast.id);
    }, duration);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(dismissTimer);
    };
  }, [toast.id, toast.duration, onDismiss]);

  const icons: Record<ToastType, string> = {
    success: 'fa-check-circle',
    error: 'fa-exclamation-circle',
    info: 'fa-info-circle',
    warning: 'fa-exclamation-triangle'
  };

  const colors: Record<ToastType, string> = {
    success: 'text-discord-green',
    error: 'text-discord-red',
    info: 'text-discord-accent',
    warning: 'text-yellow-500'
  };

  const bgColors: Record<ToastType, string> = {
    success: 'border-l-discord-green',
    error: 'border-l-discord-red',
    info: 'border-l-discord-accent',
    warning: 'border-l-yellow-500'
  };

  return (
    <div
      className={`
        flex items-start gap-3 p-4 bg-discord-dark border-l-4 ${bgColors[toast.type]}
        rounded-lg shadow-xl min-w-[300px] max-w-[400px]
        transform transition-all duration-300 ease-out
        ${isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'}
      `}
    >
      <i className={`fas ${icons[toast.type]} ${colors[toast.type]} text-xl mt-0.5`}></i>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white text-sm">{toast.title}</p>
        {toast.message && (
          <p className="text-discord-muted text-sm mt-1 break-words">{toast.message}</p>
        )}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-discord-muted hover:text-white transition-colors p-1 -m-1"
      >
        <i className="fas fa-times text-sm"></i>
      </button>
    </div>
  );
};

// Mobile Toast Component
const MobileToast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  useEffect(() => {
    const duration = toast.duration || 3500;
    const dismissTimer = setTimeout(() => {
      onDismiss(toast.id);
    }, duration);

    return () => clearTimeout(dismissTimer);
  }, [toast.id, toast.duration, onDismiss]);

  const icons: Record<ToastType, string> = {
    success: 'fa-check-circle',
    error: 'fa-exclamation-circle',
    info: 'fa-info-circle',
    warning: 'fa-exclamation-triangle'
  };

  const colors: Record<ToastType, { bg: string; text: string; border: string }> = {
    success: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
    error: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
    info: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
    warning: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' }
  };

  const style = colors[toast.type];

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      className={`flex items-center gap-3 px-4 py-3 ${style.bg} border ${style.border} rounded-2xl shadow-xl backdrop-blur-sm mx-4`}
    >
      <div className={`w-8 h-8 rounded-xl ${style.bg} flex items-center justify-center shrink-0`}>
        <i className={`fas ${icons[toast.type]} ${style.text}`}></i>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white text-sm">{toast.title}</p>
        {toast.message && (
          <p className="text-white/50 text-xs mt-0.5 truncate">{toast.message}</p>
        )}
      </div>
      <motion.button
        onClick={() => onDismiss(toast.id)}
        whileTap={{ scale: 0.9 }}
        className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center shrink-0"
      >
        <i className="fas fa-times text-white/50 text-sm"></i>
      </motion.button>
    </motion.div>
  );
};

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  const isMobile = useIsMobile();

  if (toasts.length === 0) return null;

  // Mobile layout - top of screen, full width
  if (isMobile) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[200] pt-[env(safe-area-inset-top)] pointer-events-none">
        <div className="pt-2 flex flex-col gap-2">
          <AnimatePresence mode="popLayout">
            {toasts.map((toast) => (
              <div key={toast.id} className="pointer-events-auto">
                <MobileToast toast={toast} onDismiss={onDismiss} />
              </div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // Desktop layout
  return (
    <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="pointer-events-auto"
          >
            <Toast toast={toast} onDismiss={onDismiss} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

// Hook for managing toasts
export const useToast = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: ToastType, title: string, message?: string, duration?: number) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message, duration }]);
    
    if (type === 'error') {
      playSound('error');
    }
    
    return id;
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const success = (title: string, message?: string) => addToast('success', title, message);
  const error = (title: string, message?: string) => addToast('error', title, message, 6000);
  const info = (title: string, message?: string) => addToast('info', title, message);
  const warning = (title: string, message?: string) => addToast('warning', title, message, 5000);

  return {
    toasts,
    addToast,
    dismissToast,
    success,
    error,
    info,
    warning
  };
};
