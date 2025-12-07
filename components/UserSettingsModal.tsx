import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserProfile, DeviceSettings, AppLogs } from '../types';
import { uploadFile } from '../services/firebase';
import { useIsMobile } from '../hooks/useIsMobile';

interface UserSettingsModalProps {
  currentProfile: UserProfile;
  currentDevices: DeviceSettings;
  logs: AppLogs[];
  appVersion: string;
  onSaveProfile: (newProfile: UserProfile) => void;
  onSaveDevices: (newDevices: DeviceSettings) => void;
  onCheckForUpdates: () => void;
  onClose: () => void;
  onShowToast?: (type: 'success' | 'error' | 'info' | 'warning', title: string, message?: string) => void;
}

const COLORS = ['#5865F2', '#3ba55c', '#ed4245', '#faa61a', '#eb459e', '#00b0f4', '#a8a8a8'];

export const UserSettingsModal: React.FC<UserSettingsModalProps> = ({
    currentProfile, currentDevices, logs, appVersion, onSaveProfile, onSaveDevices, onCheckForUpdates, onClose, onShowToast
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'voice' | 'debug' | 'about'>('profile');
  
  // Profile State
  const [displayName, setDisplayName] = useState(currentProfile.displayName);
  const [statusMessage, setStatusMessage] = useState(currentProfile.statusMessage);
  const [selectedColor, setSelectedColor] = useState(currentProfile.color);
  const [photoURL, setPhotoURL] = useState(currentProfile.photoURL || '');
  const [isUploading, setIsUploading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        color: selectedColor,
        photoURL
    });
    onSaveDevices({
        audioInputId,
        audioOutputId,
        videoInputId
    });
    onShowToast?.('success', 'Settings Saved', 'Your profile and device settings have been updated.');
    onClose();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        onShowToast?.('error', 'Invalid File', 'Please select an image file.');
        return;
    }

    setIsUploading(true);
    try {
        const url = await uploadFile(file);
        setPhotoURL(url);
        onShowToast?.('success', 'Upload Complete', 'Avatar updated successfully!');
    } catch (err: any) {
        onShowToast?.('error', 'Upload Failed', err.message);
    } finally {
        setIsUploading(false);
    }
  };

  const handleRemoveAvatar = () => {
      setPhotoURL('');
  };

  const handleCheckUpdates = () => {
    onShowToast?.('info', 'Checking for Updates', 'Looking for newer versions...');
    onCheckForUpdates();
  };

  const audioInputs = devices.filter(d => d.kind === 'audioinput');
  const audioOutputs = devices.filter(d => d.kind === 'audiooutput');
  const videoInputs = devices.filter(d => d.kind === 'videoinput');
  const isMobile = useIsMobile();

  // Mobile tab item component
  const MobileTabItem: React.FC<{
    tab: 'profile' | 'voice' | 'debug' | 'about';
    icon: string;
    label: string;
  }> = ({ tab, icon, label }) => (
    <motion.button
      onClick={() => setActiveTab(tab)}
      whileTap={{ scale: 0.95 }}
      className={`flex flex-col items-center justify-center py-2 px-4 rounded-xl transition-all ${
        activeTab === tab
          ? 'bg-purple-500/20 text-purple-400'
          : 'text-white/50'
      }`}
    >
      <i className={`fas ${icon} text-lg mb-1`}></i>
      <span className="text-[10px] font-medium">{label}</span>
    </motion.button>
  );

  // Mobile layout
  if (isMobile) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-gradient-to-b from-[#1a1a2e] to-[#0f0f1a] flex flex-col"
      >
        {/* Mobile Header - with top padding for status bar */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/5" style={{ paddingTop: '3.5rem' }}>
          <motion.button
            onClick={onClose}
            whileTap={{ scale: 0.95 }}
            className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center"
          >
            <i className="fas fa-arrow-left text-white/70"></i>
          </motion.button>
          <h2 className="text-lg font-bold text-white">Settings</h2>
          <motion.button
            onClick={handleSave}
            whileTap={{ scale: 0.95 }}
            className="px-4 py-2 rounded-xl bg-purple-500 text-white text-sm font-medium"
          >
            Save
          </motion.button>
        </div>

        {/* Tab Bar */}
        <div className="flex items-center justify-around px-2 py-2 border-b border-white/5 bg-white/[0.02]">
          <MobileTabItem tab="profile" icon="fa-user" label="Profile" />
          <MobileTabItem tab="voice" icon="fa-microphone" label="Audio" />
          <MobileTabItem tab="debug" icon="fa-bug" label="Debug" />
          <MobileTabItem tab="about" icon="fa-info-circle" label="About" />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <AnimatePresence mode="wait">
            {/* PROFILE TAB */}
            {activeTab === 'profile' && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* Avatar Section */}
                <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                  <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*" />

                  <div className="flex items-center">
                    <motion.div
                      whileTap={{ scale: 0.95 }}
                      onClick={() => fileInputRef.current?.click()}
                      className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg shrink-0 relative overflow-hidden cursor-pointer border-2 border-white/20"
                      style={{ backgroundColor: selectedColor }}
                    >
                      {photoURL ? (
                        <img src={photoURL} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <i className="fas fa-user"></i>
                      )}
                      {isUploading && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <i className="fas fa-spinner fa-spin"></i>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 active:opacity-100">
                        <i className="fas fa-camera"></i>
                      </div>
                    </motion.div>

                    <div className="ml-4 flex-1">
                      <div className="text-white font-bold">{displayName || "Your Name"}</div>
                      <div className="text-white/50 text-sm">{statusMessage || "No status"}</div>
                      {photoURL && (
                        <button
                          onClick={handleRemoveAvatar}
                          className="text-red-400 text-xs mt-2"
                        >
                          Remove photo
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-white/40 uppercase mb-2 tracking-wide">Display Name</label>
                    <input
                      type="text"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500/50 placeholder-white/30"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      maxLength={32}
                      placeholder="Enter your name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-white/40 uppercase mb-2 tracking-wide">Status Message</label>
                    <input
                      type="text"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500/50 placeholder-white/30"
                      value={statusMessage}
                      onChange={(e) => setStatusMessage(e.target.value)}
                      maxLength={64}
                      placeholder="What's on your mind?"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-white/40 uppercase mb-2 tracking-wide">Avatar Color</label>
                    <div className="flex gap-3 flex-wrap">
                      {COLORS.map(color => (
                        <motion.button
                          key={color}
                          onClick={() => setSelectedColor(color)}
                          whileTap={{ scale: 0.9 }}
                          className={`w-10 h-10 rounded-xl transition-all ${
                            selectedColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1a1a2e]' : ''
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* VOICE TAB */}
            {activeTab === 'voice' && (
              <motion.div
                key="voice"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-bold text-white/40 uppercase mb-2 tracking-wide">Microphone</label>
                  <select
                    value={audioInputId}
                    onChange={(e) => setAudioInputId(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500/50 appearance-none"
                  >
                    <option value="">Default</option>
                    {audioInputs.map(dev => (
                      <option key={dev.deviceId} value={dev.deviceId}>
                        {dev.label || `Microphone ${dev.deviceId.slice(0,5)}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-white/40 uppercase mb-2 tracking-wide">Speakers</label>
                  <select
                    value={audioOutputId}
                    onChange={(e) => setAudioOutputId(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500/50 appearance-none"
                  >
                    <option value="">Default</option>
                    {audioOutputs.map(dev => (
                      <option key={dev.deviceId} value={dev.deviceId}>
                        {dev.label || `Speaker ${dev.deviceId.slice(0,5)}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-white/40 uppercase mb-2 tracking-wide">Camera</label>
                  <select
                    value={videoInputId}
                    onChange={(e) => setVideoInputId(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500/50 appearance-none"
                  >
                    <option value="">Default</option>
                    {videoInputs.map(dev => (
                      <option key={dev.deviceId} value={dev.deviceId}>
                        {dev.label || `Camera ${dev.deviceId.slice(0,5)}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 mt-4">
                  <div className="flex items-start gap-3">
                    <i className="fas fa-info-circle text-green-400 mt-0.5"></i>
                    <p className="text-green-400 text-sm">Changes require reconnecting to the call to take effect.</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* DEBUG TAB */}
            {activeTab === 'debug' && (
              <motion.div
                key="debug"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="bg-black/50 rounded-2xl p-4 font-mono text-xs overflow-y-auto max-h-[60vh] border border-white/10">
                  {logs.length === 0 ? (
                    <div className="text-white/30 text-center py-8">No logs yet...</div>
                  ) : (
                    logs.map((l, i) => (
                      <div
                        key={i}
                        className={`mb-2 ${
                          l.type === 'error' ? 'text-red-400' : l.type === 'webrtc' ? 'text-blue-400' : 'text-green-400'
                        }`}
                      >
                        <span className="text-white/30">[{new Date(l.timestamp).toLocaleTimeString()}]</span> {l.message}
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}

            {/* ABOUT TAB */}
            {activeTab === 'about' && (
              <motion.div
                key="about"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center py-6">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <span className="text-4xl">💧</span>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-1">Pisscord</h3>
                  <p className="text-white/50 text-sm">Pee-to-Pee Chat</p>
                  <p className="text-purple-400 text-sm mt-2">Version {appVersion}</p>
                </div>

                <div className="bg-white/5 rounded-2xl p-4 border border-white/10 space-y-3">
                  <h4 className="text-white font-semibold text-sm">Features</h4>
                  <div className="space-y-2 text-sm">
                    {[
                      'P2P voice/video calling',
                      'Real-time text messaging',
                      'Screen sharing',
                      'Pissbot AI assistant',
                      'Auto-updates'
                    ].map((feature, i) => (
                      <div key={i} className="flex items-center gap-2 text-white/70">
                        <i className="fas fa-check text-green-400 text-xs"></i>
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>

                <motion.button
                  onClick={handleCheckUpdates}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-purple-500/20 border border-purple-500/30 text-purple-400 font-medium py-3.5 rounded-xl flex items-center justify-center gap-2"
                >
                  <i className="fas fa-sync-alt"></i>
                  Check for Updates
                </motion.button>

                <div className="text-center text-white/30 text-xs space-y-1">
                  <p>Made with 💜 by JawnPiece Productions</p>
                  <a
                    href="https://github.com/jamditis/pisscord"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-400"
                  >
                    GitHub Repository
                  </a>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    );
  }

  // Desktop layout
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
                        <div className="bg-discord-dark rounded-lg p-4 flex items-center shadow-inner relative overflow-hidden group">
                            {/* Avatar Upload Overlay */}
                            <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*" />
                            
                            <div 
                                className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg shrink-0 relative overflow-hidden cursor-pointer border-4 border-discord-main hover:border-white transition-colors"
                                style={{ backgroundColor: selectedColor }}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {photoURL ? (
                                    <img src={photoURL} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <i className="fas fa-user"></i>
                                )}
                                {isUploading && (
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                        <i className="fas fa-spinner fa-spin"></i>
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                    <span className="text-[10px] uppercase font-bold">Change</span>
                                </div>
                            </div>

                            <div className="ml-4 overflow-hidden flex-1">
                                <div className="text-white font-bold text-lg">{displayName || "Your Name"}</div>
                                <div className="text-discord-text text-sm">{statusMessage || "Custom status..."}</div>
                            </div>
                            
                            {photoURL && (
                                <button 
                                    onClick={handleRemoveAvatar}
                                    className="absolute top-4 right-4 text-discord-muted hover:text-red-500 text-xs font-bold uppercase"
                                >
                                    Remove Avatar
                                </button>
                            )}
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
                                <label className="block text-xs font-bold text-discord-muted uppercase mb-2">Avatar Color (Fallback)</label>
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
                                    onClick={handleCheckUpdates}
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