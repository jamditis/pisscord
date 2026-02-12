import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Peer, { MediaConnection, DataConnection } from 'peerjs';
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
import { ReleaseNotesModal, shouldShowReleaseNotes, markVersionAsSeen } from './components/ReleaseNotesModal';
import { useIsMobile } from './hooks/useIsMobile';
import { useResizablePanel } from './hooks/useResizablePanel';
import { ResizeHandle } from './components/ResizeHandle';
import { markChannelAsRead, updateNewestFromMessages, getUnreadChannels } from './services/unread';
import { Channel, ChannelType, ConnectionState, Message, PresenceUser, UserProfile, DeviceSettings, AppLogs, AppSettings, AppTheme } from './types';
import { ThemeProvider, themeColors } from './contexts/ThemeContext';
import { registerPresence, subscribeToUsers, removePresence, checkForUpdates, updatePresence, sendMessage, subscribeToMessages, cleanupOldMessages, getPissbotConfig, PissbotConfig, checkForMOTD, getReleaseNotes, ReleaseNotesConfig, subscribeToConnectionState } from './services/firebase';
import { playSound, preloadSounds, stopLoopingSound } from './services/sounds';
import { fetchGitHubReleases, fetchGitHubEvents } from './services/github';
import { Platform, ClipboardService, UpdateService, ScreenShareService, WindowService, HapticsService, AppLifecycleService, OrientationService } from './services/platform';
import { VoidBackground } from './components/Visuals';
import { logger } from './services/logger';
import { createAudioProcessor, AudioProcessor } from './services/audioProcessor';
import { buildVideoConstraints, buildAudioConstraints, preferH264 } from './services/webrtcUtils';

const APP_VERSION = "2.1.1";

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
    autoGainControl: true,
    // ML noise cancellation - off by default (conservative rollout)
    advancedNoiseCancellation: false,
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
  const pendingCallRef = useRef<MediaConnection | null>(null);
  
  // --- STATE: Data ---
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
      try {
        const saved = localStorage.getItem('pisscord_profile');
        if (saved) {
          const parsed = JSON.parse(saved);
          // Validate required fields exist
          if (typeof parsed.displayName === 'string' && typeof parsed.color === 'string') {
            return { ...getDefaultProfile(), ...parsed };
          }
        }
      } catch (e) {
        logger.error('app', `Corrupt profile in localStorage, resetting: ${e}`);
        localStorage.removeItem('pisscord_profile');
      }
      const defaultProfile = getDefaultProfile();
      localStorage.setItem('pisscord_profile', JSON.stringify(defaultProfile));
      return defaultProfile;
  });
  const [deviceSettings, setDeviceSettings] = useState<DeviceSettings>(() => {
      try {
        const saved = localStorage.getItem('pisscord_devices');
        if (saved) {
          const parsed = JSON.parse(saved);
          return { ...DEFAULT_DEVICES, ...parsed };
        }
      } catch (e) {
        logger.error('app', `Corrupt device settings in localStorage, resetting: ${e}`);
        localStorage.removeItem('pisscord_devices');
      }
      return DEFAULT_DEVICES;
  });
  const [appSettings, setAppSettings] = useState<AppSettings>(() => {
      try {
        const saved = localStorage.getItem('pisscord_app_settings');
        if (saved) {
          const parsed = JSON.parse(saved);
          return { ...DEFAULT_APP_SETTINGS, ...parsed };
        }
      } catch (e) {
        logger.error('app', `Corrupt app settings in localStorage, resetting: ${e}`);
        localStorage.removeItem('pisscord_app_settings');
      }
      return DEFAULT_APP_SETTINGS;
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
  const [isVideoEnabled, setIsVideoEnabled] = useState(false); // Start with camera off
  const [isAudioEnabled, setIsAudioEnabled] = useState(false); // Start muted
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [remoteVolume, setRemoteVolume] = useState<number>(100); // Master volume (0-200)
  const [userVolumes, setUserVolumes] = useState<Map<string, number>>(new Map()); // Per-user volume overrides (0-200)
  
  // --- MODALS ---
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showScreenPicker, setShowScreenPicker] = useState(false);
  const [screenSources, setScreenSources] = useState<Array<{id: string, name: string, thumbnail: string}>>([]);
  const [updateInfo, setUpdateInfo] = useState<{url: string, latest: string, downloading?: boolean, progress?: number, ready?: boolean} | null>(null);

  // --- RELEASE NOTES ---
  const [showReleaseNotesModal, setShowReleaseNotesModal] = useState(false);
  const [releaseNotesData, setReleaseNotesData] = useState<ReleaseNotesConfig | null>(null);

  // --- UNREAD MESSAGES ---
  const [unreadChannels, setUnreadChannels] = useState<string[]>([]);

  // --- STATE: Firebase connection ---
  const [firebaseConnected, setFirebaseConnected] = useState(true); // optimistic default
  const firebaseConnectedPrevRef = useRef(true);

  // --- UI STATE ---
  const [isUserListCollapsed, setIsUserListCollapsed] = useState(false);
  const [isChannelListCollapsed, setIsChannelListCollapsed] = useState(false);
  const [mobileView, setMobileView] = useState<MobileView>('chat');
  const [showMobileUsers, setShowMobileUsers] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [audioUnlockNeeded, setAudioUnlockNeeded] = useState(false);
  const audioUnlockDismissedRef = useRef(false);
  const isMobile = useIsMobile();

  // --- RESIZABLE SIDEBARS ---
  const channelListResize = useResizablePanel({
    storageKey: 'pisscord_channel_list_width',
    defaultWidth: 240,
    minWidth: 180,
    maxWidth: 400,
    side: 'right'
  });
  const userListResize = useResizablePanel({
    storageKey: 'pisscord_user_list_width',
    defaultWidth: 240,
    minWidth: 180,
    maxWidth: 400,
    side: 'left'
  });

  // --- REFS ---
  const peerInstance = useRef<Peer | null>(null);
  const callsRef = useRef<Map<string, MediaConnection>>(new Map());
  const dataConnectionsRef = useRef<Map<string, DataConnection>>(new Map());
  const myVideoTrack = useRef<MediaStreamTrack | null>(null); // Keep original camera track for when screenshare ends
  const screenTrackIdRef = useRef<string | null>(null); // Track ID of active screen share for cleanup
  const isMountedRef = useRef(true);
  const isAudioEnabledRef = useRef(isAudioEnabled);
  const isVideoEnabledRef = useRef(isVideoEnabled);
  const myStreamRef = useRef<MediaStream | null>(null);
  const activeVoiceChannelIdRef = useRef<string | null>(activeVoiceChannelId);
  const audioProcessorRef = useRef<AudioProcessor | null>(null);

  useEffect(() => {
    isAudioEnabledRef.current = isAudioEnabled;
  }, [isAudioEnabled]);

  useEffect(() => {
    isVideoEnabledRef.current = isVideoEnabled;
  }, [isVideoEnabled]);

  useEffect(() => {
    myStreamRef.current = myStream;
  }, [myStream]);

  useEffect(() => {
    activeVoiceChannelIdRef.current = activeVoiceChannelId;
  }, [activeVoiceChannelId]);

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
                  [activeChannelId]: newMessages
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
  // Subscribe to centralized logger for the debug tab display
  useEffect(() => {
    const unsubscribe = logger.subscribe((entry) => {
      // Map logger levels to the AppLogs type format
      const typeMap: Record<string, 'info' | 'error' | 'webrtc'> = {
        debug: 'info', info: 'info', warn: 'error', error: 'error'
      };
      const appEntry: AppLogs = {
        timestamp: entry.timestamp,
        type: entry.module === 'webrtc' ? 'webrtc' : (typeMap[entry.level] || 'info'),
        message: `[${entry.module}] ${entry.message}`
      };
      setLogs(prev => [appEntry, ...prev].slice(0, 50));
    });
    return unsubscribe;
  }, []);

  const log = (message: string, type: 'info' | 'error' | 'webrtc' = 'info') => {
      const module = type === 'webrtc' ? 'webrtc' : 'app';
      const level = type === 'error' ? 'error' : 'info';
      logger[level](module, message);
  };

  // --- LIFECYCLE: Updates & Peer Init ---
  useEffect(() => {
    isMountedRef.current = true;

    // Preload sound effects
    preloadSounds();
    playSound('app_launch');

    // Lock to portrait on mobile (unlocked when entering voice view with video)
    if (Platform.isMobile) {
      OrientationService.lockPortrait();
    }

    // App Lifecycle (Background/Foreground) - handles both Capacitor and Web
    const handleAppStateChange = (isActive: boolean) => {
        log(`App state changed: ${isActive ? 'active' : 'background'}`, 'info');
        const stream = myStreamRef.current;
        if (!stream) return;

        const isInVoiceCall = !!activeVoiceChannelIdRef.current;

        if (!isActive) {
            // Background: Only disable video (saves battery, no one sees you)
            // Keep audio ENABLED if in a voice call so others can still hear you!
            stream.getVideoTracks().forEach(t => t.enabled = false);

            // Suspend ML audio processing to save CPU/battery
            audioProcessorRef.current?.suspend();

            if (!isInVoiceCall) {
                // Not in a call - safe to disable audio too
                stream.getAudioTracks().forEach(t => t.enabled = false);
            } else {
                log('Keeping audio enabled - active voice call in progress', 'info');
            }
        } else {
            // Foreground: Resume ML audio processing
            audioProcessorRef.current?.resume();

            // Restore tracks based on user preference
            stream.getAudioTracks().forEach(t => t.enabled = isAudioEnabledRef.current);
            stream.getVideoTracks().forEach(t => t.enabled = isVideoEnabledRef.current);
            // Also try to unlock audio context
            unlockAudio();
        }
    };

    // Capacitor (native mobile apps)
    AppLifecycleService.onAppStateChange(({ isActive }) => handleAppStateChange(isActive));

    // Web Visibility API (mobile web browsers like Safari, Chrome mobile)
    const handleVisibilityChange = () => {
        handleAppStateChange(!document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Check for release notes (show popup on new version)
    getReleaseNotes().then(notes => {
      if (!isMountedRef.current) return;
      if (notes && shouldShowReleaseNotes(notes.version)) {
        setReleaseNotesData(notes);
        setTimeout(() => {
          if (isMountedRef.current) setShowReleaseNotesModal(true);
        }, 2000);
      }
    }).catch(err => {
      logger.error('app', `Failed to fetch release notes: ${err}`);
    });

    // Cleanup old messages (14-day retention)
    const textChannels = INITIAL_CHANNELS.filter(c => c.type === ChannelType.TEXT || c.type === ChannelType.AI).map(c => c.id);
    cleanupOldMessages(textChannels).catch(err => {
      logger.error('app', `Message cleanup failed: ${err}`);
    });

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
        if (!isMountedRef.current) return;
        if (update?.hasUpdate) {
            setUpdateInfo({ url: update.url, latest: update.latest });
            setShowUpdateModal(true);
            playSound('update_available');
        }
    });

    // Check Pissbot Updates
    getPissbotConfig().then(config => {
        if (!isMountedRef.current) return;
        if (config) {
            const lastKnown = localStorage.getItem('pissbot_last_updated');
            if (lastKnown && Number(lastKnown) < config.lastUpdated) {
                toast.info("🧠 Brain Upgrade", "Pissbot has been updated with new knowledge!");
            }
            try {
              localStorage.setItem('pissbot_last_updated', config.lastUpdated.toString());
            } catch { /* storage full — non-critical */ }
        }
    }).catch(err => {
        logger.warn('app', `Pissbot config check failed: ${err}`);
    });

    // Check MOTD
    checkForMOTD().then(motd => {
        if (!isMountedRef.current) return;
        if (motd) {
            const lastMotd = localStorage.getItem('pisscord_motd');
            if (lastMotd !== motd) {
                toast.info("📢 Announcement", motd);
                try {
                  localStorage.setItem('pisscord_motd', motd);
                } catch { /* storage full — non-critical */ }
            }
        }
    }).catch(err => {
        logger.warn('app', `MOTD check failed: ${err}`);
    });

    // Setup auto-updater listeners (Electron only - no-op on other platforms)
    if (UpdateService.isSupported) {
      UpdateService.onUpdateAvailable((data: any) => {
        if (!isMountedRef.current) return;
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
        if (!isMountedRef.current) return;
        log(`Downloading update: ${data.percent}%`, 'info');
        setUpdateInfo(prev => prev ? {
          ...prev,
          downloading: true,
          progress: data.percent
        } : null);
      });

      UpdateService.onUpdateDownloaded((data: any) => {
        if (!isMountedRef.current) return;
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
        } else if (err.type === 'network' || err.type === 'server-error') {
            toast.error("Network Error", "Connection to signaling server lost. Reconnecting...");
            // Attempt automatic reconnect after a short delay
            setTimeout(() => {
                if (peer && !peer.destroyed && peer.disconnected) {
                    log('Attempting PeerJS reconnect...', 'webrtc');
                    peer.reconnect();
                }
            }, 2000);
        } else if (err.type === 'disconnected') {
            toast.error("Connection Lost", "Lost connection to server. Reconnecting...");
        }
    });

    peer.on('disconnected', () => {
        log('PeerJS disconnected from signaling server, attempting reconnect...', 'error');
        peer.reconnect();
    });

    peer.on('call', async (call) => {
        // MESH NETWORKING: Auto-answer all incoming calls
        // In a private server like Pisscord, all calls are from trusted users
        log(`Auto-answering incoming call from ${call.peer}`, 'webrtc');
        handleAcceptCall(call);
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

    // Firebase connection state monitoring
    const unsubscribeConnection = subscribeToConnectionState((connected) => {
        if (!isMountedRef.current) return;
        setFirebaseConnected(connected);
        if (connected && !firebaseConnectedPrevRef.current) {
            toast.success("Reconnected", "Database connection restored.");
        }
        firebaseConnectedPrevRef.current = connected;
    });

    return () => {
      isMountedRef.current = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (peerInstance.current) {
          if (peerInstance.current.id) removePresence(peerInstance.current.id);
          peerInstance.current.destroy();
      }
      unsubscribeUsers();
      unsubscribeConnection();
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

    // Build audio constraints (48kHz mono, noise/echo/gain processing)
    const audioConstraints = buildAudioConstraints({
        noiseSuppression: currentSettings.noiseSuppression,
        echoCancellation: currentSettings.echoCancellation,
        autoGainControl: currentSettings.autoGainControl,
        audioInputId: currentSettings.audioInputId,
    });

    // Platform-aware video constraints: 720p30 desktop, 480p24 mobile (saves battery)
    const videoConstraints = buildVideoConstraints(isMobile, currentSettings.videoInputId);

    const constraints = {
        audio: audioConstraints,
        video: videoConstraints,
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

        // Apply initial muted/video-off state (users join muted with camera off by default)
        stream.getAudioTracks().forEach(t => t.enabled = isAudioEnabledRef.current);
        stream.getVideoTracks().forEach(t => t.enabled = isVideoEnabledRef.current);
        log(`Applied initial state: audio=${isAudioEnabledRef.current}, video=${isVideoEnabledRef.current}`, 'webrtc');

        // --- ML noise cancellation pipeline ---
        if (currentSettings.advancedNoiseCancellation) {
            try {
                log('Initializing ML noise cancellation...', 'webrtc');
                const processor = await createAudioProcessor(stream);
                audioProcessorRef.current = processor;

                // Build new stream: processed audio + original video track
                const videoTrack = stream.getVideoTracks()[0];
                const processedStream = videoTrack
                    ? new MediaStream([processor.processedAudioTrack, videoTrack])
                    : new MediaStream([processor.processedAudioTrack]);

                // Apply mute state to processed track
                processor.processedAudioTrack.enabled = isAudioEnabledRef.current;

                log('ML noise cancellation active', 'webrtc');
                setMyStream(processedStream);
                return processedStream;
            } catch (err: any) {
                log(`ML noise cancellation failed, using raw stream: ${err.message}`, 'error');
                toast.warning('Noise cancellation unavailable', 'Falling back to browser-native processing.');
                // Fall through to raw stream
            }
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
            // Fallback cascade: first drop deviceId constraints, then drop video entirely
            try {
                const fallbackStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
                setMyStream(fallbackStream);
                return fallbackStream;
            } catch (fallbackErr: any) {
                log(`Video+audio fallback failed: ${fallbackErr.message}, trying audio-only...`, 'webrtc');
                try {
                    const audioOnlyStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                    toast.warning('Audio only', 'Camera unavailable — joined with audio only.');
                    setMyStream(audioOnlyStream);
                    return audioOnlyStream;
                } catch (audioErr: any) {
                    log(`Audio-only fallback also failed: ${audioErr.message}`, 'error');
                }
            }
        }
        throw err;
    }
  };

  const setupDataConnection = (conn: DataConnection) => {
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

      // Clean up ML audio processor
      if (audioProcessorRef.current) {
          audioProcessorRef.current.destroy();
          audioProcessorRef.current = null;
      }

      if (myStream) myStream.getTracks().forEach(t => t.stop());
      
      setMyStream(null);
      setRemoteStreams(new Map());
      setConnectionState(ConnectionState.DISCONNECTED);
      setActiveVoiceChannelId(null);
      setIsScreenSharing(false);

      // Re-lock to portrait when leaving voice
      if (Platform.isMobile) {
        OrientationService.lockPortrait();
      }

      // Update presence to show not in voice
      if (myPeerId) {
          updatePresence(myPeerId, userProfile, null);
      }
      
      // Reset audio unlock state for next call
      audioUnlockDismissedRef.current = false;
      setAudioUnlockNeeded(false);

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

      // Unlock orientation for voice/video calls
      if (Platform.isMobile) {
        OrientationService.unlockOrientation();
      }

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


  const handleAcceptCall = async (call: MediaConnection) => {
      setConnectionState(ConnectionState.CONNECTING);
      // Move user to voice channel view automatically
      const voiceChan = INITIAL_CHANNELS.find(c => c.type === ChannelType.VOICE);
      if (voiceChan) {
          setActiveChannelId(voiceChan.id);
          setActiveVoiceChannelId(voiceChan.id);
      }

      try {
          const stream = await getLocalStream();
          call.answer(stream, { sdpTransform: preferH264 });
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
              const call = peerInstance.current!.call(remoteId, stream, { sdpTransform: preferH264 });
              setupCallEvents(call);

              // Also establish data connection
              const conn = peerInstance.current!.connect(remoteId);
              setupDataConnection(conn);
              
              if (connectionState !== ConnectionState.CONNECTED) {
                  // Don't play outgoing call sound for voice channel joins
                  // toast is handled by joinVoiceChannel
              } else {
                  // Connecting to additional peer in channel
                  log(`Connecting to peer ${remoteId.substring(0, 8)}...`, 'webrtc');
              }
          } catch (err) {
              log("Failed to connect to peer", 'error');
              toast.error("Connection Failed", "Could not connect to user in channel.");
              if (callsRef.current.size === 0) setConnectionState(ConnectionState.ERROR);
          }
      };

      // In Mesh mode, we allow multiple calls. 
      // If we are already connected, we just add another peer.
      initiateCall();
  };

  const setupCallEvents = (call: MediaConnection) => {
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
              playSound(vidTrack.enabled ? 'video_on' : 'video_off');
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
                      video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 15, max: 30 } },
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
      screenTrackIdRef.current = screenTrack.id;

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
          screenTrackIdRef.current = null;
          return;
      }

      log(`✅ Replaced tracks for ${replacedCount} peers`, 'webrtc');

      // Swap tracks in-place on the existing stream to prevent React re-render flicker.
      // The stream reference stays the same, so <video>.srcObject isn't reassigned.
      if (myStream) {
          const oldVideoTrack = myStream.getVideoTracks()[0];
          if (oldVideoTrack) myStream.removeTrack(oldVideoTrack);
          myStream.addTrack(screenTrack);
      }

      setIsScreenSharing(true);

      // Handle Stop Sharing via Browser UI
      screenTrack.onended = async () => {
          log("Screen share ended via browser UI", 'webrtc');
          await stopScreenShare();
      };
  };

  const stopScreenShare = async () => {
      try {
          log("Stopping screen share...", 'webrtc');

          // Camera track recovery: if the ref was lost, recreate it
          if (!myVideoTrack.current) {
              log("Camera track ref lost — attempting recovery via getLocalStream", 'error');
              try {
                  const recoveredStream = await navigator.mediaDevices.getUserMedia({ video: buildVideoConstraints(isMobile), audio: false });
                  const newCamTrack = recoveredStream.getVideoTracks()[0];
                  if (newCamTrack) {
                      myVideoTrack.current = newCamTrack;
                      log(`Camera recovered: ${newCamTrack.id}`, 'webrtc');
                      toast.info("Camera recovered", "Camera track was restored.");
                  }
              } catch (recoverErr: any) {
                  log(`Camera recovery failed: ${recoverErr.message}`, 'error');
                  toast.error("Camera Error", "Could not restore camera. Try reconnecting.");
                  setIsScreenSharing(false);
                  screenTrackIdRef.current = null;
                  return;
              }
          }

          log("Swapping Screen -> Camera", 'webrtc');

          // Revert tracks for all peers
          for (const [peerId, call] of callsRef.current.entries()) {
              if (!call.peerConnection) continue;

              const senders = call.peerConnection.getSenders();
              const videoSender = senders.find((s: RTCRtpSender) => s.track?.kind === 'video');

              if (videoSender) {
                   await videoSender.replaceTrack(myVideoTrack.current);
              }
          }

          // Stop the screen track — use stored ID for reliable identification
          const currentVideoTrack = myStream?.getVideoTracks()[0];
          if (currentVideoTrack && currentVideoTrack.id === screenTrackIdRef.current) {
              currentVideoTrack.stop();
          }
          screenTrackIdRef.current = null;

          // Swap track in-place on the existing stream (no new MediaStream = no flicker)
          if (myStream && myVideoTrack.current) {
              const screenTrack = myStream.getVideoTracks()[0];
              if (screenTrack) myStream.removeTrack(screenTrack);
              myStream.addTrack(myVideoTrack.current);
          }

          setIsScreenSharing(false);
          log("✅ Stopped screen share successfully", 'webrtc');
      } catch (err: any) {
          log(`ERROR stopping screen share: ${err.message}`, 'error');
          setIsScreenSharing(false);
          screenTrackIdRef.current = null;
      }
  };

  // --- UI ACTIONS ---
  const addMessage = async (channelId: string, text: string, sender: string, isAi: boolean = false, attachment?: Message['attachment']) => {
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

      try {
          await sendMessage(channelId, newMessage);
      } catch (err: any) {
          logger.error('app', `Failed to send message: ${err.message}`);
          toast.error("Send failed", "Message could not be sent. Check your connection.");
      }
  };

  const handleSaveProfile = (newProfile: UserProfile) => {
      setUserProfile(newProfile);
      try {
        localStorage.setItem('pisscord_profile', JSON.stringify(newProfile));
      } catch (e) {
        logger.error('app', `Failed to save profile: ${e}`);
      }
      if (myPeerId) updatePresence(myPeerId, newProfile, activeVoiceChannelId);
  };

  const handleSaveDevices = (newDevices: DeviceSettings) => {
      setDeviceSettings(newDevices);
      try {
        localStorage.setItem('pisscord_devices', JSON.stringify(newDevices));
      } catch (e) {
        logger.error('app', `Failed to save device settings: ${e}`);
      }
  };

  const handleSaveAppSettings = (newSettings: AppSettings) => {
      setAppSettings(newSettings);
      try {
        localStorage.setItem('pisscord_app_settings', JSON.stringify(newSettings));
      } catch (e) {
        logger.error('app', `Failed to save app settings: ${e}`);
      }
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
          try {
            await ClipboardService.write(myPeerId);
            if (Platform.isMobile) {
                HapticsService.impact('light');
            }
            toast.success("Copied!", "Your Peer ID has been copied to clipboard.");
          } catch {
            toast.error("Copy failed", "Could not copy to clipboard.");
          }
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

  const unlockAudio = useCallback(() => {
      // Only play voice call audio elements, not chat audio messages
      const voiceAudioElements = document.querySelectorAll('audio[data-voice-call]');
      voiceAudioElements.forEach(el => {
          (el as HTMLAudioElement).play().catch(e => console.error("Still failed to play:", e));
      });
      audioUnlockDismissedRef.current = true;
      setAudioUnlockNeeded(false);
  }, []);

  const dismissAudioBanner = useCallback(() => {
      audioUnlockDismissedRef.current = true;
      setAudioUnlockNeeded(false);
  }, []);

  return (
    <ThemeProvider initialTheme={appSettings.theme}>
    <div
      className="flex w-full h-screen bg-discord-main text-discord-text overflow-hidden font-sans relative"
      onContextMenu={handleContextMenu}
    >
      <VoidBackground />

      {/* Audio Unlock Banner */}
      {audioUnlockNeeded && (
        <div className="absolute top-0 left-0 right-0 z-alert bg-discord-dark/95 border-b border-discord-muted/30 text-white px-4 py-2.5 flex items-center justify-between shadow-lg backdrop-blur-sm" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
          <div className="flex items-center gap-2">
            <i className="fas fa-volume-mute text-discord-muted"></i>
            <span className="text-sm">Browser blocked audio playback for this voice call.</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={unlockAudio}
              className="px-3 py-1 bg-green-600 hover:bg-green-500 text-white text-xs font-medium rounded transition-colors"
            >
              Enable audio
            </button>
            <button
              onClick={dismissAudioBanner}
              className="p-1 text-discord-muted hover:text-white transition-colors"
              title="Dismiss"
            >
              <i className="fas fa-times text-sm"></i>
            </button>
          </div>
        </div>
      )}

      {/* Firebase offline indicator */}
      {!firebaseConnected && (
        <div className="absolute top-0 left-0 right-0 z-navigation bg-yellow-600/90 text-white px-4 py-1.5 flex items-center justify-center gap-2 text-xs font-medium backdrop-blur-sm" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
          <i className="fas fa-wifi-slash text-white/80"></i>
          Database offline — messages may not sync
        </div>
      )}

      {/* Splash Screen */}
      {showSplash && (
        <SplashScreen theme={appSettings.theme} onComplete={() => setShowSplash(false)} />
      )}

      {/* Global Audio Elements for persistent audio across views */}
      {Array.from(remoteStreams.entries()).map(([peerId, stream]) => (
          <audio
            key={peerId}
            data-voice-call="true"
            ref={el => {
                if (el) {
                    // Guard: only reassign srcObject when stream reference changes
                    if (el.srcObject !== stream) {
                        el.srcObject = stream;
                    }
                    // Use per-user volume if set, otherwise use master volume
                    const userVol = userVolumes.get(peerId) ?? remoteVolume;
                    el.volume = Math.min(userVol / 100, 1.0);
                    // Guard: only call setSinkId when device actually changed
                    if ((el as any).setSinkId && deviceSettings.audioOutputId && (el as any).sinkId !== deviceSettings.audioOutputId) {
                        (el as any).setSinkId(deviceSettings.audioOutputId)
                            .catch((e: any) => logger.error('audio', `Failed to set audio output: ${e.message}`));
                    }
                    // Mobile browsers require explicit play() call
                    const playPromise = el.play();
                    if (playPromise !== undefined) {
                        playPromise.catch((e: any) => {
                            log(`Audio play failed for ${peerId}: ${e.message}. Requesting unlock.`, 'error');
                            // Only show banner if user hasn't already dismissed it
                            if (!audioUnlockDismissedRef.current) {
                                setAudioUnlockNeeded(true);
                            }
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
            onSaveProfile={handleSaveProfile}
            onSaveDevices={handleSaveDevices}
            onSaveAppSettings={handleSaveAppSettings}
            onCheckForUpdates={handleCheckForUpdates}
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
      {isMobile ? (() => {
        // Compute chatChannel outside JSX so it works inside AnimatePresence
        const chatChannel = activeChannel.type === ChannelType.VOICE
          ? INITIAL_CHANNELS.find(c => c.id === '1')!
          : activeChannel;
        const voiceChannelName = INITIAL_CHANNELS.find(c => c.id === activeVoiceChannelId)?.name || 'Voice';

        return (
        <>
          {/* Mobile Main Content Area */}
          <div className="flex-1 flex flex-col bg-[#16162a]">
            <AnimatePresence mode="wait">

              {/* Mobile Channel List View */}
              {mobileView === 'channels' && (
                <motion.div
                  key="channels"
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="flex-1 flex flex-col overflow-hidden"
                >
                  {/* Glassmorphism Header */}
                  <div
                    className="relative px-5 py-4"
                    style={{
                      paddingTop: 'max(env(safe-area-inset-top, 20px), 1.25rem)',
                      background: 'linear-gradient(to bottom, rgba(18, 18, 26, 0.98), rgba(18, 18, 26, 0.92))',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                    }}
                  >
                    <div
                      className="absolute bottom-0 left-0 right-0 h-px"
                      style={{ background: `linear-gradient(90deg, transparent, ${themeColors[appSettings.theme].glowLight}, transparent)` }}
                    />
                    <div className="flex items-center justify-between">
                      <h2
                        className="font-display text-lg tracking-wide uppercase"
                        style={{ color: themeColors[appSettings.theme].primary }}
                      >
                        Channels
                      </h2>
                      <button
                        onClick={() => setShowMobileUsers(true)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all active:scale-95"
                        style={{
                          background: 'rgba(255, 255, 255, 0.06)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                        }}
                      >
                        <div
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: '#22c55e', boxShadow: '0 0 4px rgba(34, 197, 94, 0.5)' }}
                        />
                        <span className="text-xs text-discord-muted font-medium">{onlineUsers.length}</span>
                        <svg className="w-3.5 h-3.5 text-discord-muted" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 bg-discord-sidebar overflow-y-auto" style={{ paddingBottom: 'calc(64px + env(safe-area-inset-bottom, 0px) + 8px)' }}>
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
                </motion.div>
              )}

              {/* Mobile Chat View */}
              {mobileView === 'chat' && (
                <motion.div
                  key="chat"
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="flex-1 flex flex-col min-h-0"
                  style={{ paddingBottom: 'calc(64px + env(safe-area-inset-bottom, 0px) + 20px)' }}
                >
                  {/* Chat Header — back arrow + channel name with glow */}
                  <div
                    className="relative flex items-center px-4 pb-1.5"
                    style={{
                      paddingTop: 'env(safe-area-inset-top, 0px)',
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
                      <svg className="w-5 h-5 text-discord-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <div className="flex items-center">
                      <span
                        className="text-lg mr-1.5"
                        style={{ color: chatChannel.type === 'AI' ? '#22c55e' : themeColors[appSettings.theme].primary }}
                      >
                        {chatChannel.type === 'AI' ? '🤖' : '#'}
                      </span>
                      <span
                        className="font-display font-semibold text-white tracking-wide"
                        style={{ textShadow: `0 0 16px ${themeColors[appSettings.theme].glow}` }}
                      >
                        {chatChannel.name}
                      </span>
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
                </motion.div>
              )}

              {/* Mobile Voice View */}
              {mobileView === 'voice' && (
                <motion.div
                  key="voice"
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="flex-1 flex flex-col min-h-0"
                >
                  {/* Voice Header — channel name + animated state + leave button */}
                  <div
                    className="relative flex items-center justify-between px-4 py-3"
                    style={{
                      paddingTop: 'max(env(safe-area-inset-top, 20px), 1.25rem)',
                      background: 'linear-gradient(to bottom, rgba(18, 18, 26, 0.98), rgba(18, 18, 26, 0.92))',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                    }}
                  >
                    <div
                      className="absolute bottom-0 left-0 right-0 h-px"
                      style={{ background: `linear-gradient(90deg, transparent, ${connectionState === ConnectionState.CONNECTED ? 'rgba(34, 197, 94, 0.3)' : themeColors[appSettings.theme].glowLight}, transparent)` }}
                    />
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={connectionState}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="flex items-center"
                      >
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
                            className="font-display font-semibold tracking-wide"
                            style={{ color: connectionState === ConnectionState.CONNECTED ? '#22c55e' : themeColors[appSettings.theme].primary }}
                          >
                            {connectionState === ConnectionState.CONNECTED ? voiceChannelName : 'Voice channels'}
                          </span>
                          {connectionState === ConnectionState.CONNECTED && (
                            <p className="text-xs text-discord-muted">{remoteStreams.size + 1} in call</p>
                          )}
                        </div>
                      </motion.div>
                    </AnimatePresence>
                    {connectionState === ConnectionState.CONNECTED && (
                      <motion.button
                        onClick={cleanupCall}
                        whileTap={{ scale: 0.95 }}
                        className="px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2"
                        style={{
                          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(239, 68, 68, 0.1))',
                          color: '#ef4444',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          boxShadow: '0 0 12px rgba(239, 68, 68, 0.15)',
                        }}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
                        </svg>
                        Leave
                      </motion.button>
                    )}
                  </div>
                  <div className="flex-1 relative" style={{ paddingBottom: 'calc(64px + env(safe-area-inset-bottom, 0px) + 8px)' }}>
                    <VoiceStage
                      myStream={myStream}
                      remoteStreams={remoteStreams}
                      connectionState={connectionState}
                      onToggleVideo={toggleVideo}
                      onToggleAudio={toggleAudio}
                      onShareScreen={handleShareScreen}
                      onDisconnect={cleanupCall}
                      isVideoEnabled={isVideoEnabled}
                      isAudioEnabled={isAudioEnabled}
                      isScreenSharing={isScreenSharing}
                      myPeerId={myPeerId}
                      userProfile={userProfile}
                      onlineUsers={onlineUsers}
                      userVolumes={userVolumes}
                      onUserVolumeChange={(peerId, volume) => setUserVolumes(prev => new Map(prev).set(peerId, volume))}
                      voiceChannels={INITIAL_CHANNELS.filter(c => c.type === ChannelType.VOICE)}
                      onJoinVoiceChannel={(id) => {
                        joinVoiceChannel(id);
                      }}
                    />
                  </div>
                </motion.div>
              )}


            </AnimatePresence>
          </div>

          {/* Mobile Users Bottom Sheet Overlay */}
          <AnimatePresence>
            {showMobileUsers && (
              <motion.div
                key="users-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 z-alert"
              >
                {/* Backdrop */}
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowMobileUsers(false)} />
                {/* Sheet */}
                <motion.div
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  className="absolute bottom-0 left-0 right-0 bg-[#1a1a2e] rounded-t-3xl overflow-hidden"
                  style={{
                    maxHeight: '70vh',
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                    paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
                  }}
                >
                  {/* Handle bar */}
                  <div className="flex justify-center pt-3 pb-2">
                    <div className="w-10 h-1 rounded-full bg-white/20" />
                  </div>
                  {/* Header */}
                  <div className="flex items-center justify-between px-5 pb-3 border-b border-white/5">
                    <h3
                      className="font-display text-base tracking-wide uppercase"
                      style={{ color: themeColors[appSettings.theme].primary }}
                    >
                      Online — {onlineUsers.length}
                    </h3>
                    <button
                      onClick={() => setShowMobileUsers(false)}
                      className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center"
                    >
                      <svg className="w-4 h-4 text-discord-muted" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  {/* User list */}
                  <div className="overflow-y-auto" style={{ maxHeight: 'calc(70vh - 80px)' }}>
                    <UserList
                      connectionState={connectionState}
                      onlineUsers={onlineUsers}
                      myPeerId={myPeerId}
                      isCollapsed={false}
                      onToggleCollapse={() => {}}
                    />
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mobile Bottom Navigation */}
          <MobileNav
            activeView={mobileView}
            onViewChange={setMobileView}
            connectionState={connectionState}
            onOpenSettings={() => setShowSettingsModal(true)}
            isSettingsOpen={showSettingsModal}
          />
        </>
        );
      })() : (
        /* ============ DESKTOP LAYOUT ============ */
        <>
          <Sidebar onServerClick={() => setActiveChannelId('1')} />

          {/* CHANNEL LIST + VOICE CONTROLS */}
          <div
            className="flex flex-col h-full bg-discord-sidebar relative scanlines"
            style={{ width: isChannelListCollapsed ? 72 : channelListResize.width }}
          >
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
                isCollapsed={isChannelListCollapsed}
                onToggleCollapse={() => setIsChannelListCollapsed(!isChannelListCollapsed)}
              />
              {!isChannelListCollapsed && (
                <ResizeHandle
                  side="right"
                  onMouseDown={channelListResize.handleMouseDown}
                  isResizing={channelListResize.isResizing}
                />
              )}
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
                    onDisconnect={cleanupCall}
                    isVideoEnabled={isVideoEnabled}
                    isAudioEnabled={isAudioEnabled}
                    isScreenSharing={isScreenSharing}
                    myPeerId={myPeerId}
                    userProfile={userProfile}
                    onlineUsers={onlineUsers}
                    userVolumes={userVolumes}
                    onUserVolumeChange={(peerId, volume) => setUserVolumes(prev => new Map(prev).set(peerId, volume))}
                 />
               </div>
               <div
                  className="relative h-full"
                  style={{ width: isUserListCollapsed ? 48 : userListResize.width }}
               >
                  {!isUserListCollapsed && (
                    <ResizeHandle
                      side="left"
                      onMouseDown={userListResize.handleMouseDown}
                      isResizing={userListResize.isResizing}
                    />
                  )}
                  <UserList
                    connectionState={connectionState}
                    onlineUsers={onlineUsers}
                    myPeerId={myPeerId}
                    isCollapsed={isUserListCollapsed}
                    onToggleCollapse={() => setIsUserListCollapsed(!isUserListCollapsed)}
                    width={userListResize.width}
                  />
               </div>
             </div>
          ) : (
             <div className="flex-1 flex min-w-0 relative scanlines">
                 <ChatArea
                    channel={activeChannel}
                    messages={messages[activeChannel.id] || []}
                    onlineUsers={onlineUsers}
                    onSendMessage={(text, attachment) => addMessage(activeChannel.id, text, userProfile.displayName, false, attachment)}
                    onSendAIMessage={(text, response) => addMessage(activeChannel.id, response, 'Pissbot', true)}
                    onOpenReportModal={() => setShowReportModal(true)}
                 />
                 <div
                    className="relative h-full"
                    style={{ width: isUserListCollapsed ? 48 : userListResize.width }}
                 >
                    {!isUserListCollapsed && (
                      <ResizeHandle
                        side="left"
                        onMouseDown={userListResize.handleMouseDown}
                        isResizing={userListResize.isResizing}
                      />
                    )}
                    <UserList
                      connectionState={connectionState}
                      onlineUsers={onlineUsers}
                      myPeerId={myPeerId}
                      isCollapsed={isUserListCollapsed}
                      onToggleCollapse={() => setIsUserListCollapsed(!isUserListCollapsed)}
                      width={userListResize.width}
                    />
                 </div>
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
