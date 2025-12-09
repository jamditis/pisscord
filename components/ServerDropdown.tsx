import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';
import { useIsMobile } from '../hooks/useIsMobile';
import { LinkService } from '../services/platform';

interface ServerDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MenuItem {
  label: string;
  icon: string;
  href: string;
  external?: boolean;
  divider?: boolean;
}

const menuItems: MenuItem[] = [
  {
    label: 'Product Page',
    icon: 'fa-globe',
    href: 'https://jamditis.github.io/pisscord',
    external: true
  },
  {
    label: 'User Guide',
    icon: 'fa-book',
    href: 'https://jamditis.github.io/pisscord/guide',
    external: true
  },
  {
    label: 'Latest Release',
    icon: 'fa-download',
    href: 'https://github.com/jamditis/pisscord/releases/latest',
    external: true
  },
  {
    label: '',
    icon: '',
    href: '',
    divider: true
  },
  {
    label: 'Contact',
    icon: 'fa-envelope',
    href: 'mailto:jamditis@gmail.com',
    external: true
  }
];

export const ServerDropdown: React.FC<ServerDropdownProps> = ({
  isOpen,
  onClose
}) => {
  const { colors } = useTheme();
  const isMobile = useIsMobile();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    // Delay to prevent immediate close from the same click that opened it
    setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }, 0);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  const handleItemClick = (item: MenuItem) => {
    if (item.divider) return;
    LinkService.openExternal(item.href);
    onClose();
  };

  // Mobile: Bottom sheet style
  if (isMobile) {
    return (
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-[100]"
              onClick={onClose}
            />

            {/* Bottom Sheet */}
            <motion.div
              ref={dropdownRef}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[101] rounded-t-3xl overflow-hidden"
              style={{
                background: 'linear-gradient(180deg, rgba(26, 26, 38, 0.98), rgba(18, 18, 26, 0.99))',
                paddingBottom: 'env(safe-area-inset-bottom, 20px)',
              }}
            >
              {/* Handle bar */}
              <div className="flex justify-center py-3">
                <div className="w-10 h-1 rounded-full bg-white/20"></div>
              </div>

              {/* Header */}
              <div className="px-5 pb-3 border-b border-white/5">
                <h3 className="text-lg font-bold text-white">Pisscord</h3>
                <p className="text-sm text-white/50">Quick Links</p>
              </div>

              {/* Menu Items */}
              <div className="py-2">
                {menuItems.map((item, index) => (
                  item.divider ? (
                    <div key={index} className="h-px bg-white/10 my-2 mx-5"></div>
                  ) : (
                    <button
                      key={index}
                      onClick={() => handleItemClick(item)}
                      className="w-full flex items-center px-5 py-3.5 text-left active:bg-white/10 transition-colors"
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center mr-3"
                        style={{ backgroundColor: `${colors.primary}20` }}
                      >
                        <i className={`fas ${item.icon}`} style={{ color: colors.primary }}></i>
                      </div>
                      <span className="text-white font-medium">{item.label}</span>
                      {item.external && (
                        <i className="fas fa-external-link-alt ml-auto text-white/30 text-xs"></i>
                      )}
                    </button>
                  )
                ))}
              </div>

              {/* Cancel button */}
              <div className="px-5 pb-4 pt-2">
                <button
                  onClick={onClose}
                  className="w-full py-3.5 rounded-xl bg-white/5 text-white font-medium active:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  // Desktop: Dropdown menu
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={dropdownRef}
          initial={{ opacity: 0, y: -8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className="absolute top-full left-0 right-0 mt-1 mx-2 z-[100] rounded-lg overflow-hidden shadow-xl"
          style={{
            background: 'linear-gradient(180deg, rgba(30, 30, 42, 0.98), rgba(22, 22, 30, 0.99))',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(12px)',
          }}
        >
          {menuItems.map((item, index) => (
            item.divider ? (
              <div key={index} className="h-px bg-white/10 my-1"></div>
            ) : (
              <button
                key={index}
                onClick={() => handleItemClick(item)}
                className="w-full flex items-center px-3 py-2.5 text-left hover:bg-white/10 transition-colors group"
              >
                <i
                  className={`fas ${item.icon} w-5 text-center mr-3 text-discord-muted group-hover:text-white transition-colors`}
                  style={{ color: undefined }}
                ></i>
                <span className="text-discord-text group-hover:text-white text-sm font-medium transition-colors">
                  {item.label}
                </span>
                {item.external && (
                  <i className="fas fa-external-link-alt ml-auto text-discord-muted text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"></i>
                )}
              </button>
            )
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
