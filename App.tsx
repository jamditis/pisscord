import React, { useEffect, useState, useRef, useCallback } from 'react';
import Peer from 'peerjs';
import { Sidebar } from './components/Sidebar';
import { ChannelList } from './components/ChannelList';
import { ChatArea } from './components/ChatArea';
import { VoiceStage } from './components/VoiceStage';
import { UserList } from './components/UserList';
import { UpdateModal } from './components/UpdateModal';
import { UserSettingsModal } from './components/UserSettingsModal';
import { ScreenPickerModal } from './components/ScreenPickerModal';
import { ToastContainer, useToast } from './components/Toast';
import { ConfirmModal } from './components/ConfirmModal';
import { ContextMenu, useContextMenu } from './components/ContextMenu';
import { Channel, ChannelType, ConnectionState, Message, PresenceUser, UserProfile, DeviceSettings, AppLogs } from './types';
import { registerPresence, subscribeToUsers, removePresence, checkForUpdates, updatePresence } from './services/firebase';
import { playSound, preloadSounds, stopLoopingSound } from './services/sounds';

const APP_VERSION = "1.0.11";

// Initial Channels
const INITIAL_CHANNELS: Channel[] = [
  { id: '1', name: 'general', type: ChannelType.TEXT },
  { id: '2', name: 'links', type: ChannelType.TEXT },
  { id: '3', name: 'pissbot', type: ChannelType.AI },
  { id: 'voice-1', name: 'Voice Lounge', type: ChannelType.VOICE },
];

const generateName = () => {
    const adjs = ['Speedy', 'Crimson', 'Shadow', 'Azure', 'Silent', 'Golden', 'Cyber'];
    const nouns = ['Ninja', 'Wolf', 'Eagle', 'Coder', 'Gamer', 'Phoenix', 'Ghost'];
    return `${adjs[Math.floor(Math.random() * adjs.length)]}${nouns[Math.floor(Math.random() * nouns.length)]}`;
};

const getDefaultProfile = (): UserProfile => ({
    displayName: generateName(),
    statusMessage: "",
    color: "#5865F2"
});

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

  // --- TOAST, CONFIRM & CONTEXT MENU ---
  const toast = useToast();
  const { contextMenu, showContextMenu, hideContextMenu } = useContextMenu();
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    confirmStyle?: 'danger' | 'primary';
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // Pending call state for incoming call confirmation
  const pendingCallRef = useRef<any>(null);
  
  // --- STATE: Data ---
  const [messages, setMessages] = useState<Record<string, Message[]>>({
      '1': [], '2': [], '3': [{ id: 'welcome-ai', sender: 'Pissbot', content: 'Hello! I am your AI assistant.', timestamp: Date.now(), isAi: true }],
  });
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
      const saved = localStorage.getItem('pisscord_profile');
      if (saved) {
          return JSON.parse(saved);
      }
      // Generate and save a default profile on first launch
      const defaultProfile = getDefaultProfile();
      localStorage.setItem('pisscord_profile', JSON.stringify(defaultProfile));
      return defaultProfile;
  });
  const [deviceSettings, setDeviceSettings] = useState<DeviceSettings>(() => {
      const saved = localStorage.getItem('pisscord_devices');
      return saved ? JSON.parse(saved) : DEFAULT_DEVICES;
  });
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);
  const [logs, setLogs] = useState<AppLogs[]>([]);
  
  // Ref to hold current device settings for async callbacks (Stale Closure Fix)
  const deviceSettingsRef = useRef(deviceSettings);
  useEffect(() => {
      deviceSettingsRef.current = deviceSettings;
  }, [deviceSettings]);

  // --- STATE: Media ---
  const [myStream, setMyStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [remoteVolume, setRemoteVolume] = useState<number>(100);
  
  // --- MODALS ---
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showScreenPicker, setShowScreenPicker] = useState(false);
  const [screenSources, setScreenSources] = useState<Array<{id: string, name: string, thumbnail: string}>>([]);
  const [updateInfo, setUpdateInfo] = useState<{url: string, latest: string, downloading?: boolean, progress?: number, ready?: boolean} | null>(null);

  // --- REFS ---
  const peerInstance = useRef<Peer | null>(null);
  const callsRef = useRef<Map<string, any>>(new Map()); // Map of peerId -> MediaConnection
  const dataConnectionsRef = useRef<Map<string, any>>(new Map()); // Map of peerId -> DataConnection
  const myVideoTrack = useRef<MediaStreamTrack | null>(null); // Keep original camera track for when screenshare ends
  const isMountedRef = useRef(true);

  const activeChannel = INITIAL_CHANNELS.find(c => c.id === activeChannelId) || INITIAL_CHANNELS[0];

  // --- HELPERS ---
  const log = (message: string, type: 'info' | 'error' | 'webrtc' = 'info') => {
      const entry: AppLogs = { timestamp: Date.now(), type, message };
      setLogs(prev => [entry, ...prev].slice(0, 50));
      console.log(`[${type.toUpperCase()}] ${message}`);
      
      // Log to file via Electron
      if (window.electronAPI?.logToFile) {
          window.electronAPI.logToFile(`[${type.toUpperCase()}] ${message}`);
      }
  };

  // --- LIFECYCLE: Updates & Peer Init ---
  useEffect(() => {
    isMountedRef.current = true;

    // Preload sound effects
    preloadSounds();

    // Check Updates (both Firebase and Electron auto-updater)
    checkForUpdates(APP_VERSION).then(update => {
        if (update?.hasUpdate) {
            setUpdateInfo({ url: update.url, latest: update.latest });
            setShowUpdateModal(true);
        }
    });

    // Setup Electron auto-updater listeners (if running in Electron)
    if ((window as any).electronAPI) {
      const electronAPI = (window as any).electronAPI;

      electronAPI.onUpdateAvailable((data: any) => {
        log(`Update available: ${data.version}`, 'info');
        setUpdateInfo({
          url: '',
          latest: data.version,
          downloading: false,
          ready: false
        });
        setShowUpdateModal(true);
      });

      electronAPI.onUpdateDownloadProgress((data: any) => {
        log(`Downloading update: ${data.percent}%`, 'info');
        setUpdateInfo(prev => prev ? {
          ...prev,
          downloading: true,
          progress: data.percent
        } : null);
      });

      electronAPI.onUpdateDownloaded((data: any) => {
        log(`Update downloaded: ${data.version}`, 'info');
        setUpdateInfo(prev => prev ? {
          ...prev,
          downloading: false,
          ready: true
        } : null);
      });

      electronAPI.onUpdateError((message: string) => {
        log(`Update error: ${message}`, 'error');
      });
    }

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
            toast.error("Connection Failed", "Peer unavailable. They may have disconnected.");
            cleanupCall();
        }
    });

    peer.on('call', async (call) => {
        // MESH NETWORKING:
        // If we are already connected to a voice channel, we assume incoming calls are from peers joining the channel.
        // We auto-answer them to establish the mesh.
        if (connectionState === ConnectionState.CONNECTED) {
            log(`Auto-answering incoming mesh call from ${call.peer}`, 'webrtc');
            handleAcceptCall(call);
            return;
        }

        // Show the window before displaying the confirmation dialog
        if (window.electronAPI?.showWindow) {
            window.electronAPI.showWindow();
        }

        // Store pending call and show confirmation modal
        pendingCallRef.current = call;
        // Play incoming call sound (looped)
        playSound('call_incoming', true);
        setConfirmModal({
            isOpen: true,
            title: "Incoming Call",
            message: `Someone is calling you. Accept the call?`,
            confirmText: "Accept",
            cancelText: "Decline",
            confirmStyle: 'primary',
            onConfirm: () => {
                log('Answering incoming call...', 'webrtc');
                stopLoopingSound(); // Stop the ringing
                handleAcceptCall(pendingCallRef.current);
                pendingCallRef.current = null;
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
            }
        });
    });

    // Handle incoming data connections for text messages
    peer.on('connection', (conn) => {
        log('Incoming data connection from: ' + conn.peer, 'webrtc');
        setupDataConnection(conn);
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
  // Volume is now handled by individual audio elements in the render loop
  
  // --- MEDIA HELPERS ---
  const getLocalStream = async () => {
    // Return existing stream if active
    if (myStream && myStream.active) {
        return myStream;
    }

    log("=== Getting Local Media Stream ===", 'webrtc');
    const currentSettings = deviceSettingsRef.current;
    const constraints = {
        audio: currentSettings.audioInputId ? { deviceId: { exact: currentSettings.audioInputId } } : true,
        video: currentSettings.videoInputId ? { deviceId: { exact: currentSettings.videoInputId } } : true,
    };
    log(`Media constraints: ${JSON.stringify(constraints)}`, 'webrtc');

    try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        log(`✅ Got media stream with ${stream.getVideoTracks().length} video tracks and ${stream.getAudioTracks().length} audio tracks`, 'webrtc');

        // Log video track details
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
            log(`Video track: ${videoTrack.id}, label: ${videoTrack.label}, enabled: ${videoTrack.enabled}`, 'webrtc');
            myVideoTrack.current = videoTrack; // Store cam track for screen share
            log("✅ Stored camera track in myVideoTrack.current", 'webrtc');
        } else {
            log("⚠️ WARNING: No video track in stream!", 'error');
        }

        // Log audio track details
        const audioTrack = stream.getAudioTracks()[0];
        if (audioTrack) {
            log(`Audio track: ${audioTrack.id}, label: ${audioTrack.label}, enabled: ${audioTrack.enabled}, muted: ${audioTrack.muted}`, 'webrtc');
        } else {
            log("⚠️ WARNING: No audio track in stream! Microphone may not be available.", 'error');
        }

        setMyStream(stream);
        return stream;
    } catch (err: any) {
        log(`GetUserMedia Error: ${err.name} - ${err.message}`, 'error');
        throw err;
    }
  };

  const setupDataConnection = (conn: any) => {
      const peerId = conn.peer;
      dataConnectionsRef.current.set(peerId, conn);

      conn.on('open', () => {
          log(`Data connection established with ${peerId}`, 'webrtc');
      });

      conn.on('data', (data: any) => {
          // Receive text messages from remote peer
          if (data.type === 'text-message') {
              const newMessage: Message = {
                  id: data.id,
                  sender: data.sender,
                  content: data.content,
                  timestamp: data.timestamp,
                  isAi: false,
                  attachment: data.attachment
              };
              setMessages(prev => ({
                  ...prev,
                  [data.channelId]: [...(prev[data.channelId] || []), newMessage]
              }));
              log(`Received message from ${data.sender}: ${data.content}`, 'info');
          }
      });

      conn.on('close', () => {
          log(`Data connection closed with ${peerId}`, 'webrtc');
          dataConnectionsRef.current.delete(peerId);
      });

      conn.on('error', (err: Error) => {
          log(`Data connection error with ${peerId}: ${err.message}`, 'error');
          dataConnectionsRef.current.delete(peerId);
      });
  };

  const cleanupCall = () => {
      callsRef.current.forEach(call => call.close());
      callsRef.current.clear();
      
      dataConnectionsRef.current.forEach(conn => conn.close());
      dataConnectionsRef.current.clear();

      if (myStream) myStream.getTracks().forEach(t => t.stop());
      
      setMyStream(null);
      setRemoteStreams(new Map());
      setConnectionState(ConnectionState.DISCONNECTED);
      setActiveVoiceChannelId(null);
      setIsScreenSharing(false);
      
      // Update presence to show not in voice
      if (myPeerId) {
          updatePresence(myPeerId, userProfile, null);
      }
      
      log("Left voice channel.", 'info');
  };

  // --- CALL HANDLERS ---
  const joinVoiceChannel = async (channelId: string) => {
      log(`Joining voice channel: ${channelId}`, 'info');
      
      if (activeVoiceChannelId === channelId && connectionState === ConnectionState.CONNECTED) return;
      
      if (connectionState === ConnectionState.CONNECTED) {
          cleanupCall();
      }

      setActiveChannelId(channelId);
      setActiveVoiceChannelId(channelId);
      setConnectionState(ConnectionState.CONNECTING);

      if (myPeerId) {
          updatePresence(myPeerId, userProfile, channelId);
      }

      try {
          // Get stream once for all calls
          await getLocalStream();
          
          // Find peers to call
          const peersInChannel = onlineUsers.filter(u => u.voiceChannelId === channelId && u.peerId !== myPeerId);
          
          if (peersInChannel.length === 0) {
              log("No users in channel. Waiting...", 'info');
              setConnectionState(ConnectionState.CONNECTED);
              toast.success("Joined Voice", "You are in the Voice Lounge.");
              return;
          }

          toast.info("Joining...", `Connecting to ${peersInChannel.length} users...`);
          
          // Initiate calls to all existing peers
          peersInChannel.forEach(peer => {
             handleStartCall(peer.peerId); 
          });
      } catch (err: any) {
          log(`Failed to join channel: ${err.message}`, 'error');
          setConnectionState(ConnectionState.ERROR);
      }
  };

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

      const initiateCall = async () => {
          // Only set connecting if we aren't already connected
          if (connectionState !== ConnectionState.CONNECTED) {
             setConnectionState(ConnectionState.CONNECTING);
          }

          const voiceChan = INITIAL_CHANNELS.find(c => c.type === ChannelType.VOICE);
          if (voiceChan && activeVoiceChannelId !== voiceChan.id) {
              setActiveChannelId(voiceChan.id);
              setActiveVoiceChannelId(voiceChan.id);
          }

          try {
              const stream = await getLocalStream();
              const call = peerInstance.current!.call(remoteId, stream);
              setupCallEvents(call);

              // Also establish data connection
              const conn = peerInstance.current!.connect(remoteId);
              setupDataConnection(conn);
              
              if (connectionState !== ConnectionState.CONNECTED) {
                  playSound('call_outgoing', true);
                  toast.info("Calling...", "Waiting for peer to answer.");
              } else {
                  toast.success("Calling...", `Adding ${remoteId} to the call.`);
              }
          } catch (err) {
              log("Failed to start call", 'error');
              toast.error("Call Failed", "Could not start call.");
              if (callsRef.current.size === 0) setConnectionState(ConnectionState.ERROR);
          }
      };

      // In Mesh mode, we allow multiple calls. 
      // If we are already connected, we just add another peer.
      initiateCall();
  };

  const setupCallEvents = (call: any) => {
      const remotePeerId = call.peer;
      callsRef.current.set(remotePeerId, call);

      call.on('stream', (rStream: MediaStream) => {
          log(`=== Received Remote Stream from ${remotePeerId} ===`, 'webrtc');
          
          setRemoteStreams(prev => {
              const newMap = new Map(prev);
              newMap.set(remotePeerId, rStream);
              return newMap;
          });

          setConnectionState(ConnectionState.CONNECTED);
          stopLoopingSound(); 
          playSound('user_join');
      });

      call.on('close', () => {
          log(`Call closed by peer ${remotePeerId}`, 'info');
          playSound('user_leave');
          
          // Remove this peer's stream and call
          setRemoteStreams(prev => {
              const newMap = new Map(prev);
              newMap.delete(remotePeerId);
              return newMap;
          });
          callsRef.current.delete(remotePeerId);
          
          if (callsRef.current.size === 0) {
             // If everyone left, we are just alone in the channel.
             // We DON'T disconnect ourselves.
             toast.info("User Left", "You are the only one in the call.");
          } else {
              toast.info("User Left", "A user disconnected from the call.");
          }
      });

      call.on('error', (err: any) => {
          log(`Call Error with ${remotePeerId}: ${err.message}`, 'error');
          callsRef.current.delete(remotePeerId);
          setRemoteStreams(prev => {
              const newMap = new Map(prev);
              newMap.delete(remotePeerId);
              return newMap;
          });
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
              playSound(audTrack.enabled ? 'unmute' : 'mute');
          }
      }
  };

  const handleShareScreen = async () => {
      log("=== Screen Share Button Clicked ===", 'webrtc');

      // Debug: Check prerequisites
      if (callsRef.current.size === 0) {
          log("ERROR: No active call instance!", 'error');
          toast.warning("No Active Call", "Please connect to a call first before sharing your screen.");
          return;
      }

      if (!myStream) {
          log("ERROR: No local stream!", 'error');
          toast.error("No Media Stream", "Could not access your media devices.");
          return;
      }

      log(`Current state: isScreenSharing=${isScreenSharing}`, 'webrtc');

      // START SCREEN SHARE
      if (!isScreenSharing) {
          // Use Electron's desktopCapturer if available - show picker
          if (window.electronAPI?.getDesktopSources) {
              log("Using Electron desktopCapturer - fetching sources", 'webrtc');
              try {
                  const sources = await window.electronAPI.getDesktopSources();
                  if (sources.length === 0) {
                      toast.warning("No Sources", "No screen sources available to share.");
                      return;
                  }
                  log(`Found ${sources.length} screen sources`, 'webrtc');
                  setScreenSources(sources);
                  setShowScreenPicker(true);
              } catch (err: any) {
                  log(`Failed to get screen sources: ${err.message}`, 'error');
                  toast.error("Screen Share Error", `Failed to get screen sources: ${err.message}`);
              }
          } else {
              // Fallback to standard getDisplayMedia (has its own picker)
              try {
                  log("Using standard getDisplayMedia", 'webrtc');
                  const displayStream = await navigator.mediaDevices.getDisplayMedia({
                      video: true,
                      audio: false
                  });
                  await startScreenShareWithStream(displayStream);
                  toast.success("Screen Sharing", "You are now sharing your screen.");
              } catch (err: any) {
                  log(`Screen share error: ${err.name} - ${err.message}`, 'error');
                  if (err.name !== 'AbortError') {
                      toast.error("Screen Share Failed", err.message);
                  }
              }
          }
      }
      // STOP SCREEN SHARE (Manual Click)
      else {
          await stopScreenShare();
      }
  };

  const handleScreenSourceSelect = async (source: {id: string, name: string, thumbnail: string}) => {
      log(`User selected source: ${source.name} (${source.id})`, 'webrtc');
      setShowScreenPicker(false);

      try {
          const displayStream = await navigator.mediaDevices.getUserMedia({
              audio: false,
              video: {
                  mandatory: {
                      chromeMediaSource: 'desktop',
                      chromeMediaSourceId: source.id,
                      minWidth: 640,
                      maxWidth: 1920,
                      minHeight: 480,
                      maxHeight: 1080,
                      minFrameRate: 5,
                      maxFrameRate: 30
                  }
              } as any
          });
          await startScreenShareWithStream(displayStream);
      } catch (err: any) {
          log(`Screen share error: ${err.name} - ${err.message}`, 'error');
          // Provide more helpful error message for common Windows capture issues
          if (err.message?.includes('not capturable') || err.name === 'NotReadableError') {
              toast.error("Cannot Capture Window", `"${source.name}" may be protected or using hardware acceleration. Try sharing "Entire Screen" instead.`);
          } else {
              toast.error("Screen Share Failed", err.message);
          }
      }
  };

  const startScreenShareWithStream = async (displayStream: MediaStream) => {
      const screenTrack = displayStream.getVideoTracks()[0];

      if (!screenTrack) {
          log("ERROR: No screen track received!", 'error');
          return;
      }

      log(`Screen track: ${screenTrack.id}, label: ${screenTrack.label}`, 'webrtc');
      
      // Iterate over all active calls and replace the track
      let replacedCount = 0;
      
      for (const [peerId, call] of callsRef.current.entries()) {
          if (!call.peerConnection) {
              log(`WARN: No peerConnection for ${peerId}`, 'error');
              continue;
          }

          const senders = call.peerConnection.getSenders();
          const videoSender = senders.find((s: RTCRtpSender) => s.track?.kind === 'video');

          if (videoSender) {
              try {
                  await videoSender.replaceTrack(screenTrack);
                  replacedCount++;
              } catch(e) {
                  log(`Failed to replace track for ${peerId}`, 'error');
              }
          }
      }

      if (replacedCount === 0) {
          log("ERROR: Could not replace tracks for any peer", 'error');
          toast.error("Screen Share Failed", "Could not share screen with peers.");
          screenTrack.stop();
          return;
      }

      log(`✅ Replaced tracks for ${replacedCount} peers`, 'webrtc');

      setIsScreenSharing(true);

      // Update local preview
      const audioTracks = myStream!.getAudioTracks();
      const newStream = new MediaStream([screenTrack, ...audioTracks]);
      setMyStream(newStream);

      // Handle Stop Sharing via Browser UI
      screenTrack.onended = async () => {
          log("Screen share ended via browser UI", 'webrtc');
          await stopScreenShare();
      };
  };

  const stopScreenShare = async () => {
      try {
          log("Stopping screen share...", 'webrtc');

          if (!myVideoTrack.current) {
              log("ERROR: No camera track to revert to!", 'error');
              toast.error("Camera Error", "Lost reference to camera. Try reconnecting.");
              setIsScreenSharing(false);
              return;
          }

          log("Swapping Screen -> Camera", 'webrtc');
          
          // Revert tracks for all peers
          for (const [peerId, call] of callsRef.current.entries()) {
              if (!call.peerConnection) continue;

              const senders = call.peerConnection.getSenders();
              const videoSender = senders.find((s: RTCRtpSender) => s.track?.kind === 'video');

              if (videoSender) {
                   // Stop the screen track (but strictly speaking we should only stop it once, effectively handled by the fact it's the same track object)
                   // Actually we should stop the screen track *after* replacing?
                   await videoSender.replaceTrack(myVideoTrack.current);
              }
          }
          
          // Stop the screen track in the current stream if it exists
          const currentVideoTrack = myStream?.getVideoTracks()[0];
          if (currentVideoTrack && currentVideoTrack.label !== myVideoTrack.current.label) {
              currentVideoTrack.stop();
          }

          const audioTracks = myStream?.getAudioTracks() || [];
          const revertedStream = new MediaStream([myVideoTrack.current, ...audioTracks]);
          setMyStream(revertedStream);
          setIsScreenSharing(false);

          log("✅ Stopped screen share successfully", 'webrtc');
      } catch (err: any) {
          log(`ERROR stopping screen share: ${err.message}`, 'error');
          setIsScreenSharing(false);
      }
  };

  // --- UI ACTIONS ---
  const addMessage = (channelId: string, text: string, sender: string, isAi: boolean = false, attachment?: Message['attachment']) => {
      const newMessage: Message = {
          id: Date.now().toString() + Math.random().toString(), sender, content: text, timestamp: Date.now(), isAi, attachment
      };
      setMessages(prev => ({ ...prev, [channelId]: [...(prev[channelId] || []), newMessage] }));

      // Send message to ALL remote peers via data connection (except AI messages)
      if (!isAi && dataConnectionsRef.current.size > 0) {
          dataConnectionsRef.current.forEach((conn) => {
              if (conn.open) {
                  try {
                      conn.send({
                          type: 'text-message',
                          channelId,
                          id: newMessage.id,
                          sender: newMessage.sender,
                          content: newMessage.content,
                          timestamp: newMessage.timestamp,
                          attachment: newMessage.attachment
                      });
                  } catch (err: any) {
                      log(`Failed to send message to ${conn.peer}: ${err.message}`, 'error');
                  }
              }
          });
          log(`Broadcasted message: ${text}`, 'webrtc');
      }
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

  const handleCheckForUpdates = () => {
      log("Manually checking for updates...", 'info');
      checkForUpdates(APP_VERSION).then(update => {
          if (update) {
              setUpdateInfo(update);
              setShowUpdateModal(true);
              log(`Update available: ${update.latest}`, 'info');
              toast.success("Update Available", `Version ${update.latest} is ready to download!`);
          } else {
              log("You're already on the latest version!", 'info');
              toast.success("Up to Date", `You're running the latest version (${APP_VERSION}).`);
          }
      }).catch(err => {
          log(`Update check failed: ${err.message}`, 'error');
          toast.error("Update Check Failed", err.message);
      });
  };

  const copyId = () => {
      if (myPeerId) {
          // Use Electron clipboard API if available, otherwise fallback to navigator
          if (window.electronAPI?.copyToClipboard) {
              window.electronAPI.copyToClipboard(myPeerId);
          } else {
              navigator.clipboard.writeText(myPeerId);
          }
          toast.success("Copied!", "Your Peer ID has been copied to clipboard.");
      }
  };

  // Global right-click handler
  const handleContextMenu = (e: React.MouseEvent) => {
    // Only show context menu if we're not clicking on an input, textarea, or element with its own context menu
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return; // Let default context menu show for text inputs
    }

    showContextMenu(e, [
      {
        label: 'Copy Peer ID',
        icon: 'fa-copy',
        onClick: copyId,
        disabled: !myPeerId
      },
      { label: '', onClick: () => {}, divider: true },
      {
        label: isAudioEnabled ? 'Mute' : 'Unmute',
        icon: isAudioEnabled ? 'fa-microphone-slash' : 'fa-microphone',
        onClick: toggleAudio,
        disabled: connectionState !== ConnectionState.CONNECTED
      },
      {
        label: isVideoEnabled ? 'Turn Off Camera' : 'Turn On Camera',
        icon: isVideoEnabled ? 'fa-video-slash' : 'fa-video',
        onClick: toggleVideo,
        disabled: connectionState !== ConnectionState.CONNECTED
      },
      { label: '', onClick: () => {}, divider: true },
      {
        label: 'Settings',
        icon: 'fa-cog',
        onClick: () => setShowSettingsModal(true)
      },
      {
        label: 'Disconnect',
        icon: 'fa-phone-slash',
        onClick: cleanupCall,
        danger: true,
        disabled: connectionState !== ConnectionState.CONNECTED
      }
    ]);
  };

  return (
    <div
      className="flex w-full h-screen bg-discord-main text-discord-text overflow-hidden font-sans relative"
      onContextMenu={handleContextMenu}
    >
      {/* Global Audio Elements for persistent audio across views */}
      {Array.from(remoteStreams.entries()).map(([peerId, stream]) => (
          <audio 
            key={peerId}
            ref={el => {
                if (el) {
                    el.srcObject = stream;
                    el.volume = Math.min(remoteVolume / 100, 1.0);
                    // If we have a specific output device, set it
                    if ((el as any).setSinkId && deviceSettings.audioOutputId) {
                        (el as any).setSinkId(deviceSettings.audioOutputId)
                            .catch((e: any) => console.error("Failed to set audio output", e));
                    }
                }
            }}
            autoPlay 
            playsInline 
            className="hidden" 
          />
      ))}

      {showUpdateModal && updateInfo && (
          <UpdateModal
            latestVersion={updateInfo.latest}
            downloadUrl={updateInfo.url}
            downloading={updateInfo.downloading}
            progress={updateInfo.progress}
            ready={updateInfo.ready}
            onClose={() => setShowUpdateModal(false)}
          />
      )}

      {showSettingsModal && (
          <UserSettingsModal
            currentProfile={userProfile}
            currentDevices={deviceSettings}
            logs={logs}
            appVersion={APP_VERSION}
            onSaveProfile={handleSaveProfile}
            onSaveDevices={handleSaveDevices}
            onCheckForUpdates={handleCheckForUpdates}
            onClose={() => setShowSettingsModal(false)}
            onShowToast={(type, title, message) => toast[type](title, message)}
          />
      )}

      {showScreenPicker && (
          <ScreenPickerModal
            sources={screenSources}
            onSelect={handleScreenSourceSelect}
            onClose={() => setShowScreenPicker(false)}
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
                if (ch?.type === ChannelType.VOICE) {
                    joinVoiceChannel(id);
                } else {
                    setActiveChannelId(id);
                }
            }}
            connectionState={connectionState}
            peerId={myPeerId}
            userProfile={userProfile}
            onCopyId={copyId}
            onOpenSettings={() => setShowSettingsModal(true)}
            onDisconnect={cleanupCall}
            isAudioEnabled={isAudioEnabled}
            isVideoEnabled={isVideoEnabled}
            onToggleAudio={toggleAudio}
            onToggleVideo={toggleVideo}
            remoteVolume={remoteVolume}
            onVolumeChange={setRemoteVolume}
            onShowToast={(type, title, message) => toast[type](title, message)}
          />
      </div>
      
      {/* MAIN VIEW AREA */}
      {/* Render Voice Stage if active channel is VOICE OR if we are just "viewing" the call */}
      {activeChannel.type === ChannelType.VOICE ? (
         <VoiceStage
            myStream={myStream}
            remoteStreams={remoteStreams}
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
            userProfile={userProfile}
            onlineUsers={onlineUsers}
            onIdCopied={() => toast.success("Copied!", "Send this ID to your friend so they can call you.")}
         />
      ) : (
         <div className="flex-1 flex min-w-0">
             <ChatArea 
                channel={activeChannel}
                messages={messages[activeChannel.id] || []}
                onSendMessage={(text, attachment) => addMessage(activeChannel.id, text, userProfile.displayName, false, attachment)}
                onSendAIMessage={(text, response) => addMessage(activeChannel.id, response, 'Pissbot', true)}
             />
             <UserList 
                connectionState={connectionState} 
                onlineUsers={onlineUsers} 
                myPeerId={myPeerId}
                onConnectToUser={handleStartCall}
             />
         </div>
      )}

      {/* Toast Notifications */}
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismissToast} />

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        confirmStyle={confirmModal.confirmStyle}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => {
            // If there's a pending call, close it
            if (pendingCallRef.current) {
                stopLoopingSound(); // Stop the ringing
                pendingCallRef.current.close();
                pendingCallRef.current = null;
            }
            setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }}
      />

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          items={contextMenu.items}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={hideContextMenu}
        />
      )}
    </div>
  );
}
