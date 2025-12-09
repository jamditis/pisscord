import React from 'react';
import { motion } from 'framer-motion';

// --- 1. Void Background (Slow moving deep gradients) ---
export const VoidBackground = () => {
  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none bg-[#0a0a0f]">
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          rotate: [0, 15, -15, 0],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] rounded-full bg-gradient-to-br from-purple-900/20 via-transparent to-yellow-900/10 blur-3xl"
      />
      <motion.div
        animate={{
          scale: [1.2, 1, 1.2],
          rotate: [0, -20, 20, 0],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        className="absolute bottom-[-50%] right-[-50%] w-[200%] h-[200%] rounded-full bg-gradient-to-tl from-indigo-900/20 via-transparent to-purple-900/10 blur-3xl"
      />
    </div>
  );
};

// --- 2. Glitch Text (CSS-based) ---
// Requires specific CSS in index.css for the clip-path animations
export const GlitchText: React.FC<{ text: string; className?: string }> = ({ text, className = "" }) => {
  return (
    <div className={`relative inline-block group ${className}`}>
      <span className="relative z-10">{text}</span>
      <span className="absolute top-0 left-0 -z-10 w-full h-full text-[#f0e130] opacity-0 group-hover:opacity-70 animate-glitch-1 translate-x-[2px]">
        {text}
      </span>
      <span className="absolute top-0 left-0 -z-10 w-full h-full text-[#8b5cf6] opacity-0 group-hover:opacity-70 animate-glitch-2 translate-x-[-2px]">
        {text}
      </span>
    </div>
  );
};

// --- 3. Spotlight Card (Hover effect) ---
export const SpotlightCard: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void }> = ({ children, className = "", onClick }) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`relative overflow-hidden rounded-xl bg-white/5 border border-white/10 p-4 group ${className}`}
    >
      {/* Gradient Blob that follows hover could be added here with more complex JS, 
          but for now we'll do a static reveal */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out" />
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
};

// --- 4. Terminal Typing Effect ---
export const Typewriter: React.FC<{ text: string; speed?: number; className?: string }> = ({ text, speed = 50, className = "" }) => {
  const [displayedText, setDisplayedText] = React.useState("");

  React.useEffect(() => {
    let i = 0;
    setDisplayedText("");
    const timer = setInterval(() => {
      if (i < text.length) {
        setDisplayedText((prev) => prev + text.charAt(i));
        i++;
      } else {
        clearInterval(timer);
      }
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);

  return (
    <span className={`${className}`}>
      {displayedText}
      <span className="animate-pulse">_</span>
    </span>
  );
};
