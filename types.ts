
export interface User {
  id: string;
  username: string;
  isSelf: boolean;
}

export interface UserProfile {
  displayName: string;
  statusMessage: string;
  color: string;
  photoURL?: string;
}

export interface DeviceSettings {
  audioInputId: string;
  audioOutputId: string;
  videoInputId: string;
}

export interface PresenceUser extends UserProfile {
  peerId: string;
  lastSeen: number;
  voiceChannelId?: string;
}

export interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: number;
  isAi?: boolean;
  attachment?: {
    url: string;
    type: 'image' | 'file';
    name: string;
  };
}

export enum ChannelType {
  TEXT = 'TEXT',
  VOICE = 'VOICE',
  AI = 'AI'
}

export interface Channel {
  id: string;
  name: string;
  type: ChannelType;
  requireApproval?: boolean; // If true, users must be approved to join voice channels
}

export interface JoinRequest {
  peerId: string;
  displayName: string;
  photoURL?: string;
  color: string;
  channelId: string;
  timestamp: number;
}

export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR'
}

export interface AppLogs {
    timestamp: number;
    type: 'info' | 'error' | 'webrtc';
    message: string;
}

// Electron API types
declare global {
  interface Window {
    electronAPI?: {
      downloadUpdate: () => void;
      installUpdate: () => void;
      showWindow: () => void;
      getDesktopSources: () => Promise<Array<{id: string, name: string, thumbnail: any}>>;
      copyToClipboard: (text: string) => void;
      onUpdateAvailable: (callback: (data: any) => void) => void;
      onUpdateDownloadProgress: (callback: (data: any) => void) => void;
      onUpdateDownloaded: (callback: (data: any) => void) => void;
      onUpdateError: (callback: (message: string) => void) => void;
      removeAllListeners: (channel: string) => void;
      logToFile: (message: string) => void;
    };
  }
}
