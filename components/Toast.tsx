import React, { useEffect, useState } from 'react';

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

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

// Hook for managing toasts
export const useToast = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: ToastType, title: string, message?: string, duration?: number) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message, duration }]);
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
