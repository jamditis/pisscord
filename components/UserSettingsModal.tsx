import React, { useState, useEffect } from 'react';
import { UserProfile, DeviceSettings, AppLogs } from '../types';

interface UserSettingsModalProps {
  currentProfile: UserProfile;
  currentDevices: DeviceSettings;
  logs: AppLogs[];
  appVersion: string;
  onSaveProfile: (newProfile: UserProfile) => void;
  onSaveDevices: (newDevices: DeviceSettings) => void;
  onCheckForUpdates: () => void;
  onClose: () => void;
}

const COLORS = ['#5865F2', '#3ba55c', '#ed4245', '#faa61a', '#eb459e', '#00b0f4', '#a8a8a8'];

export const UserSettingsModal: React.FC<UserSettingsModalProps> = ({
    currentProfile, currentDevices, logs, appVersion, onSaveProfile, onSaveDevices, onCheckForUpdates, onClose
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'voice' | 'debug' | 'about'>('profile');
  
  // Profile State
  const [displayName, setDisplayName] = useState(currentProfile.displayName);
  const [statusMessage, setStatusMessage] = useState(currentProfile.statusMessage);
  const [selectedColor, setSelectedColor] = useState(currentProfile.color);

  // Device State
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioInputId, setAudioInputId] = useState(currentDevices.audioInputId);
  const [audioOutputId, setAudioOutputId] = useState(currentDevices.audioOutputId);
  const [videoInputId, setVideoInputId] = useState(currentDevices.videoInputId);

  useEffect(() => {
    // Enumerate devices
    navigator.mediaDevices.enumerateDevices().then(devs => setDevices(devs));
  }, []);

  const handleSave = () => {
    onSaveProfile({
        displayName: displayName || "Anonymous",
        statusMessage,
        color: selectedColor
    });
    onSaveDevices({
        audioInputId,
        audioOutputId,
        videoInputId
    });
    onClose();
  };

  const audioInputs = devices.filter(d => d.kind === 'audioinput');
  const audioOutputs = devices.filter(d => d.kind === 'audiooutput');
  const videoInputs = devices.filter(d => d.kind === 'videoinput');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-discord-main w-full max-w-4xl h-[600px] rounded-lg shadow-2xl flex overflow-hidden">
        
        {/* Sidebar */}
        <div className="w-1/4 bg-discord-sidebar p-4 flex flex-col gap-2">
            <h2 className="text-xs font-bold text-discord-muted uppercase mb-2 px-2">Settings</h2>
            <button 
                onClick={() => setActiveTab('profile')}
                className={`text-left px-3 py-2 rounded text-sm font-medium ${activeTab === 'profile' ? 'bg-discord-hover text-white' : 'text-discord-text hover:bg-discord-hover'}`}
            >
                My Profile
            </button>
            <button 
                onClick={() => setActiveTab('voice')}
                className={`text-left px-3 py-2 rounded text-sm font-medium ${activeTab === 'voice' ? 'bg-discord-hover text-white' : 'text-discord-text hover:bg-discord-hover'}`}
            >
                Voice & Video
            </button>
            <div className="border-t border-discord-muted/20 my-2"></div>
            <button
                onClick={() => setActiveTab('debug')}
                className={`text-left px-3 py-2 rounded text-sm font-medium ${activeTab === 'debug' ? 'bg-discord-hover text-white' : 'text-discord-text hover:bg-discord-hover'}`}
            >
                Debug Log
            </button>
            <button
                onClick={() => setActiveTab('about')}
                className={`text-left px-3 py-2 rounded text-sm font-medium ${activeTab === 'about' ? 'bg-discord-hover text-white' : 'text-discord-text hover:bg-discord-hover'}`}
            >
                About
            </button>
        </div>

        {/* Content */}
        <div className="flex-1 bg-discord-main p-8 flex flex-col relative">
            <h2 className="text-xl font-bold text-white mb-6">
                {activeTab === 'profile' && 'My Profile'}
                {activeTab === 'voice' && 'Voice & Video Settings'}
                {activeTab === 'debug' && 'Troubleshooting Logs'}
                {activeTab === 'about' && 'About Pisscord'}
            </h2>

            <div className="flex-1 overflow-y-auto pr-4">
                
                {/* PROFILE TAB */}
                {activeTab === 'profile' && (
                    <div className="space-y-6">
                        <div className="bg-discord-dark rounded-lg p-4 flex items-center shadow-inner">
                            <div 
                                className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg shrink-0"
                                style={{ backgroundColor: selectedColor }}
                            >
                                <i className="fas fa-user"></i>
                            </div>
                            <div className="ml-4 overflow-hidden">
                                <div className="text-white font-bold text-lg">{displayName || "Your Name"}</div>
                                <div className="text-discord-text text-sm">{statusMessage || "Custom status..."}</div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-discord-muted uppercase mb-2">Display Name</label>
                                <input 
                                    type="text" 
                                    className="w-full bg-discord-dark border-none rounded p-2 text-white outline-none focus:ring-2 ring-discord-accent"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    maxLength={32}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-discord-muted uppercase mb-2">Status</label>
                                <input 
                                    type="text" 
                                    className="w-full bg-discord-dark border-none rounded p-2 text-white outline-none focus:ring-2 ring-discord-accent"
                                    value={statusMessage}
                                    onChange={(e) => setStatusMessage(e.target.value)}
                                    maxLength={64}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-discord-muted uppercase mb-2">Avatar Color</label>
                                <div className="flex gap-3 flex-wrap">
                                    {COLORS.map(color => (
                                        <button
                                            key={color}
                                            onClick={() => setSelectedColor(color)}
                                            className={`w-8 h-8 rounded-full border-2 hover:scale-110 transition-transform ${selectedColor === color ? 'border-white' : 'border-transparent'}`}
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* VOICE TAB */}
                {activeTab === 'voice' && (
                    <div className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-discord-muted uppercase mb-2">Input Device (Microphone)</label>
                            <select 
                                value={audioInputId}
                                onChange={(e) => setAudioInputId(e.target.value)}
                                className="w-full bg-discord-dark text-white p-2 rounded outline-none border border-transparent focus:border-discord-accent"
                            >
                                <option value="">Default</option>
                                {audioInputs.map(dev => <option key={dev.deviceId} value={dev.deviceId}>{dev.label || `Microphone ${dev.deviceId.slice(0,5)}`}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-discord-muted uppercase mb-2">Output Device (Speakers)</label>
                            <select 
                                value={audioOutputId}
                                onChange={(e) => setAudioOutputId(e.target.value)}
                                className="w-full bg-discord-dark text-white p-2 rounded outline-none border border-transparent focus:border-discord-accent"
                            >
                                <option value="">Default</option>
                                {audioOutputs.map(dev => <option key={dev.deviceId} value={dev.deviceId}>{dev.label || `Speaker ${dev.deviceId.slice(0,5)}`}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-discord-muted uppercase mb-2">Video Device (Camera)</label>
                            <select 
                                value={videoInputId}
                                onChange={(e) => setVideoInputId(e.target.value)}
                                className="w-full bg-discord-dark text-white p-2 rounded outline-none border border-transparent focus:border-discord-accent"
                            >
                                <option value="">Default</option>
                                {videoInputs.map(dev => <option key={dev.deviceId} value={dev.deviceId}>{dev.label || `Camera ${dev.deviceId.slice(0,5)}`}</option>)}
                            </select>
                        </div>
                        
                        <div className="bg-discord-green/10 text-discord-green p-4 rounded text-sm border border-discord-green/20">
                            <i className="fas fa-info-circle mr-2"></i>
                            Changes require reconnecting to the call to take full effect.
                        </div>
                    </div>
                )}

                {/* DEBUG TAB */}
                {activeTab === 'debug' && (
                    <div className="space-y-4 h-full flex flex-col">
                        <div className="bg-black font-mono text-xs text-green-400 p-4 rounded h-96 overflow-y-auto whitespace-pre-wrap">
                            {logs.length === 0 ? "No logs yet..." : logs.map((l, i) => (
                                <div key={i} className={`mb-1 ${l.type === 'error' ? 'text-red-400' : l.type === 'webrtc' ? 'text-blue-400' : 'text-green-400'}`}>
                                    <span className="opacity-50">[{new Date(l.timestamp).toLocaleTimeString()}]</span> {l.message}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ABOUT TAB */}
                {activeTab === 'about' && (
                    <div className="space-y-6">
                        <div className="text-center py-8">
                            <div className="text-6xl mb-4">💧</div>
                            <h3 className="text-2xl font-bold text-white mb-2">Pisscord</h3>
                            <p className="text-discord-muted">P2P Discord Clone</p>
                            <p className="text-discord-text mt-2">Version {appVersion}</p>
                        </div>

                        <div className="bg-discord-dark rounded-lg p-6 space-y-4">
                            <div>
                                <h4 className="text-white font-semibold mb-2">Features</h4>
                                <ul className="text-discord-text text-sm space-y-1">
                                    <li>✅ P2P voice/video calling</li>
                                    <li>✅ Real-time text messaging</li>
                                    <li>✅ Screen sharing</li>
                                    <li>✅ Pissbot AI assistant</li>
                                    <li>✅ Auto-updates</li>
                                </ul>
                            </div>

                            <div className="pt-4 border-t border-discord-muted/20">
                                <button
                                    onClick={onCheckForUpdates}
                                    className="w-full bg-discord-accent hover:bg-indigo-600 px-4 py-3 rounded text-white font-medium transition-colors flex items-center justify-center gap-2"
                                >
                                    <i className="fas fa-sync-alt"></i>
                                    Check for Updates
                                </button>
                            </div>

                            <div className="text-xs text-discord-muted text-center">
                                <p>Made with 💜 by JawnPiece Productions</p>
                                <p className="mt-1">
                                    <a href="https://github.com/jamditis/pisscord" target="_blank" rel="noopener noreferrer" className="text-discord-accent hover:underline">
                                        GitHub Repository
                                    </a>
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="pt-6 mt-4 border-t border-discord-dark flex justify-end space-x-3">
                <button onClick={onClose} className="px-4 py-2 rounded text-white font-medium hover:underline">Cancel</button>
                <button onClick={handleSave} className="bg-discord-accent hover:bg-indigo-600 px-6 py-2 rounded text-white font-medium shadow-lg transition-colors">Done</button>
            </div>
            
            <button onClick={onClose} className="absolute top-4 right-4 text-discord-muted hover:text-white">
                <i className="fas fa-times text-xl"></i>
            </button>
        </div>
      </div>
    </div>
  );
};