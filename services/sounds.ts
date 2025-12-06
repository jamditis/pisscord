// Sound effects service for Pisscord

export type SoundEffect =
  | 'user_join'
  | 'user_leave'
  | 'message'
  | 'call_incoming'
  | 'call_outgoing'
  | 'mute'
  | 'unmute'
  | 'deafen'
  | 'undeafen';

// Get base path for assets - works in both dev and production Electron
const getBasePath = () => {
  // In Electron, we need to handle both dev (localhost) and prod (file://) modes
  const base = import.meta.env.BASE_URL || './';
  return base.endsWith('/') ? base : base + '/';
};

// Sound file paths
const getSoundPaths = (): Record<SoundEffect, string> => {
  const base = getBasePath();
  return {
    user_join: `${base}assets/user_join_sound.mp3`,
    user_leave: `${base}assets/user_leave_sound.mp3`,
    message: '', // To be added
    call_incoming: `${base}assets/incoming_call_sound.mp3`,
    call_outgoing: `${base}assets/outgoing_call_sound.mp3`,
    mute: `${base}assets/mic_muted_sound.mp3`,
    unmute: `${base}assets/mic_unmuted_sound.mp3`,
    deafen: '', // To be added
    undeafen: '', // To be added
  };
};

// Volume level (0-1)
let masterVolume = 0.7;

// Audio elements cache
const audioCache: Record<string, HTMLAudioElement> = {};

// Currently playing looped sound (for call ringing)
let loopingSound: { sound: SoundEffect; audio: HTMLAudioElement } | null = null;

// Play a sound effect
export const playSound = (sound: SoundEffect, loop: boolean = false) => {
  const soundPaths = getSoundPaths();
  const soundUrl = soundPaths[sound];
  if (!soundUrl) {
    console.warn(`Sound "${sound}" not configured`);
    return;
  }

  console.log(`[SOUND] Attempting to play: ${sound}, URL: ${soundUrl}`);

  try {
    // For looping sounds, stop any existing loop first
    if (loop) {
      stopLoopingSound();
    }

    // Always create a fresh Audio element for reliability
    const audio = new Audio(soundUrl);
    audio.volume = masterVolume;
    audio.loop = loop;

    // Add event listeners for debugging
    audio.addEventListener('canplaythrough', () => {
      console.log(`[SOUND] ${sound} can play through`);
    });
    audio.addEventListener('error', (e) => {
      console.error(`[SOUND] ${sound} error:`, audio.error?.message || e);
    });
    audio.addEventListener('playing', () => {
      console.log(`[SOUND] ${sound} is now playing!`);
    });

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          console.log(`[SOUND] ${sound} play() succeeded`);
        })
        .catch(err => {
          console.error(`[SOUND] ${sound} play() failed:`, err.name, err.message);
        });
    }

    if (loop) {
      loopingSound = { sound, audio };
    }

  } catch (err) {
    console.error(`[SOUND] Error playing "${sound}":`, err);
  }
};

// Stop any looping sound
export const stopLoopingSound = () => {
  if (loopingSound) {
    loopingSound.audio.pause();
    loopingSound.audio.currentTime = 0;
    loopingSound.audio.loop = false;
    console.log(`Stopped looping sound: ${loopingSound.sound}`);
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
  console.log('Preloading sounds...');
  const soundPaths = getSoundPaths();
  Object.entries(soundPaths).forEach(([name, url]) => {
    if (url && !audioCache[name]) {
      const audio = new Audio(url);
      audio.preload = 'auto';
      audioCache[name] = audio;
      console.log(`Preloaded: ${name} -> ${url}`);
    }
  });
};
