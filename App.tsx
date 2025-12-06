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

  // --- STATE: Media ---
  const [myStream, setMyStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
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
  const callInstance = useRef<any>(null);
  const dataConnection = useRef<any>(null); // P2P data channel for text messages
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
        // If we are already connected, we reject
        if (connectionState === ConnectionState.CONNECTED) {
            call.close(); // Busy
            toast.info("Incoming Call Blocked", "You declined an incoming call while already connected.");
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
  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
        log(`Setting up remote audio: ${remoteStream.getAudioTracks().length} audio tracks`, 'webrtc');

        // Log audio track details
        remoteStream.getAudioTracks().forEach((track, i) => {
            log(`  Audio track ${i}: ${track.label}, enabled=${track.enabled}, muted=${track.muted}`, 'webrtc');
        });

        remoteAudioRef.current.srcObject = remoteStream;
        // Apply volume
        remoteAudioRef.current.volume = remoteVolume / 100;

        // Apply output device if supported
        if (deviceSettings.audioOutputId && (remoteAudioRef.current as any).setSinkId) {
            (remoteAudioRef.current as any).setSinkId(deviceSettings.audioOutputId)
                .catch((e: any) => log(`Failed to set audio output: ${e.message}`, 'error'));
        }

        // Play audio with retry logic
        const playAudio = async () => {
            try {
                await remoteAudioRef.current?.play();
                log("✅ Remote audio playing successfully", 'webrtc');
            } catch (e: any) {
                log(`Audio play failed: ${e.message}. Will retry on user interaction.`, 'error');
                // Add click listener to retry audio on user interaction
                const retryPlay = () => {
                    remoteAudioRef.current?.play()
                        .then(() => {
                            log("✅ Audio resumed after user interaction", 'webrtc');
                            document.removeEventListener('click', retryPlay);
                        })
                        .catch(() => {});
                };
                document.addEventListener('click', retryPlay, { once: true });
            }
        };
        playAudio();
    }
  }, [remoteStream, deviceSettings.audioOutputId, remoteVolume]);


  // --- MEDIA HELPERS ---
  const getLocalStream = async () => {
    log("=== Getting Local Media Stream ===", 'webrtc');
    const constraints = {
        audio: deviceSettings.audioInputId ? { deviceId: { exact: deviceSettings.audioInputId } } : true,
        video: deviceSettings.videoInputId ? { deviceId: { exact: deviceSettings.videoInputId } } : true,
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
      dataConnection.current = conn;

      conn.on('open', () => {
          log('Data connection established', 'webrtc');
      });

      conn.on('data', (data: any) => {
          // Receive text messages from remote peer
          if (data.type === 'text-message') {
              const newMessage: Message = {
                  id: data.id,
                  sender: data.sender,
                  content: data.content,
                  timestamp: data.timestamp,
                  isAi: false
              };
              setMessages(prev => ({
                  ...prev,
                  [data.channelId]: [...(prev[data.channelId] || []), newMessage]
              }));
              log(`Received message from ${data.sender}: ${data.content}`, 'info');
          }
      });

      conn.on('close', () => {
          log('Data connection closed', 'webrtc');
          dataConnection.current = null;
      });

      conn.on('error', (err: Error) => {
          log(`Data connection error: ${err.message}`, 'error');
      });
  };

  const cleanupCall = () => {
      if (callInstance.current) callInstance.current.close();
      if (dataConnection.current) dataConnection.current.close();
      if (myStream) myStream.getTracks().forEach(t => t.stop());
      setMyStream(null);
      setRemoteStream(null);
      setConnectionState(ConnectionState.DISCONNECTED);
      setActiveVoiceChannelId(null);
      setIsScreenSharing(false);
      dataConnection.current = null;
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

      const initiateCall = async () => {
          setConnectionState(ConnectionState.CONNECTING);
          const voiceChan = INITIAL_CHANNELS.find(c => c.type === ChannelType.VOICE);
          if (voiceChan) {
              setActiveChannelId(voiceChan.id);
              setActiveVoiceChannelId(voiceChan.id);
          }

          try {
              const stream = await getLocalStream();
              const call = peerInstance.current!.call(remoteId, stream);
              setupCallEvents(call);

              // Also establish data connection for text messages
              const conn = peerInstance.current!.connect(remoteId);
              setupDataConnection(conn);
              // Play outgoing call sound (looped while waiting)
              playSound('call_outgoing', true);
              toast.info("Calling...", "Waiting for peer to answer.");
          } catch (err) {
              log("Failed to start call", 'error');
              toast.error("Call Failed", "Could not start call. Check your camera/microphone permissions.");
              setConnectionState(ConnectionState.ERROR);
          }
      };

      if (connectionState === ConnectionState.CONNECTED) {
          setConfirmModal({
              isOpen: true,
              title: "Disconnect Current Call?",
              message: "You're already in a call. Do you want to disconnect and start a new call?",
              confirmText: "Disconnect & Call",
              cancelText: "Stay Connected",
              confirmStyle: 'danger',
              onConfirm: () => {
                  cleanupCall();
                  setConfirmModal(prev => ({ ...prev, isOpen: false }));
                  initiateCall();
              }
          });
          return;
      }

      initiateCall();
  };

  const setupCallEvents = (call: any) => {
      callInstance.current = call;

      call.on('stream', (rStream: MediaStream) => {
          log("=== Received Remote Stream ===", 'webrtc');
          log(`Remote stream has ${rStream.getVideoTracks().length} video tracks`, 'webrtc');
          log(`Remote stream has ${rStream.getAudioTracks().length} audio tracks`, 'webrtc');

          // Log details of each audio track
          rStream.getAudioTracks().forEach((track, i) => {
              log(`  Remote audio track ${i}: id=${track.id}, label="${track.label}", enabled=${track.enabled}, muted=${track.muted}, readyState=${track.readyState}`, 'webrtc');
          });

          // Log details of each video track
          rStream.getVideoTracks().forEach((track, i) => {
              log(`  Remote video track ${i}: id=${track.id}, label="${track.label}", enabled=${track.enabled}, readyState=${track.readyState}`, 'webrtc');
          });

          setRemoteStream(rStream);
          setConnectionState(ConnectionState.CONNECTED);
          stopLoopingSound(); // Stop outgoing/incoming call ringing
          playSound('user_join');
          toast.success("Connected!", "You are now in a secure P2P call.");
      });

      call.on('close', () => {
          log("Call closed by peer", 'info');
          playSound('user_leave');
          cleanupCall();
          toast.info("Call Ended", "The other user disconnected from the call.");
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
              playSound(audTrack.enabled ? 'unmute' : 'mute');
          }
      }
  };

  const handleShareScreen = async () => {
      log("=== Screen Share Button Clicked ===", 'webrtc');

      // Debug: Check prerequisites
      if (!callInstance.current) {
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

      // Check if we have peerConnection
      if (!callInstance.current?.peerConnection) {
          log("ERROR: No peerConnection on call instance!", 'error');
          toast.error("Connection Error", "Peer connection not established. Try reconnecting.");
          screenTrack.stop();
          return;
      }

      // IMPORTANT: Find the sender for video and replace track
      const senders = callInstance.current.peerConnection.getSenders();
      log(`Found ${senders.length} RTP senders`, 'webrtc');

      const videoSender = senders.find((s: RTCRtpSender) => s.track?.kind === 'video');

      if (!videoSender) {
          log("ERROR: No video sender found!", 'error');
          toast.error("Video Error", "No video track in call. Try reconnecting.");
          screenTrack.stop();
          return;
      }

      log(`Video sender found: current track = ${videoSender.track?.id}`, 'webrtc');
      log("Replacing camera track with screen track...", 'webrtc');

      await videoSender.replaceTrack(screenTrack);
      log("✅ Track replaced successfully!", 'webrtc');

      setIsScreenSharing(true);

      // Update local preview
      const audioTracks = myStream!.getAudioTracks();
      log(`Creating new stream with screen + ${audioTracks.length} audio tracks`, 'webrtc');
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

          if (!callInstance.current?.peerConnection) {
              log("ERROR: No peerConnection!", 'error');
              setIsScreenSharing(false);
              return;
          }

          const senders = callInstance.current.peerConnection.getSenders();
          const videoSender = senders.find((s: RTCRtpSender) => s.track?.kind === 'video');

          if (!videoSender) {
              log("ERROR: No video sender found when stopping!", 'error');
              setIsScreenSharing(false);
              return;
          }

          if (!myVideoTrack.current) {
              log("ERROR: No camera track to revert to!", 'error');
              toast.error("Camera Error", "Lost reference to camera. Try reconnecting.");
              setIsScreenSharing(false);
              return;
          }

          log("Swapping Screen -> Camera", 'webrtc');

          // Stop the screen track to release resource
          const currentScreenTrack = videoSender.track;
          if (currentScreenTrack) {
              log(`Stopping screen track: ${currentScreenTrack.id}`, 'webrtc');
              currentScreenTrack.stop();
          }

          log(`Replacing with camera track: ${myVideoTrack.current.id}`, 'webrtc');
          await videoSender.replaceTrack(myVideoTrack.current);

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
  const addMessage = (channelId: string, text: string, sender: string, isAi: boolean = false) => {
      const newMessage: Message = {
          id: Date.now().toString() + Math.random().toString(), sender, content: text, timestamp: Date.now(), isAi
      };
      setMessages(prev => ({ ...prev, [channelId]: [...(prev[channelId] || []), newMessage] }));

      // Send message to remote peer via data connection (except AI messages)
      if (!isAi && dataConnection.current && dataConnection.current.open) {
          try {
              dataConnection.current.send({
                  type: 'text-message',
                  channelId,
                  id: newMessage.id,
                  sender: newMessage.sender,
                  content: newMessage.content,
                  timestamp: newMessage.timestamp
              });
              log(`Sent message to remote peer: ${text}`, 'webrtc');
          } catch (err: any) {
              log(`Failed to send message: ${err.message}`, 'error');
          }
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
      {/* Global Audio Element for persistent audio across views */}
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

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
            onIdCopied={() => toast.success("Copied!", "Send this ID to your friend so they can call you.")}
         />
      ) : (
         <div className="flex-1 flex min-w-0">
             <ChatArea 
                channel={activeChannel}
                messages={messages[activeChannel.id] || []}
                onSendMessage={(text) => addMessage(activeChannel.id, text, userProfile.displayName)}
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
