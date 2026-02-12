import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { ThemeProvider, useTheme, useThemeClasses, themeColors } from '../ThemeContext';

const wrapper = ({ children, initialTheme }: { children: React.ReactNode; initialTheme?: 'gold' | 'purple' }) => (
  <ThemeProvider initialTheme={initialTheme}>{children}</ThemeProvider>
);

describe('ThemeContext', () => {
  describe('useTheme', () => {
    it('throws when used outside ThemeProvider', () => {
      // Suppress React error boundary console noise
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      expect(() => renderHook(() => useTheme())).toThrow('useTheme must be used within a ThemeProvider');
      spy.mockRestore();
    });

    it('defaults to purple theme', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
      });
      expect(result.current.theme).toBe('purple');
      expect(result.current.colors).toEqual(themeColors.purple);
    });

    it('respects initialTheme prop', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ({ children }) => <ThemeProvider initialTheme="gold">{children}</ThemeProvider>,
      });
      expect(result.current.theme).toBe('gold');
      expect(result.current.colors).toEqual(themeColors.gold);
    });

    it('switches theme via setTheme', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
      });

      expect(result.current.theme).toBe('purple');

      act(() => {
        result.current.setTheme('gold');
      });

      expect(result.current.theme).toBe('gold');
      expect(result.current.colors.primary).toBe('#f0e130');
    });

    it('switches back from gold to purple', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ({ children }) => <ThemeProvider initialTheme="gold">{children}</ThemeProvider>,
      });

      act(() => {
        result.current.setTheme('purple');
      });

      expect(result.current.theme).toBe('purple');
      expect(result.current.colors.primary).toBe('#a855f7');
    });
  });

  describe('themeColors', () => {
    it('gold has correct primary color', () => {
      expect(themeColors.gold.primary).toBe('#f0e130');
      expect(themeColors.gold.primaryRgb).toBe('240, 225, 48');
    });

    it('purple has correct primary color', () => {
      expect(themeColors.purple.primary).toBe('#a855f7');
      expect(themeColors.purple.primaryRgb).toBe('168, 85, 247');
    });

    it('both themes have all required keys', () => {
      const requiredKeys = ['primary', 'primaryRgb', 'accent', 'accentHover', 'accentBg', 'accentBgHover', 'accentBorder', 'accentText', 'glow', 'glowLight', 'glowFaint', 'gradientFrom', 'gradientTo'];
      for (const key of requiredKeys) {
        expect(themeColors.gold).toHaveProperty(key);
        expect(themeColors.purple).toHaveProperty(key);
      }
    });
  });

  describe('useThemeClasses', () => {
    it('returns purple Tailwind classes by default', () => {
      const { result } = renderHook(() => useThemeClasses(), {
        wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
      });

      expect(result.current.textAccent).toBe('text-purple-400');
      expect(result.current.bgAccent).toBe('bg-purple-500');
      expect(result.current.borderAccent).toBe('border-purple-400');
    });

    it('returns gold Tailwind classes when gold theme is set', () => {
      const { result } = renderHook(() => useThemeClasses(), {
        wrapper: ({ children }) => <ThemeProvider initialTheme="gold">{children}</ThemeProvider>,
      });

      expect(result.current.textAccent).toBe('text-yellow-400');
      expect(result.current.bgAccent).toBe('bg-yellow-400');
      expect(result.current.borderAccent).toBe('border-yellow-400');
    });

    it('btnPrimary uses gradient classes', () => {
      const { result: purpleResult } = renderHook(() => useThemeClasses(), {
        wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
      });
      expect(purpleResult.current.btnPrimary).toContain('bg-gradient-to-r');
      expect(purpleResult.current.btnPrimary).toContain('text-white');

      const { result: goldResult } = renderHook(() => useThemeClasses(), {
        wrapper: ({ children }) => <ThemeProvider initialTheme="gold">{children}</ThemeProvider>,
      });
      expect(goldResult.current.btnPrimary).toContain('bg-gradient-to-r');
      expect(goldResult.current.btnPrimary).toContain('text-black');
    });
  });
});
