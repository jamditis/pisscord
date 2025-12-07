import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppTheme } from '../types';

// Theme color definitions
export const themeColors = {
  gold: {
    // Primary accent
    primary: '#f0e130',
    primaryRgb: '240, 225, 48',

    // Tailwind class equivalents
    accent: 'yellow-400',
    accentHover: 'yellow-500',
    accentBg: 'yellow-400/10',
    accentBgHover: 'yellow-400/20',
    accentBorder: 'yellow-400/30',
    accentText: 'yellow-400',

    // Glow effects
    glow: 'rgba(240, 225, 48, 0.5)',
    glowLight: 'rgba(240, 225, 48, 0.3)',
    glowFaint: 'rgba(240, 225, 48, 0.1)',

    // Gradient
    gradientFrom: '#f0e130',
    gradientTo: '#c4b82a',
  },
  purple: {
    // Primary accent
    primary: '#a855f7',
    primaryRgb: '168, 85, 247',

    // Tailwind class equivalents
    accent: 'purple-400',
    accentHover: 'purple-500',
    accentBg: 'purple-500/10',
    accentBgHover: 'purple-500/20',
    accentBorder: 'purple-500/30',
    accentText: 'purple-400',

    // Glow effects
    glow: 'rgba(168, 85, 247, 0.5)',
    glowLight: 'rgba(168, 85, 247, 0.3)',
    glowFaint: 'rgba(168, 85, 247, 0.1)',

    // Gradient
    gradientFrom: '#a855f7',
    gradientTo: '#7c3aed',
  },
};

export type ThemeColors = typeof themeColors.gold;

interface ThemeContextType {
  theme: AppTheme;
  colors: ThemeColors;
  setTheme: (theme: AppTheme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  initialTheme?: AppTheme;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children, initialTheme = 'purple' }) => {
  const [theme, setTheme] = useState<AppTheme>(initialTheme);

  const colors = themeColors[theme];

  return (
    <ThemeContext.Provider value={{ theme, colors, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Helper hook to get dynamic Tailwind classes based on theme
export const useThemeClasses = () => {
  const { theme } = useTheme();

  return {
    // Text colors
    textAccent: theme === 'gold' ? 'text-yellow-400' : 'text-purple-400',
    textAccentHover: theme === 'gold' ? 'hover:text-yellow-300' : 'hover:text-purple-300',

    // Background colors
    bgAccent: theme === 'gold' ? 'bg-yellow-400' : 'bg-purple-500',
    bgAccentLight: theme === 'gold' ? 'bg-yellow-400/10' : 'bg-purple-500/10',
    bgAccentMedium: theme === 'gold' ? 'bg-yellow-400/20' : 'bg-purple-500/20',

    // Border colors
    borderAccent: theme === 'gold' ? 'border-yellow-400' : 'border-purple-400',
    borderAccentLight: theme === 'gold' ? 'border-yellow-400/30' : 'border-purple-500/30',

    // Ring colors (for focus states)
    ringAccent: theme === 'gold' ? 'ring-yellow-400' : 'ring-purple-400',

    // Active/selected states
    activeTab: theme === 'gold' ? 'bg-yellow-400/20 text-yellow-400' : 'bg-purple-500/20 text-purple-400',

    // Button styles
    btnPrimary: theme === 'gold'
      ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-black'
      : 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white',
    btnOutline: theme === 'gold'
      ? 'border-yellow-400/30 text-yellow-400 bg-yellow-400/10'
      : 'border-purple-500/30 text-purple-400 bg-purple-500/10',
  };
};
