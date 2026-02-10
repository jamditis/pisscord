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
});
