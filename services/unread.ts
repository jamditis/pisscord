/**
 * Unread Message Tracking Service
 *
 * Tracks the last read timestamp per channel to show unread indicators.
 * Persists to localStorage for cross-session tracking.
 */

import { logger } from './logger';

const STORAGE_KEY = 'pisscord_unread';

interface UnreadState {
  // channelId -> timestamp of last read message
  lastRead: Record<string, number>;
  // channelId -> timestamp of newest message we know about
  newestMessage: Record<string, number>;
}

let state: UnreadState = {
  lastRead: {},
  newestMessage: {}
};

/**
 * Load unread state from localStorage
 */
export function loadUnreadState(): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      state = {
        lastRead: parsed.lastRead || {},
        newestMessage: parsed.newestMessage || {}
      };
    }
  } catch (error) {
    logger.error('unread', 'Failed to load state', error);
  }
}

/**
 * Save unread state to localStorage
 */
function saveState(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    logger.error('unread', 'Failed to save state', error);
  }
}

/**
 * Mark a channel as read (user is viewing it)
 */
export function markChannelAsRead(channelId: string): void {
  const now = Date.now();
  state.lastRead[channelId] = now;
  // Also update newest message to current time so it's not "unread"
  if (state.newestMessage[channelId]) {
    state.lastRead[channelId] = Math.max(now, state.newestMessage[channelId]);
  }
  saveState();
}

/**
 * Update the newest message timestamp for a channel
 * Called when messages are received/loaded
 */
export function updateNewestMessage(channelId: string, timestamp: number): void {
  const current = state.newestMessage[channelId] || 0;
  if (timestamp > current) {
    state.newestMessage[channelId] = timestamp;
    saveState();
  }
}

/**
 * Update newest message from an array of messages
 */
export function updateNewestFromMessages(channelId: string, messages: Array<{ timestamp: number }>): void {
  if (!messages || messages.length === 0) return;

  // Find the newest message timestamp
  let newest = 0;
  for (const msg of messages) {
    const ts = msg.timestamp || 0;
    if (ts > newest) {
      newest = ts;
    }
  }

  if (newest > 0) {
    updateNewestMessage(channelId, newest);
  }
}

/**
 * Check if a channel has unread messages
 */
export function hasUnreadMessages(channelId: string): boolean {
  const lastRead = state.lastRead[channelId] || 0;
  const newestMessage = state.newestMessage[channelId] || 0;

  // If we've never seen any messages, not unread
  if (newestMessage === 0) return false;

  // If newest message is after last read, it's unread
  return newestMessage > lastRead;
}

/**
 * Get the count of unread channels
 */
export function getUnreadChannelCount(): number {
  let count = 0;
  for (const channelId of Object.keys(state.newestMessage)) {
    if (hasUnreadMessages(channelId)) {
      count++;
    }
  }
  return count;
}

/**
 * Get all channel IDs that have unread messages
 */
export function getUnreadChannels(): string[] {
  return Object.keys(state.newestMessage).filter(hasUnreadMessages);
}

/**
 * Clear all unread state (for logout/reset)
 */
export function clearUnreadState(): void {
  state = { lastRead: {}, newestMessage: {} };
  localStorage.removeItem(STORAGE_KEY);
}

// Initialize on load
loadUnreadState();
