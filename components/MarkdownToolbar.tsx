import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';
import { useIsMobile } from '../hooks/useIsMobile';

interface MarkdownToolbarProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (before: string, after: string, placeholder: string) => void;
  toggleRef?: React.RefObject<HTMLButtonElement>;
}

interface FormatOption {
  label: string;
  icon: string;
  before: string;
  after: string;
  placeholder: string;
  shortcut?: string;
}

const formatOptions: FormatOption[] = [
  { label: 'Bold', icon: 'fa-bold', before: '**', after: '**', placeholder: 'bold text', shortcut: 'Ctrl+B' },
  { label: 'Italic', icon: 'fa-italic', before: '*', after: '*', placeholder: 'italic text', shortcut: 'Ctrl+I' },
  { label: 'Strikethrough', icon: 'fa-strikethrough', before: '~~', after: '~~', placeholder: 'strikethrough' },
  { label: 'Inline Code', icon: 'fa-code', before: '`', after: '`', placeholder: 'code' },
  { label: 'Code Block', icon: 'fa-file-code', before: '```\n', after: '\n```', placeholder: 'code block' },
  { label: 'Quote', icon: 'fa-quote-left', before: '> ', after: '', placeholder: 'quote' },
  { label: 'Link', icon: 'fa-link', before: '[', after: '](url)', placeholder: 'link text' },
  { label: 'List', icon: 'fa-list-ul', before: '- ', after: '', placeholder: 'list item' },
];

export const MarkdownToolbar: React.FC<MarkdownToolbarProps> = ({
  isOpen,
  onClose,
  onInsert,
  toggleRef
}) => {
  const { colors } = useTheme();
  const isMobile = useIsMobile();
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      // Don't close if clicking the toggle button
      if (toggleRef?.current?.contains(target)) {
        return;
      }
      if (toolbarRef.current && !toolbarRef.current.contains(target)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    // Use setTimeout to avoid immediate trigger from the click that opened it
    setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }, 0);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose, toggleRef]);

  const handleFormat = (option: FormatOption) => {
    onInsert(option.before, option.after, option.placeholder);
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
              className="fixed inset-0 bg-black/60 z-modal"
              onClick={onClose}
            />

            {/* Bottom Sheet */}
            <motion.div
              ref={toolbarRef}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[31] rounded-t-3xl overflow-hidden"
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
                <h3 className="text-lg font-bold text-white">Text Formatting</h3>
                <p className="text-sm text-white/50">Tap to insert markdown</p>
              </div>

              {/* Format options grid */}
              <div className="grid grid-cols-4 gap-2 p-4">
                {formatOptions.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleFormat(option)}
                    className="flex flex-col items-center p-3 rounded-xl bg-white/5 active:bg-white/10 transition-colors"
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center mb-2"
                      style={{ backgroundColor: `${colors.primary}20` }}
                    >
                      <i className={`fas ${option.icon}`} style={{ color: colors.primary }}></i>
                    </div>
                    <span className="text-xs text-white/70">{option.label}</span>
                  </button>
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

  // Desktop: Popup toolbar
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={toolbarRef}
          initial={{ opacity: 0, y: 8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className="absolute bottom-full left-0 mb-2 z-modal rounded-lg overflow-hidden shadow-xl"
          style={{
            background: 'linear-gradient(180deg, rgba(30, 30, 42, 0.98), rgba(22, 22, 30, 0.99))',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(12px)',
          }}
        >
          {/* Header */}
          <div className="px-3 py-2 border-b border-white/10">
            <span className="text-xs font-bold text-discord-muted uppercase">Formatting</span>
          </div>

          {/* Format options */}
          <div className="p-1">
            {formatOptions.map((option, index) => (
              <button
                key={index}
                onClick={() => handleFormat(option)}
                className="w-full flex items-center px-3 py-2 text-left hover:bg-white/10 rounded transition-colors group"
              >
                <i className={`fas ${option.icon} w-5 text-center mr-3 text-discord-muted group-hover:text-white transition-colors`}></i>
                <span className="text-discord-text group-hover:text-white text-sm font-medium transition-colors flex-1">
                  {option.label}
                </span>
                {option.shortcut && (
                  <span className="text-[10px] text-discord-muted bg-discord-dark px-1.5 py-0.5 rounded">
                    {option.shortcut}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Preview hint */}
          <div className="px-3 py-2 border-t border-white/10 bg-white/5">
            <p className="text-[10px] text-discord-muted">
              <span className="font-bold">Example:</span> **bold** → <strong className="text-white">bold</strong>
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
