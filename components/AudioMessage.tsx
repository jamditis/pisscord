import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';
import { transcribeAudio } from '../services/geminiService';

interface AudioMessageProps {
  url: string;
  duration?: number;
  fileName?: string;
}

export const AudioMessage: React.FC<AudioMessageProps> = ({
  url,
  duration = 0,
  fileName = 'Voice Message'
}) => {
  const { colors } = useTheme();
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Transcription state
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);

  // Generate stable waveform heights once per component instance
  // More bars for wider player (30 bars at 480px width)
  const waveformHeights = useMemo(() => {
    return Array.from({ length: 30 }).map((_, i) =>
      20 + Math.sin(i * 0.5) * 15 + Math.random() * 10
    );
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Ensure audio is at full volume
    audio.volume = 1.0;

    const handleLoadedMetadata = () => {
      setAudioDuration(audio.duration);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
    };

    const handleError = () => {
      setIsLoading(false);
      const errorCode = audio.error?.code;
      const errorMessage = audio.error?.message || 'Unknown error';
      console.error('Audio load error:', { code: errorCode, message: errorMessage, url });
      setError(`Failed to load audio (${errorCode || 'unknown'})`);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
    };
  }, []);

  const togglePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      try {
        await audio.play();
        setIsPlaying(true);
      } catch (err) {
        console.error('Playback failed:', err);
        setError('Playback blocked - tap to retry');
        setIsPlaying(false);
      }
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    const progressBar = progressRef.current;
    if (!audio || !progressBar) return;

    const rect = progressBar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * audioDuration;

    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds) || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleTranscribe = async () => {
    if (isTranscribing || transcript) {
      // If already transcribed, just toggle visibility
      setShowTranscript(!showTranscript);
      return;
    }

    setIsTranscribing(true);
    try {
      const result = await transcribeAudio(url);
      setTranscript(result);
      setShowTranscript(true);
    } catch (err) {
      console.error('Transcription failed:', err);
      setTranscript('⚠️ Transcription failed');
      setShowTranscript(true);
    } finally {
      setIsTranscribing(false);
    }
  };

  const progress = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

  return (
    <div className="max-w-[480px]">
      <div className="flex items-center bg-discord-dark/60 rounded-lg p-3 border border-discord-dark">
        {/* Hidden audio element */}
        <audio ref={audioRef} src={url} preload="metadata" />

        {/* Play/Pause button */}
        <motion.button
          onClick={() => {
            setError(null); // Clear error on retry
            togglePlayPause();
          }}
          disabled={isLoading}
          whileTap={{ scale: 0.95 }}
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors"
          style={{ backgroundColor: error ? '#ef4444' : colors.primary }}
          title={error || (isPlaying ? 'Pause' : 'Play')}
        >
          {isLoading ? (
            <i className="fas fa-spinner fa-spin text-white text-sm"></i>
          ) : error ? (
            <i className="fas fa-exclamation-triangle text-white text-sm"></i>
          ) : isPlaying ? (
            <i className="fas fa-pause text-white text-sm"></i>
          ) : (
            <i className="fas fa-play text-white text-sm ml-0.5"></i>
          )}
        </motion.button>

        {/* Waveform / Progress */}
        <div className="flex-1 ml-3">
          {/* Simple waveform visualization */}
          <div
            ref={progressRef}
            onClick={handleProgressClick}
            className="h-8 bg-discord-sidebar rounded cursor-pointer relative overflow-hidden group"
          >
            {/* Waveform bars (decorative) */}
            <div className="absolute inset-0 flex items-center justify-around px-1">
              {waveformHeights.map((height, i) => {
                const isActive = (i / 30) * 100 <= progress;
                return (
                  <div
                    key={i}
                    className="w-1 rounded-full transition-colors"
                    style={{
                      height: `${height}%`,
                      backgroundColor: isActive ? colors.primary : 'rgba(255, 255, 255, 0.2)',
                    }}
                  />
                );
              })}
            </div>

            {/* Progress overlay */}
            <div
              className="absolute inset-y-0 left-0 bg-white/5 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Time display */}
          <div className="flex justify-between mt-1 text-[10px] text-discord-muted">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(audioDuration)}</span>
          </div>
        </div>

        {/* Transcribe button */}
        <motion.button
          onClick={handleTranscribe}
          disabled={isTranscribing}
          whileTap={{ scale: 0.95 }}
          className={`ml-2 p-2 rounded transition-colors ${
            transcript
              ? 'text-purple-400 hover:text-purple-300 hover:bg-purple-500/20'
              : 'text-discord-muted hover:text-white hover:bg-discord-hover'
          }`}
          title={isTranscribing ? 'Transcribing...' : transcript ? (showTranscript ? 'Hide transcript' : 'Show transcript') : 'Transcribe with Pissbot'}
        >
          {isTranscribing ? (
            <i className="fas fa-spinner fa-spin text-xs"></i>
          ) : (
            <i className={`fas fa-closed-captioning text-xs ${transcript ? 'text-purple-400' : ''}`}></i>
          )}
        </motion.button>

        {/* Download button */}
        <a
          href={url}
          download={fileName}
          className="ml-1 p-2 rounded hover:bg-discord-hover text-discord-muted hover:text-white transition-colors"
          title="Download"
        >
          <i className="fas fa-download text-xs"></i>
        </a>
      </div>

      {/* Expandable Transcript */}
      <AnimatePresence>
        {showTranscript && transcript && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-2 px-3 py-2 bg-discord-dark/40 rounded-lg border border-discord-dark">
              <div className="flex items-center gap-1 mb-1">
                <i className="fas fa-robot text-[10px] text-purple-400"></i>
                <span className="text-[10px] text-purple-400 font-medium">Transcript</span>
              </div>
              <p className="text-sm text-discord-text/80 italic leading-relaxed">
                {transcript}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
