import React, { useEffect, useState, useRef } from 'react';
import Peer from 'peerjs';
import { Sidebar } from './components/Sidebar';
import { ChannelList } from './components/ChannelList';
import { ChatArea } from './components/ChatArea';
import { VoiceStage } from './components/VoiceStage';
import { UserList } from './components/UserList';
import { UpdateModal } from './components/UpdateModal';
import { UserSettingsModal } from './components/UserSettingsModal';
import { Channel, ChannelType, ConnectionState, Message, PresenceUser, UserProfile, DeviceSettings, AppLogs } from './types';
import { registerPresence, subscribeToUsers, removePresence, checkForUpdates, updatePresence } from './services/firebase';

const APP_VERSION = "1.0.1";

// Initial Channels
const INITIAL_CHANNELS: Channel[] = [
  { id: '1', name: 'general', type: ChannelType.TEXT },
  { id: '2', name: 'links', type: ChannelType.TEXT },
  { id: '3', name: 'gemini-ai', type: ChannelType.AI },
  { id: 'voice-1', name: 'Voice Lounge', type: ChannelType.VOICE },
];

const generateName = () => {
    const adjs = ['Speedy', 'Crimson', 'Shadow', 'Azure', 'Silent', 'Golden', 'Cyber'];
    const nouns = ['Ninja', 'Wolf', 'Eagle', 'Coder', 'Gamer', 'Phoenix', 'Ghost'];
    return `${adjs[Math.floor(Math.random() * adjs.length)]}${nouns[Math.floor(Math.random() * nouns.length)]}`;
};

const DEFAULT_PROFILE: UserProfile = {
    displayName: generateName(),
    statusMessage: "",
    color: "#5865F2"
};

const DEFAULT_DEVICES: DeviceSettings = {
    audioInputId: "",
    audioOutputId: "",
    videoInputId: ""
};

export default function App() {
  // --- STATE: UI & Navigation ---
  const [activeChannelId, setActiveChannelId] = useState<string>('1'); // What channel we are LOOKING at
  
  // --- STATE: Connection ---
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [activeVoiceChannelId, setActiveVoiceChannelId] = useState<string | null>(null); // What channel we are CONNECTED to
  const [myPeerId, setMyPeerId] = useState<string | null>(null);
  
  // --- STATE: Data ---
  const [messages, setMessages] = useState<Record<string, Message[]>>({
      '1': [], '2': [], '3': [{ id: 'welcome-ai', sender: 'Gemini', content: 'Hello! I am your AI assistant.', timestamp: Date.now(), isAi: true }],
  });
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
      const saved = localStorage.getItem('pisscord_profile');
      return saved ? JSON.parse(saved) : DEFAULT_PROFILE;
  });
  const [deviceSettings, setDeviceSettings] = useState<DeviceSettings>(() => {
      const saved = localStorage.getItem('pisscord_devices');
      return saved ? JSON.parse(saved) : DEFAULT_DEVICES;
  });
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);
  const [logs, setLogs] = useState<AppLogs[]>([]);

  // --- STATE: Media ---
  const [myStream, setMyStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  
  // --- MODALS ---
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<{url: string, latest: string} | null>(null);

  // --- REFS ---
  const peerInstance = useRef<Peer | null>(null);
  const callInstance = useRef<any>(null); 
  const myVideoTrack = useRef<MediaStreamTrack | null>(null); // Keep original camera track for when screenshare ends
  const remoteAudioRef = useRef<HTMLAudioElement>(null); // Global audio element
  const isMountedRef = useRef(true);

  const activeChannel = INITIAL_CHANNELS.find(c => c.id === activeChannelId) || INITIAL_CHANNELS[0];

  const log = (message: string, type: 'info' | 'error' | 'webrtc' = 'info') => {
      console.log(`[${type}] ${message}`);
      setLogs(prev => [...prev.slice(-50), { timestamp: Date.now(), type, message }]);
  };

  // --- LIFECYCLE: Updates & Peer Init ---
  useEffect(() => {
    isMountedRef.current = true;
    
    // Check Updates
    checkForUpdates(APP_VERSION).then(update => {
        if (update?.hasUpdate) {
            setUpdateInfo({ url: update.url, latest: update.latest });
            setShowUpdateModal(true);
        }
    });

    // Init PeerJS
    if (peerInstance.current) peerInstance.current.destroy();
    
    const peer = new Peer({ debug: 1 });
    
    peer.on('open', (id) => {
      if (!isMountedRef.current) return;
      setMyPeerId(id);
      registerPresence(id, userProfile);
      log(`PeerJS initialized with ID: ${id}`);
    });

    peer.on('error', (err) => {
        log(`PeerJS Error: ${err.type} - ${err.message}`, 'error');
        if (err.type === 'peer-unavailable') {
            alert("Could not connect. Peer unavailable.");
            cleanupCall();
        }
    });

    peer.on('call', async (call) => {
        // Auto-answer or prompt? For simplicity, we auto-answer if not busy, or prompt
        // If we are already connected, we reject or replace?
        if (connectionState === ConnectionState.CONNECTED) {
            call.close(); // Busy
            return;
        }

        if (window.confirm(`Incoming call from ${call.peer}. Accept?`)) {
            log('Answering incoming call...', 'webrtc');
            handleAcceptCall(call);
        } else {
            call.close();
        }
    });

    peerInstance.current = peer;

    // Presence Subscription
    const unsubscribeUsers = subscribeToUsers((users) => {
        if (isMountedRef.current) setOnlineUsers(users);
    });

    return () => {
      isMountedRef.current = false;
      if (peerInstance.current) {
          if (peerInstance.current.id) removePresence(peerInstance.current.id);
          peerInstance.current.destroy();
      }
      unsubscribeUsers();
    };
  }, []);

  // --- AUDIO OUTPUT MANAGEMENT ---
  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
        remoteAudioRef.current.srcObject = remoteStream;
        // Apply output device if supported
        if (deviceSettings.audioOutputId && (remoteAudioRef.current as any).setSinkId) {
            (remoteAudioRef.current as any).setSinkId(deviceSettings.audioOutputId)
                .catch((e: any) => log(`Failed to set audio output: ${e.message}`, 'error'));
        }
        remoteAudioRef.current.play().catch(e => log("Audio play failed (interaction needed?)", 'error'));
    }
  }, [remoteStream, deviceSettings.audioOutputId]);


  // --- MEDIA HELPERS ---
  const getLocalStream = async () => {
    const constraints = {
        audio: deviceSettings.audioInputId ? { deviceId: { exact: deviceSettings.audioInputId } } : true,
        video: deviceSettings.videoInputId ? { deviceId: { exact: deviceSettings.videoInputId } } : true,
    };
    try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        setMyStream(stream);
        myVideoTrack.current = stream.getVideoTracks()[0]; // Store cam track
        return stream;
    } catch (err: any) {
        log(`GetUserMedia Error: ${err.message}`, 'error');
        throw err;
    }
  };

  const cleanupCall = () => {
      if (callInstance.current) callInstance.current.close();
      if (myStream) myStream.getTracks().forEach(t => t.stop());
      setMyStream(null);
      setRemoteStream(null);
      setConnectionState(ConnectionState.DISCONNECTED);
      setActiveVoiceChannelId(null);
      setIsScreenSharing(false);
      log("Call disconnected.", 'info');
  };

  // --- CALL HANDLERS ---
  const handleAcceptCall = async (call: any) => {
      setConnectionState(ConnectionState.CONNECTING);
      // Move user to voice channel view automatically
      const voiceChan = INITIAL_CHANNELS.find(c => c.type === ChannelType.VOICE);
      if (voiceChan) {
          setActiveChannelId(voiceChan.id);
          setActiveVoiceChannelId(voiceChan.id);
      }

      try {
          const stream = await getLocalStream();
          call.answer(stream);
          setupCallEvents(call);
      } catch (err) {
          log("Failed to get stream for answer", 'error');
          setConnectionState(ConnectionState.ERROR);
      }
  };

  const handleStartCall = async (remoteId: string) => {
      if (!peerInstance.current) return;
      if (connectionState === ConnectionState.CONNECTED) {
          if(!window.confirm("Disconnect current call?")) return;
          cleanupCall();
      }

      setConnectionState(ConnectionState.CONNECTING);
      const voiceChan = INITIAL_CHANNELS.find(c => c.type === ChannelType.VOICE);
      if (voiceChan) {
          setActiveChannelId(voiceChan.id);
          setActiveVoiceChannelId(voiceChan.id);
      }

      try {
          const stream = await getLocalStream();
          const call = peerInstance.current.call(remoteId, stream);
          setupCallEvents(call);
      } catch (err) {
          log("Failed to start call", 'error');
          setConnectionState(ConnectionState.ERROR);
      }
  };

  const setupCallEvents = (call: any) => {
      callInstance.current = call;
      
      call.on('stream', (rStream: MediaStream) => {
          log("Received remote stream", 'webrtc');
          setRemoteStream(rStream);
          setConnectionState(ConnectionState.CONNECTED);
      });

      call.on('close', () => {
          log("Call closed by peer", 'info');
          cleanupCall();
      });

      call.on('error', (err: any) => {
          log(`Call Error: ${err.message}`, 'error');
          cleanupCall();
      });
  };

  // --- IN-CALL ACTIONS ---
  const toggleVideo = () => {
      if (myStream) {
          const vidTrack = myStream.getVideoTracks()[0];
          if (vidTrack) {
              vidTrack.enabled = !vidTrack.enabled;
              setIsVideoEnabled(vidTrack.enabled);
          }
      }
  };

  const toggleAudio = () => {
      if (myStream) {
          const audTrack = myStream.getAudioTracks()[0];
          if (audTrack) {
              audTrack.enabled = !audTrack.enabled;
              setIsAudioEnabled(audTrack.enabled);
          }
      }
  };

  const handleShareScreen = async () => {
      if (!callInstance.current || !myStream) return;

      // START SCREEN SHARE
      if (!isScreenSharing) {
          try {
              const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
              const screenTrack = displayStream.getVideoTracks()[0];

              // IMPORTANT: Find the sender for video and replace track
              const senders = callInstance.current.peerConnection.getSenders();
              const videoSender = senders.find((s: RTCRtpSender) => s.track?.kind === 'video');

              if (videoSender) {
                  log("Swapping Camera -> Screen", 'webrtc');
                  await videoSender.replaceTrack(screenTrack);
                  setIsScreenSharing(true);
                  
                  // Update local preview
                  const newStream = new MediaStream([screenTrack, ...myStream.getAudioTracks()]);
                  setMyStream(newStream);

                  // Handle Stop Sharing via Browser UI
                  screenTrack.onended = async () => {
                      log("Screen share ended via browser UI", 'webrtc');
                      if (myVideoTrack.current) {
                          await videoSender.replaceTrack(myVideoTrack.current);
                          const revertedStream = new MediaStream([myVideoTrack.current, ...myStream.getAudioTracks()]);
                          setMyStream(revertedStream);
                      }
                      setIsScreenSharing(false);
                  };
              }
          } catch (err: any) {
              log(`Screen share error: ${err.message}`, 'error');
          }
      } 
      // STOP SCREEN SHARE (Manual Click)
      else {
          const senders = callInstance.current.peerConnection.getSenders();
          const videoSender = senders.find((s: RTCRtpSender) => s.track?.kind === 'video');
          
          if (videoSender && myVideoTrack.current) {
              log("Swapping Screen -> Camera", 'webrtc');
              // Stop the screen track to release resource
              const currentScreenTrack = videoSender.track;
              if (currentScreenTrack) currentScreenTrack.stop();

              await videoSender.replaceTrack(myVideoTrack.current);
              const revertedStream = new MediaStream([myVideoTrack.current, ...myStream.getAudioTracks()]);
              setMyStream(revertedStream);
              setIsScreenSharing(false);
          }
      }
  };

  // --- UI ACTIONS ---
  const addMessage = (channelId: string, text: string, sender: string, isAi: boolean = false) => {
      const newMessage: Message = {
          id: Date.now().toString() + Math.random().toString(), sender, content: text, timestamp: Date.now(), isAi
      };
      setMessages(prev => ({ ...prev, [channelId]: [...(prev[channelId] || []), newMessage] }));
  };

  const handleSaveProfile = (newProfile: UserProfile) => {
      setUserProfile(newProfile);
      localStorage.setItem('pisscord_profile', JSON.stringify(newProfile));
      if (myPeerId) updatePresence(myPeerId, newProfile);
  };

  const handleSaveDevices = (newDevices: DeviceSettings) => {
      setDeviceSettings(newDevices);
      localStorage.setItem('pisscord_devices', JSON.stringify(newDevices));
      // Re-trigger stream if connected? Ideally yes, but for now user must reconnect.
  };

  const copyId = () => {
      if (myPeerId) {
          navigator.clipboard.writeText(myPeerId);
          alert("ID Copied!");
      }
  };

  return (
    <div className="flex w-full h-screen bg-discord-main text-discord-text overflow-hidden font-sans relative">
      {/* Global Audio Element for persistent audio across views */}
      <audio ref={remoteAudioRef} className="hidden" />

      {showUpdateModal && updateInfo && (
          <UpdateModal latestVersion={updateInfo.latest} downloadUrl={updateInfo.url} onClose={() => setShowUpdateModal(false)} />
      )}

      {showSettingsModal && (
          <UserSettingsModal 
            currentProfile={userProfile}
            currentDevices={deviceSettings}
            logs={logs}
            onSaveProfile={handleSaveProfile}
            onSaveDevices={handleSaveDevices}
            onClose={() => setShowSettingsModal(false)}
          />
      )}

      <Sidebar onServerClick={() => setActiveChannelId('1')} />
      
      {/* CHANNEL LIST + VOICE CONTROLS */}
      <div className="flex flex-col h-full bg-discord-sidebar w-60">
          <ChannelList 
            channels={INITIAL_CHANNELS} 
            activeChannelId={activeChannelId} 
            onSelectChannel={(id) => {
                const ch = INITIAL_CHANNELS.find(c => c.id === id);
                // If it's a voice channel, we set it as active view AND try to connect if not connected
                if (ch?.type === ChannelType.VOICE) {
                    setActiveChannelId(id);
                    // We don't auto-connect logic here, simpler to let user init call via UI in VoiceStage
                } else {
                    setActiveChannelId(id);
                }
            }}
            connectionState={connectionState}
            peerId={myPeerId}
            userProfile={userProfile}
            onCopyId={copyId}
            onOpenSettings={() => setShowSettingsModal(true)}
          />

          {/* Persistent Voice Control Panel (If Connected) */}
          {connectionState === ConnectionState.CONNECTED && (
             <div className="bg-discord-dark/80 p-2 border-t border-discord-dark flex items-center justify-between">
                 <div className="overflow-hidden">
                    <div className="text-green-500 text-xs font-bold uppercase">Voice Connected</div>
                    <div className="text-white text-xs truncate">Voice Lounge</div>
                 </div>
                 <div className="flex items-center space-x-1">
                    <button onClick={cleanupCall} className="text-white hover:text-red-500 p-1" title="Disconnect">
                        <i className="fas fa-phone-slash"></i>
                    </button>
                 </div>
             </div>
          )}
      </div>
      
      {/* MAIN VIEW AREA */}
      {/* Render Voice Stage if active channel is VOICE OR if we are just "viewing" the call */}
      {activeChannel.type === ChannelType.VOICE ? (
         <VoiceStage 
            myStream={myStream}
            remoteStream={remoteStream}
            connectionState={connectionState}
            onToggleVideo={toggleVideo}
            onToggleAudio={toggleAudio}
            onShareScreen={handleShareScreen}
            onConnect={handleStartCall}
            onDisconnect={cleanupCall}
            isVideoEnabled={isVideoEnabled}
            isAudioEnabled={isAudioEnabled}
            isScreenSharing={isScreenSharing}
            myPeerId={myPeerId}
         />
      ) : (
         <div className="flex-1 flex min-w-0">
             <ChatArea 
                channel={activeChannel}
                messages={messages[activeChannel.id] || []}
                onSendMessage={(text) => addMessage(activeChannel.id, text, userProfile.displayName)}
                onSendAIMessage={(text, response) => addMessage(activeChannel.id, response, 'Gemini', true)}
             />
             <UserList 
                connectionState={connectionState} 
                onlineUsers={onlineUsers} 
                myPeerId={myPeerId}
                onConnectToUser={handleStartCall}
             />
         </div>
      )}
    </div>
  );
}
