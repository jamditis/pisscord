import { useState, useEffect, useCallback, useRef } from 'react';

interface UseResizablePanelOptions {
  storageKey: string;
  defaultWidth: number;
  minWidth: number;
  maxWidth: number;
  side: 'left' | 'right';
}

interface UseResizablePanelReturn {
  width: number;
  setWidth: (width: number) => void;
  isResizing: boolean;
  handleMouseDown: (e: React.MouseEvent) => void;
}

export function useResizablePanel({
  storageKey,
  defaultWidth,
  minWidth,
  maxWidth,
  side
}: UseResizablePanelOptions): UseResizablePanelReturn {
  // Initialize width from localStorage or default
  const [width, setWidthState] = useState<number>(() => {
    if (typeof window === 'undefined') return defaultWidth;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const parsed = Number(saved);
      if (!isNaN(parsed) && parsed >= minWidth && parsed <= maxWidth) {
        return parsed;
      }
    }
    return defaultWidth;
  });

  const [isResizing, setIsResizing] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  // Wrapper to also persist to localStorage
  const setWidth = useCallback((newWidth: number) => {
    const clampedWidth = Math.min(maxWidth, Math.max(minWidth, newWidth));
    setWidthState(clampedWidth);
    localStorage.setItem(storageKey, String(clampedWidth));
  }, [storageKey, minWidth, maxWidth]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = width;
  }, [width]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;

    const delta = e.clientX - startXRef.current;
    // For left-side resize handle, moving right increases width
    // For right-side resize handle, moving right increases width
    const newWidth = side === 'right'
      ? startWidthRef.current + delta
      : startWidthRef.current - delta;

    setWidth(newWidth);
  }, [isResizing, side, setWidth]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  // Add/remove global mouse event listeners during resize
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      // Prevent text selection during resize
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return {
    width,
    setWidth,
    isResizing,
    handleMouseDown
  };
}
