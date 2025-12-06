
export interface User {
  id: string;
  username: string;
  isSelf: boolean;
}

export interface UserProfile {
  displayName: string;
  statusMessage: string;
  color: string;
}

export interface DeviceSettings {
  audioInputId: string;
  audioOutputId: string;
  videoInputId: string;
}

export interface PresenceUser extends UserProfile {
  peerId: string;
  lastSeen: number;
}

export interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: number;
  isAi?: boolean;
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
