import { describe, it, expect } from 'vitest';
import { Platform } from '../platform';

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
});
