import React from 'react';
import { motion } from 'framer-motion';
import { ConnectionState } from '../types';
import { HapticsService } from '../services/platform';
import { useTheme } from '../contexts/ThemeContext';

export type MobileView = 'chat' | 'channels' | 'users' | 'voice';

interface MobileNavProps {
  activeView: MobileView;
  onViewChange: (view: MobileView) => void;
  connectionState: ConnectionState;
  unreadCount?: number;
  onOpenSettings: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  activeView,
  onViewChange,
  connectionState,
  unreadCount = 0,
  onOpenSettings,
}) => {
  const isConnected = connectionState === ConnectionState.CONNECTED;
  const { colors } = useTheme();

  const tabs = [
    {
      id: 'channels' as MobileView,
      label: 'Channels',
      // Outline icon for inactive
      iconInactive: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 8.25h15m-16.5 7.5h15m-1.8-13.5l-3.9 19.5m-2.1-19.5l-3.9 19.5" />
        </svg>
      ),
      // Filled icon for active
      iconActive: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path fillRule="evenodd" d="M10.5 3.798v5.02a3 3 0 01-.879 2.121l-2.377 2.377a9.845 9.845 0 015.091 1.013 8.315 8.315 0 005.713.636l.15-.025a.75.75 0 01.877.636.75.75 0 01-.636.878l-.15.024a9.813 9.813 0 01-6.49-.643 8.358 8.358 0 00-5.486-.625.75.75 0 01-.879-.636.75.75 0 01.636-.878 9.86 9.86 0 015.972.393 8.343 8.343 0 005.122.196l-4.018-4.018a4.5 4.5 0 01-1.318-3.182V3.798a.75.75 0 011.5 0zM3.75 8.25a.75.75 0 01.75-.75h15a.75.75 0 010 1.5h-15a.75.75 0 01-.75-.75zm-.75 7.5a.75.75 0 01.75-.75h15a.75.75 0 010 1.5h-15a.75.75 0 01-.75-.75z" clipRule="evenodd" />
        </svg>
      ),
    },
    {
      id: 'chat' as MobileView,
      label: 'Chat',
      iconInactive: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
        </svg>
      ),
      iconActive: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path fillRule="evenodd" d="M4.848 2.771A49.144 49.144 0 0112 2.25c2.43 0 4.817.178 7.152.52 1.978.292 3.348 2.024 3.348 3.97v6.02c0 1.946-1.37 3.678-3.348 3.97a48.901 48.901 0 01-3.476.383.39.39 0 00-.297.17l-2.755 4.133a.75.75 0 01-1.248 0l-2.755-4.133a.39.39 0 00-.297-.17 48.9 48.9 0 01-3.476-.384c-1.978-.29-3.348-2.024-3.348-3.97V6.741c0-1.946 1.37-3.68 3.348-3.97zM6.75 8.25a.75.75 0 01.75-.75h9a.75.75 0 010 1.5h-9a.75.75 0 01-.75-.75zm.75 2.25a.75.75 0 000 1.5H12a.75.75 0 000-1.5H7.5z" clipRule="evenodd" />
        </svg>
      ),
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
    {
      id: 'voice' as MobileView,
      label: isConnected ? 'Live' : 'Voice',
      iconInactive: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
        </svg>
      ),
      iconActive: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
          <path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z" />
        </svg>
      ),
      isLive: isConnected,
    },
    {
      id: 'users' as MobileView,
      label: 'Online',
      iconInactive: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
        </svg>
      ),
      iconActive: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M4.5 6.375a4.125 4.125 0 118.25 0 4.125 4.125 0 01-8.25 0zM14.25 8.625a3.375 3.375 0 116.75 0 3.375 3.375 0 01-6.75 0zM1.5 19.125a7.125 7.125 0 0114.25 0v.003l-.001.119a.75.75 0 01-.363.63 13.067 13.067 0 01-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 01-.364-.63l-.001-.122zM17.25 19.128l-.001.144a2.25 2.25 0 01-.233.96 10.088 10.088 0 005.06-1.01.75.75 0 00.42-.643 4.875 4.875 0 00-6.957-4.611 8.586 8.586 0 011.71 5.157v.003z" />
        </svg>
      ),
    },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {/* Glassmorphism background */}
      <div
        className="absolute inset-0 backdrop-blur-xl"
        style={{
          background: 'linear-gradient(to top, rgba(10, 10, 15, 0.95), rgba(18, 18, 26, 0.85))',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      />

      {/* Subtle top glow line */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${colors.glowLight}, transparent)`,
        }}
      />

      <div className="relative flex items-center justify-around h-16 px-2">
        {tabs.map((tab) => {
          const isActive = activeView === tab.id;
          const isLive = 'isLive' in tab && tab.isLive;

          return (
            <motion.button
              key={tab.id}
              onClick={() => {
                HapticsService.impact('light');
                onViewChange(tab.id);
              }}
              whileTap={{ scale: 0.9 }}
              className="relative flex flex-col items-center justify-center flex-1 h-full group"
              style={{
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {/* Active indicator pill */}
              <div
                className="absolute top-1 w-12 h-1 rounded-full transition-all duration-300 ease-out"
                style={{
                  background: isActive
                    ? isLive
                      ? '#22c55e'
                      : colors.primary
                    : 'transparent',
                  transform: isActive ? 'scaleX(1)' : 'scaleX(0)',
                  boxShadow: isActive
                    ? isLive
                      ? '0 0 12px rgba(34, 197, 94, 0.5)'
                      : `0 0 12px ${colors.glow}`
                    : 'none',
                }}
              />

              {/* Icon container with scale animation */}
              <div
                className="relative transition-transform duration-200 ease-out"
                style={{
                  transform: isActive ? 'scale(1.1)' : 'scale(1)',
                }}
              >
                {/* Icon */}
                <div
                  style={{
                    color: isActive
                      ? isLive
                        ? '#22c55e'
                        : colors.primary
                      : '#6b7280',
                    transition: 'color 0.2s ease-out',
                  }}
                >
                  {isActive ? tab.iconActive : tab.iconInactive}
                </div>

                {/* Badge */}
                {'badge' in tab && tab.badge && (
                  <span
                    className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-4 h-4 text-[10px] font-bold rounded-full"
                    style={{
                      background: '#ef4444',
                      color: 'white',
                      boxShadow: '0 0 8px rgba(239, 68, 68, 0.5)',
                    }}
                  >
                    {tab.badge > 9 ? '9+' : tab.badge}
                  </span>
                )}

                {/* Live pulse indicator */}
                {isLive && (
                  <span
                    className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full animate-pulse"
                    style={{
                      background: '#22c55e',
                      boxShadow: '0 0 8px rgba(34, 197, 94, 0.6)',
                    }}
                  />
                )}
              </div>

              {/* Label */}
              <span
                className="mt-1 text-[10px] font-medium tracking-wide transition-colors duration-200"
                style={{
                  color: isActive
                    ? isLive
                      ? '#22c55e'
                      : colors.primary
                    : '#6b7280',
                }}
              >
                {tab.label}
              </span>
            </motion.button>
          );
        })}

        {/* Settings button */}
        <motion.button
          onClick={() => {
            HapticsService.impact('light');
            onOpenSettings();
          }}
          whileTap={{ scale: 0.9 }}
          className="relative flex flex-col items-center justify-center flex-1 h-full"
          style={{
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <div className="transition-transform duration-200">
            <svg
              className="w-6 h-6 transition-colors duration-200"
              fill="none"
              stroke="#6b7280"
              strokeWidth={1.5}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <span className="mt-1 text-[10px] font-medium tracking-wide text-gray-500">
            Settings
          </span>
        </motion.button>
      </div>
    </nav>
  );
};
