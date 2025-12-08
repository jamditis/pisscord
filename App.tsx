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
import { ReportIssueModal } from './components/ReportIssueModal';
import { ToastContainer, useToast } from './components/Toast';
import { ConfirmModal } from './components/ConfirmModal';
import { ContextMenu, useContextMenu } from './components/ContextMenu';
import { MobileNav, MobileView } from './components/MobileNav';
import { SplashScreen } from './components/SplashScreen';
import { PassphraseModal } from './components/PassphraseModal';
import { ReleaseNotesModal, shouldShowReleaseNotes, markVersionAsSeen } from './components/ReleaseNotesModal';
import { useIsMobile } from './hooks/useIsMobile';
import { isEncryptionSetUp } from './services/encryption';
import { markChannelAsRead, updateNewestFromMessages, getUnreadChannels } from './services/unread';
import { Channel, ChannelType, ConnectionState, Message, PresenceUser, UserProfile, DeviceSettings, AppLogs, AppSettings, AppTheme } from './types';
import { ThemeProvider, themeColors } from './contexts/ThemeContext';
import { registerPresence, subscribeToUsers, removePresence, checkForUpdates, updatePresence, sendMessage, subscribeToMessages, cleanupOldMessages, getPissbotConfig, PissbotConfig, checkForMOTD, getReleaseNotes, ReleaseNotesConfig } from './services/firebase';
import { playSound, preloadSounds, stopLoopingSound } from './services/sounds';
import { fetchGitHubReleases, fetchGitHubEvents } from './services/github';
import { Platform, LogService, ClipboardService, UpdateService, ScreenShareService, WindowService, HapticsService } from './services/platform';

const APP_VERSION = "1.4.4";

// Initial Channels
const INITIAL_CHANNELS: Channel[] = [
  { id: '1', name: 'general', type: ChannelType.TEXT },
  { id: '2', name: 'links', type: ChannelType.TEXT },
  { id: '4', name: 'dev-updates', type: ChannelType.TEXT },
  { id: '5', name: 'issues', type: ChannelType.TEXT },
  { id: '3', name: 'pissbot', type: ChannelType.AI },
  { id: 'voice-1', name: 'Chillin\'', type: ChannelType.VOICE },
  { id: 'voice-2', name: 'Gaming', type: ChannelType.VOICE },
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
    videoInputId: "",
    // Audio processing - all enabled by default
    noiseSuppression: true,
    echoCancellation: true,
    autoGainControl: true
};

const DEFAULT_APP_SETTINGS: AppSettings = {
    theme: 'purple'
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
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
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
  const [appSettings, setAppSettings] = useState<AppSettings>(() => {
      const saved = localStorage.getItem('pisscord_app_settings');
      return saved ? JSON.parse(saved) : DEFAULT_APP_SETTINGS;
  });
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);
  const [logs, setLogs] = useState<AppLogs[]>([]);
  
  // Ref to hold current device settings for async callbacks (Stale Closure Fix)
  const deviceSettingsRef = useRef(deviceSettings);
  useEffect(() => {
      deviceSettingsRef.current = deviceSettings;
  }, [deviceSettings]);

  // Ref for connectionState to avoid stale closure in peer.on('call')
  const connectionStateRef = useRef(connectionState);
  useEffect(() => {
      connectionStateRef.current = connectionState;
  }, [connectionState]);

  // --- STATE: Media ---
  const [myStream, setMyStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [remoteVolume, setRemoteVolume] = useState<number>(100); // Master volume (0-200)
  const [userVolumes, setUserVolumes] = useState<Map<string, number>>(new Map()); // Per-user volume overrides (0-200)
  
  // --- MODALS ---
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showScreenPicker, setShowScreenPicker] = useState(false);
  const [showPassphraseModal, setShowPassphraseModal] = useState(false);
  const [screenSources, setScreenSources] = useState<Array<{id: string, name: string, thumbnail: string}>>([]);
  const [updateInfo, setUpdateInfo] = useState<{url: string, latest: string, downloading?: boolean, progress?: number, ready?: boolean} | null>(null);
  // Encryption state: 'none' = not set up, 'locked' = stored but needs unlock, 'ready' = unlocked
  const [encryptionState, setEncryptionState] = useState<'none' | 'locked' | 'ready'>('none');

  // --- RELEASE NOTES ---
  const [showReleaseNotesModal, setShowReleaseNotesModal] = useState(false);
  const [releaseNotesData, setReleaseNotesData] = useState<ReleaseNotesConfig | null>(null);

  // --- UNREAD MESSAGES ---
  const [unreadChannels, setUnreadChannels] = useState<string[]>([]);

  // --- UI STATE ---
  const [isUserListCollapsed, setIsUserListCollapsed] = useState(false);
  const [mobileView, setMobileView] = useState<MobileView>('chat');
  const [showSplash, setShowSplash] = useState(true);
  const isMobile = useIsMobile();

  // --- REFS ---
  const peerInstance = useRef<Peer | null>(null);
  const callsRef = useRef<Map<string, any>>(new Map()); // Map of peerId -> MediaConnection
  const dataConnectionsRef = useRef<Map<string, any>>(new Map()); // Map of peerId -> DataConnection
  const myVideoTrack = useRef<MediaStreamTrack | null>(null); // Keep original camera track for when screenshare ends
  const isMountedRef = useRef(true);

  const activeChannel = INITIAL_CHANNELS.find(c => c.id === activeChannelId) || INITIAL_CHANNELS[0];

  // --- SUBSCRIPTIONS ---
  useEffect(() => {
      // Subscribe to messages for the active channel
      if (activeChannel.id === '4') {
          // Dev Updates Channel - Fetch from GitHub (Releases + Events)
          Promise.all([fetchGitHubReleases(), fetchGitHubEvents()]).then(([releases, events]) => {
              const allMessages = [...releases, ...events].sort((a, b) => a.timestamp - b.timestamp);
              
              // Add Roadmap as a pinned message (fake timestamp)
              const roadmapMessage: Message = {
                  id: 'roadmap',
                  sender: 'System',
                  content: "# 🗺️ Roadmap\n\n- [x] Group Calls\n- [x] File Sharing\n- [x] Profile Pictures\n- [x] Mobile App\n- [x] Theme Customization\n- [x] End-to-End Encryption\n- [x] Web Browser Version\n- [ ] Direct Messages (DMs)\n- [ ] iOS App\n\n*Updates every commit.*",
                  timestamp: Date.now(), // Always at bottom? Or top? 
                  // If we want it at top, set timestamp 0. If bottom, Date.now().
                  // Actually, let's just put it in the list.
                  isAi: false
              };

              setMessages(prev => ({
                  ...prev,
                  '4': [...allMessages, roadmapMessage]
              }));
          });
      } else if (activeChannel.type !== ChannelType.VOICE) {
          // Mark channel as read when viewing it
          markChannelAsRead(activeChannelId);
          setUnreadChannels(getUnreadChannels());

          const unsubscribe = subscribeToMessages(activeChannelId, (newMessages) => {
              setMessages(prev => ({
                  ...prev,
                  [activeChannelId]: newMessages as Message[]
              }));
              // Update newest message tracking for this channel
              updateNewestFromMessages(activeChannelId, newMessages);
              // Since we're viewing this channel, keep it marked as read
              markChannelAsRead(activeChannelId);
          });
          return () => unsubscribe();
      }
  }, [activeChannelId, activeChannel.type]);


  // --- HELPERS ---
  const log = (message: string, type: 'info' | 'error' | 'webrtc' = 'info') => {
      const entry: AppLogs = { timestamp: Date.now(), type, message };
      setLogs(prev => [entry, ...prev].slice(0, 50));
      // Use platform-agnostic logging (handles console + file logging on Electron)
      LogService.log(type, message);
  };

  // --- LIFECYCLE: Updates & Peer Init ---
  useEffect(() => {
    isMountedRef.current = true;

    // Preload sound effects
    preloadSounds();

    // Check encryption state - always require passphrase if not unlocked
    if (isEncryptionSetUp()) {
      setEncryptionState('ready');
    } else {
      // Encryption not ready - show passphrase modal for all users
      setEncryptionState('locked');
      setShowPassphraseModal(true);
    }

    // Check for release notes (show popup on new version)
    getReleaseNotes().then(notes => {
      if (notes && shouldShowReleaseNotes(notes.version)) {
        setReleaseNotesData(notes);
        // Delay showing modal until after splash screen
        setTimeout(() => {
          setShowReleaseNotesModal(true);
        }, 2000);
      }
    }).catch(err => {
      console.error('[App] Failed to fetch release notes:', err);
    });

    // Cleanup old messages (14-day retention)
    const textChannels = INITIAL_CHANNELS.filter(c => c.type === ChannelType.TEXT || c.type === ChannelType.AI).map(c => c.id);
    cleanupOldMessages(textChannels);

    // Subscribe to all text channels for unread tracking
    const unsubscribes: (() => void)[] = [];
    textChannels.forEach(channelId => {
      const unsub = subscribeToMessages(channelId, (newMessages) => {
        updateNewestFromMessages(channelId, newMessages);
        // Update unread state (but don't mark as read - that happens when viewing)
        setUnreadChannels(getUnreadChannels());
      });
      unsubscribes.push(unsub);
    });

    // Check Updates (both Firebase and Electron auto-updater)
    checkForUpdates(APP_VERSION).then(update => {
        if (update?.hasUpdate) {
            setUpdateInfo({ url: update.url, latest: update.latest });
            setShowUpdateModal(true);
        }
    });

    // Check Pissbot Updates
    getPissbotConfig().then(config => {
        if (config) {
            const lastKnown = localStorage.getItem('pissbot_last_updated');
            if (lastKnown && Number(lastKnown) < config.lastUpdated) {
                toast.info("🧠 Brain Upgrade", "Pissbot has been updated with new knowledge!");
                // Maybe post to dev channel?
            }
            localStorage.setItem('pissbot_last_updated', config.lastUpdated.toString());
        }
    });

    // Check MOTD
    checkForMOTD().then(motd => {
        if (motd) {
            const lastMotd = localStorage.getItem('pisscord_motd');
            if (lastMotd !== motd) {
                toast.info("📢 Announcement", motd);
                localStorage.setItem('pisscord_motd', motd);
            }
        }
    });

    // Setup auto-updater listeners (Electron only - no-op on other platforms)
    if (UpdateService.isSupported) {
      UpdateService.onUpdateAvailable((data: any) => {
        log(`Update available: ${data.version}`, 'info');
        setUpdateInfo({
          url: '',
          latest: data.version,
          downloading: false,
          ready: false
        });
        setShowUpdateModal(true);
      });

      UpdateService.onUpdateProgress((data: any) => {
        log(`Downloading update: ${data.percent}%`, 'info');
        setUpdateInfo(prev => prev ? {
          ...prev,
          downloading: true,
          progress: data.percent
        } : null);
      });

      UpdateService.onUpdateDownloaded((data: any) => {
        log(`Update downloaded: ${data.version}`, 'info');
        setUpdateInfo(prev => prev ? {
          ...prev,
          downloading: false,
          ready: true
        } : null);
      });

      UpdateService.onUpdateError((message: string) => {
        log(`Update error: ${message}`, 'error');
      });
    }

    // Init PeerJS with ICE server configuration for mobile/NAT traversal
    if (peerInstance.current) peerInstance.current.destroy();

    const peer = new Peer({
      debug: 2, // More verbose logging for debugging
      config: {
        iceServers: [
          // Google STUN servers
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          // OpenRelay free TURN servers for NAT traversal
          {
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject'
          },
          {
            urls: 'turn:openrelay.metered.ca:443',
            username: 'openrelayproject',
            credential: 'openrelayproject'
          },
          {
            urls: 'turn:openrelay.metered.ca:443?transport=tcp',
            username: 'openrelayproject',
            credential: 'openrelayproject'
          }
        ]
      }
    });
    
    peer.on('open', (id) => {
      if (!isMountedRef.current) return;
      setMyPeerId(id);
      registerPresence(id, userProfile);
      log(`PeerJS initialized with ID: ${id}`);
      log(`Platform: ${navigator.userAgent}`, 'info');
      log(`MediaDevices available: ${!!navigator.mediaDevices}`, 'info');
    });

    peer.on('error', (err) => {
        log(`PeerJS Error: ${err.type} - ${err.message}`, 'error');
        if (err.type === 'peer-unavailable') {
            toast.error("Connection Failed", "Peer unavailable. They may have disconnected.");
            cleanupCall();
        } else if (err.type === 'network') {
            toast.error("Network Error", "Could not connect to signaling server.");
        } else if (err.type === 'disconnected' || err.type === 'server-error') {
            toast.error("Connection Lost", "Lost connection to server. Reconnecting...");
        }
    });

    peer.on('disconnected', () => {
        log('PeerJS disconnected from signaling server, attempting reconnect...', 'error');
        peer.reconnect();
    });

    peer.on('call', async (call) => {
        // MESH NETWORKING:
        // If we are already connected to a voice channel, we assume incoming calls are from peers joining the channel.
        // We auto-answer them to establish the mesh.
        // Use connectionStateRef to get current state (avoid stale closure bug)
        if (connectionStateRef.current === ConnectionState.CONNECTED) {
            log(`Auto-answering incoming mesh call from ${call.peer}`, 'webrtc');
            handleAcceptCall(call);
            return;
        }

        // Show the window before displaying the confirmation dialog (Electron only)
        WindowService.showWindow();

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
      // Cleanup message subscriptions for unread tracking
      unsubscribes.forEach(unsub => unsub());
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

    // Build audio constraints with noise suppression and other processing
    const audioConstraints: MediaTrackConstraints = {
        noiseSuppression: currentSettings.noiseSuppression ?? true,
        echoCancellation: currentSettings.echoCancellation ?? true,
        autoGainControl: currentSettings.autoGainControl ?? true,
    };
    if (currentSettings.audioInputId) {
        audioConstraints.deviceId = { exact: currentSettings.audioInputId };
    }

    const constraints = {
        audio: audioConstraints,
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
        // Provide more helpful error messages for common mobile issues
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            toast.error("Permission Denied", "Camera/microphone access was denied. Please allow access in your device settings.");
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
            toast.error("No Device Found", "No camera or microphone found. Please connect a device.");
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
            toast.error("Device In Use", "Camera/microphone is being used by another app.");
        } else if (err.name === 'OverconstrainedError') {
            log("Device constraints too strict, retrying with basic constraints...", 'webrtc');
            // Fallback: try with minimal constraints
            try {
                const fallbackStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
                setMyStream(fallbackStream);
                return fallbackStream;
            } catch (fallbackErr: any) {
                log(`Fallback also failed: ${fallbackErr.message}`, 'error');
            }
        }
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
          // DEPRECATED: Chat is now handled via Firebase Persistence.
          // Keeping this hook for future P2P features (e.g. typing indicators, game state)
          if (data.type === 'ping') {
              log(`Ping from ${conn.peer}`, 'webrtc');
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

      const channel = INITIAL_CHANNELS.find(c => c.id === channelId);
      const peersInChannel = onlineUsers.filter(u => u.voiceChannelId === channelId && u.peerId !== myPeerId);

      setActiveChannelId(channelId);
      setActiveVoiceChannelId(channelId);
      setConnectionState(ConnectionState.CONNECTING);

      if (myPeerId) {
          updatePresence(myPeerId, userProfile, channelId);
      }

      try {
          // Get stream once for all calls
          await getLocalStream();

          if (peersInChannel.length === 0) {
              log("No users in channel. Waiting...", 'info');
              setConnectionState(ConnectionState.CONNECTED);
              toast.success("Joined Voice", `You are in ${channel?.name || 'the channel'}.`);
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
          if (ScreenShareService.isSupported) {
              log("Using Electron desktopCapturer - fetching sources", 'webrtc');
              try {
                  const sources = await ScreenShareService.getSources();
                  if (!sources || sources.length === 0) {
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
          } else if (!Platform.isMobile) {
              // Fallback to standard getDisplayMedia (has its own picker) - not on mobile
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
          } else {
              // Mobile - screen sharing not supported
              toast.warning("Not Supported", "Screen sharing is not available on mobile devices.");
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
      // Prevent posting in read-only dev channel
      if (channelId === '4') {
          toast.error("Read Only", "Only system updates are posted here.");
          return;
      }

      // Build message object - only include attachment if it exists
      // Firebase RTDB doesn't allow undefined values
      const newMessage: Message = {
          id: Date.now().toString() + Math.random().toString(),
          sender,
          content: text,
          timestamp: Date.now(),
          isAi,
      };

      // Only add attachment if it's defined
      if (attachment) {
          newMessage.attachment = attachment;
      }

      sendMessage(channelId, newMessage);
  };

  const handleSaveProfile = (newProfile: UserProfile) => {
      setUserProfile(newProfile);
      localStorage.setItem('pisscord_profile', JSON.stringify(newProfile));
      // Preserve voice channel when updating profile
      if (myPeerId) updatePresence(myPeerId, newProfile, activeVoiceChannelId);
  };

  const handleSaveDevices = (newDevices: DeviceSettings) => {
      setDeviceSettings(newDevices);
      localStorage.setItem('pisscord_devices', JSON.stringify(newDevices));
      // Re-trigger stream if connected? Ideally yes, but for now user must reconnect.
  };

  const handleSaveAppSettings = (newSettings: AppSettings) => {
      setAppSettings(newSettings);
      localStorage.setItem('pisscord_app_settings', JSON.stringify(newSettings));
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

  const handleEncryptionComplete = () => {
      setEncryptionState('ready');
      setShowPassphraseModal(false);
      toast.success("Encryption Unlocked", "Messages are now encrypted end-to-end.");
      // Force re-fetch of current channel messages to decrypt them
      setMessages({});
  };

  const handleEncryptionSkip = () => {
      setShowPassphraseModal(false);
      toast.info("Encryption Skipped", "Encrypted messages won't be readable until you unlock.");
  };

  const handleReportIssue = (title: string, description: string, type: 'BUG' | 'FEATURE', screenshotUrl?: string) => {
      const content = `**[${type}] ${title}**\n${description}`;
      // Use the addMessage function to post to '5' (issues channel)
      // We can attach the screenshot as an attachment
      addMessage(
          '5', 
          content, 
          userProfile.displayName, 
          false, 
          screenshotUrl ? { url: screenshotUrl, type: 'image', name: 'screenshot.png' } : undefined
      );
      toast.success("Report Submitted", "Your issue has been posted to #issues.");
  };

  const copyId = async () => {
      if (myPeerId) {
          // Use platform-agnostic clipboard service
          await ClipboardService.write(myPeerId);
          // Haptic feedback on mobile
          if (Platform.isMobile) {
              HapticsService.impact('light');
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
    <ThemeProvider initialTheme={appSettings.theme}>
    <div
      className="flex w-full h-screen bg-discord-main text-discord-text overflow-hidden font-sans relative"
      onContextMenu={handleContextMenu}
    >
      {/* Splash Screen */}
      {showSplash && (
        <SplashScreen theme={appSettings.theme} onComplete={() => setShowSplash(false)} />
      )}

      {/* Global Audio Elements for persistent audio across views */}
      {Array.from(remoteStreams.entries()).map(([peerId, stream]) => (
          <audio
            key={peerId}
            ref={el => {
                if (el) {
                    el.srcObject = stream;
                    // Use per-user volume if set, otherwise use master volume
                    const userVol = userVolumes.get(peerId) ?? remoteVolume;
                    el.volume = Math.min(userVol / 100, 1.0);
                    // If we have a specific output device, set it
                    if ((el as any).setSinkId && deviceSettings.audioOutputId) {
                        (el as any).setSinkId(deviceSettings.audioOutputId)
                            .catch((e: any) => console.error("Failed to set audio output", e));
                    }
                    // Mobile browsers require explicit play() call
                    const playPromise = el.play();
                    if (playPromise !== undefined) {
                        playPromise.catch((e: any) => {
                            log(`Audio play failed for ${peerId}: ${e.message}. Will retry on user interaction.`, 'error');
                        });
                    }
                }
            }}
            autoPlay
            playsInline
            muted={false}
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
            currentAppSettings={appSettings}
            logs={logs}
            appVersion={APP_VERSION}
            isEncryptionUnlocked={encryptionState === 'ready'}
            onSaveProfile={handleSaveProfile}
            onSaveDevices={handleSaveDevices}
            onSaveAppSettings={handleSaveAppSettings}
            onCheckForUpdates={handleCheckForUpdates}
            onOpenPassphrase={() => setShowPassphraseModal(true)}
            onClose={() => setShowSettingsModal(false)}
            onShowToast={(type, title, message) => toast[type](title, message)}
          />
      )}

      {showReportModal && (
          <ReportIssueModal
            onClose={() => setShowReportModal(false)}
            onSubmit={handleReportIssue}
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

      {showPassphraseModal && (
          <PassphraseModal
            onComplete={handleEncryptionComplete}
            onSkip={encryptionState === 'locked' ? handleEncryptionSkip : undefined}
          />
      )}

      {showReleaseNotesModal && releaseNotesData && (
          <ReleaseNotesModal
            version={releaseNotesData.version}
            releaseNotes={releaseNotesData.releaseNotes}
            downloadUrl={releaseNotesData.downloadUrl}
            onDismiss={() => {
              setShowReleaseNotesModal(false);
              markVersionAsSeen(releaseNotesData.version);
            }}
          />
      )}

      {/* ============ MOBILE LAYOUT ============ */}
      {isMobile ? (
        <>
          {/* Mobile Main Content Area - safe area padding for status bar and nav bar */}
          <div
            className="flex-1 flex flex-col bg-[#16162a]"
          >
            {/* Mobile Channel List View */}
            {mobileView === 'channels' && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Glassmorphism Header - with top padding for status bar */}
                <div
                  className="relative px-5 py-4"
                  style={{
                    paddingTop: '3.5rem',
                    background: 'linear-gradient(to bottom, rgba(18, 18, 26, 0.98), rgba(18, 18, 26, 0.92))',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                  }}
                >
                  <div
                    className="absolute bottom-0 left-0 right-0 h-px"
                    style={{ background: 'linear-gradient(90deg, transparent, rgba(240, 225, 48, 0.2), transparent)' }}
                  />
                  <h2
                    className="font-semibold text-lg tracking-wide"
                    style={{ color: '#f0e130' }}
                  >
                    Channels
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">Browse text and voice channels</p>
                </div>
                <div className="flex-1 bg-discord-sidebar overflow-y-auto pb-20">
                  <ChannelList
                  channels={INITIAL_CHANNELS}
                  activeChannelId={activeChannelId}
                  activeVoiceChannelId={activeVoiceChannelId}
                  onlineUsers={onlineUsers}
                  onSelectChannel={(id) => {
                    const ch = INITIAL_CHANNELS.find(c => c.id === id);
                    if (ch?.type === ChannelType.VOICE) {
                      if (activeVoiceChannelId === id && connectionState === ConnectionState.CONNECTED) {
                        setActiveChannelId(id);
                        setMobileView('voice');
                      } else {
                        joinVoiceChannel(id);
                        setMobileView('voice');
                      }
                    } else {
                      setActiveChannelId(id);
                      setMobileView('chat');
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
                  unreadChannels={unreadChannels}
                />
                </div>
              </div>
            )}

            {/* Mobile Chat View */}
            {mobileView === 'chat' && (() => {
              // If activeChannel is a voice channel, show general text channel instead
              const chatChannel = activeChannel.type === ChannelType.VOICE
                ? INITIAL_CHANNELS.find(c => c.id === '1')! // Default to general
                : activeChannel;
              return (
              <div className="flex-1 flex flex-col min-h-0">
                {/* Glassmorphism Chat Header */}
                <div
                  className="relative flex items-center px-4 py-3"
                  style={{
                    background: 'linear-gradient(to bottom, rgba(18, 18, 26, 0.98), rgba(18, 18, 26, 0.92))',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                  }}
                >
                  <div
                    className="absolute bottom-0 left-0 right-0 h-px"
                    style={{ background: `linear-gradient(90deg, transparent, ${themeColors[appSettings.theme].glowLight}, transparent)` }}
                  />
                  <button
                    onClick={() => setMobileView('channels')}
                    className="mr-3 p-2.5 -ml-2 rounded-xl transition-all duration-200 active:scale-95"
                    style={{ background: 'rgba(255, 255, 255, 0.06)' }}
                  >
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                  <div className="flex items-center">
                    <span
                      className="text-lg mr-1.5"
                      style={{ color: chatChannel.type === 'AI' ? '#22c55e' : themeColors[appSettings.theme].primary }}
                    >
                      {chatChannel.type === 'AI' ? '🤖' : '#'}
                    </span>
                    <span className="font-semibold text-white">{chatChannel.name}</span>
                  </div>
                </div>
                <ChatArea
                  channel={chatChannel}
                  messages={messages[chatChannel.id] || []}
                  onlineUsers={onlineUsers}
                  onSendMessage={(text, attachment) => addMessage(chatChannel.id, text, userProfile.displayName, false, attachment)}
                  onSendAIMessage={(text, response) => addMessage(chatChannel.id, response, 'Pissbot', true)}
                  onOpenReportModal={() => setShowReportModal(true)}
                />
              </div>
              );
            })()}

            {/* Mobile Voice View */}
            {mobileView === 'voice' && (
              <div className="flex-1 flex flex-col min-h-0">
                {/* Glassmorphism Voice Header - with top padding for status bar */}
                <div
                  className="relative flex items-center justify-between px-4 py-3"
                  style={{
                    paddingTop: '3.5rem',
                    background: 'linear-gradient(to bottom, rgba(18, 18, 26, 0.98), rgba(18, 18, 26, 0.92))',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                  }}
                >
                  <div
                    className="absolute bottom-0 left-0 right-0 h-px"
                    style={{ background: `linear-gradient(90deg, transparent, ${connectionState === ConnectionState.CONNECTED ? 'rgba(34, 197, 94, 0.3)' : themeColors[appSettings.theme].glowLight}, transparent)` }}
                  />
                  <div className="flex items-center">
                    <div
                      className="w-2.5 h-2.5 rounded-full mr-3"
                      style={{
                        background: connectionState === ConnectionState.CONNECTED ? '#22c55e' : '#6b7280',
                        boxShadow: connectionState === ConnectionState.CONNECTED ? '0 0 8px rgba(34, 197, 94, 0.6)' : 'none',
                        animation: connectionState === ConnectionState.CONNECTED ? 'pulse 2s infinite' : 'none',
                      }}
                    />
                    <div>
                      <span
                        className="font-semibold"
                        style={{ color: connectionState === ConnectionState.CONNECTED ? '#22c55e' : themeColors[appSettings.theme].primary }}
                      >
                        {connectionState === ConnectionState.CONNECTED ? 'Voice Connected' : 'Voice Lounge'}
                      </span>
                      {connectionState === ConnectionState.CONNECTED && (
                        <p className="text-xs text-gray-500">{remoteStreams.size + 1} in call</p>
                      )}
                    </div>
                  </div>
                  {connectionState === ConnectionState.CONNECTED && (
                    <button
                      onClick={cleanupCall}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 active:scale-95"
                      style={{
                        background: 'rgba(239, 68, 68, 0.15)',
                        color: '#ef4444',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                      }}
                    >
                      Leave
                    </button>
                  )}
                </div>
                <div className="flex-1 relative pb-20">
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
                  userVolumes={userVolumes}
                  onUserVolumeChange={(peerId, volume) => setUserVolumes(prev => new Map(prev).set(peerId, volume))}
                  onIdCopied={() => toast.success("Copied!", "Send this ID to your friend so they can call you.")}
                />
                </div>
              </div>
            )}

            {/* Mobile Users View */}
            {mobileView === 'users' && (
              <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-b from-[#1a1a2e] to-[#16162a] pb-20">
                <UserList
                  connectionState={connectionState}
                  onlineUsers={onlineUsers}
                  myPeerId={myPeerId}
                  onConnectToUser={handleStartCall}
                  isCollapsed={false}
                  onToggleCollapse={() => {}}
                />
              </div>
            )}
          </div>

          {/* Mobile Bottom Navigation */}
          <MobileNav
            activeView={mobileView}
            onViewChange={setMobileView}
            connectionState={connectionState}
            onOpenSettings={() => setShowSettingsModal(true)}
          />
        </>
      ) : (
        /* ============ DESKTOP LAYOUT ============ */
        <>
          <Sidebar onServerClick={() => setActiveChannelId('1')} />

          {/* CHANNEL LIST + VOICE CONTROLS */}
          <div className="flex flex-col h-full bg-discord-sidebar w-60">
              <ChannelList
                channels={INITIAL_CHANNELS}
                activeChannelId={activeChannelId}
                activeVoiceChannelId={activeVoiceChannelId}
                onlineUsers={onlineUsers}
                onSelectChannel={(id) => {
                    const ch = INITIAL_CHANNELS.find(c => c.id === id);
                    if (ch?.type === ChannelType.VOICE) {
                        if (activeVoiceChannelId === id && connectionState === ConnectionState.CONNECTED) {
                            setActiveChannelId(id);
                        } else {
                            joinVoiceChannel(id);
                        }
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
                unreadChannels={unreadChannels}
              />
          </div>

          {/* MAIN VIEW AREA */}
          {activeChannel.type === ChannelType.VOICE ? (
             <div className="flex-1 flex min-w-0">
               <div className="flex-1 relative">
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
                    userVolumes={userVolumes}
                    onUserVolumeChange={(peerId, volume) => setUserVolumes(prev => new Map(prev).set(peerId, volume))}
                    onIdCopied={() => toast.success("Copied!", "Send this ID to your friend so they can call you.")}
                 />
               </div>
               <UserList
                  connectionState={connectionState}
                  onlineUsers={onlineUsers}
                  myPeerId={myPeerId}
                  onConnectToUser={handleStartCall}
                  isCollapsed={isUserListCollapsed}
                  onToggleCollapse={() => setIsUserListCollapsed(!isUserListCollapsed)}
               />
             </div>
          ) : (
             <div className="flex-1 flex min-w-0">
                 <ChatArea
                    channel={activeChannel}
                    messages={messages[activeChannel.id] || []}
                    onlineUsers={onlineUsers}
                    onSendMessage={(text, attachment) => addMessage(activeChannel.id, text, userProfile.displayName, false, attachment)}
                    onSendAIMessage={(text, response) => addMessage(activeChannel.id, response, 'Pissbot', true)}
                    onOpenReportModal={() => setShowReportModal(true)}
                 />
                 <UserList
                    connectionState={connectionState}
                    onlineUsers={onlineUsers}
                    myPeerId={myPeerId}
                    onConnectToUser={handleStartCall}
                    isCollapsed={isUserListCollapsed}
                    onToggleCollapse={() => setIsUserListCollapsed(!isUserListCollapsed)}
                 />
             </div>
          )}
        </>
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
    </ThemeProvider>
  );
}
