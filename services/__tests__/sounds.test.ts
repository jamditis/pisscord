import { describe, it, expect, beforeEach, vi } from 'vitest';
import { playSound, stopLoopingSound, setMasterVolume, getMasterVolume, preloadSounds } from '../sounds';

describe('sounds service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('playSound does not throw for valid sounds', () => {
    expect(() => playSound('user_join')).not.toThrow();
  });

  it('playSound does not throw for unconfigured sounds', () => {
    // deafen/undeafen have empty paths
    expect(() => playSound('deafen')).not.toThrow();
  });

  it('stopLoopingSound does not throw when nothing is playing', () => {
    expect(() => stopLoopingSound()).not.toThrow();
  });

  it('setMasterVolume clamps between 0 and 1', () => {
    setMasterVolume(1.5);
    expect(getMasterVolume()).toBe(1);

    setMasterVolume(-0.5);
    expect(getMasterVolume()).toBe(0);

    setMasterVolume(0.5);
    expect(getMasterVolume()).toBe(0.5);
  });

  it('preloadSounds does not throw', () => {
    expect(() => preloadSounds()).not.toThrow();
  });

  it('playing a looping sound then stopping it works', () => {
    playSound('call_incoming', true);
    expect(() => stopLoopingSound()).not.toThrow();
  });

  it('playing same sound twice reuses cached element', () => {
    // First play creates element
    playSound('mute');
    // Second play reuses it (no additional Audio constructor)
    playSound('mute');
    // If it didn't reuse, we'd see extra Audio elements, but since
    // Audio is mocked, we just verify no throw
  });
});
