import { describe, it, expect } from 'vitest';
import {
    buildVideoConstraints,
    buildAudioConstraints,
    buildScreenShareConstraints,
    preferH264,
} from '../webrtcUtils';

describe('buildVideoConstraints', () => {
    it('returns 720p30 for desktop', () => {
        const constraints = buildVideoConstraints(false);
        expect(constraints.width).toEqual({ ideal: 1280 });
        expect(constraints.height).toEqual({ ideal: 720 });
        expect(constraints.frameRate).toEqual({ ideal: 30, max: 30 });
        expect(constraints.facingMode).toBeUndefined();
    });

    it('returns 480p24 for mobile with front camera', () => {
        const constraints = buildVideoConstraints(true);
        expect(constraints.width).toEqual({ ideal: 640 });
        expect(constraints.height).toEqual({ ideal: 480 });
        expect(constraints.frameRate).toEqual({ ideal: 24, max: 24 });
        expect(constraints.facingMode).toBe('user');
    });

    it('includes deviceId when specified', () => {
        const constraints = buildVideoConstraints(false, 'camera-123');
        expect(constraints.deviceId).toEqual({ exact: 'camera-123' });
        expect(constraints.width).toEqual({ ideal: 1280 });
    });

    it('omits deviceId when not specified', () => {
        const constraints = buildVideoConstraints(true);
        expect(constraints.deviceId).toBeUndefined();
    });

    it('mobile constraints produce fewer pixels than desktop', () => {
        const mobile = buildVideoConstraints(true);
        const desktop = buildVideoConstraints(false);
        const mobilePixels = (mobile.width as ConstrainULongRange).ideal! * (mobile.height as ConstrainULongRange).ideal!;
        const desktopPixels = (desktop.width as ConstrainULongRange).ideal! * (desktop.height as ConstrainULongRange).ideal!;
        expect(mobilePixels).toBeLessThan(desktopPixels);
    });
});

describe('buildAudioConstraints', () => {
    it('defaults to all processing enabled', () => {
        const constraints = buildAudioConstraints({});
        expect(constraints.noiseSuppression).toBe(true);
        expect(constraints.echoCancellation).toBe(true);
        expect(constraints.autoGainControl).toBe(true);
    });

    it('requests 48kHz mono', () => {
        const constraints = buildAudioConstraints({});
        expect(constraints.sampleRate).toEqual({ ideal: 48000 });
        expect(constraints.channelCount).toBe(1);
    });

    it('respects custom processing settings', () => {
        const constraints = buildAudioConstraints({
            noiseSuppression: false,
            echoCancellation: false,
            autoGainControl: false,
        });
        expect(constraints.noiseSuppression).toBe(false);
        expect(constraints.echoCancellation).toBe(false);
        expect(constraints.autoGainControl).toBe(false);
    });

    it('includes deviceId when audioInputId is specified', () => {
        const constraints = buildAudioConstraints({ audioInputId: 'mic-456' });
        expect(constraints.deviceId).toEqual({ exact: 'mic-456' });
    });

    it('omits deviceId when audioInputId is not specified', () => {
        const constraints = buildAudioConstraints({});
        expect(constraints.deviceId).toBeUndefined();
    });
});

describe('buildScreenShareConstraints', () => {
    it('requests 1080p at 15fps ideal', () => {
        const opts = buildScreenShareConstraints();
        const video = opts.video as MediaTrackConstraints;
        expect(video.width).toEqual({ ideal: 1920 });
        expect(video.height).toEqual({ ideal: 1080 });
        expect(video.frameRate).toEqual({ ideal: 15, max: 30 });
    });

    it('disables audio capture', () => {
        const opts = buildScreenShareConstraints();
        expect(opts.audio).toBe(false);
    });
});

describe('preferH264', () => {
    // Realistic SDP snippet with VP8 before H.264
    const makeSdp = (mLine: string, rtpLines: string[]) => {
        return [
            'v=0',
            'o=- 123 2 IN IP4 127.0.0.1',
            's=-',
            't=0 0',
            'a=group:BUNDLE 0 1',
            'm=audio 9 UDP/TLS/RTP/SAVPF 111',
            'a=rtpmap:111 opus/48000/2',
            mLine,
            ...rtpLines,
        ].join('\r\n');
    };

    it('moves H.264 payload types before VP8', () => {
        const sdp = makeSdp(
            'm=video 9 UDP/TLS/RTP/SAVPF 96 97 98',
            [
                'a=rtpmap:96 VP8/90000',
                'a=rtpmap:97 H264/90000',
                'a=rtpmap:98 VP9/90000',
            ]
        );

        const result = preferH264(sdp);
        const mLine = result.split('\r\n').find(l => l.startsWith('m=video'))!;
        const pts = mLine.split(' ').slice(3);
        // H.264 (97) should now be first
        expect(pts[0]).toBe('97');
        // VP8 and VP9 should follow
        expect(pts).toContain('96');
        expect(pts).toContain('98');
    });

    it('handles multiple H.264 profiles', () => {
        const sdp = makeSdp(
            'm=video 9 UDP/TLS/RTP/SAVPF 96 97 98 100',
            [
                'a=rtpmap:96 VP8/90000',
                'a=rtpmap:97 H264/90000',
                'a=rtpmap:98 VP9/90000',
                'a=rtpmap:100 H264/90000',
            ]
        );

        const result = preferH264(sdp);
        const mLine = result.split('\r\n').find(l => l.startsWith('m=video'))!;
        const pts = mLine.split(' ').slice(3);
        // Both H.264 types should come first
        expect(pts[0]).toBe('97');
        expect(pts[1]).toBe('100');
        expect(pts[2]).toBe('96');
        expect(pts[3]).toBe('98');
    });

    it('returns SDP unchanged when no H.264 is available', () => {
        const sdp = makeSdp(
            'm=video 9 UDP/TLS/RTP/SAVPF 96 98',
            [
                'a=rtpmap:96 VP8/90000',
                'a=rtpmap:98 VP9/90000',
            ]
        );

        const result = preferH264(sdp);
        expect(result).toBe(sdp);
    });

    it('returns SDP unchanged when no video m-line exists', () => {
        const audioOnly = [
            'v=0',
            'o=- 123 2 IN IP4 127.0.0.1',
            's=-',
            'm=audio 9 UDP/TLS/RTP/SAVPF 111',
            'a=rtpmap:111 opus/48000/2',
        ].join('\r\n');

        expect(preferH264(audioOnly)).toBe(audioOnly);
    });

    it('preserves all codec entries — never removes any', () => {
        const sdp = makeSdp(
            'm=video 9 UDP/TLS/RTP/SAVPF 96 97 98 100 102',
            [
                'a=rtpmap:96 VP8/90000',
                'a=rtpmap:97 H264/90000',
                'a=rtpmap:98 VP9/90000',
                'a=rtpmap:100 H264/90000',
                'a=rtpmap:102 red/90000',
            ]
        );

        const result = preferH264(sdp);
        const mLine = result.split('\r\n').find(l => l.startsWith('m=video'))!;
        const pts = mLine.split(' ').slice(3);
        expect(pts).toHaveLength(5);
        expect(pts.sort()).toEqual(['100', '102', '96', '97', '98']);
    });

    it('handles empty string gracefully', () => {
        expect(preferH264('')).toBe('');
    });

    it('handles malformed SDP gracefully', () => {
        const garbage = 'this is not valid SDP at all';
        expect(preferH264(garbage)).toBe(garbage);
    });

    it('is case-insensitive for H264 matching', () => {
        const sdp = makeSdp(
            'm=video 9 UDP/TLS/RTP/SAVPF 96 97',
            [
                'a=rtpmap:96 VP8/90000',
                'a=rtpmap:97 h264/90000', // lowercase
            ]
        );

        const result = preferH264(sdp);
        const mLine = result.split('\r\n').find(l => l.startsWith('m=video'))!;
        const pts = mLine.split(' ').slice(3);
        expect(pts[0]).toBe('97');
    });

    it('is a no-op when H.264 is already first', () => {
        const sdp = makeSdp(
            'm=video 9 UDP/TLS/RTP/SAVPF 97 96 98',
            [
                'a=rtpmap:97 H264/90000',
                'a=rtpmap:96 VP8/90000',
                'a=rtpmap:98 VP9/90000',
            ]
        );

        const result = preferH264(sdp);
        // Should still produce same ordering
        const mLine = result.split('\r\n').find(l => l.startsWith('m=video'))!;
        const pts = mLine.split(' ').slice(3);
        expect(pts[0]).toBe('97');
        expect(pts[1]).toBe('96');
        expect(pts[2]).toBe('98');
    });

    it('preserves non-video SDP lines exactly', () => {
        const sdp = makeSdp(
            'm=video 9 UDP/TLS/RTP/SAVPF 96 97',
            [
                'a=rtpmap:96 VP8/90000',
                'a=rtpmap:97 H264/90000',
                'a=fmtp:97 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42e01f',
            ]
        );

        const result = preferH264(sdp);
        // Audio section should be unchanged
        expect(result).toContain('m=audio 9 UDP/TLS/RTP/SAVPF 111');
        expect(result).toContain('a=rtpmap:111 opus/48000/2');
        // fmtp line preserved
        expect(result).toContain('a=fmtp:97 level-asymmetry-allowed=1');
    });

    it('handles single codec SDP (only H.264)', () => {
        const sdp = makeSdp(
            'm=video 9 UDP/TLS/RTP/SAVPF 97',
            ['a=rtpmap:97 H264/90000']
        );

        const result = preferH264(sdp);
        const mLine = result.split('\r\n').find(l => l.startsWith('m=video'))!;
        const pts = mLine.split(' ').slice(3);
        expect(pts).toEqual(['97']);
    });
});

describe('buildVideoConstraints — additional edge cases', () => {
    it('mobile deviceId coexists with facingMode', () => {
        const constraints = buildVideoConstraints(true, 'front-cam-abc');
        expect(constraints.deviceId).toEqual({ exact: 'front-cam-abc' });
        expect(constraints.facingMode).toBe('user');
    });

    it('mobile framerate max matches ideal', () => {
        const constraints = buildVideoConstraints(true);
        const fr = constraints.frameRate as ConstrainDoubleRange;
        expect(fr.max).toBe(fr.ideal);
    });

    it('desktop framerate max matches ideal', () => {
        const constraints = buildVideoConstraints(false);
        const fr = constraints.frameRate as ConstrainDoubleRange;
        expect(fr.max).toBe(fr.ideal);
    });
});

describe('buildAudioConstraints — additional edge cases', () => {
    it('always requests mono regardless of other settings', () => {
        const withAll = buildAudioConstraints({ noiseSuppression: true, echoCancellation: true, autoGainControl: true, audioInputId: 'mic-1' });
        const withNone = buildAudioConstraints({ noiseSuppression: false, echoCancellation: false, autoGainControl: false });
        expect(withAll.channelCount).toBe(1);
        expect(withNone.channelCount).toBe(1);
    });

    it('always requests 48kHz regardless of processing settings', () => {
        const constraints = buildAudioConstraints({ noiseSuppression: false });
        expect(constraints.sampleRate).toEqual({ ideal: 48000 });
    });
});
