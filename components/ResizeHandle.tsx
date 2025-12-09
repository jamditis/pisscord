import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface ResizeHandleProps {
  onMouseDown: (e: React.MouseEvent) => void;
  side: 'left' | 'right';
  isResizing?: boolean;
}

export const ResizeHandle: React.FC<ResizeHandleProps> = ({
  onMouseDown,
  side,
  isResizing = false
}) => {
  const { colors } = useTheme();

  return (
    <div
      onMouseDown={onMouseDown}
      className={`
        absolute top-0 bottom-0 w-1 z-20
        cursor-col-resize
        group
        transition-colors duration-150
        ${side === 'right' ? 'right-0' : 'left-0'}
        ${isResizing ? 'bg-opacity-100' : 'bg-transparent hover:bg-opacity-50'}
      `}
      style={{
        backgroundColor: isResizing ? colors.primary : 'transparent',
      }}
    >
      {/* Visual indicator line - appears on hover */}
      <div
        className={`
          absolute top-0 bottom-0 w-[2px]
          transition-opacity duration-150
          ${side === 'right' ? 'right-0' : 'left-0'}
          ${isResizing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
        `}
        style={{
          backgroundColor: colors.primary,
          boxShadow: isResizing ? `0 0 8px ${colors.glow}` : 'none',
        }}
      />

      {/* Wider invisible hit area for easier grabbing */}
      <div
        className={`
          absolute top-0 bottom-0 w-2
          ${side === 'right' ? '-right-1' : '-left-1'}
        `}
      />
    </div>
  );
};
