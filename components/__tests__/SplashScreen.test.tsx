import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { SplashScreen } from '../SplashScreen';

describe('SplashScreen', () => {
  let mockImageInstances: Array<{ onload?: () => void; onerror?: () => void; src: string }>;

  beforeEach(() => {
    vi.useFakeTimers();
    mockImageInstances = [];

    // Mock the Image constructor to capture onload/onerror
    vi.stubGlobal('Image', class MockImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      src = '';
      constructor() {
        mockImageInstances.push(this);
      }
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('shows blank screen before image loads', () => {
    const onComplete = vi.fn();
    const { container } = render(<SplashScreen onComplete={onComplete} />);

    // Before image loads, should just show a dark div
    expect(screen.queryByText('PISSCORD')).not.toBeInTheDocument();
    expect(container.firstChild).toHaveStyle({ backgroundColor: '#0a0a0f' });
  });

  it('shows branding after image loads', () => {
    const onComplete = vi.fn();
    render(<SplashScreen onComplete={onComplete} />);

    // Trigger image load
    act(() => {
      mockImageInstances[0]?.onload?.();
    });

    expect(screen.getByText('PISSCORD')).toBeInTheDocument();
    expect(screen.getByText('Pee-to-Pee Chat')).toBeInTheDocument();
  });

  it('calls onComplete after duration', () => {
    const onComplete = vi.fn();
    render(<SplashScreen onComplete={onComplete} duration={3000} />);

    // Load image
    act(() => {
      mockImageInstances[0]?.onload?.();
    });

    expect(onComplete).not.toHaveBeenCalled();

    // Advance past duration
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('calls onTap once on first click', () => {
    const onComplete = vi.fn();
    const onTap = vi.fn();
    render(<SplashScreen onComplete={onComplete} onTap={onTap} />);

    // Load image
    act(() => {
      mockImageInstances[0]?.onload?.();
    });

    const splash = screen.getByText('PISSCORD').closest('div[class*="fixed"]')!;

    fireEvent.click(splash);
    expect(onTap).toHaveBeenCalledTimes(1);

    // Second click should not call onTap again
    fireEvent.click(splash);
    expect(onTap).toHaveBeenCalledTimes(1);
  });

  it('uses purple theme by default', () => {
    const onComplete = vi.fn();
    render(<SplashScreen onComplete={onComplete} />);

    // Check that it loads the purple logo
    expect(mockImageInstances[0]?.src).toBe('./pisscord-purple.png');
  });

  it('uses gold theme when specified', () => {
    const onComplete = vi.fn();
    render(<SplashScreen onComplete={onComplete} theme="gold" />);

    expect(mockImageInstances[0]?.src).toBe('./pisscord-gold.png');
  });

  it('shows splash even if image fails to load', () => {
    const onComplete = vi.fn();
    render(<SplashScreen onComplete={onComplete} />);

    // Trigger image error (fallback behavior)
    act(() => {
      mockImageInstances[0]?.onerror?.();
    });

    // Should still render splash content
    expect(screen.getByText('PISSCORD')).toBeInTheDocument();
  });

  it('defaults to 3000ms duration', () => {
    const onComplete = vi.fn();
    render(<SplashScreen onComplete={onComplete} />);

    act(() => {
      mockImageInstances[0]?.onload?.();
    });

    // Should not fire at 2999ms
    act(() => {
      vi.advanceTimersByTime(2999);
    });
    expect(onComplete).not.toHaveBeenCalled();

    // Should fire at 3000ms
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('starts fade-out 500ms before duration ends', () => {
    const onComplete = vi.fn();
    const { container } = render(<SplashScreen onComplete={onComplete} duration={3000} />);

    act(() => {
      mockImageInstances[0]?.onload?.();
    });

    // At 2499ms, opacity should still be 1
    act(() => {
      vi.advanceTimersByTime(2499);
    });

    // The splash div with opacity style
    const splashDiv = screen.getByText('PISSCORD').closest('div[class*="fixed"]');
    expect(splashDiv).toHaveStyle({ opacity: '1' });

    // At 2500ms (duration - 500), opacity should change to 0
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(splashDiv).toHaveStyle({ opacity: '0' });
  });
});
