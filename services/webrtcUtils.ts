/**
 * WebRTC utility functions for media constraints and SDP manipulation.
 * Extracted from App.tsx for testability.
 */

/**
 * Build platform-aware video constraints.
 * Desktop: 720p@30fps for sharp video.
 * Mobile: 480p@24fps to save battery and reduce heat.
 */
export function buildVideoConstraints(isMobile: boolean, deviceId?: string): MediaTrackConstraints {
    const constraints: MediaTrackConstraints = isMobile
        ? { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24, max: 24 }, facingMode: 'user' }
        : { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30, max: 30 } };
    if (deviceId) {
        constraints.deviceId = { exact: deviceId };
    }
    return constraints;
}

/**
 * Build audio constraints with 48kHz mono for voice calls.
 */
export function buildAudioConstraints(settings: {
    noiseSuppression?: boolean;
    echoCancellation?: boolean;
    autoGainControl?: boolean;
    audioInputId?: string;
}): MediaTrackConstraints {
    const constraints: MediaTrackConstraints = {
        noiseSuppression: settings.noiseSuppression ?? true,
        echoCancellation: settings.echoCancellation ?? true,
        autoGainControl: settings.autoGainControl ?? true,
        sampleRate: { ideal: 48000 },
        channelCount: 1,
    };
    if (settings.audioInputId) {
        constraints.deviceId = { exact: settings.audioInputId };
    }
    return constraints;
}

/**
 * Build screen share constraints optimized for text clarity.
 * 1080p at 15fps ideal — screen content is mostly static, so resolution > framerate.
 */
export function buildScreenShareConstraints(): DisplayMediaStreamOptions {
    return {
        video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 15, max: 30 } },
        audio: false,
    };
}

/**
 * SDP transform that reorders H.264 before VP8 in the video codec list.
 * H.264 has wider hardware acceleration support on mobile (most chipsets have
 * dedicated H.264 encoders), reducing CPU usage and battery drain.
 *
 * Falls back gracefully — never removes codecs, only reorders.
 */
export function preferH264(sdp: string): string {
    try {
        const lines = sdp.split('\r\n');
        const videoMLineIndex = lines.findIndex(l => l.startsWith('m=video'));
        if (videoMLineIndex === -1) return sdp;

        // Collect H.264 payload types from rtpmap lines
        const h264PayloadTypes: string[] = [];
        const otherPayloadTypes: string[] = [];

        // Parse the m=video line to get current payload type order
        const mLineParts = lines[videoMLineIndex].split(' ');
        // Format: m=video <port> <proto> <pt1> <pt2> ...
        const payloadTypes = mLineParts.slice(3);

        for (const pt of payloadTypes) {
            const rtpmapLine = lines.find(l => l.startsWith(`a=rtpmap:${pt} `) && l.toLowerCase().includes('h264'));
            if (rtpmapLine) {
                h264PayloadTypes.push(pt);
            } else {
                otherPayloadTypes.push(pt);
            }
        }

        if (h264PayloadTypes.length === 0) return sdp; // No H.264 available

        // Rebuild m=video line with H.264 first
        mLineParts.splice(3, payloadTypes.length, ...h264PayloadTypes, ...otherPayloadTypes);
        lines[videoMLineIndex] = mLineParts.join(' ');

        return lines.join('\r\n');
    } catch {
        return sdp; // On any error, return unmodified SDP
    }
}
