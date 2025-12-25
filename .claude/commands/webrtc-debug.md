# WebRTC Diagnostics Skill

Debug and diagnose WebRTC connection issues in Pisscord. This skill encodes expert knowledge about P2P networking, PeerJS internals, and common failure modes.

## When to Activate

- User reports "can't connect", "no audio", "no video", "call keeps dropping"
- User mentions "WebRTC", "peer", "connection", or "P2P" issues
- Debug logs show WebRTC-related errors (ice, peer, stream)
- User asks to "debug voice calls" or "fix video chat"

## Mental Model

Pisscord's voice/video uses **mesh networking**: each participant connects directly to every other participant. With N users, there are N*(N-1)/2 bidirectional connections.

```
    User A
   /      \
  /        \
User B --- User C
```

A call failure can occur at **5 layers**:
1. **Local Media** - Camera/mic permissions or hardware
2. **Signaling** - PeerJS server coordination
3. **ICE/STUN** - NAT traversal negotiation
4. **Connection** - WebRTC peer connection establishment
5. **Stream** - Media track delivery

Debug from layer 1 outward - most issues are local media or ICE failures.

## Diagnostic Framework

### Layer 1: Local Media Issues

**Symptoms:** Black video, no microphone input, "NotAllowedError"

**Diagnostic code to add:**
```typescript
// Check media permissions
const checkMedia = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    });
    console.log('✅ Media access granted');
    console.log('Video tracks:', stream.getVideoTracks().map(t => ({
      label: t.label,
      enabled: t.enabled,
      muted: t.muted,
      readyState: t.readyState
    })));
    console.log('Audio tracks:', stream.getAudioTracks().map(t => ({
      label: t.label,
      enabled: t.enabled,
      muted: t.muted,
      readyState: t.readyState
    })));
    stream.getTracks().forEach(t => t.stop());
  } catch (error) {
    console.error('❌ Media access failed:', error.name, error.message);
  }
};
```

**Common fixes:**
- Check browser permissions (chrome://settings/content/camera)
- Verify device isn't used by another app
- Test with specific device constraints

### Layer 2: Signaling Issues

**Symptoms:** "Peer disconnected", can't find other users

**Key code location:** `App.tsx` - PeerJS initialization

**Diagnostic approach:**
```typescript
// Check PeerJS connection status
peer.on('open', (id) => {
  console.log('✅ PeerJS connected, ID:', id);
});

peer.on('disconnected', () => {
  console.log('⚠️ PeerJS disconnected from signaling server');
  console.log('Attempting reconnect...');
  peer.reconnect();
});

peer.on('error', (err) => {
  console.error('❌ PeerJS error:', err.type, err.message);
  // err.type can be: 'browser-incompatible', 'disconnected',
  // 'invalid-id', 'invalid-key', 'network', 'peer-unavailable',
  // 'ssl-unavailable', 'server-error', 'socket-error', 'socket-closed',
  // 'unavailable-id', 'webrtc'
});
```

**Common fixes:**
- PeerJS cloud server may be overloaded - wait and retry
- Check if peer ID is registered in Firebase presence
- Verify Firebase `users/` has the target peer's entry

### Layer 3: ICE/STUN Issues

**Symptoms:** Calls connect briefly then drop, works on same network but not across NAT

**Diagnostic code:**
```typescript
// Monitor ICE candidates
call.peerConnection.onicecandidate = (event) => {
  if (event.candidate) {
    console.log('ICE candidate:', {
      type: event.candidate.type, // 'host', 'srflx', 'relay'
      protocol: event.candidate.protocol,
      address: event.candidate.address,
      port: event.candidate.port
    });
  }
};

call.peerConnection.onicecandidateerror = (event) => {
  console.error('ICE error:', event.errorCode, event.errorText);
};

// Check ICE connection state
call.peerConnection.oniceconnectionstatechange = () => {
  const state = call.peerConnection.iceConnectionState;
  console.log('ICE state:', state);
  // States: 'new', 'checking', 'connected', 'completed',
  //         'failed', 'disconnected', 'closed'

  if (state === 'failed') {
    console.error('❌ ICE negotiation failed - likely NAT/firewall issue');
  }
};
```

**ICE Candidate Types:**
- `host`: Direct connection (same network)
- `srflx`: Server reflexive (via STUN, works for most NATs)
- `relay`: TURN relay (needed for symmetric NAT)

**Common fixes:**
- If only `host` candidates appear, STUN server unreachable
- If `srflx` but still fails, may need TURN server
- Corporate firewalls often block UDP - TURN over TCP may help

### Layer 4: Connection Issues

**Symptoms:** ICE succeeds but call object is null, `call.on('stream')` never fires

**Key code locations:**
- `App.tsx:callsRef` - stores active MediaConnection objects
- `peer.call()` - outgoing call initiation
- `peer.on('call')` - incoming call handler

**Diagnostic code:**
```typescript
// Enhanced call monitoring
const makeCall = (remotePeerId: string, localStream: MediaStream) => {
  console.log('📞 Initiating call to:', remotePeerId);

  const call = peer.call(remotePeerId, localStream);

  if (!call) {
    console.error('❌ peer.call() returned null - peer not found');
    return null;
  }

  call.on('stream', (remoteStream) => {
    console.log('✅ Remote stream received:', {
      id: remoteStream.id,
      videoTracks: remoteStream.getVideoTracks().length,
      audioTracks: remoteStream.getAudioTracks().length
    });
  });

  call.on('close', () => {
    console.log('📴 Call closed with:', remotePeerId);
  });

  call.on('error', (err) => {
    console.error('❌ Call error:', err);
  });

  return call;
};
```

**Common fixes:**
- Check `connectionStateRef.current` for stale closure bug (fixed in v1.4.4)
- Verify `localStream` has active tracks before calling
- Ensure remote peer is answering with `call.answer(stream)`

### Layer 5: Stream Issues

**Symptoms:** Connected but black video, connected but no audio

**Diagnostic code:**
```typescript
// Check stream health
const diagnoseStream = (stream: MediaStream, label: string) => {
  console.log(`Stream [${label}]:`, {
    id: stream.id,
    active: stream.active,
    videoTracks: stream.getVideoTracks().map(t => ({
      id: t.id,
      label: t.label,
      enabled: t.enabled,
      muted: t.muted,
      readyState: t.readyState
    })),
    audioTracks: stream.getAudioTracks().map(t => ({
      id: t.id,
      label: t.label,
      enabled: t.enabled,
      muted: t.muted,
      readyState: t.readyState
    }))
  });
};

// Check if remote audio is playing
const audioElement = document.querySelector('audio');
if (audioElement) {
  console.log('Audio element:', {
    srcObject: !!audioElement.srcObject,
    paused: audioElement.paused,
    muted: audioElement.muted,
    volume: audioElement.volume,
    readyState: audioElement.readyState
  });
}
```

**Common fixes:**
- Track `enabled: false` → user muted themselves
- Track `muted: true` → browser detected no input
- Track `readyState: 'ended'` → track was stopped
- Audio element `paused: true` → call `play()` (autoplay policy)

## Stale Closure Bug Pattern

This is Pisscord's most common WebRTC bug. When async callbacks capture old state:

**Problem:**
```typescript
// BAD: connectionState captured at callback creation time
peer.on('call', (call) => {
  if (connectionState === 'CONNECTED') { // ❌ Always uses old value
    // ...
  }
});
```

**Solution (already implemented in v1.4.4):**
```typescript
// GOOD: Use ref to get current value
const connectionStateRef = useRef(connectionState);
useEffect(() => {
  connectionStateRef.current = connectionState;
}, [connectionState]);

peer.on('call', (call) => {
  if (connectionStateRef.current === 'CONNECTED') { // ✅ Current value
    // ...
  }
});
```

## Debug Log Enhancement

Add to `App.tsx` for comprehensive WebRTC logging:

```typescript
const addLog = (type: string, message: string, data?: any) => {
  const entry = {
    timestamp: new Date().toISOString(),
    type,
    message,
    data: data ? JSON.stringify(data) : undefined
  };
  setLogs(prev => [...prev.slice(-49), entry]); // Keep last 50

  // Color-coded console output
  const colors = {
    info: 'color: #10b981',
    error: 'color: #ef4444',
    webrtc: 'color: #3b82f6',
    peer: 'color: #8b5cf6'
  };
  console.log(`%c[${type}] ${message}`, colors[type] || '', data || '');
};
```

## Quick Diagnosis Checklist

When user reports call issues:

1. **Check Settings > Debug Log** for recent errors
2. **Verify both users appear in Firebase** `/users` with valid peer IDs
3. **Check browser console** for WebRTC errors (filter by "ice" or "peer")
4. **Test local media** independently of call
5. **Check network** - same WiFi works? Different networks fail?
6. **Browser compatibility** - both users on supported browser?

## Network Requirements

Pisscord requires:
- **UDP ports 10000-60000** for media (or TURN fallback)
- **WSS connection** to PeerJS signaling server
- **STUN server access** (default: Google's stun:stun.l.google.com:19302)

Corporate/school networks often block these - recommend mobile hotspot for testing.

## Example Usage

User: "Video calls connect but I can't hear the other person"

Claude should:
1. Ask for Settings > Debug Log output
2. Check if audio track shows `enabled: true`, `muted: false`
3. Verify `<audio>` element has `srcObject` and isn't paused
4. Check `remoteVolume` state isn't 0
5. Verify `setSinkId()` matches selected output device
6. If all looks correct, check if browser autoplay was blocked

---
Created: 2025-12-25
Version: 1.0
Author: Claude Code Analysis
