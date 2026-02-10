// Sound effects service for Pisscord

import { logger } from './logger';

export type SoundEffect =
  | 'user_join'
  | 'user_leave'
  | 'message'
  | 'call_incoming'
  | 'call_outgoing'
  | 'mute'
  | 'unmute'
  | 'deafen'
  | 'undeafen'
  | 'app_launch'
  | 'error'
  | 'update_available'
  | 'video_on'
  | 'video_off';

// Get base path for assets - works in both dev and production Electron
const getBasePath = () => {
  // In Electron, we need to handle both dev (localhost) and prod (file://) modes
  // @ts-ignore - Vite injects BASE_URL at build time
  const base = (import.meta as any).env?.BASE_URL || './';
  return base.endsWith('/') ? base : base + '/';
};

// Sound file paths
const getSoundPaths = (): Record<SoundEffect, string> => {
  const base = getBasePath();
  return {
    user_join: `${base}assets/UIAlert-user-join-call.mp3`,
    user_leave: `${base}assets/UIAlert-user-leave-call.mp3`,
    message: `${base}assets/UIAlert-new-message-in-text-channel.mp3`,
    call_incoming: `${base}assets/UIAlert-incoming-call.mp3`,
    call_outgoing: `${base}assets/UIAlert-outgoing-call.mp3`,
    mute: `${base}assets/UIAlert-mic_muted_sound.mp3`,
    unmute: `${base}assets/UIAlert-mic_unmuted_sound.mp3`,
    deafen: '',
    undeafen: '',
    app_launch: `${base}assets/UIAlert-app-launch.mp3`,
    error: `${base}assets/UIAlert-error-message.mp3`,
    update_available: `${base}assets/UIAlert-new-version-update.mp3`,
    video_on: `${base}assets/UIAlert-video-on.mp3`,
    video_off: `${base}assets/UIAlert-video-off.mp3`,
  };
};

// Volume level (0-1)
let masterVolume = 0.7;

// Audio elements cache — reused across playSound calls
const audioCache: Record<string, HTMLAudioElement> = {};

// Currently playing looped sound (for call ringing)
let loopingSound: { sound: SoundEffect; audio: HTMLAudioElement } | null = null;

/**
 * Get or create a cached Audio element for the given sound.
 * Reuses elements from preloadSounds() and creates on-demand if needed.
 */
const getAudioElement = (sound: SoundEffect, soundUrl: string): HTMLAudioElement => {
  const cached = audioCache[sound];
  if (cached) {
    // Reuse cached element — reset it for replay
    cached.currentTime = 0;
    cached.volume = masterVolume;
    return cached;
  }

  // Create and cache a new element
  const audio = new Audio(soundUrl);
  audio.preload = 'auto';
  audioCache[sound] = audio;
  return audio;
};

// Play a sound effect
export const playSound = (sound: SoundEffect, loop: boolean = false) => {
  const soundPaths = getSoundPaths();
  const soundUrl = soundPaths[sound];
  if (!soundUrl) return;

  try {
    // For looping sounds, stop any existing loop first
    if (loop) {
      stopLoopingSound();
    }

    const audio = getAudioElement(sound, soundUrl);
    audio.volume = masterVolume;
    audio.loop = loop;

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(err => {
        logger.warn('sounds', `${sound} play() failed: ${err.name} ${err.message}`);
      });
    }

    if (loop) {
      loopingSound = { sound, audio };
    }
  } catch (err) {
    logger.error('sounds', `Error playing "${sound}": ${err}`);
  }
};

// Stop any looping sound
export const stopLoopingSound = () => {
  if (loopingSound) {
    loopingSound.audio.pause();
    loopingSound.audio.currentTime = 0;
    loopingSound.audio.loop = false;
    loopingSound = null;
  }
};

// Set master volume
export const setMasterVolume = (volume: number) => {
  masterVolume = Math.max(0, Math.min(1, volume));
  // Update volume on any currently playing audio
  Object.values(audioCache).forEach(audio => {
    audio.volume = masterVolume;
  });
};

// Get master volume
export const getMasterVolume = () => masterVolume;

// Preload all sounds
export const preloadSounds = () => {
  const soundPaths = getSoundPaths();
  Object.entries(soundPaths).forEach(([name, url]) => {
    if (url && !audioCache[name]) {
      const audio = new Audio(url);
      audio.preload = 'auto';
      audioCache[name] = audio;
    }
  });
};
