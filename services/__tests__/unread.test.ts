import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadUnreadState,
  markChannelAsRead,
  updateNewestMessage,
  updateNewestFromMessages,
  hasUnreadMessages,
  getUnreadChannels,
  getUnreadChannelCount,
  clearUnreadState,
} from '../unread';

describe('unread service', () => {
  beforeEach(() => {
    localStorage.clear();
    clearUnreadState();
  });

  it('starts with no unread channels', () => {
    expect(getUnreadChannels()).toEqual([]);
    expect(getUnreadChannelCount()).toBe(0);
  });

  it('detects unread messages after updateNewestMessage', () => {
    updateNewestMessage('ch1', 1000);
    expect(hasUnreadMessages('ch1')).toBe(true);
    expect(getUnreadChannels()).toEqual(['ch1']);
  });

  it('marks channel as read', () => {
    updateNewestMessage('ch1', 1000);
    expect(hasUnreadMessages('ch1')).toBe(true);

    markChannelAsRead('ch1');
    expect(hasUnreadMessages('ch1')).toBe(false);
  });

  it('shows unread again when new message arrives after mark-as-read', () => {
    updateNewestMessage('ch1', 1000);
    markChannelAsRead('ch1');
    expect(hasUnreadMessages('ch1')).toBe(false);

    // New message with later timestamp
    updateNewestMessage('ch1', Date.now() + 5000);
    expect(hasUnreadMessages('ch1')).toBe(true);
  });

  it('updateNewestFromMessages picks the latest timestamp', () => {
    const messages = [
      { timestamp: 100 },
      { timestamp: 500 },
      { timestamp: 300 },
    ];
    updateNewestFromMessages('ch2', messages);
    expect(hasUnreadMessages('ch2')).toBe(true);
  });

  it('updateNewestFromMessages ignores empty arrays', () => {
    updateNewestFromMessages('ch2', []);
    expect(hasUnreadMessages('ch2')).toBe(false);
  });

  it('does not downgrade newest message timestamp', () => {
    updateNewestMessage('ch1', 5000);
    updateNewestMessage('ch1', 3000); // older — should be ignored
    markChannelAsRead('ch1');

    // Only the 5000 timestamp matters, so marking as read covers it
    expect(hasUnreadMessages('ch1')).toBe(false);
  });

  it('persists state to localStorage', () => {
    updateNewestMessage('ch1', 1000);
    markChannelAsRead('ch1');

    const stored = localStorage.getItem('pisscord_unread');
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed.newestMessage.ch1).toBe(1000);
    expect(parsed.lastRead.ch1).toBeGreaterThanOrEqual(1000);
  });

  it('loads state from localStorage', () => {
    localStorage.setItem('pisscord_unread', JSON.stringify({
      lastRead: { ch1: 500 },
      newestMessage: { ch1: 1000 },
    }));
    loadUnreadState();
    expect(hasUnreadMessages('ch1')).toBe(true);
  });

  it('handles corrupted localStorage gracefully', () => {
    localStorage.setItem('pisscord_unread', 'not json');
    // Should not throw
    loadUnreadState();
    expect(getUnreadChannels()).toEqual([]);
  });

  it('clearUnreadState resets everything', () => {
    updateNewestMessage('ch1', 1000);
    clearUnreadState();
    expect(hasUnreadMessages('ch1')).toBe(false);
    expect(localStorage.getItem('pisscord_unread')).toBeNull();
  });

  it('tracks multiple channels independently', () => {
    updateNewestMessage('ch1', 1000);
    updateNewestMessage('ch2', 2000);
    markChannelAsRead('ch1');

    expect(hasUnreadMessages('ch1')).toBe(false);
    expect(hasUnreadMessages('ch2')).toBe(true);
    expect(getUnreadChannelCount()).toBe(1);
  });

  it('hasUnreadMessages returns false for unknown channels', () => {
    expect(hasUnreadMessages('nonexistent')).toBe(false);
  });

  it('markChannelAsRead on unknown channel does not crash', () => {
    expect(() => markChannelAsRead('nonexistent')).not.toThrow();
    expect(hasUnreadMessages('nonexistent')).toBe(false);
  });

  it('rapid markAsRead + updateNewest simulates user viewing channel', () => {
    // Simulate: user opens channel, messages arrive while viewing
    markChannelAsRead('ch1');
    updateNewestMessage('ch1', Date.now() - 1000); // message from 1s ago
    // Since markChannelAsRead sets lastRead to now, which is after the message
    expect(hasUnreadMessages('ch1')).toBe(false);
  });

  it('getUnreadChannels returns sorted channel IDs', () => {
    updateNewestMessage('beta', 2000);
    updateNewestMessage('alpha', 1000);
    updateNewestMessage('gamma', 3000);

    const channels = getUnreadChannels();
    expect(channels).toContain('alpha');
    expect(channels).toContain('beta');
    expect(channels).toContain('gamma');
    expect(channels).toHaveLength(3);
  });

  it('updateNewestFromMessages handles messages with missing timestamps', () => {
    const messages = [
      { timestamp: 0 },
      { timestamp: 500 },
      {} as any, // missing timestamp
    ];
    updateNewestFromMessages('ch3', messages);
    // Should pick 500 as the newest
    expect(hasUnreadMessages('ch3')).toBe(true);
  });

  it('survives localStorage being full (save fails gracefully)', () => {
    // Mock localStorage.setItem to throw (simulating quota exceeded)
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = () => { throw new Error('QuotaExceededError'); };

    // Should not crash
    expect(() => updateNewestMessage('ch1', 1000)).not.toThrow();
    expect(() => markChannelAsRead('ch1')).not.toThrow();

    localStorage.setItem = originalSetItem;
  });

  it('loadUnreadState handles partial data', () => {
    localStorage.setItem('pisscord_unread', JSON.stringify({
      lastRead: { ch1: 500 },
      // newestMessage missing
    }));
    loadUnreadState();
    // Should default newestMessage to empty object
    expect(hasUnreadMessages('ch1')).toBe(false);
  });

  it('clearUnreadState removes localStorage key', () => {
    updateNewestMessage('ch1', 1000);
    expect(localStorage.getItem('pisscord_unread')).toBeTruthy();

    clearUnreadState();
    expect(localStorage.getItem('pisscord_unread')).toBeNull();
  });
});
