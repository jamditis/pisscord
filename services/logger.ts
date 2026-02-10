/**
 * Centralized logging service for Pisscord
 *
 * Replaces scattered console.log/error/warn calls with structured output.
 * Maintains an in-memory buffer for the Debug Log tab in settings.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  module: string;
  message: string;
}

const LOG_BUFFER_SIZE = 200;

// Ordered by severity — higher index = more severe
const LEVEL_SEVERITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

let minLevel: LogLevel = 'debug';
const buffer: LogEntry[] = [];
const listeners: Set<(entry: LogEntry) => void> = new Set();

function shouldLog(level: LogLevel): boolean {
  return LEVEL_SEVERITY[level] >= LEVEL_SEVERITY[minLevel];
}

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString('en-US', { hour12: false }) + '.' + String(d.getMilliseconds()).padStart(3, '0');
}

function emit(level: LogLevel, module: string, message: string): void {
  if (!shouldLog(level)) return;

  const entry: LogEntry = {
    timestamp: Date.now(),
    level,
    module,
    message,
  };

  // Add to buffer (newest first)
  buffer.unshift(entry);
  if (buffer.length > LOG_BUFFER_SIZE) {
    buffer.length = LOG_BUFFER_SIZE;
  }

  // Console output
  const formatted = `[${formatTimestamp(entry.timestamp)}] [${level.toUpperCase()}] [${module}] ${message}`;
  switch (level) {
    case 'error':
      console.error(formatted);
      break;
    case 'warn':
      console.warn(formatted);
      break;
    case 'debug':
      console.debug(formatted);
      break;
    default:
      console.log(formatted);
  }

  // Electron file logging
  if (typeof window !== 'undefined' && (window as any).electronAPI?.logToFile) {
    (window as any).electronAPI.logToFile(formatted);
  }

  // Notify listeners (for Debug Log tab)
  listeners.forEach(fn => fn(entry));
}

export const logger = {
  debug(module: string, message: string): void {
    emit('debug', module, message);
  },
  info(module: string, message: string): void {
    emit('info', module, message);
  },
  warn(module: string, message: string): void {
    emit('warn', module, message);
  },
  error(module: string, message: string): void {
    emit('error', module, message);
  },

  /** Get the current log buffer (newest first) */
  getBuffer(): readonly LogEntry[] {
    return buffer;
  },

  /** Clear the log buffer */
  clearBuffer(): void {
    buffer.length = 0;
  },

  /** Set minimum log level */
  setMinLevel(level: LogLevel): void {
    minLevel = level;
  },

  /** Subscribe to new log entries (returns unsubscribe function) */
  subscribe(fn: (entry: LogEntry) => void): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
