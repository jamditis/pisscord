import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface SidebarProps {
  onServerClick: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onServerClick }) => {
  const { theme } = useTheme();
  const logoSrc = theme === 'gold' ? './pisscord-gold.png' : './pisscord-purple.png';

  return (
    <div className="w-[72px] bg-discord-dark flex flex-col items-center py-3 space-y-2 h-full overflow-y-auto">
      {/* Home - Pisscord Logo */}
      <div
        onClick={onServerClick}
        className="w-12 h-12 bg-discord-main rounded-[24px] hover:rounded-[16px] hover:bg-discord-accent transition-all duration-200 cursor-pointer flex items-center justify-center group relative overflow-hidden"
      >
        <img src={logoSrc} alt="Pisscord" className="w-10 h-10 object-contain" />
        <div className="absolute -left-4 h-10 w-1 bg-white rounded-r"></div>
      </div>
    </div>
  );
};