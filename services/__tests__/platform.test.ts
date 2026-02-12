import { describe, it, expect, vi } from 'vitest';
import {
  Platform,
  LinkService,
  UpdateService,
  ScreenShareService,
  HapticsService,
  StatusBarService,
  OrientationService,
} from '../platform';

describe('platform service', () => {
  it('detects web platform in jsdom', () => {
    // In jsdom test environment, there's no electronAPI or Capacitor
    expect(Platform.isWeb).toBe(true);
    expect(Platform.isElectron).toBe(false);
    expect(Platform.isCapacitor).toBe(false);
  });

  it('reports not mobile in jsdom', () => {
    // jsdom navigator doesn't have mobile user agent
    expect(Platform.isMobileNative).toBe(false);
  });

  it('getName returns web in jsdom', () => {
    expect(Platform.getName()).toBe('web');
  });

  it('isDesktop is true when not mobile', () => {
    expect(Platform.isDesktop).toBe(!Platform.isMobile);
  });

  it('platform booleans are mutually exclusive for base platforms', () => {
    // At most one of these is true at any time
    const bases = [Platform.isElectron, Platform.isCapacitor, Platform.isWeb];
    const trueCount = bases.filter(Boolean).length;
    expect(trueCount).toBe(1);
  });

  it('isIOS and isAndroid are both false in jsdom', () => {
    expect(Platform.isIOS).toBe(false);
    expect(Platform.isAndroid).toBe(false);
  });

  it('isMobileWeb is false in jsdom (no mobile user agent)', () => {
    expect(Platform.isMobileWeb).toBe(false);
  });

  it('isMobile is false for desktop jsdom', () => {
    expect(Platform.isMobile).toBe(false);
  });

  it('isDesktop and isMobile are mutually exclusive', () => {
    expect(Platform.isDesktop).not.toBe(Platform.isMobile);
  });
});

describe('platform services in web mode', () => {
  it('LinkService.openExternal calls window.open', () => {
    const mockOpen = vi.fn();
    vi.stubGlobal('open', mockOpen);

    LinkService.openExternal('https://example.com');
    expect(mockOpen).toHaveBeenCalledWith('https://example.com', '_blank', 'noopener,noreferrer');

    vi.unstubAllGlobals();
  });

  it('UpdateService.isSupported is false on web', () => {
    expect(UpdateService.isSupported).toBe(false);
  });

  it('ScreenShareService.isSupported is false on web', () => {
    expect(ScreenShareService.isSupported).toBe(false);
  });

  it('ScreenShareService.getSources returns null on web', async () => {
    const result = await ScreenShareService.getSources();
    expect(result).toBeNull();
  });

  it('HapticsService.isSupported is false on web', () => {
    expect(HapticsService.isSupported).toBe(false);
  });

  it('HapticsService.impact is no-op on web', async () => {
    await expect(HapticsService.impact('medium')).resolves.toBeUndefined();
  });

  it('StatusBarService.isSupported is false on web', () => {
    expect(StatusBarService.isSupported).toBe(false);
  });

  it('OrientationService.lockPortrait is a no-op in jsdom', async () => {
    await expect(OrientationService.lockPortrait()).resolves.toBeUndefined();
  });

  it('OrientationService.unlockOrientation is a no-op in jsdom', async () => {
    await expect(OrientationService.unlockOrientation()).resolves.toBeUndefined();
  });
});
