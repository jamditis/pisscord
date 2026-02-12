import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';
import { useIsMobile } from '../hooks/useIsMobile';

interface QuickEmojiPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onEmojiSelect: (emoji: string) => void;
  toggleRef?: React.RefObject<HTMLButtonElement>;
}

interface EmojiCategory {
  name: string;
  icon: string;
  emojis: string[];
}

const RECENT_EMOJIS_KEY = 'pisscord_recent_emojis';
const MAX_RECENT = 16;

const emojiCategories: EmojiCategory[] = [
  {
    name: 'Smileys',
    icon: 'fa-smile',
    emojis: ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😍', '🥰', '😘', '😋', '😜', '🤪', '😎', '🤩', '🥳', '😏', '😒', '😞', '😢', '😭', '😤', '😠', '🤯', '😱', '🥶', '🤮', '🤧']
  },
  {
    name: 'Gestures',
    icon: 'fa-hand-paper',
    emojis: ['👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👋', '🖐️', '✋', '🖖', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '💪', '🦾', '🖕', '✍️', '🤳', '💅']
  },
  {
    name: 'Hearts',
    icon: 'fa-heart',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟']
  },
  {
    name: 'Objects',
    icon: 'fa-lightbulb',
    emojis: ['🔥', '⭐', '✨', '💫', '🌟', '💥', '💯', '🎉', '🎊', '🎁', '🏆', '🥇', '🎮', '🎧', '🎵', '🎶', '💻', '📱', '⌨️', '🖥️', '💡', '🔔', '📢', '💰']
  },
  {
    name: 'Symbols',
    icon: 'fa-check-circle',
    emojis: ['✅', '❌', '⭕', '❓', '❗', '💤', '💢', '💬', '👁️‍🗨️', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪', '🟤', '▶️', '⏸️', '⏹️', '⏯️', '🔁', '🔀']
  }
];

export const QuickEmojiPicker: React.FC<QuickEmojiPickerProps> = ({
  isOpen,
  onClose,
  onEmojiSelect,
  toggleRef
}) => {
  const { colors } = useTheme();
  const isMobile = useIsMobile();
  const pickerRef = useRef<HTMLDivElement>(null);

  const [activeCategory, setActiveCategory] = useState(0);
  const [recentEmojis, setRecentEmojis] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(RECENT_EMOJIS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [searchQuery, setSearchQuery] = useState('');

  // Handle click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      // Don't close if clicking the toggle button
      if (toggleRef?.current?.contains(target)) {
        return;
      }
      if (pickerRef.current && !pickerRef.current.contains(target)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }, 0);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose, toggleRef]);

  const handleEmojiClick = (emoji: string) => {
    // Add to recent
    const newRecent = [emoji, ...recentEmojis.filter(e => e !== emoji)].slice(0, MAX_RECENT);
    setRecentEmojis(newRecent);
    localStorage.setItem(RECENT_EMOJIS_KEY, JSON.stringify(newRecent));

    onEmojiSelect(emoji);
    onClose();
  };

  // Filter emojis by search (simple name matching - in production you'd have emoji names)
  const filteredCategories = searchQuery
    ? [{ name: 'Search Results', icon: 'fa-search', emojis: emojiCategories.flatMap(c => c.emojis) }]
    : emojiCategories;

  // Mobile: Full screen picker
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
              ref={pickerRef}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[31] rounded-t-3xl overflow-hidden max-h-[70vh]"
              style={{
                background: 'linear-gradient(180deg, rgba(26, 26, 38, 0.98), rgba(18, 18, 26, 0.99))',
                paddingBottom: 'env(safe-area-inset-bottom, 20px)',
              }}
            >
              {/* Handle bar */}
              <div className="flex justify-center py-3">
                <div className="w-10 h-1 rounded-full bg-white/20"></div>
              </div>

              {/* Search */}
              <div className="px-4 pb-3">
                <div className="bg-white/5 rounded-xl flex items-center px-3">
                  <i className="fas fa-search text-discord-faint"></i>
                  <input
                    type="text"
                    placeholder="Search emojis..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 bg-transparent border-none outline-none text-white px-3 py-2.5 placeholder-white/30"
                  />
                </div>
              </div>

              {/* Category tabs */}
              <div className="flex px-4 pb-3 space-x-2 overflow-x-auto scrollbar-hide">
                {recentEmojis.length > 0 && (
                  <button
                    onClick={() => setActiveCategory(-1)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      activeCategory === -1 ? 'bg-white/10 text-white' : 'text-white/50'
                    }`}
                  >
                    <i className="fas fa-clock mr-1"></i> Recent
                  </button>
                )}
                {emojiCategories.map((cat, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveCategory(i)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                      activeCategory === i ? 'bg-white/10 text-white' : 'text-white/50'
                    }`}
                  >
                    <i className={`fas ${cat.icon} mr-1`}></i> {cat.name}
                  </button>
                ))}
              </div>

              {/* Emoji grid */}
              <div className="px-4 pb-4 max-h-60 overflow-y-auto">
                <div className="grid grid-cols-8 gap-1">
                  {(activeCategory === -1 ? recentEmojis : emojiCategories[activeCategory]?.emojis || []).map((emoji, i) => (
                    <button
                      key={i}
                      onClick={() => handleEmojiClick(emoji)}
                      className="w-10 h-10 rounded-lg hover:bg-white/10 active:bg-white/20 flex items-center justify-center text-2xl transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  // Desktop: Compact popup picker
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={pickerRef}
          initial={{ opacity: 0, y: 8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className="absolute bottom-full right-0 mb-2 z-modal rounded-lg overflow-hidden shadow-xl w-80"
          style={{
            background: 'linear-gradient(180deg, rgba(30, 30, 42, 0.98), rgba(22, 22, 30, 0.99))',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(12px)',
          }}
        >
          {/* Search */}
          <div className="p-2 border-b border-white/10">
            <div className="bg-discord-dark rounded flex items-center px-2">
              <i className="fas fa-search text-discord-muted text-xs"></i>
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-white px-2 py-1.5 text-sm placeholder-discord-muted"
              />
            </div>
          </div>

          {/* Category tabs */}
          <div className="flex px-2 py-1 space-x-1 border-b border-white/10 overflow-x-auto scrollbar-hide">
            {recentEmojis.length > 0 && (
              <button
                onClick={() => setActiveCategory(-1)}
                className={`p-1.5 rounded transition-colors ${
                  activeCategory === -1 ? 'bg-white/10 text-white' : 'text-discord-muted hover:text-white'
                }`}
                title="Recent"
              >
                <i className="fas fa-clock text-sm"></i>
              </button>
            )}
            {emojiCategories.map((cat, i) => (
              <button
                key={i}
                onClick={() => setActiveCategory(i)}
                className={`p-1.5 rounded transition-colors ${
                  activeCategory === i ? 'bg-white/10 text-white' : 'text-discord-muted hover:text-white'
                }`}
                title={cat.name}
              >
                <i className={`fas ${cat.icon} text-sm`}></i>
              </button>
            ))}
          </div>

          {/* Emoji grid */}
          <div className="p-2 max-h-48 overflow-y-auto">
            <div className="grid grid-cols-8 gap-0.5">
              {(activeCategory === -1 ? recentEmojis : emojiCategories[activeCategory]?.emojis || []).map((emoji, i) => (
                <button
                  key={i}
                  onClick={() => handleEmojiClick(emoji)}
                  className="w-8 h-8 rounded hover:bg-white/10 flex items-center justify-center text-lg transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Footer hint */}
          <div className="px-2 py-1.5 border-t border-white/10 bg-white/5">
            <p className="text-[10px] text-discord-muted text-center">
              Custom emojis coming soon!
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
