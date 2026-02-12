import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useIsMobile } from '../hooks/useIsMobile';
import { HapticsService } from '../services/platform';

export interface ContextMenuItem {
  label: string;
  icon?: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  divider?: boolean;
}

interface ContextMenuProps {
  items: ContextMenuItem[];
  x: number;
  y: number;
  onClose: () => void;
}

// Mobile Action Sheet Component
const MobileActionSheet: React.FC<{ items: ContextMenuItem[]; onClose: () => void }> = ({ items, onClose }) => {
  useEffect(() => {
    HapticsService.impact('medium');
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-context bg-black/60 backdrop-blur-sm flex items-end justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-gradient-to-b from-[#2a2a4a] to-[#1a1a2e] rounded-t-3xl overflow-hidden pb-[env(safe-area-inset-bottom)]"
      >
        {/* Handle indicator */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-white/20"></div>
        </div>

        {/* Menu items */}
        <div className="px-4 pb-4">
          {items.map((item, index) => {
            if (item.divider) {
              return <div key={index} className="border-t border-white/10 my-2" />;
            }
            return (
              <motion.button
                key={index}
                onClick={() => {
                  if (!item.disabled) {
                    HapticsService.impact('light');
                    item.onClick();
                    onClose();
                  }
                }}
                disabled={item.disabled}
                whileTap={{ scale: 0.98 }}
                className={`w-full px-4 py-3.5 rounded-xl mb-1 text-left flex items-center gap-3 transition-all ${
                  item.disabled
                    ? 'text-discord-faint cursor-not-allowed'
                    : item.danger
                      ? 'text-red-400 bg-red-500/10 active:bg-red-500/20'
                      : 'text-white bg-white/5 active:bg-white/10'
                }`}
              >
                {item.icon && (
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    item.danger ? 'bg-red-500/20' : 'bg-white/10'
                  }`}>
                    <i className={`fas ${item.icon} ${item.danger ? 'text-red-400' : 'text-white/70'}`}></i>
                  </div>
                )}
                <span className="font-medium">{item.label}</span>
              </motion.button>
            );
          })}

          {/* Cancel button */}
          <motion.button
            onClick={onClose}
            whileTap={{ scale: 0.98 }}
            className="w-full px-4 py-3.5 rounded-xl mt-2 text-center text-white/50 bg-white/5 font-medium"
          >
            Cancel
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export const ContextMenu: React.FC<ContextMenuProps> = ({ items, x, y, onClose }) => {
  const isMobile = useIsMobile();

  // Mobile: show action sheet
  if (isMobile) {
    return <MobileActionSheet items={items} onClose={onClose} />;
  }

  // Desktop: traditional context menu
  return <DesktopContextMenu items={items} x={x} y={y} onClose={onClose} />;
};

const DesktopContextMenu: React.FC<ContextMenuProps> = ({ items, x, y, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x, y });

  useEffect(() => {
    // Adjust position if menu would go off screen
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const newX = x + rect.width > window.innerWidth ? x - rect.width : x;
      const newY = y + rect.height > window.innerHeight ? y - rect.height : y;
      setPosition({ x: Math.max(0, newX), y: Math.max(0, newY) });
    }
  }, [x, y]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="fixed bg-discord-dark border border-discord-sidebar rounded-lg shadow-xl py-1 min-w-[180px] z-context animate-in fade-in zoom-in-95 duration-100"
      style={{ left: position.x, top: position.y }}
    >
      {items.map((item, index) => {
        if (item.divider) {
          return <div key={index} className="border-t border-discord-sidebar my-1" />;
        }
        return (
          <button
            key={index}
            onClick={() => {
              if (!item.disabled) {
                item.onClick();
                onClose();
              }
            }}
            disabled={item.disabled}
            className={`
              w-full px-3 py-2 text-left text-sm flex items-center gap-2
              ${item.disabled
                ? 'text-discord-muted cursor-not-allowed'
                : item.danger
                  ? 'text-discord-red hover:bg-discord-red hover:text-white'
                  : 'text-discord-text hover:bg-discord-accent hover:text-white'
              }
              transition-colors
            `}
          >
            {item.icon && <i className={`fas ${item.icon} w-4 text-center`}></i>}
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
};

// Hook for managing context menu state
export const useContextMenu = () => {
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    items: ContextMenuItem[];
  } | null>(null);

  const showContextMenu = (e: React.MouseEvent, items: ContextMenuItem[]) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, items });
  };

  const hideContextMenu = () => setContextMenu(null);

  return { contextMenu, showContextMenu, hideContextMenu };
};
