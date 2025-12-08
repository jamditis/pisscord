import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type SplashTheme = 'gold' | 'purple';

interface SplashScreenProps {
  onComplete: () => void;
  duration?: number; // Total duration in ms
  theme?: SplashTheme;
}

// Theme color configurations
const themes = {
  gold: {
    logo: './pisscord-gold.png',
    primary: '#f0e130',
    primaryRgb: '240, 225, 48',
    glow: 'rgba(240, 225, 48, 0.6)',
    glowLight: 'rgba(240, 225, 48, 0.5)',
    glowFaint: 'rgba(240, 225, 48, 0.08)',
    particle: '#f0e130',
  },
  purple: {
    logo: './pisscord-purple.png',
    primary: '#a855f7',
    primaryRgb: '168, 85, 247',
    glow: 'rgba(168, 85, 247, 0.6)',
    glowLight: 'rgba(168, 85, 247, 0.5)',
    glowFaint: 'rgba(168, 85, 247, 0.08)',
    particle: '#a855f7',
  },
};

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onComplete,
  duration = 4300, // Extended for 1.5s pause at end
  theme = 'gold',
}) => {
  const [phase, setPhase] = useState<'particles' | 'logo' | 'text' | 'flourish' | 'hold' | 'exit'>('particles');
  const colors = themes[theme];

  // Store onComplete in a ref to avoid re-running effect when callback changes
  const onCompleteRef = React.useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const timeline = [
      { phase: 'logo' as const, delay: 400 },
      { phase: 'text' as const, delay: 800 },
      { phase: 'flourish' as const, delay: 1400 },
      { phase: 'hold' as const, delay: 2200 },     // Hold for admiration
      { phase: 'exit' as const, delay: 3700 },     // Exit after 1.5s hold
    ];

    const timeouts = timeline.map(({ phase, delay }) =>
      setTimeout(() => setPhase(phase), delay)
    );

    const completeTimeout = setTimeout(() => onCompleteRef.current(), duration);

    return () => {
      timeouts.forEach(clearTimeout);
      clearTimeout(completeTimeout);
    };
  }, [duration]); // Only re-run if duration changes, not onComplete

  // Generate particles
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 4 + 2,
    delay: Math.random() * 0.5,
  }));

  return (
    <AnimatePresence>
      {phase !== 'exit' && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #0a0a0f 0%, #12121a 50%, #0a0a0f 100%)',
          }}
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            scale: 1.1,
            filter: 'blur(20px)',
          }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        >
          {/* Animated gradient background */}
          <motion.div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(circle at 50% 50%, ${colors.glowFaint} 0%, transparent 50%)`,
            }}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />

          {/* Floating particles */}
          {particles.map((particle) => (
            <motion.div
              key={particle.id}
              className="absolute rounded-full"
              style={{
                left: `${particle.x}%`,
                top: `${particle.y}%`,
                width: particle.size,
                height: particle.size,
                background: particle.id % 3 === 0 ? colors.particle : 'rgba(255, 255, 255, 0.3)',
              }}
              initial={{ opacity: 0, scale: 0 }}
              animate={{
                opacity: [0, 0.8, 0],
                scale: [0, 1, 0],
                y: [0, -50, -100],
              }}
              transition={{
                duration: 2,
                delay: particle.delay,
                repeat: Infinity,
                ease: 'easeOut',
              }}
            />
          ))}

          {/* Main content container */}
          <div className="relative flex flex-col items-center justify-center">
            {/* Ring burst effect */}
            <motion.div
              className="absolute"
              initial={{ scale: 0, opacity: 0 }}
              animate={phase === 'flourish' ? {
                scale: [0, 3],
                opacity: [0.8, 0],
              } : {}}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            >
              <div
                className="w-32 h-32 rounded-full"
                style={{
                  border: `2px solid ${colors.primary}`,
                  boxShadow: `0 0 40px ${colors.glowLight}`,
                }}
              />
            </motion.div>

            {/* Second ring burst */}
            <motion.div
              className="absolute"
              initial={{ scale: 0, opacity: 0 }}
              animate={phase === 'flourish' ? {
                scale: [0, 4],
                opacity: [0.5, 0],
              } : {}}
              transition={{ duration: 1, delay: 0.1, ease: 'easeOut' }}
            >
              <div
                className="w-32 h-32 rounded-full"
                style={{
                  border: `1px solid ${colors.glowLight}`,
                }}
              />
            </motion.div>

            {/* Logo container with glow */}
            <motion.div
              className="relative"
              initial={{ scale: 0, rotate: -180, opacity: 0 }}
              animate={phase !== 'particles' ? {
                scale: 1,
                rotate: 0,
                opacity: 1,
              } : {}}
              transition={{
                type: 'spring',
                stiffness: 200,
                damping: 15,
                duration: 0.8,
              }}
            >
              {/* Glow effect behind logo */}
              <motion.div
                className="absolute inset-0 blur-2xl"
                style={{
                  background: `radial-gradient(circle, rgba(${colors.primaryRgb}, 0.4) 0%, transparent 70%)`,
                }}
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.4, 0.8, 0.4],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />

              {/* Logo image */}
              <motion.img
                src={colors.logo}
                alt="Pisscord"
                className="relative z-10 w-32 h-32 object-cover rounded-full"
                style={{
                  filter: `drop-shadow(0 0 30px ${colors.glow})`,
                }}
                animate={phase === 'flourish' || phase === 'hold' ? {
                  scale: [1, 1.15, 1],
                } : {}}
                transition={{
                  duration: 0.4,
                  ease: 'easeOut',
                }}
              />
            </motion.div>

            {/* App name with letter-by-letter animation */}
            <motion.div
              className="mt-6 overflow-hidden"
              initial={{ opacity: 0 }}
              animate={phase === 'text' || phase === 'flourish' || phase === 'hold' ? { opacity: 1 } : {}}
            >
              <div className="flex justify-center">
                {'PISSCORD'.split('').map((letter, index) => (
                  <motion.span
                    key={index}
                    className="text-3xl font-bold tracking-widest"
                    style={{
                      color: colors.primary,
                      textShadow: `0 0 20px ${colors.glowLight}`,
                    }}
                    initial={{ y: 40, opacity: 0, filter: 'blur(10px)' }}
                    animate={phase === 'text' || phase === 'flourish' || phase === 'hold' ? {
                      y: 0,
                      opacity: 1,
                      filter: 'blur(0px)',
                    } : {}}
                    transition={{
                      delay: index * 0.05,
                      duration: 0.4,
                      ease: [0.25, 0.46, 0.45, 0.94],
                    }}
                  >
                    {letter}
                  </motion.span>
                ))}
              </div>
            </motion.div>

            {/* Tagline */}
            <motion.p
              className="mt-2 text-sm tracking-[0.3em] uppercase"
              style={{ color: 'rgba(255, 255, 255, 0.5)' }}
              initial={{ opacity: 0, y: 10 }}
              animate={phase === 'flourish' || phase === 'hold' ? {
                opacity: 1,
                y: 0,
              } : {}}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              Pee-to-Pee Chat
            </motion.p>

            {/* Sparkle effects on flourish */}
            {phase === 'flourish' && (
              <>
                {[...Array(8)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute"
                    style={{
                      width: 4,
                      height: 4,
                      background: colors.primary,
                      borderRadius: '50%',
                      boxShadow: `0 0 10px ${colors.primary}`,
                    }}
                    initial={{
                      x: 0,
                      y: 0,
                      scale: 0,
                      opacity: 1,
                    }}
                    animate={{
                      x: Math.cos((i * Math.PI * 2) / 8) * 120,
                      y: Math.sin((i * Math.PI * 2) / 8) * 120,
                      scale: [0, 1.5, 0],
                      opacity: [1, 1, 0],
                    }}
                    transition={{
                      duration: 0.8,
                      ease: 'easeOut',
                    }}
                  />
                ))}
              </>
            )}
          </div>

          {/* Bottom gradient fade */}
          <div
            className="absolute bottom-0 left-0 right-0 h-32"
            style={{
              background: 'linear-gradient(to top, rgba(10, 10, 15, 0.8), transparent)',
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
