import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';
import { uploadFile } from '../services/firebase';

interface VoiceMessageButtonProps {
  onVoiceMessageSent: (audioUrl: string, duration: number, fileName: string, fileSize: number) => void;
  onRecordingStateChange?: (isRecording: boolean) => void;
  disabled?: boolean;
}

const MAX_DURATION = 60; // Maximum recording duration in seconds
const SAMPLE_RATE = 44100;

export const VoiceMessageButton: React.FC<VoiceMessageButtonProps> = ({
  onVoiceMessageSent,
  onRecordingStateChange,
  disabled = false
}) => {
  const { colors } = useTheme();

  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Notify parent of recording state changes
  useEffect(() => {
    onRecordingStateChange?.(isRecording);
  }, [isRecording, onRecordingStateChange]);

  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioDataRef = useRef<Float32Array[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingDurationRef = useRef<number>(0);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const encodeToWav = (audioData: Float32Array[], sampleRate: number): Blob => {
    // Combine all audio chunks
    const totalLength = audioData.reduce((sum, chunk) => sum + chunk.length, 0);
    const combined = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of audioData) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }

    // Convert float32 to int16
    const samples = new Int16Array(combined.length);
    for (let i = 0; i < combined.length; i++) {
      const s = Math.max(-1, Math.min(1, combined[i]));
      samples[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }

    // Create WAV file
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    // WAV header
    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size
    view.setUint16(20, 1, true); // AudioFormat (PCM)
    view.setUint16(22, 1, true); // NumChannels (mono)
    view.setUint32(24, sampleRate, true); // SampleRate
    view.setUint32(28, sampleRate * 2, true); // ByteRate
    view.setUint16(32, 2, true); // BlockAlign
    view.setUint16(34, 16, true); // BitsPerSample
    writeString(36, 'data');
    view.setUint32(40, samples.length * 2, true);

    // Write audio data
    const dataOffset = 44;
    for (let i = 0; i < samples.length; i++) {
      view.setInt16(dataOffset + i * 2, samples[i], true);
    }

    return new Blob([buffer], { type: 'audio/wav' });
  };

  const startRecording = useCallback(async () => {
    setError(null);
    audioDataRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: SAMPLE_RATE,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        }
      });
      streamRef.current = stream;

      // Log audio track info
      const audioTracks = stream.getAudioTracks();
      console.log('[VoiceMessage] Audio tracks:', audioTracks.length);
      audioTracks.forEach((track, i) => {
        console.log(`[VoiceMessage] Track ${i}: label=${track.label}, enabled=${track.enabled}, muted=${track.muted}`);
      });

      // Create audio context and processor
      const audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        // Copy the data since the buffer gets reused
        const copy = new Float32Array(inputData);
        audioDataRef.current.push(copy);

        // Log audio level periodically (every ~1 second)
        if (audioDataRef.current.length % 11 === 1) {
          const max = Math.max(...Array.from(copy).map(Math.abs));
          const rms = Math.sqrt(copy.reduce((sum, x) => sum + x * x, 0) / copy.length);
          console.log(`[VoiceMessage] Audio level - max: ${max.toFixed(4)}, rms: ${rms.toFixed(4)}`);
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      setIsRecording(true);
      console.log('[VoiceMessage] Recording started with Web Audio API');

      // Start duration timer
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => {
          const newDuration = prev + 1;
          recordingDurationRef.current = newDuration;
          if (newDuration >= MAX_DURATION) {
            stopRecording();
            return prev;
          }
          return newDuration;
        });
      }, 1000);

    } catch (err: any) {
      console.error('[VoiceMessage] Failed to start recording:', err);
      setError(err.message || 'Microphone access denied');
    }
  }, []);

  const stopRecording = useCallback(async () => {
    if (!isRecording) return;

    console.log('[VoiceMessage] Stopping recording...');
    setIsRecording(false);

    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Disconnect processor
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      await audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Stop stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    const finalDuration = recordingDurationRef.current;
    setRecordingDuration(0);
    recordingDurationRef.current = 0;

    // Encode to WAV
    if (audioDataRef.current.length > 0) {
      setIsUploading(true);
      try {
        console.log('[VoiceMessage] Encoding to WAV...', audioDataRef.current.length, 'chunks');
        const wavBlob = encodeToWav(audioDataRef.current, SAMPLE_RATE);
        console.log('[VoiceMessage] WAV blob size:', wavBlob.size, 'bytes');

        const fileName = `voice_${Date.now()}.wav`;
        const file = new File([wavBlob], fileName, { type: 'audio/wav' });

        console.log('[VoiceMessage] Uploading file:', fileName);
        const url = await uploadFile(file);
        console.log('[VoiceMessage] Upload complete:', url);

        onVoiceMessageSent(url, Math.max(finalDuration, 1), fileName, wavBlob.size);
      } catch (err) {
        console.error('[VoiceMessage] Processing/upload failed:', err);
        setError('Failed to process voice message');
      } finally {
        setIsUploading(false);
        audioDataRef.current = [];
      }
    } else {
      console.warn('[VoiceMessage] No audio data recorded');
      setError('No audio recorded');
    }
  }, [isRecording, onVoiceMessageSent]);

  const cancelRecording = useCallback(async () => {
    if (!isRecording) return;

    console.log('[VoiceMessage] Canceling recording...');
    setIsRecording(false);
    setRecordingDuration(0);
    recordingDurationRef.current = 0;
    audioDataRef.current = [];

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (audioContextRef.current) {
      await audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, [isRecording]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Show recording UI when recording
  if (isRecording) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center space-x-1"
      >
        {/* Recording indicator - styled like other buttons but with red highlight */}
        <div className="h-8 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center px-3 space-x-2">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          <span className="text-red-400 text-sm font-medium tabular-nums">{formatDuration(recordingDuration)}</span>
        </div>

        {/* Cancel button - consistent w-8 h-8 style */}
        <button
          onClick={cancelRecording}
          className="w-8 h-8 rounded-lg bg-discord-sidebar hover:bg-discord-hover text-discord-muted hover:text-white flex items-center justify-center transition-colors"
          title="Cancel Recording"
        >
          <i className="fas fa-times text-sm"></i>
        </button>

        {/* Stop/Send button - consistent w-8 h-8 style with primary color */}
        <button
          onClick={stopRecording}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white transition-colors"
          style={{ backgroundColor: colors.primary }}
          title="Send Voice Message"
        >
          <i className="fas fa-paper-plane text-sm"></i>
        </button>
      </motion.div>
    );
  }

  // Show uploading state - consistent with other button styles
  if (isUploading) {
    return (
      <div className="flex items-center space-x-1">
        <div className="h-8 rounded-lg bg-discord-sidebar flex items-center px-3 space-x-2">
          <i className="fas fa-spinner fa-spin text-discord-muted text-sm"></i>
          <span className="text-discord-muted text-sm">Uploading...</span>
        </div>
      </div>
    );
  }

  // Default microphone button - styled consistently with other toolbar buttons
  return (
    <div className="relative">
      <button
        onClick={startRecording}
        disabled={disabled}
        className={`w-8 h-8 rounded-lg bg-discord-sidebar hover:bg-discord-hover text-discord-muted hover:text-white flex items-center justify-center transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        title="Record Voice Message"
      >
        <i className="fas fa-microphone text-sm"></i>
      </button>

      {/* Error tooltip */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-red-500 text-white text-xs rounded whitespace-nowrap z-50"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
