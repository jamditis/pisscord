import React, { useEffect, useState, useRef } from 'react';

type SplashTheme = 'gold' | 'purple';

interface SplashScreenProps {
  onComplete: () => void;
  duration?: number;
  theme?: SplashTheme;
  onTap?: () => void; // Called when user taps splash screen (for audio unlock)
}

const themes = {
  gold: {
    logo: './pisscord-gold.png',
    primary: '#f0e130',
    glow: 'rgba(240, 225, 48, 0.5)',
  },
  purple: {
    logo: './pisscord-purple.png',
    primary: '#a855f7',
    glow: 'rgba(168, 85, 247, 0.5)',
  },
};

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onComplete,
  duration = 3000,
  theme = 'purple',
  onTap,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [hasTapped, setHasTapped] = useState(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const onTapRef = useRef(onTap);
  onTapRef.current = onTap;
  const colors = themes[theme];

  // Handle tap to unlock audio
  const handleTap = () => {
    if (!hasTapped) {
      setHasTapped(true);
      onTapRef.current?.();
    }
  };

  // Preload the image before showing anything
  useEffect(() => {
    const img = new Image();
    img.onload = () => setIsReady(true);
    img.onerror = () => setIsReady(true);
    img.src = colors.logo;
  }, [colors.logo]);

  // Start exit after duration
  useEffect(() => {
    if (!isReady) return;

    const timer = setTimeout(() => {
      setIsVisible(false);
    }, duration - 500); // Start fade 500ms before end

    const completeTimer = setTimeout(() => {
      onCompleteRef.current();
    }, duration);

    return () => {
      clearTimeout(timer);
      clearTimeout(completeTimer);
    };
  }, [duration, isReady]);

  // Don't render until image is loaded
  if (!isReady) {
    return (
      <div
        className="fixed inset-0 z-splash"
        style={{ backgroundColor: '#0a0a0f' }}
      />
    );
  }

  return (
    <div
      className="fixed inset-0 z-splash flex items-center justify-center cursor-pointer"
      style={{
        backgroundColor: '#0a0a0f',
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 0.5s ease-out',
      }}
      onClick={handleTap}
    >
      {/* Simple centered content */}
      <div className="flex flex-col items-center">
        {/* Logo with simple CSS glow animation */}
        <div
          className="relative"
          style={{
            animation: 'fadeInScale 0.6s ease-out forwards',
          }}
        >
          <img
            src={colors.logo}
            alt="Pisscord"
            className="w-28 h-28 rounded-full"
            style={{
              boxShadow: `0 0 60px ${colors.glow}`,
              animation: 'gentlePulse 2s ease-in-out infinite',
            }}
          />
        </div>

        {/* Text */}
        <h1
          className="mt-6 text-2xl font-bold tracking-[0.2em]"
          style={{
            color: colors.primary,
            textShadow: `0 0 20px ${colors.glow}`,
            animation: 'fadeInUp 0.5s ease-out 0.3s both',
          }}
        >
          PISSCORD
        </h1>

        <p
          className="mt-2 text-xs tracking-[0.3em] uppercase text-gray-500"
          style={{
            animation: 'fadeInUp 0.5s ease-out 0.5s both',
          }}
        >
          Pee-to-Pee Chat
        </p>
      </div>

      {/* CSS Keyframes */}
      <style>{`
        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes gentlePulse {
          0%, 100% {
            box-shadow: 0 0 40px ${colors.glow};
          }
          50% {
            box-shadow: 0 0 60px ${colors.glow};
          }
        }
      `}</style>
    </div>
  );
};
