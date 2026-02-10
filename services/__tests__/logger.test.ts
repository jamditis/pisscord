import { describe, it, expect, beforeEach } from 'vitest';
import { logger, LogEntry } from '../logger';

describe('logger service', () => {
  beforeEach(() => {
    logger.clearBuffer();
  });

  it('logs info messages', () => {
    logger.info('test', 'hello world');
    expect(logger.getBuffer().length).toBe(1);

    // Buffer is newest-first, so index 0 is the most recent entry
    const entry = logger.getBuffer()[0];
    expect(entry.level).toBe('info');
    expect(entry.module).toBe('test');
    expect(entry.message).toBe('hello world');
  });

  it('logs all levels', () => {
    const levels: Array<'debug' | 'info' | 'warn' | 'error'> = ['debug', 'info', 'warn', 'error'];

    levels.forEach(level => logger[level]('mod', `${level} msg`));

    const buf = logger.getBuffer();
    expect(buf.length).toBe(4);

    // Buffer is newest-first: index 0 = error (last logged), index 3 = debug (first logged)
    for (let i = 0; i < levels.length; i++) {
      const entry = buf[levels.length - 1 - i];
      expect(entry.level).toBe(levels[i]);
      expect(entry.message).toBe(`${levels[i]} msg`);
    }
  });

  it('includes timestamp in entries', () => {
    logger.info('test', 'timestamp check');
    const entry = logger.getBuffer()[0];
    expect(entry.timestamp).toBeLessThanOrEqual(Date.now());
    expect(entry.timestamp).toBeGreaterThan(0);
  });

  it('subscribe receives new entries', () => {
    const received: LogEntry[] = [];
    const unsub = logger.subscribe(entry => received.push(entry));

    logger.info('sub', 'message 1');
    logger.warn('sub', 'message 2');

    expect(received.length).toBe(2);
    expect(received[0].message).toBe('message 1');
    expect(received[1].level).toBe('warn');

    unsub();

    // After unsubscribe, no more entries
    logger.info('sub', 'message 3');
    expect(received.length).toBe(2);
  });

  it('getBuffer returns readonly array', () => {
    const buf = logger.getBuffer();
    expect(Array.isArray(buf)).toBe(true);
  });
});
