import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';
import { useIsMobile } from '../hooks/useIsMobile';
import { uploadFile } from '../services/firebase';

interface VoiceMessageButtonProps {
  onVoiceMessageSent: (audioUrl: string, duration: number, fileName: string) => void;
  onRecordingStateChange?: (isRecording: boolean) => void;
  disabled?: boolean;
}

const MAX_DURATION = 60; // Maximum recording duration in seconds

export const VoiceMessageButton: React.FC<VoiceMessageButtonProps> = ({
  onVoiceMessageSent,
  onRecordingStateChange,
  disabled = false
}) => {
  const { colors } = useTheme();
  const isMobile = useIsMobile();

  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Notify parent of recording state changes
  useEffect(() => {
    onRecordingStateChange?.(isRecording);
  }, [isRecording, onRecordingStateChange]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingDurationRef = useRef<number>(0); // Track duration in ref to avoid stale closure

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Find best supported MIME type
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus',
        'audio/ogg',
        ''  // Let browser choose default
      ];
      const supportedMimeType = mimeTypes.find(type =>
        type === '' || MediaRecorder.isTypeSupported(type)
      ) || '';

      console.log('[VoiceMessage] Using MIME type:', supportedMimeType || 'browser default');

      const mediaRecorderOptions: MediaRecorderOptions = {};
      if (supportedMimeType) {
        mediaRecorderOptions.mimeType = supportedMimeType;
      }

      const mediaRecorder = new MediaRecorder(stream, mediaRecorderOptions);
      console.log('[VoiceMessage] MediaRecorder created with mimeType:', mediaRecorder.mimeType);

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        console.log('[VoiceMessage] Data available:', event.data.size, 'bytes');
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        console.log('[VoiceMessage] Recording stopped, chunks:', audioChunksRef.current.length);

        // Stop the stream
        stream.getTracks().forEach(track => track.stop());
        streamRef.current = null;

        // Get MIME type from recorder
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        console.log('[VoiceMessage] Final mimeType:', mimeType);

        // Create blob from chunks
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        console.log('[VoiceMessage] Blob size:', audioBlob.size, 'bytes');

        // Get the final duration from ref (avoids stale closure)
        const finalDuration = recordingDurationRef.current;

        // Reset timer
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        setRecordingDuration(0);
        recordingDurationRef.current = 0;

        // Upload to Firebase - allow even 0 duration if blob has data
        if (audioBlob.size > 0) {
          setIsUploading(true);
          try {
            // Determine file extension based on MIME type
            let extension = 'webm';
            if (mimeType.includes('mp4') || mimeType.includes('m4a')) {
              extension = 'm4a';
            } else if (mimeType.includes('ogg')) {
              extension = 'ogg';
            } else if (mimeType.includes('wav')) {
              extension = 'wav';
            }

            const fileName = `voice_${Date.now()}.${extension}`;
            const file = new File([audioBlob], fileName, { type: mimeType });
            console.log('[VoiceMessage] Uploading file:', fileName, 'type:', mimeType);

            const url = await uploadFile(file);
            console.log('[VoiceMessage] Upload complete:', url);
            onVoiceMessageSent(url, Math.max(finalDuration, 1), fileName);
          } catch (err) {
            console.error('[VoiceMessage] Upload failed:', err);
            setError('Failed to upload voice message');
          } finally {
            setIsUploading(false);
          }
        } else {
          console.warn('[VoiceMessage] No audio data recorded');
          setError('No audio recorded');
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      // Start with timeslice to ensure data is captured in chunks
      // This helps with short recordings and ensures ondataavailable fires regularly
      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);

      // Start duration timer
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => {
          const newDuration = prev + 1;
          recordingDurationRef.current = newDuration; // Keep ref in sync
          if (newDuration >= MAX_DURATION) {
            stopRecording();
            return prev;
          }
          return newDuration;
        });
      }, 1000);

    } catch (err: any) {
      console.error('Failed to start recording:', err);
      setError(err.message || 'Microphone access denied');
    }
  }, [onVoiceMessageSent]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      // Clear chunks before stopping to prevent upload
      audioChunksRef.current = [];
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordingDuration(0);

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
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
