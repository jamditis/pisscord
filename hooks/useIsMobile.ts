import { useState, useEffect } from 'react';

const MOBILE_BREAKPOINT = 768;

/**
 * Detects whether the user is on a mobile device that should show the mobile layout.
 *
 * Uses a two-signal approach:
 * 1. If the device is a mobile device (touch + UA match), always return true
 *    regardless of window width — this handles landscape phones correctly.
 * 2. If the device is NOT detected as mobile, fall back to the width breakpoint
 *    so narrow desktop windows still get the mobile layout.
 */

// Detect mobile device once at module load (doesn't change during session)
const isMobileDevice = typeof navigator !== 'undefined' &&
  navigator.maxTouchPoints > 0 &&
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    // Mobile devices always get mobile layout
    if (isMobileDevice) return true;
    // Desktop: use width breakpoint
    return window.innerWidth < MOBILE_BREAKPOINT;
  });

  useEffect(() => {
    // Mobile devices always stay mobile — no listener needed
    if (isMobileDevice) {
      setIsMobile(true);
      return;
    }

    const checkMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    window.addEventListener('resize', checkMobile);
    window.addEventListener('orientationchange', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('orientationchange', checkMobile);
    };
  }, []);

  return isMobile;
}
