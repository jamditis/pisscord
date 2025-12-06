import React from 'react';

interface SidebarProps {
  onServerClick: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onServerClick }) => {
  return (
    <div className="w-[72px] bg-discord-dark flex flex-col items-center py-3 space-y-2 h-full overflow-y-auto">
      {/* Home / Direct Messages */}
      <div
        onClick={onServerClick}
        className="w-12 h-12 bg-discord-main rounded-[24px] hover:rounded-[16px] hover:bg-discord-accent transition-all duration-200 cursor-pointer flex items-center justify-center group relative"
      >
        <i className="fas fa-home text-discord-text group-hover:text-white text-xl"></i>
        {/* Tooltip or Indicator could go here */}
        <div className="absolute -left-4 top-0 bottom-0 w-1 bg-white rounded-r opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      <div className="w-8 h-[2px] bg-discord-main rounded-lg my-1"></div>

      {/* The "One Server" */}
      <div className="w-12 h-12 bg-discord-main rounded-[24px] hover:rounded-[16px] transition-all duration-200 cursor-pointer flex items-center justify-center group relative overflow-hidden">
        <img src="pisscord-dark.png" alt="Pisscord" className="w-10 h-10 object-contain" />
        <div className="absolute -left-4 h-10 w-1 bg-white rounded-r"></div>
      </div>

      <div className="w-12 h-12 bg-discord-main rounded-[24px] hover:rounded-[16px] hover:bg-discord-green transition-all duration-200 cursor-pointer flex items-center justify-center group text-discord-green hover:text-white">
        <i className="fas fa-plus text-xl"></i>
      </div>
    </div>
  );
};